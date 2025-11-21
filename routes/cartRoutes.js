const express = require('express');
const router = express.Router();

router.post('/set', (req, res) => {
  const { cart } = req.body;
  if (!cart) return res.status(400).json({ error: 'Cart required' });
  req.session.cart = cart;
  res.json({ success: true });
});

router.get('/get', (req, res) => {
  if (!req.session.cart) return res.status(404).json({ error: 'No cart found' });
  res.json({ cart: req.session.cart });
});

module.exports = router;
