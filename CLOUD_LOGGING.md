# Cloud Logging Mapping Architecture

This document describes how the structured JSON logs emitted by `orders-api` map seamlessly into modern cloud log management platforms and observability backends (such as **Google Cloud Logging**, **Grafana Loki**, and **AWS CloudWatch Logs**).

---

## 1. The Core Principle: Logs as Structured Data

In containerized and cloud-native environments, applications follow the Twelve-Factor App methodology by writing unbuffered structured logs directly to `stdout` and `stderr`.

When logs are plain text strings, cloud ingest agents cannot inspect internal parameters without brittle regex parsers. By emitting JSON objects:
```json
{
  "level": "info",
  "ts": "2026-10-07T09:14:53.483Z",
  "service": "orders-api",
  "reqId": "req-8841-abc",
  "msg": "payment.start",
  "orderId": 8841
}
```
cloud log collectors automatically parse each key into indexed, queryable attributes.

---

## 2. Google Cloud Logging (Cloud Logging / Stackdriver)

Google Cloud's Logging agent (and Google Kubernetes Engine fluentbit/fluent-agent) automatically recognizes JSON formatted lines written to container stdout.

### Field Mapping

| `orders-api` JSON Field | Google Cloud Logging Field | Purpose |
|-------------------------|----------------------------|---------|
| `ts`                    | `timestamp`                | Event time index |
| `level`                 | `severity`                 | Maps `info` -> `INFO`, `warn` -> `WARNING`, `error` -> `ERROR` |
| `msg`                   | `message` / `jsonPayload.msg` | Log summary |
| `service`               | `jsonPayload.service`      | Service tag for filtering |
| `reqId`                 | `jsonPayload.reqId` or `logging.googleapis.com/trace` | Distributed correlation ID |
| Extra context (e.g., `orderId`) | `jsonPayload.orderId` | Domain-specific searchable filter |

### Querying in Google Cloud Logs Explorer

- **Filter all errors in the service:**
  ```text
  resource.type="k8s_container"
  jsonPayload.service="orders-api"
  severity>=ERROR
  ```

- **Trace a specific customer transaction end-to-end:**
  ```text
  jsonPayload.service="orders-api"
  jsonPayload.reqId="req-8841-abc"
  ```

---

## 3. Grafana Loki

Grafana Loki ingests log streams using labels for stream indexing and decomposes structured payloads dynamically using LogQL's JSON parser.

### Field Extraction via LogQL
With Promtail scraping container stdout, logs are stored as streams (labeled by `app="orders-api"`). At query time, the `| json` parser exposes all JSON keys as filterable variables.

### Querying with LogQL

- **Isolate all error-level logs:**
  ```logql
  {app="orders-api"} | json | level = "error"
  ```

- **Trace a single request's complete lifecycle:**
  ```logql
  {app="orders-api"} | json | reqId = "req-8841-abc"
  ```

- **Calculate request duration and error rate:**
  ```logql
  rate({app="orders-api"} | json | level = "error" [5m])
  ```

---

## 4. AWS CloudWatch Logs & CloudWatch Logs Insights

On AWS ECS (Fargate/EC2) or EKS, container logs routed via `awslogs` log driver or AWS for Fluent Bit are natively ingested into CloudWatch Log Groups.

### Querying in CloudWatch Logs Insights

- **Find all failed transactions with their request IDs and error causes:**
  ```sql
  fields @timestamp, reqId, msg, error, durationMs
  | filter service = "orders-api" and level = "error"
  | sort @timestamp desc
  | limit 50
  ```

- **Trace the full chronological lifecycle of a request:**
  ```sql
  fields @timestamp, level, msg, method, url, statusCode, durationMs
  | filter reqId = "req-8841-abc"
  | sort @timestamp asc
  ```

---

## 5. Correlation IDs Across Distributed Architectures

In distributed systems, a user action crosses multiple boundaries (e.g., API Gateway $\rightarrow$ Orders API $\rightarrow$ Payment Service $\rightarrow$ PostgreSQL).

- By propagating `reqId` through HTTP headers (`X-Request-Id` or W3C `traceparent`), every downstream service can inherit or tag the same correlation ID.
- Filtering by `reqId` in any of the above cloud tools immediately aggregates logs across all microservices into a single unified timeline.

---

## 6. Security and Compliance (Redaction & Safe Logging)

In cloud environments, log storage is subject to compliance frameworks (GDPR, PCI-DSS, SOC 2, HIPAA).
- **Golden Rule:** Never log sensitive credentials (passwords, secret API tokens, credit card PANs, CVVs, or session tokens).
- Always log **non-sensitive identifiers** (e.g. `orderId`, `customerId`, `reqId`) that permit engineers to look up records in secure transactional databases without exposing raw credentials in centralized log aggregators.
