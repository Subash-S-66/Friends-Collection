const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  googleAuth,
  requestVerificationToken,
  verifyTokenAndLogin,
  forgotPasswordRequest,
  forgotPasswordVerify,
  verifyEmailToken,
  resendVerification,
  requestEmailChange,
  verifyEmailChange,
  cancelEmailChange
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], register);

router.post('/login', authLimiter, [
  body('email').trim().notEmpty().withMessage('Valid email or username is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

// Google OAuth
router.post('/google', authLimiter, googleAuth);

// 6-Digit Email Token Verification (Manual login / sign up)
router.post('/request-token', authLimiter, requestVerificationToken);
router.post('/verify-token', authLimiter, verifyTokenAndLogin);

// Account Registration Token Verification
router.post('/verify-email-token', authLimiter, verifyEmailToken);
router.post('/resend-verification', authLimiter, resendVerification);

// Forgot Password OTP Flow
router.post('/forgot-password-request', authLimiter, forgotPasswordRequest);
router.post('/forgot-password-verify', authLimiter, forgotPasswordVerify);

router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.post('/request-email-change', auth, authLimiter, requestEmailChange);
router.post('/verify-email-change', auth, authLimiter, verifyEmailChange);
router.post('/cancel-email-change', auth, cancelEmailChange);
router.post('/address', auth, addAddress);
router.put('/address/:id', auth, updateAddress);
router.delete('/address/:id', auth, deleteAddress);

module.exports = router;
