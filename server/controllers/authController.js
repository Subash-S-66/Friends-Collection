const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const {
  sendVerificationTokenEmail,
  sendForgotPasswordOtpEmail,
  sendAccountVerificationEmail,
  sendOldEmailChangeOtp,
  sendNewEmailChangeOtp
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
      }).select('+password');
    } else {
      user = await User.findOne({ email: loginIdentifier }).select('+password');
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

// @desc    Update / edit saved address
// @route   PUT /api/auth/address/:id
exports.updateAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const addr = user.savedAddresses.id(req.params.id);
    if (!addr) {
      return res.status(404).json({ message: 'Saved address not found' });
    }

    const { label, street, city, state, pincode, phone, secondaryPhone, isDefault } = req.body;

    if (label !== undefined) addr.label = label.trim() || 'Home';
    if (street !== undefined) addr.street = street.trim();
    if (city !== undefined) addr.city = city.trim();
    if (state !== undefined) addr.state = state.trim();
    if (pincode !== undefined) addr.pincode = pincode.trim();
    if (phone !== undefined) addr.phone = phone.trim();
    if (secondaryPhone !== undefined) addr.secondaryPhone = secondaryPhone.trim();

    if (isDefault) {
      user.savedAddresses.forEach((a) => {
        a.isDefault = a._id.toString() === req.params.id;
      });
    }

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
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const wasDefault = user.savedAddresses.some(
      (addr) => addr._id.toString() === req.params.id && addr.isDefault
    );

    user.savedAddresses = user.savedAddresses.filter(
      (addr) => addr._id.toString() !== req.params.id
    );

    // If the deleted address was the default and addresses still remain, make the first one default
    if (wasDefault && user.savedAddresses.length > 0) {
      user.savedAddresses[0].isDefault = true;
    }

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
    const { credential, accessToken, userInfo } = req.body;
    if (!credential && !accessToken && !userInfo) {
      return res.status(400).json({ message: 'Google credential token or user profile is required' });
    }

    let payload = null;

    if (credential) {
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
    } else if (accessToken) {
      // Attempt verification via Google OAuth2 userinfo
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
          payload = await response.json();
        }
      } catch (err) {
        console.warn('Google userinfo fetch failed:', err.message);
      }
    }

    if (!payload && userInfo && userInfo.email) {
      payload = userInfo;
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Google authentication failed or missing verified email' });
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

    console.log(`🔑 [AUTH OTP] 6-digit login token for ${cleanEmail}: ${token}`);

    // Dispatch branded email via Email Service (HTTP API or Nodemailer SMTP)
    try {
      await sendVerificationTokenEmail({
        to: cleanEmail,
        token,
        name: existingUser?.name || cleanEmail.split('@')[0]
      });
      res.json({
        success: true,
        message: `A 6-digit verification code has been sent to ${cleanEmail}`,
        isExistingUser: Boolean(existingUser)
      });
    } catch (mailError) {
      console.error('Mail dispatch error in requestVerificationToken:', mailError.message);
      // Even if SMTP times out (e.g. Render Free Tier port block), the token is valid in MongoDB for 10 mins!
      // Return success so the user can enter the 6-digit OTP code rather than being blocked with a 502 error.
      res.json({
        success: true,
        message: `A 6-digit verification code was generated for ${cleanEmail}. (Check server console or inbox).`,
        isExistingUser: Boolean(existingUser),
        mailWarning: true
      });
    }
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
      res.json({
        success: true,
        message: `A fresh 6-digit verification code has been sent to ${cleanEmail}`
      });
    } catch (mailError) {
      console.error('Mail dispatch error during resend:', mailError.message);
      res.json({
        success: true,
        message: `A fresh 6-digit verification code was generated for ${cleanEmail}. Check server console or inbox.`,
        mailWarning: true
      });
    }
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
      res.json({
        success: true,
        message: `A 6-digit password reset code has been sent to ${cleanEmail}`
      });
    } catch (mailError) {
      console.error('Mail dispatch error during forgot password:', mailError.message);
      res.json({
        success: true,
        message: `A 6-digit password reset code has been generated for ${cleanEmail}. Check server console or inbox.`,
        mailWarning: true
      });
    }
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

// @desc    Request email and/or phone change (initiates dual OTP verification for email changes)
// @route   POST /api/auth/request-email-change
// @access  Private
exports.requestEmailChange = async (req, res, next) => {
  try {
    const { newEmail, newPhone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
      return res.status(400).json({ message: 'Please provide a valid new email address.' });
    }

    const currentEmail = (user.email || '').toLowerCase().trim();
    const cleanNewEmail = newEmail.toLowerCase().trim();

    if (cleanNewEmail === currentEmail) {
      return res.status(400).json({
        message: 'The new email address cannot be identical to your current email address.'
      });
    }

    // Check if new email is already in use by another user
    const existingUser = await User.findOne({
      email: cleanNewEmail,
      _id: { $ne: user._id }
    });
    if (existingUser) {
      return res.status(400).json({
        message: 'This email address is already in use by another account.'
      });
    }

    // Format phone if provided
    let cleanPhone = user.phone || '';
    if (newPhone !== undefined && newPhone !== null && newPhone.toString().trim() !== '') {
      cleanPhone = newPhone.toString().trim().replace(/[^0-9]/g, '');
      if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ message: 'Please provide a valid 10-digit mobile number.' });
      }
    }

    // Generate two distinct 6-digit OTPs
    const oldEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    let newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    while (newEmailOtp === oldEmailOtp) {
      newEmailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any previous pending change-email tokens for this user
    await VerificationToken.deleteMany({
      type: 'change-email',
      'metadata.userId': user._id.toString()
    });

    // Store in VerificationToken
    await VerificationToken.create({
      email: currentEmail,
      token: oldEmailOtp,
      type: 'change-email',
      metadata: {
        userId: user._id.toString(),
        newEmail: cleanNewEmail,
        newPhone: cleanPhone,
        oldEmailOtp,
        newEmailOtp
      },
      expiresAt
    });

    console.log(`\n================ [DUAL OTP EMAIL CHANGE] ================`);
    console.log(`User: ${user.name} (${user._id})`);
    console.log(`Current Email: ${currentEmail} -> OTP: [${oldEmailOtp}]`);
    console.log(`New Email: ${cleanNewEmail} -> OTP: [${newEmailOtp}]`);
    console.log(`=========================================================\n`);

    // Concurrently dispatch both emails
    try {
      await Promise.all([
        sendOldEmailChangeOtp({
          to: currentEmail,
          token: oldEmailOtp,
          newEmail: cleanNewEmail,
          name: user.name
        }),
        sendNewEmailChangeOtp({
          to: cleanNewEmail,
          token: newEmailOtp,
          currentEmail: currentEmail,
          name: user.name
        })
      ]);
    } catch (mailError) {
      console.error('Mail dispatch error during email change request:', mailError.message);
      return res.status(502).json({
        error: 'MAIL_DELIVERY_FAILED',
        isMailError: true,
        isOtpError: true,
        email: cleanNewEmail,
        retryAfter: 30,
        message: `Could not send verification codes to ${currentEmail} and ${cleanNewEmail} due to a temporary dispatch server delay. Please try again in 30 seconds or connect with our team on WhatsApp.`
      });
    }

    res.json({
      success: true,
      message: `Verification codes have been dispatched to both ${currentEmail} and ${cleanNewEmail}.`,
      currentEmail,
      newEmail: cleanNewEmail,
      newPhone: cleanPhone
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify dual OTPs and commit email/phone changes
// @route   POST /api/auth/verify-email-change
// @access  Private
exports.verifyEmailChange = async (req, res, next) => {
  try {
    const { oldOtp, newOtp } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const record = await VerificationToken.findOne({
      type: 'change-email',
      'metadata.userId': user._id.toString(),
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!record) {
      return res.status(400).json({
        message: 'No pending email change request found or the verification codes have expired. Please start over.'
      });
    }

    const cleanOldOtp = (oldOtp || '').toString().trim();
    const cleanNewOtp = (newOtp || '').toString().trim();

    if (!cleanOldOtp || !cleanNewOtp) {
      return res.status(400).json({
        message: 'Both current email and new email verification codes are required.'
      });
    }

    const isOldCorrect = record.metadata?.oldEmailOtp === cleanOldOtp || record.token === cleanOldOtp;
    const isNewCorrect = record.metadata?.newEmailOtp === cleanNewOtp;

    if (!isOldCorrect || !isNewCorrect) {
      let failMessage = 'Verification failed: ';
      if (!isOldCorrect && !isNewCorrect) {
        failMessage += 'Both OTP codes are incorrect.';
      } else if (!isOldCorrect) {
        failMessage += 'The OTP code sent to your current email is incorrect.';
      } else {
        failMessage += 'The OTP code sent to your new email is incorrect.';
      }
      return res.status(400).json({ message: failMessage });
    }

    // Double check conflict before committing
    const targetEmail = record.metadata.newEmail;
    const collision = await User.findOne({
      email: targetEmail,
      _id: { $ne: user._id }
    });
    if (collision) {
      return res.status(400).json({
        message: 'This email address is already in use by another account.'
      });
    }

    // Both OTPs are valid! Mark token used
    record.used = true;
    await record.save();

    // Commit changes to User
    user.email = targetEmail;
    if (record.metadata?.newPhone !== undefined && record.metadata?.newPhone !== null) {
      user.phone = record.metadata.newPhone;
    }
    await user.save();

    // Clean up any remaining change-email tokens for this user
    await VerificationToken.deleteMany({
      type: 'change-email',
      'metadata.userId': user._id.toString()
    });

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Email address and contact details updated successfully!',
      user,
      token: jwtToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a pending email change and purge tokens
// @route   POST /api/auth/cancel-email-change
// @access  Private
exports.cancelEmailChange = async (req, res, next) => {
  try {
    await VerificationToken.deleteMany({
      type: 'change-email',
      'metadata.userId': req.user._id.toString()
    });
    res.json({ success: true, message: 'Email change request cancelled. No changes were made.' });
  } catch (error) {
    next(error);
  }
};


