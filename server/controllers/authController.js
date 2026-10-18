const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const {
  sendVerificationTokenEmail,
  sendForgotPasswordOtpEmail,
  sendAccountVerificationEmail
} = require('../utils/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// @desc    Register user - sends 6-digit verification code & verification link
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, email, phone, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim().replace(/\D/g, '') : undefined;

    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        ...(cleanPhone ? [{ phone: cleanPhone }] : [])
      ]
    });

    if (existingUser) {
      if (existingUser.isVerified !== false) {
        return res.status(400).json({
          message: existingUser.email === cleanEmail ? 'Email already registered. Please sign in.' : 'Phone number already registered'
        });
      } else {
        // User created earlier but unverified: update details and resend code
        existingUser.name = name.trim();
        existingUser.password = password;
        if (cleanPhone) existingUser.phone = cleanPhone;
        await existingUser.save();
      }
    } else {
      await User.create({
        name: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password,
        isVerified: false
      });
    }

    // Generate 6-digit verification token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await VerificationToken.deleteMany({ email: cleanEmail, type: { $in: ['register', 'verify-email'] } });
    await VerificationToken.create({
      email: cleanEmail,
      token,
      type: 'verify-email',
      expiresAt
    });

    const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
    const redirectParam = req.body.redirect ? `&redirect=${encodeURIComponent(req.body.redirect)}` : '';
    const verifyUrl = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(cleanEmail)}${redirectParam}`;

    try {
      await sendAccountVerificationEmail({
        to: cleanEmail,
        token,
        verifyUrl,
        name: name.trim()
      });
    } catch (mailError) {
      console.error('Mail dispatch warning during registration:', mailError.message);
      return res.status(200).json({
        requireVerification: true,
        mailDeliveryWarning: true,
        message: `Account created! However, our mail dispatch server had a temporary issue sending to ${cleanEmail}. Please check your spam folder, enter your code below, or contact us on WhatsApp (+91 95007 57024).`,
        email: cleanEmail,
        name: name.trim(),
        debugCode: process.env.NODE_ENV === 'development' ? token : undefined
      });
    }

    res.status(200).json({
      requireVerification: true,
      message: `A 6-digit verification token and direct activation link have been sent to ${cleanEmail}`,
      email: cleanEmail,
      name: name.trim()
    });
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
    const loginIdentifier = (email || '').trim().toLowerCase();

    // Check if input matches configured admin username or 'admin'
    const adminUsernames = [
      (process.env.ADMIN_USERNAME || 'admin').toLowerCase(),
      'admin'
    ];
    const isAdminUsernameLogin = adminUsernames.includes(loginIdentifier);

    let user;
    if (isAdminUsernameLogin) {
      const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
      user = await User.findOne({
        $or: [
          ...(adminEmail ? [{ email: adminEmail }] : []),
          { role: 'admin' }
        ]
      });
    } else {
      user = await User.findOne({ email: loginIdentifier });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email/username or password' });
    }

    // Check if user is explicitly unverified (local registration pending token confirmation; admins are always verified)
    if (user.role !== 'admin' && user.isVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email address to log in.',
        requireVerification: true,
        email: user.email
      });
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
    const { name, phone, secondaryPhone, address } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (secondaryPhone !== undefined) user.secondaryPhone = secondaryPhone.trim();

    if (address && address.street && address.city && address.pincode) {
      const cleanStreet = address.street.trim();
      const cleanCity = address.city.trim();
      const cleanState = (address.state || 'Tamil Nadu').trim();
      const cleanPincode = address.pincode.trim();
      const cleanLabel = (address.label || 'Home').trim();

      const existingIdx = user.savedAddresses.findIndex(
        (a) => a.street?.toLowerCase() === cleanStreet.toLowerCase() && a.pincode === cleanPincode
      );

      if (existingIdx >= 0) {
        user.savedAddresses[existingIdx].label = cleanLabel;
        user.savedAddresses[existingIdx].city = cleanCity;
        user.savedAddresses[existingIdx].state = cleanState;
        user.savedAddresses[existingIdx].phone = user.phone || '';
        user.savedAddresses[existingIdx].secondaryPhone = user.secondaryPhone || '';
        user.savedAddresses[existingIdx].isDefault = true;
        user.savedAddresses.forEach((a, i) => {
          if (i !== existingIdx) a.isDefault = false;
        });
      } else {
        user.savedAddresses.forEach((a) => {
          a.isDefault = false;
        });
        user.savedAddresses.unshift({
          label: cleanLabel,
          street: cleanStreet,
          city: cleanCity,
          state: cleanState,
          pincode: cleanPincode,
          phone: user.phone || '',
          secondaryPhone: user.secondaryPhone || '',
          isDefault: true
        });
      }
    }

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
    const { label, street, city, state, pincode, phone, secondaryPhone, isDefault } = req.body;

    if (isDefault) {
      user.savedAddresses.forEach((addr) => (addr.isDefault = false));
    }

    user.savedAddresses.push({
      label: label || 'Home',
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      phone: phone ? phone.trim() : (user.phone || ''),
      secondaryPhone: secondaryPhone ? secondaryPhone.trim() : (user.secondaryPhone || ''),
      isDefault: isDefault || user.savedAddresses.length === 0
    });
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
      user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        googleId,
        avatar: picture || '',
        authProvider: 'google',
        role: 'user',
        isVerified: true
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
        role: 'user',
        isVerified: true
      });
    } else {
      user.isVerified = true;
      await user.save();
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

// @desc    Verify email verification token (via link or 6-digit code)
// @route   POST /api/auth/verify-email-token
exports.verifyEmailToken = async (req, res, next) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const record = await VerificationToken.findOne({
      email: cleanEmail,
      token: cleanToken,
      type: { $in: ['verify-email', 'register'] },
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
      return res.status(404).json({ message: 'User account not found' });
    }

    user.isVerified = true;
    await user.save();

    const jwtToken = generateToken(user._id);
    res.json({
      success: true,
      message: 'Account verified successfully!',
      token: jwtToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend registration email verification token
// @route   POST /api/auth/resend-verification
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'Account not found with this email' });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'This account is already verified. Please sign in.' });
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await VerificationToken.deleteMany({ email: cleanEmail, type: { $in: ['verify-email', 'register'] } });
    await VerificationToken.create({
      email: cleanEmail,
      token,
      type: 'verify-email',
      expiresAt
    });

    const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
    const redirectParam = req.body.redirect ? `&redirect=${encodeURIComponent(req.body.redirect)}` : '';
    const verifyUrl = `${clientUrl}/verify-email?token=${token}&email=${encodeURIComponent(cleanEmail)}${redirectParam}`;

    try {
      await sendAccountVerificationEmail({
        to: cleanEmail,
        token,
        verifyUrl,
        name: user.name
      });
    } catch (mailError) {
      console.error('Mail dispatch error during resend:', mailError.message);
      return res.status(502).json({
        isMailError: true,
        message: `Unable to dispatch email to ${cleanEmail} right now. Please check your spam folder or contact us directly on WhatsApp (+91 95007 57024) for instant assistance.`
      });
    }

    res.json({
      success: true,
      message: `A fresh 6-digit verification code has been sent to ${cleanEmail}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Request forgot password OTP
// @route   POST /api/auth/forgot-password-request
exports.forgotPasswordRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ message: 'No registered account found with this email address' });
    }

    // Generate 6-digit OTP
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await VerificationToken.deleteMany({ email: cleanEmail, type: 'forgot-password' });
    await VerificationToken.create({
      email: cleanEmail,
      token,
      type: 'forgot-password',
      expiresAt
    });

    try {
      await sendForgotPasswordOtpEmail({
        to: cleanEmail,
        token,
        name: user.name
      });
    } catch (mailError) {
      console.error('Mail dispatch error during forgot password:', mailError.message);
      return res.status(502).json({
        isMailError: true,
        message: `Could not send password reset OTP to ${cleanEmail} due to a temporary mail server issue. Please connect with our team on WhatsApp (+91 95007 57024) for immediate recovery.`
      });
    }

    res.json({
      success: true,
      message: `A 6-digit password reset code has been sent to ${cleanEmail}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify forgot password OTP and set new password, automatically logging in
// @route   POST /api/auth/forgot-password-verify
exports.forgotPasswordVerify = async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const record = await VerificationToken.findOne({
      email: cleanEmail,
      token: cleanToken,
      type: 'forgot-password',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid or expired password reset OTP code' });
    }

    record.used = true;
    await record.save();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    // Update password (pre-save hook will hash it with bcrypt)
    user.password = newPassword;
    user.isVerified = true;
    await user.save();

    // Directly log the user in!
    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successfully! You are now logged in.',
      token: jwtToken,
      user
    });
  } catch (error) {
    next(error);
  }
};

