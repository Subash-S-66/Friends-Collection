const express = require('express');
const router = express.Router();
const {
  getCart,
  syncCart,
  updateCart,
  clearCart
} = require('../controllers/cartController');
const { auth } = require('../middleware/auth');

router.get('/', auth, getCart);
router.post('/sync', auth, syncCart);
router.put('/', auth, updateCart);
router.delete('/', auth, clearCart);

module.exports = router;
