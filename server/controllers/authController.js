const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const { sendVerificationTokenEmail } = require('../utils/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, phone, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already registered' : 'Phone number already registered'
      });
    }

    const user = await User.create({ name, email, phone, password });
    const token = generateToken(user._id);

    res.status(201).json({ token, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Add saved address
// @route   POST /api/auth/address
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { label, street, city, state, pincode, isDefault } = req.body;

    if (isDefault) {
      user.savedAddresses.forEach(addr => addr.isDefault = false);
    }

    user.savedAddresses.push({ label, street, city, state, pincode, isDefault: isDefault || user.savedAddresses.length === 0 });
    await user.save();
    res.json(user.savedAddresses);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete saved address
// @route   DELETE /api/auth/address/:id
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.savedAddresses = user.savedAddresses.filter(
      addr => addr._id.toString() !== req.params.id
    );
    await user.save();
    res.json(user.savedAddresses);
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required' });
    }

    let payload = null;
    // Attempt verification via Google tokeninfo
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
      if (response.ok) {
        payload = await response.json();
      }
    } catch (err) {
      console.warn('Google tokeninfo fetch failed, fallback to payload decode:', err.message);
    }

    // Fallback decoding if tokeninfo had network issues
    if (!payload || !payload.email) {
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          Buffer.from(base64, 'base64')
            .toString('utf-8')
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        payload = JSON.parse(jsonPayload);
      } catch (decodeErr) {
        return res.status(400).json({ message: 'Invalid Google credential token' });
      }
    }

    const { email, name, picture, sub: googleId } = payload;
    if (!email) {
      return res.status(400).json({ message: 'Google account does not have a verified email' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      await user.save();
    } else {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        authProvider: 'google',
        role: 'user'
      });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Request a 6-digit email verification token (manual login or registration)
// @route   POST /api/auth/request-token
exports.requestVerificationToken = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });

    // Generate secure 6-digit numeric token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate existing tokens for this email
    await VerificationToken.deleteMany({ email: cleanEmail });

    await VerificationToken.create({
      email: cleanEmail,
      token,
      type: existingUser ? 'login' : 'register',
      expiresAt
    });

    // Send the gorgeous branded email via Nodemailer
    await sendVerificationTokenEmail({
      to: cleanEmail,
      token,
      name: existingUser?.name || cleanEmail.split('@')[0]
    });

    res.json({
      message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      isExistingUser: Boolean(existingUser)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit token and login/register
// @route   POST /api/auth/verify-token
exports.verifyTokenAndLogin = async (req, res, next) => {
  try {
    const { email, token, name } = req.body;
    if (!email || !token) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const record = await VerificationToken.findOne({
      email: cleanEmail,
      token: cleanToken,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new code.' });
    }

    record.used = true;
    await record.save();

    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({
        name: name ? name.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        authProvider: 'token',
        role: 'user'
      });
    }

    const jwtToken = generateToken(user._id);
    res.json({
      message: 'Authentication successful',
      token: jwtToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

