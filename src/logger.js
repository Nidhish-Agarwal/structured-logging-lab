const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: () => `,"ts":"${new Date().toISOString()}"`,
  base: {
    service: process.env.SERVICE_NAME || 'orders-api',
  },
  messageKey: 'msg',
});

module.exports = logger;
