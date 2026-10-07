const express = require('express');
const crypto = require('crypto');
const logger = require('./logger');
const { connectDb } = require('./db');
const ordersRouter = require('./routes/orders');
const { processPayment } = require('./payment');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Correlation ID & Request Logging Middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req-${crypto.randomUUID()}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  req.log = logger.child({ reqId });

  const url = req.originalUrl || req.url;
  const startTime = Date.now();
  req.log.info(
    { method: req.method, url },
    'http.request.received'
  );

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.log[level](
      {
        method: req.method,
        url,
        statusCode: res.statusCode,
        durationMs,
      },
      'http.request.completed'
    );
  });

  next();
});

logger.info('server.init');

connectDb();

app.get('/', (req, res) => {
  req.log.info('health.check');
  res.send('Orders API is running');
});

app.use('/orders', ordersRouter);

app.post('/payments', (req, res) => {
  const { orderId, amount, customer_id } = req.body || {};
  // Safe logging: Never log credit card numbers, CVVs, or session tokens!
  req.log.info({ orderId, customer_id, amount }, 'payment.request.received');
  processPayment({ orderId, amount, customerId: customer_id }, req.log);
  res.send('Payment processed');
});

// Endpoint to simulate an unexpected internal failure for debugging demonstration
app.get('/simulate-error', (req, res) => {
  const simulatedError = new Error('Database transaction timeout during payment verification');
  req.log.error(
    {
      error: simulatedError.message,
      stack: simulatedError.stack,
      endpoint: '/simulate-error',
    },
    'payment.error.simulated'
  );
  res.status(500).json({ error: 'Internal Server Error', reqId: req.id });
});

app.listen(port, () => {
  logger.info({ port }, 'server.ready');
});
