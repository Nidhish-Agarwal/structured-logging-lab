const defaultLogger = require('./logger');

/**
 * Process payment transaction.
 * SECURITY: Never log sensitive payment data (credit card numbers, CVVs, passwords, tokens).
 * Only log safe identifiers like orderId, amount, customerId, status.
 */
const processPayment = (paymentDetails = {}, log = defaultLogger) => {
  const { orderId, amount, customerId } = paymentDetails;

  log.info(
    { orderId, amount, customerId },
    'payment.start'
  );

  // Simulate payment processing
  setTimeout(() => {
    log.info(
      { orderId, status: 'completed' },
      'payment.success'
    );
  }, 500);
};

module.exports = { processPayment };
