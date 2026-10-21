const Inquiry = require('../models/Inquiry');
const {
  sendContactInquiryToBusinessEmail,
  sendContactInquiryConfirmationToUserEmail
} = require('../utils/emailService');

// @desc    Submit contact / styling / product inquiry request
// @route   POST /api/contact
// @access  Public
exports.submitInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your name.' });
    }

    if (!email || !/\S+@\S+\.\S+/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address so we can confirm your request.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your message or inquiry details.' });
    }

    // Save inquiry to database if connected
    let savedInquiry = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        savedInquiry = await Inquiry.create({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: (phone || '').trim(),
          subject: (subject || 'General Inquiry').trim(),
          message: message.trim(),
          metadata: {
            ip: req.ip || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent']
          }
        });
      } catch (dbErr) {
        console.warn('⚠️ [Contact Controller] Could not persist inquiry to MongoDB:', dbErr.message);
      }
    }

    const inquiryData = {
      inquiryId: savedInquiry?.inquiryId || `INQ-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      subject: (subject || 'General Inquiry').trim(),
      message: message.trim(),
      createdAt: savedInquiry?.createdAt || new Date()
    };

    // 1. Send notification email to boutique business email
    const businessResult = await sendContactInquiryToBusinessEmail({ inquiry: inquiryData });

    // 2. Send receipt acknowledgment email to sender
    const userResult = await sendContactInquiryConfirmationToUserEmail({ inquiry: inquiryData });

    return res.status(200).json({
      success: true,
      message: 'Thank you! Your request has been safely received. A confirmation email has been dispatched to your inbox and our store team.',
      inquiry: inquiryData,
      previews: {
        userEmail: {
          to: userResult?.to || inquiryData.email,
          subject: userResult?.subject || `✨ We've Received Your Request #${inquiryData.inquiryId} - Friends Collections`,
          html: userResult?.html || '',
          previewUrl: userResult?.previewUrl || null,
          messageId: userResult?.messageId
        },
        businessEmail: {
          to: businessResult?.to || process.env.BUSINESS_EMAIL || 'friends.collection06@gmail.com',
          subject: businessResult?.subject || `📩 [New Request #${inquiryData.inquiryId}] ${inquiryData.subject} from ${inquiryData.name}`,
          html: businessResult?.html || '',
          previewUrl: businessResult?.previewUrl || null,
          messageId: businessResult?.messageId
        }
      }
    });
  } catch (error) {
    console.error('❌ [Contact Controller Error]:', error);
    next(error);
  }
};

// @desc    Get all inquiries (Admin only)
// @route   GET /api/contact
// @access  Private/Admin
exports.getInquiries = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status) query.status = req.query.status;

    const [inquiries, total] = await Promise.all([
      Inquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Inquiry.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: inquiries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};
