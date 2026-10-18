const express = require('express');
const router = express.Router();
const {
  getCart,
  syncCart,
  updateCart,
  clearCart,
  validateCart
} = require('../controllers/cartController');
const { auth } = require('../middleware/auth');

// Public route to validate live database stock for both guests and logged-in users
router.post('/validate', validateCart);

router.get('/', auth, getCart);
router.post('/sync', auth, syncCart);
router.put('/', auth, updateCart);
router.delete('/', auth, clearCart);

module.exports = router;
