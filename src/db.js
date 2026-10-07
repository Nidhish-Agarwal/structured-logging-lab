const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: process.env.DB_NAME || 'ordersdb',
  port: process.env.DB_PORT || 5432,
});

const connectDb = async (maxRetries = 5, delayMs = 1500) => {
  logger.info('db.connecting');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT NOW()');
      logger.info({ attempt }, 'db.connected');
      return;
    } catch (err) {
      if (attempt < maxRetries) {
        logger.warn(
          { attempt, maxRetries, retryInMs: delayMs, error: err.message },
          'db.connect.retry'
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        logger.error(
          { attempt, maxRetries, error: err.message, stack: err.stack },
          'db.connect.failed'
        );
      }
    }
  }
};

const queryDb = async (text, params = [], log = logger) => {
  const startTime = Date.now();
  log.debug({ query: text, paramCount: params.length }, 'db.query.start');
  try {
    const res = await pool.query(text, params);
    const durationMs = Date.now() - startTime;
    log.debug({ rowCount: res.rowCount, durationMs }, 'db.query.success');
    return res;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    log.error({ query: text, durationMs, error: err.message }, 'db.query.failed');
    throw err;
  }
};

module.exports = { connectDb, queryDb, pool };
