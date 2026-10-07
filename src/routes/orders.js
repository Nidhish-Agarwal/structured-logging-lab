const express = require('express');
const router = express.Router();
const { queryDb } = require('../db');

// GET /orders - List all orders
router.get('/', async (req, res) => {
  const log = req.log;
  log.info('orders.list.start');
  try {
    const result = await queryDb('SELECT * FROM orders', [], log);
    log.info({ count: result.rows.length }, 'orders.list.success');
    res.json(result.rows);
  } catch (err) {
    log.error({ error: err.message, stack: err.stack }, 'orders.list.failed');
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// POST /orders - Create a new order
router.post('/', async (req, res) => {
  const log = req.log;
  const { product_id, quantity, customer_id } = req.body || {};

  log.info({ product_id, quantity, customer_id }, 'orders.create.start');

  // Input validation: Handled client error logged as WARN (not ERROR)
  if (!product_id || !quantity || !customer_id) {
    log.warn(
      {
        missingFields: {
          product_id: !product_id,
          quantity: !quantity,
          customer_id: !customer_id,
        },
      },
      'orders.create.validation_failed'
    );
    return res.status(400).json({ error: 'Missing required fields: product_id, quantity, and customer_id' });
  }

  try {
    const result = await queryDb(
      'INSERT INTO orders (product_id, quantity, customer_id) VALUES ($1, $2, $3) RETURNING *',
      [product_id, quantity, customer_id],
      log
    );
    const createdOrder = result.rows[0];
    log.info(
      { orderId: createdOrder.id, product_id, customer_id },
      'orders.create.success'
    );
    res.status(201).json(createdOrder);
  } catch (err) {
    log.error(
      { error: err.message, product_id, customer_id },
      'orders.create.failed'
    );
    res.status(500).json({ error: 'Error creating order' });
  }
});

module.exports = router;
