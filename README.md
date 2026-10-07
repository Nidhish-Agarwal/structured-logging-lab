# structured-logging-lab

This repository contains an Orders API application enhanced with **Structured JSON Logging**, **Severity Levels**, and **Request Correlation IDs** for debugging and observability.

---

## Features

- **Structured JSON Logging**: Every log line is emitted as a valid JSON object containing consistent fields (`ts`, `level`, `service`, `msg`).
- **Severity Levels**: Proper use of `debug`, `info`, `warn`, and `error` to differentiate routine events from warnings and critical failures.
- **Request Correlation ID (`reqId`)**: Every request is assigned a unique UUID (or extracts `X-Request-Id` from incoming headers) that is attached to all logs emitted during that request's lifecycle.
- **Safe Logging**: Zero exposure of sensitive credentials, passwords, or credit card details.
- **Queryable with `jq`**: Seamless integration with CLI tools and cloud log platforms.

---

## Setup & Running

Build and start the services using Docker Compose:

```bash
docker compose up -d --build
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Health check endpoint |
| `GET`  | `/orders` | Fetch list of all orders |
| `POST` | `/orders` | Create a new order (Payload: `product_id`, `quantity`, `customer_id`) |
| `POST` | `/payments` | Process payment for an order |
| `GET`  | `/simulate-error` | Trigger simulated internal failure for debugging demonstration |

---

## Viewing & Querying Logs

### 1. View Raw Structured Logs
```bash
docker logs orders-api
```

### 2. Filter Only Error Logs
```bash
docker logs orders-api | jq 'select(.level=="error")'
```

### 3. Trace a Specific Request by Correlation ID
```bash
docker logs orders-api | jq 'select(.reqId=="<your-request-id>")'
```

### 4. Extract Summary Table of Events
```bash
docker logs orders-api | jq -r '[.ts, .level, .reqId // "-", .msg] | @tsv'
```

---

## Triggering Failures & Debugging Demo

1. Send normal requests:
   ```bash
   curl -i http://localhost:3000/
   curl -i -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"product_id":"PROD-100","quantity":2,"customer_id":"CUST-001"}'
   ```

2. Trigger a simulated failure:
   ```bash
   curl -i http://localhost:3000/simulate-error
   ```
   Note the `X-Request-Id` header returned in the response (e.g. `req-abcdef...`).

3. Immediately trace the root cause using `jq`:
   ```bash
   docker logs orders-api | jq 'select(.reqId=="<request-id-from-header>")'
   ```

---

## Cloud Observability Mapping

Refer to [CLOUD_LOGGING.md](CLOUD_LOGGING.md) for details on how these structured JSON logs map automatically into **Google Cloud Logging**, **Grafana Loki**, and **AWS CloudWatch Logs**.
