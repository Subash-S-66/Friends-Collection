const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

let transporter = null;

// HTTP-based Email Sender via Brevo REST API (HTTPS Port 443 - 100% reliable on Render Free Tier)
const sendViaBrevo = async ({ from, to, subject, html, text, attachments }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SMTP_USER || process.env.ADMIN_EMAIL || 'friends.collection06@gmail.com';
  const senderName = process.env.BUSINESS_NAME || 'Friends Collections';

  const toList = Array.isArray(to)
    ? to.map((e) => (typeof e === 'string' ? { email: e } : e))
    : [{ email: to }];

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: toList,
    subject,
    htmlContent: html,
    ...(text ? { textContent: text } : {})
  };

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments
      .map((att) => {
        let contentBase64 = '';
        if (att.content) {
          contentBase64 = Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64');
        } else if (att.path && fs.existsSync(att.path)) {
          contentBase64 = fs.readFileSync(att.path).toString('base64');
        }
        return {
          name: att.filename || 'attachment',
          content: contentBase64
        };
      })
      .filter((a) => a.content);
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo HTTP API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  console.log('✅ [Email Service] Successfully sent via Brevo HTTP API:', data.messageId);
  return { messageId: data.messageId || 'brevo-' + Date.now() };
};

// HTTP-based Email Sender via Resend REST API (HTTPS Port 443 - 100% reliable on Render Free Tier)
const sendViaResend = async ({ from, to, subject, html, text, attachments }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'Friends Collections <onboarding@resend.dev>';
  const toList = Array.isArray(to) ? to : [to];

  const payload = {
    from: fromAddress,
    to: toList,
    subject,
    html,
    ...(text ? { text } : {})
  };

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments
      .map((att) => {
        let contentBase64 = '';
        if (att.content) {
          contentBase64 = Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : Buffer.from(att.content).toString('base64');
        } else if (att.path && fs.existsSync(att.path)) {
          contentBase64 = fs.readFileSync(att.path).toString('base64');
        }
        return {
          filename: att.filename || 'attachment',
          content: contentBase64
        };
      })
      .filter((a) => a.content);
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend HTTP API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  console.log('✅ [Email Service] Successfully sent via Resend HTTP API:', data.id);
  return { messageId: data.id || 'resend-' + Date.now() };
};

// Initialize or get the transporter
const getTransporter = async () => {
  if (transporter) return transporter;

  // 1. Check HTTP-based APIs first (Port 443 - Immune to cloud PaaS SMTP blocking)
  if (process.env.BREVO_API_KEY) {
    console.log('🚀 [Email Service] Initialized Brevo HTTP API (Port 443)');
    transporter = { sendMail: sendViaBrevo };
    return transporter;
  }

  if (process.env.RESEND_API_KEY) {
    console.log('🚀 [Email Service] Initialized Resend HTTP API (Port 443)');
    transporter = { sendMail: sendViaResend };
    return transporter;
  }

  // 2. Standard SMTP (Localhost or VPS/Cloud with outbound port 465/587 open)
  const smtpUser = process.env.SMTP_USER || process.env.ADMIN_EMAIL || 'friends.collection06@gmail.com';
  const smtpPass = process.env.SMTP_PASS;

  if (smtpPass) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      connectionTimeout: 6000, // 6s connection timeout to fail fast if blocked
      greetingTimeout: 5000,
      socketTimeout: 8000
    });
  } else {
    // Development / fallback: Create Ethereal test account or console logger
    console.log('ℹ️ [Nodemailer] SMTP_PASS not configured. Creating test transporter...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('✅ [Nodemailer] Test Ethereal transporter initialized:', testAccount.user);
    } catch {
      // Fallback stub
      transporter = {
        sendMail: async (options) => {
          console.log('\n================== [EMAIL STUB] ==================');
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`Preview: ${options.text || 'HTML Email Sent'}`);
          console.log('==================================================\n');
          return { messageId: 'stub-' + Date.now() };
        }
      };
    }
  }

  return transporter;
};

// Find logo file path
const getLogoAttachment = () => {
  const possiblePaths = [
    path.join(__dirname, '../assets/logo.png'),
    path.join(__dirname, '../../client/public/logo.png')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return [{
        filename: 'logo.png',
        path: p,
        cid: 'friends_logo'
      }];
    }
  }
  return [];
};

// Royal HTML Email Base Template
const wrapInFriendsTheme = ({ title, preheader, contentHtml }) => {
  const currentYear = new Date().getFullYear();
  const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F5F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #2D2522;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F8F5F0;
      padding: 30px 10px;
    }
    .main-card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(74, 14, 23, 0.08);
      border: 1px solid #EEDCD0;
    }
    .header-banner {
      background: linear-gradient(135deg, #4A0E17 0%, #30080E 100%);
      padding: 36px 24px 28px;
      text-align: center;
      position: relative;
    }
    .logo-container {
      width: 82px;
      height: 82px;
      margin: 0 auto;
      border-radius: 50%;
      border: 3px solid #D4AF37;
      background-color: #FFFFFF;
      padding: 3px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
      display: inline-block;
      box-sizing: border-box;
    }
    .logo-img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: contain;
      display: block;
    }
    .brand-title {
      font-family: Georgia, 'Playfair Display', serif;
      font-size: 24px;
      color: #FFFFFF;
      margin: 14px 0 2px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .brand-tagline {
      color: #E2BFB3;
      font-size: 11px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      margin: 0;
      font-weight: 500;
    }
    .ornament {
      color: #D4AF37;
      font-size: 12px;
      letter-spacing: 6px;
      margin-top: 8px;
    }
    .content-body {
      padding: 36px 32px 32px;
      text-align: left;
    }
    .content-title {
      font-family: Georgia, 'Playfair Display', serif;
      font-size: 22px;
      color: #3B0A11;
      margin: 0 0 14px;
      font-weight: 700;
      text-align: center;
    }
    .content-text {
      font-size: 14px;
      line-height: 1.65;
      color: #4A4543;
      margin: 0 0 20px;
    }
    .token-box {
      background: linear-gradient(180deg, #FDF9F5 0%, #F5EDE4 100%);
      border: 2px dashed #C88A65;
      border-radius: 18px;
      padding: 22px;
      text-align: center;
      margin: 24px 0;
    }
    .token-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #8C5338;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .token-digits {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      letter-spacing: 10px;
      color: #4A0E17;
      font-weight: 900;
      margin: 0;
      padding-left: 10px;
    }
    .token-expires {
      font-size: 11px;
      color: #947E73;
      margin-top: 8px;
    }
    .product-box {
      background: #FAF7F2;
      border: 1px solid #EEDCD0;
      border-radius: 16px;
      padding: 16px;
      margin: 20px 0;
      display: table;
      width: 100%;
      box-sizing: border-box;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #4A0E17 0%, #681824 100%);
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 34px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 9999px;
      box-shadow: 0 6px 16px rgba(74, 14, 23, 0.25);
      border: 1px solid #D4AF37;
      margin: 10px 0;
    }
    .footer {
      background-color: #FAF6F0;
      border-top: 1px solid #EEDCD0;
      padding: 24px 30px;
      text-align: center;
      font-size: 11px;
      color: #8C827A;
      line-height: 1.6;
    }
    .footer a {
      color: #4A0E17;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || 'Friends Collections - Luxury Ethnic & Contemporary Wear'}
  </div>
  <table class="wrapper" role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <div class="main-card">
          <!-- Royal Header -->
          <div class="header-banner">
            <div class="logo-container">
              <img src="cid:friends_logo" alt="Friends Collections" class="logo-img" />
            </div>
            <h1 class="brand-title">Friends Collections</h1>
            <p class="brand-tagline">Style That Defines You</p>
            <div class="ornament">✦ ✦ ✦</div>
          </div>

          <!-- Main Content -->
          <div class="content-body">
            ${contentHtml}
          </div>

          <!-- Royal Boutique Footer -->
          <div class="footer">
            <p style="margin: 0 0 6px; font-weight: 600; color: #4A0E17;">
              Friends Collections • Jamalia Store
            </p>
            <p style="margin: 0 0 8px;">
              7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 600012
            </p>
            <p style="margin: 0 0 12px;">
              WhatsApp Helpline: <a href="https://wa.me/919500757024">+91 95007 57024</a> • Email: <a href="mailto:friends.collection06@gmail.com">friends.collection06@gmail.com</a>
            </p>
            <div style="border-top: 1px solid #E5D5C8; padding-top: 10px; font-size: 10px; color: #A89C94;">
              © ${currentYear} Friends Collections. All rights reserved.<br>
              <a href="${clientUrl}" target="_blank">Visit Boutique Online</a>
            </div>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// 1. Send Verification Token / OTP Email
exports.sendVerificationTokenEmail = async ({ to, token, name }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';

    const contentHtml = `
      <h2 class="content-title">Your Verification Token</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        Please use the 6-digit verification code below to securely authenticate your Friends Collections account.
      </p>

      <div class="token-box">
        <div class="token-label">Verification Code</div>
        <div class="token-digits">${token}</div>
        <div class="token-expires">Valid for the next 10 minutes</div>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center;">
        If you did not request this token, please ignore this email or reach out to our team at 
        <a href="mailto:friends.collection06@gmail.com" style="color: #4A0E17;">friends.collection06@gmail.com</a>.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `${token} is your Friends Collections verification code`,
      preheader: `Your 6-digit authentication token is ${token}. Valid for 10 minutes.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `🔑 ${token} is your Friends Collections Verification Code`,
      html,
      attachments: getLogoAttachment()
    });

    if (info?.messageId && info.messageId.startsWith('stub-') === false && nodemailer.getTestMessageUrl) {
      console.log('📬 [Email Sent] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendVerificationTokenEmail:', error);
    throw error;
  }
};

// 1b. Send Forgot Password OTP Email
exports.sendForgotPasswordOtpEmail = async ({ to, token, name }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';

    const contentHtml = `
      <h2 class="content-title">Password Reset Code</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        We received a request to reset the password for your Friends Collections account. Use the 6-digit OTP code below to verify your identity and set a new password.
      </p>

      <div class="token-box">
        <div class="token-label">Password Reset OTP</div>
        <div class="token-digits">${token}</div>
        <div class="token-expires">Valid for the next 10 minutes</div>
      </div>

      <p class="content-text" style="font-size: 13px; color: #7A726E; text-align: center;">
        Once verified, your new password will be activated and you will be securely logged into your boutique account.
      </p>

      <p class="content-text" style="font-size: 12px; color: #9E9590; text-align: center; border-top: 1px solid #EEDCD0; padding-top: 14px; margin-top: 20px;">
        If you did not request this password reset, please disregard this email or notify us immediately at 
        <a href="mailto:friends.collection06@gmail.com" style="color: #4A0E17; font-weight: 600;">friends.collection06@gmail.com</a>.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `${token} is your Friends Collections password reset code`,
      preheader: `Your 6-digit password reset OTP is ${token}. Valid for 10 minutes.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `🔑 ${token} is your Friends Collections Password Reset Code`,
      html,
      attachments: getLogoAttachment()
    });

    if (info?.messageId && !info.messageId.startsWith('stub-') && nodemailer.getTestMessageUrl) {
      console.log('📬 [Password Reset OTP Sent] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendForgotPasswordOtpEmail:', error);
    throw error;
  }
};

// 1c. Send Account Registration Verification Email (Token + Link)
exports.sendAccountVerificationEmail = async ({ to, token, verifyUrl, name }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Welcome,';

    const contentHtml = `
      <h2 class="content-title">Verify Your Friends Collections Account ✨</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        Thank you for joining Friends Collections! To secure your account and start exploring our royal silk sarees, designer kurtis, and festive collections, please verify your email address.
      </p>

      <div class="token-box">
        <div class="token-label">Your 6-Digit Verification Code</div>
        <div class="token-digits">${token}</div>
        <div class="token-expires">Valid for the next 10 minutes</div>
      </div>

      <div style="text-align: center; margin: 26px 0 16px;">
        <a href="${verifyUrl}" class="cta-btn" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4A0E17 0%, #681824 100%); color: #FFFFFF !important; text-decoration: none; padding: 15px 36px; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 9999px; box-shadow: 0 8px 20px rgba(74, 14, 23, 0.3); border: 1px solid #D4AF37;">
          ✦ Verify Account & Enter Boutique ✦
        </a>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 20px;">
        You can tap the button above to verify instantly, or enter the 6-digit code on the registration page.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `Verify your Friends Collections account (${token})`,
      preheader: `Welcome to Friends Collections! Verify your email using code ${token} or tap the link.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `✨ Verify your Friends Collections Account (${token})`,
      html,
      attachments: getLogoAttachment()
    });

    if (info?.messageId && !info.messageId.startsWith('stub-') && nodemailer.getTestMessageUrl) {
      console.log('📬 [Account Verification Sent] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendAccountVerificationEmail:', error);
    throw error;
  }
};

// 1d. Send OTP to Old / Current Email to Authorize Change
exports.sendOldEmailChangeOtp = async ({ to, token, newEmail, name }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';

    const contentHtml = `
      <h2 class="content-title">Authorize Email Address Change 🔒</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        We received a request to change the email address of your Friends Collections account.
      </p>

      <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 12px 18px; margin: 16px auto; max-width: 440px; text-align: center;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9A3412; font-weight: 700; display: block; margin-bottom: 2px;">Requested New Email</span>
        <strong style="color: #431407; font-size: 15px; font-family: monospace;">${newEmail}</strong>
      </div>

      <p class="content-text" style="text-align: center;">
        To authorize this change, please enter your <strong>Current Email Security OTP</strong>:
      </p>

      <div class="token-box">
        <div class="token-label">Current Email Authorization OTP</div>
        <div class="token-digits">${token}</div>
        <div class="token-expires">Valid for the next 10 minutes</div>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 18px;">
        ⚠️ <strong>Security Rule:</strong> For your protection, your email will not be updated until <em>both</em> this code and the code sent to your new email are correctly entered.
      </p>

      <p class="content-text" style="font-size: 11px; color: #9E9590; text-align: center; border-top: 1px solid #EEDCD0; padding-top: 14px; margin-top: 16px;">
        If you did not make this request, please disregard this email or report immediately to 
        <a href="mailto:friends.collection06@gmail.com" style="color: #4A0E17; font-weight: 600;">friends.collection06@gmail.com</a>.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `${token} - Authorize Email Change on Friends Collections`,
      preheader: `Security Code ${token} to authorize changing your Friends Collections account email.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `🔒 ${token} is your Security Code to Authorize Email Change`,
      html,
      attachments: getLogoAttachment()
    });

    if (info?.messageId && !info.messageId.startsWith('stub-') && nodemailer.getTestMessageUrl) {
      console.log('📬 [Old Email OTP Sent] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendOldEmailChangeOtp:', error);
    throw error;
  }
};

// 1e. Send OTP to New Email to Confirm Ownership
exports.sendNewEmailChangeOtp = async ({ to, token, currentEmail, name }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';

    const contentHtml = `
      <h2 class="content-title">Confirm Your New Email Address ✨</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        You have requested to set this address as the primary email for your Friends Collections account.
      </p>

      <p class="content-text" style="text-align: center;">
        Please enter the confirmation OTP below to verify that you own this new inbox:
      </p>

      <div class="token-box">
        <div class="token-label">New Email Confirmation OTP</div>
        <div class="token-digits">${token}</div>
        <div class="token-expires">Valid for the next 10 minutes</div>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 18px;">
        Both this code and the security code sent to your existing email must be entered together on the verification screen to complete this update.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `${token} - Confirm New Email on Friends Collections`,
      preheader: `Confirmation Code ${token} for your new Friends Collections account email.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `✨ ${token} is your Code to Confirm New Email Address`,
      html,
      attachments: getLogoAttachment()
    });

    if (info?.messageId && !info.messageId.startsWith('stub-') && nodemailer.getTestMessageUrl) {
      console.log('📬 [New Email OTP Sent] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendNewEmailChangeOtp:', error);
    throw error;
  }
};

// 1f. Send OTP for Invoice Authorized Signature Change
exports.sendSignatureChangeOtpEmail = async ({ to, token, name }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Admin,';

    const contentHtml = `
      <h2 class="content-title" style="color: #4A0E17;">🔒 Signature Change Authorization</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        A security request was initiated in the Administrator Console to <strong>update or change the legal Authorized Signature</strong> for official Tax Invoices & Bills of Supply.
      </p>

      <div class="token-box" style="border: 2px dashed #C88A65; background: #FFFDF9;">
        <div class="token-label" style="color: #4A0E17; font-weight: 700; letter-spacing: 1px;">SIGNATURE AUTHORIZATION CODE</div>
        <div class="token-digits" style="color: #4A0E17; font-size: 34px; letter-spacing: 8px;">${token}</div>
        <div class="token-expires" style="color: #8C827A;">Valid for the next 10 minutes</div>
      </div>

      <p class="content-text" style="font-size: 13px; color: #5C5552; text-align: center; margin-top: 16px;">
        Enter this 6-digit code in the dynamic confirmation popup to verify your identity and commit the new signature image.
      </p>

      <div style="background-color: #FFF4E5; border-left: 4px solid #E07A22; padding: 12px 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; color: #7B3E03; line-height: 1.5;">
          <strong>⚠️ Critical Security Notice:</strong> Authorized signatures appear on all legally binding customer receipts and GST invoices. If you did NOT initiate this change, immediately disregard this email and change your administrator password.
        </p>
      </div>

      <p class="content-text" style="font-size: 12px; color: #9E9590; text-align: center; border-top: 1px solid #EEDCD0; padding-top: 14px; margin-top: 20px;">
        Friends Collections Administration Security Desk • Chennai, Tamil Nadu
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `${token} is your Invoice Signature Authorization Code`,
      preheader: `Your 6-digit signature authorization code is ${token}. Valid for 10 minutes.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections Security" <friends.collection06@gmail.com>',
      to,
      subject: `🔒 ${token} is your Invoice Signature Authorization Code`,
      html,
      attachments: getLogoAttachment()
    });

    if (info?.messageId && !info.messageId.startsWith('stub-') && nodemailer.getTestMessageUrl) {
      console.log('📬 [Signature Change OTP Sent] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendSignatureChangeOtpEmail:', error);
    throw error;
  }
};

// 2. Send Back In Stock Subscription Confirmation
exports.sendBackInStockSubscriptionEmail = async ({ to, name, phone, product, variant }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';
    const variantDesc = variant && (variant.color || variant.size)
      ? [variant.color, variant.size].filter(Boolean).join(' • ')
      : '';
    const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
    const productUrl = `${clientUrl}/product/${product.slug || product._id}`;

    let productImageUrl = 'https://friends-collection.vercel.app/fallback-product-1.png';
    if (product.images && product.images.length > 0) {
      const raw = product.images[0];
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        productImageUrl = raw;
      } else {
        productImageUrl = `${clientUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
      }
    }

    const priceText = product.salePrice
      ? `<span style="font-size: 18px; font-weight: 800; color: #5B1130;">₹${product.salePrice}</span>
         <span style="font-size: 13px; text-decoration: line-through; color: #8C827A; margin-left: 6px;">₹${product.price}</span>`
      : `<span style="font-size: 18px; font-weight: 800; color: #5B1130;">₹${product.price}</span>`;

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="background: linear-gradient(135deg, #FFF3CD 0%, #FFEBAA 100%); color: #856404; padding: 6px 16px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; border: 1px solid #FFE082; display: inline-block;">
          ✦ WAITLIST REGISTERED ✦
        </span>
      </div>
      <h2 class="content-title" style="font-family: Georgia, serif; font-size: 22px; color: #3B0A11; text-align: center; margin-bottom: 10px;">
        You're on the Waitlist! 🔔
      </h2>
      <p class="content-text" style="text-align: center; margin-bottom: 20px;">
        ${greeting}<br>
        Thank you for your interest! We have registered your restock alert for this exclusive design. As soon as our master weavers and boutique restock it, you will receive an instant email notification!
      </p>

      <!-- Product Preview Card -->
      <div style="background: #FAF7F2; border: 1px solid #EEDCD0; border-radius: 20px; padding: 20px; margin: 20px 0; box-shadow: 0 4px 16px rgba(74, 14, 23, 0.05); text-align: center;">
        <a href="${productUrl}" target="_blank" style="display: block; text-decoration: none;">
          <img
            src="${productImageUrl}"
            alt="${product.title}"
            style="width: 200px; max-width: 100%; height: 250px; object-fit: cover; object-position: top; border-radius: 14px; border: 2px solid #D4AF37; box-shadow: 0 6px 18px rgba(74, 14, 23, 0.15); margin: 0 auto 14px; display: block;"
          />
        </a>

        <h3 style="margin: 0 0 6px; font-family: Georgia, serif; font-size: 18px; color: #3B0A11; font-weight: 700;">
          <a href="${productUrl}" target="_blank" style="color: #3B0A11; text-decoration: none;">${product.title}</a>
        </h3>

        ${variantDesc ? `
          <div style="margin: 0 0 8px;">
            <span style="background: #FFF3CD; color: #856404; padding: 3px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #FFE082;">
              Combination: ${variantDesc}
            </span>
          </div>
        ` : ''}

        <div style="margin: 8px 0 16px;">
          ${priceText}
        </div>

        <div>
          <a href="${productUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #5B1130 0%, #762243 100%); color: #FFFFFF !important; font-family: -apple-system, sans-serif; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; padding: 13px 32px; border-radius: 9999px; text-decoration: none; border: 1px solid #D4AF37; box-shadow: 0 6px 18px rgba(91, 17, 48, 0.3);">
            View Product in Boutique →
          </a>
        </div>
      </div>

      <!-- Boutique Contact & Phone Details -->
      <div style="background: #FFFFFF; border: 1px solid #EEDCD0; border-radius: 16px; padding: 16px; margin: 20px 0 10px;">
        <h4 style="margin: 0 0 6px; font-family: Georgia, serif; font-size: 13px; color: #4A0E17; font-weight: 700;">
          Have questions or want early booking? Contact our boutique:
        </h4>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #4A4543; line-height: 1.6;">
          <tr>
            <td style="padding: 3px 0;">📞 <strong>Store Phone:</strong> <a href="tel:+919500757024" style="color: #5B1130; font-weight: bold; text-decoration: none;">+91 95007 57024</a></td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">💬 <strong>WhatsApp:</strong> <a href="https://wa.me/919500757024?text=Hi%20Friends%20Collections,%20I%20have%20waitlisted%20for%20${encodeURIComponent(product.title)}" style="color: #2E7D32; font-weight: bold; text-decoration: none;">Chat on WhatsApp (+91 95007 57024)</a></td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">📍 <strong>Showroom:</strong> 7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012</td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 3px 0; color: #8C5338;">📱 <strong>Registered Alert Mobile:</strong> +91 ${phone}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;

    const html = wrapInFriendsTheme({
      title: `You're on the waitlist for "${product.title}"`,
      preheader: `We'll email you the moment "${product.title}" is back in stock at Friends Collections.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `🔔 Waitlist Confirmed: "${product.title}" at Friends Collections`,
      html,
      attachments: getLogoAttachment()
    });

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendBackInStockSubscriptionEmail:', error);
    return { success: false, error: error.message };
  }
};

// 3. Send Back In Stock Alert When Product Restocked
exports.sendBackInStockAlertEmail = async ({ to, name, phone, product, variant }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';
    const variantDesc = variant && (variant.color || variant.size)
      ? [variant.color, variant.size].filter(Boolean).join(' • ')
      : '';
    const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
    const productUrl = `${clientUrl}/product/${product.slug || product._id}`;

    let productImageUrl = 'https://friends-collection.vercel.app/fallback-product-1.png';
    if (product.images && product.images.length > 0) {
      const raw = product.images[0];
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        productImageUrl = raw;
      } else {
        productImageUrl = `${clientUrl}${raw.startsWith('/') ? '' : '/'}${raw}`;
      }
    }

    const priceText = product.salePrice
      ? `<span style="font-size: 20px; font-weight: 800; color: #5B1130;">₹${product.salePrice}</span>
         <span style="font-size: 14px; text-decoration: line-through; color: #8C827A; margin-left: 8px;">₹${product.price}</span>`
      : `<span style="font-size: 20px; font-weight: 800; color: #5B1130;">₹${product.price}</span>`;

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); color: #1B5E20; padding: 6px 18px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; border: 1px solid #A5D6A7; display: inline-block;">
          ✦ BACK IN STOCK AT OUR BOUTIQUE ✦
        </span>
      </div>
      <h2 class="content-title" style="font-family: Georgia, serif; font-size: 22px; color: #3B0A11; text-align: center; margin-bottom: 10px;">
        Great News! Your Favorite Garment is Back! ✨
      </h2>
      <p class="content-text" style="text-align: center; margin-bottom: 22px;">
        ${greeting}<br>
        The wait is finally over! <strong>"${product.title}"</strong> ${variantDesc ? `(${variantDesc})` : ''} has just arrived and been freshly restocked at our Chennai boutique.
      </p>

      <!-- Product Showcase Card (Clickable to Product Page) -->
      <div style="background: #FAF7F2; border: 1px solid #EEDCD0; border-radius: 20px; padding: 22px; margin: 20px 0; box-shadow: 0 4px 16px rgba(74, 14, 23, 0.05); text-align: center;">
        <a href="${productUrl}" target="_blank" style="display: block; text-decoration: none;">
          <img
            src="${productImageUrl}"
            alt="${product.title}"
            style="width: 220px; max-width: 100%; height: 280px; object-fit: cover; object-position: top; border-radius: 16px; border: 2px solid #D4AF37; box-shadow: 0 8px 24px rgba(74, 14, 23, 0.16); margin: 0 auto 16px; display: block;"
          />
        </a>

        <h3 style="margin: 0 0 6px; font-family: Georgia, serif; font-size: 19px; color: #3B0A11; font-weight: 700;">
          <a href="${productUrl}" target="_blank" style="color: #3B0A11; text-decoration: none;">${product.title}</a>
        </h3>

        ${variantDesc ? `
          <div style="margin: 0 0 10px;">
            <span style="background: #FFF3CD; color: #856404; padding: 3px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #FFE082;">
              Combination: ${variantDesc}
            </span>
          </div>
        ` : ''}

        <div style="margin: 10px 0 14px;">
          ${priceText}
        </div>

        <div style="margin-bottom: 18px;">
          <span style="display: inline-flex; align-items: center; gap: 6px; background: #E8F5E9; color: #2E7D32; font-size: 12px; font-weight: 700; padding: 4px 14px; border-radius: 8px;">
            🟢 In Stock Now (Strictly Limited Handcrafted Batches)
          </span>
        </div>

        <div>
          <a href="${productUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #5B1130 0%, #762243 100%); color: #FFFFFF !important; font-family: -apple-system, sans-serif; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 15px 36px; border-radius: 9999px; text-decoration: none; border: 1px solid #D4AF37; box-shadow: 0 8px 22px rgba(91, 17, 48, 0.35);">
            Shop Now & Claim Yours →
          </a>
        </div>
      </div>

      <!-- Boutique & Contact Assistance Card -->
      <div style="background: #FFFFFF; border: 1px solid #EEDCD0; border-radius: 16px; padding: 18px; margin: 24px 0 10px;">
        <h4 style="margin: 0 0 8px; font-family: Georgia, serif; font-size: 14px; color: #4A0E17; font-weight: 700;">
          Need Assistance Ordering? Contact Our Boutique:
        </h4>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #4A4543; line-height: 1.6;">
          <tr>
            <td style="padding: 4px 0;">📞 <strong>Store Phone:</strong> <a href="tel:+919500757024" style="color: #5B1130; font-weight: bold; text-decoration: none;">+91 95007 57024</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">💬 <strong>WhatsApp:</strong> <a href="https://wa.me/919500757024?text=Hi%20Friends%20Collections,%20I%20am%20interested%20in%20${encodeURIComponent(product.title)}" style="color: #2E7D32; font-weight: bold; text-decoration: none;">Chat on WhatsApp (+91 95007 57024)</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0;">📍 <strong>Showroom Hub:</strong> 7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012</td>
          </tr>
          ${phone ? `
          <tr>
            <td style="padding: 4px 0; color: #8C5338;">📱 <strong>Registered Alert Mobile:</strong> +91 ${phone}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 18px;">
        Tap the button or product photo above to open this garment directly on Friends Collections and complete your order.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `Back in Stock: "${product.title}" is available now!`,
      preheader: `Good news! "${product.title}" has been restocked. Shop now before it sells out again.`,
      contentHtml
    });

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `🎉 BACK IN STOCK: "${product.title}" is Now Available!`,
      html,
      attachments: getLogoAttachment()
    });

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendBackInStockAlertEmail:', error);
    return { success: false, error: error.message };
  }
};

// Render Full Campaign HTML
const renderCampaignHtml = (campaign, recipientName = '') => {
  const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
  const ctaUrl = campaign.ctaUrl || `${clientUrl}/shop`;

  const bannerHtml = campaign.bannerImage
    ? `
      <div style="margin: 0 0 24px; border-radius: 18px; overflow: hidden; border: 1px solid #EEDCD0; box-shadow: 0 4px 12px rgba(74, 14, 23, 0.08);">
        <img src="${campaign.bannerImage}" alt="${campaign.title || 'Festival Sale'}" style="width: 100%; max-height: 280px; object-fit: cover; display: block;" />
      </div>
    `
    : '';

  const badgeHtml = campaign.badgeText
    ? `
      <div style="text-align: center; margin-bottom: 14px;">
        <span style="background: linear-gradient(135deg, #FFF3CD 0%, #FFEBAA 100%); color: #856404; padding: 6px 18px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; border: 1px solid #FFE082; display: inline-block;">
          ✦ ${campaign.badgeText} ✦
        </span>
      </div>
    `
    : '';

  const headlineHtml = campaign.headline
    ? `
      <h2 style="font-family: Georgia, 'Playfair Display', serif; font-size: 24px; color: #4A0E17; margin: 0 0 16px; font-weight: 700; text-align: center; line-height: 1.3;">
        ${campaign.headline}
      </h2>
    `
    : '';

  const couponHtml = campaign.couponCode
    ? `
      <div style="background: linear-gradient(180deg, #FDF9F5 0%, #F5EDE4 100%); border: 2px dashed #C88A65; border-radius: 16px; padding: 18px 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #8C5338; font-weight: 700; display: block; margin-bottom: 6px;">
          Exclusive Festival Coupon Code
        </span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 28px; letter-spacing: 6px; color: #4A0E17; font-weight: 900; background: #FFFFFF; padding: 6px 18px; border-radius: 10px; border: 1px solid #D4AF37; display: inline-block;">
          ${campaign.couponCode}
        </span>
        <span style="font-size: 11px; color: #7A726E; display: block; margin-top: 8px;">
          Apply this code at checkout to claim your festive savings!
        </span>
      </div>
    `
    : '';

  const ctaBtnHtml = campaign.ctaText
    ? `
      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${ctaUrl}" class="cta-btn" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4A0E17 0%, #681824 100%); color: #FFFFFF !important; text-decoration: none; padding: 15px 36px; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 9999px; box-shadow: 0 8px 20px rgba(74, 14, 23, 0.3); border: 1px solid #D4AF37;">
          ${campaign.ctaText} →
        </a>
      </div>
    `
    : '';

  const contentHtml = `
    ${badgeHtml}
    ${bannerHtml}
    ${headlineHtml}
    <div style="font-size: 14px; line-height: 1.7; color: #3E3835; margin: 0 0 20px;">
      ${campaign.bodyHtml}
    </div>
    ${couponHtml}
    ${ctaBtnHtml}
  `;

  return wrapInFriendsTheme({
    title: campaign.subject || 'Special Festival Announcement - Friends Collections',
    preheader: campaign.preheader || campaign.subject,
    contentHtml
  });
};

// 4. Send Marketing / Festival Campaign Email
exports.sendCampaignEmail = async ({ to, name, campaign }) => {
  try {
    const mailClient = await getTransporter();
    const html = renderCampaignHtml(campaign, name);

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: campaign.subject,
      html,
      attachments: getLogoAttachment()
    });

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error(`❌ [Email Error] sendCampaignEmail to ${to}:`, error);
    return { success: false, error: error.message };
  }
};

// 5. Send Order Confirmation Email with PDF Invoice & Delivery Window
exports.sendOrderConfirmationEmail = async ({ order }) => {
  try {
    const customer = order.customer || {};
    const to = customer.email;
    if (!to) {
      console.log(`ℹ️ [Email Skipped] Order #${order.orderId} customer provided no email address.`);
      return { success: false, reason: 'No customer email provided' };
    }

    const mailClient = await getTransporter();
    const { generateInvoicePdf, getExpectedDeliveryRange } = require('./invoiceGenerator');

    const deliveryRange = getExpectedDeliveryRange(order.createdAt || new Date());
    const isPaid = order.paymentStatus === 'paid';
    const grandTotal = (Number(order.totalAmount) || 0) + (Number(order.shippingCharge) || 0);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const trackUrl = `${clientUrl}/account?tab=track&orderId=${order.orderId}`;

    const itemsHtml = (order.items || []).map((it) => {
      const varTxt = [it.color, it.size].filter(Boolean).join(' • ');
      return `
        <tr style="border-bottom: 1px solid #EEDCD0;">
          <td style="padding: 12px 8px; font-size: 13px; color: #2D2522; font-weight: 600;">
            ${it.title}
            ${varTxt ? `<br><span style="font-size: 11px; color: #8C5338; font-weight: normal;">${varTxt}</span>` : ''}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #4A4543; text-align: center;">
            ${it.quantity}
          </td>
          <td style="padding: 12px 8px; font-size: 13px; color: #4A0E17; font-weight: 700; text-align: right;">
            ₹${(Number(it.price) * Number(it.quantity)).toLocaleString('en-IN')}
          </td>
        </tr>
      `;
    }).join('');

    const paymentBadge = isPaid
      ? `<span style="display: inline-block; background-color: #E6F4EA; color: #137333; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #CEEAD6;">✓ Paid Online via Razorpay</span>`
      : `<span style="display: inline-block; background-color: #FEF7E0; color: #B06000; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #FEEFC3;">Cash on Delivery (COD)</span>`;

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background: #E6F4EA; color: #137333; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; padding: 5px 14px; border-radius: 9999px; border: 1px solid #CEEAD6;">
          ✦ Order Confirmed & Received ✦
        </span>
        <h2 class="content-title" style="margin-top: 14px; margin-bottom: 8px;">
          Thank You for Shopping with Us!
        </h2>
        <p class="content-text" style="text-align: center; max-width: 460px; margin: 0 auto 16px;">
          Dear <strong>${customer.name || 'Valued Customer'}</strong>, your order has been successfully placed. Our boutique artisans at Jamalia, Chennai are packing your garments with supreme care.
        </p>
      </div>

      <!-- Expected Delivery Window Banner -->
      <div style="background: linear-gradient(135deg, #FDF9F5 0%, #F5EDE4 100%); border: 2px dashed #C88A65; border-radius: 16px; padding: 18px 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #8C5338; font-weight: 700; display: block; margin-bottom: 4px;">
          Estimated Arrival Window
        </span>
        <span style="font-family: Georgia, serif; font-size: 20px; color: #4A0E17; font-weight: 800; display: inline-block;">
          📦 ${deliveryRange}
        </span>
        <span style="font-size: 11px; color: #7A726E; display: block; margin-top: 6px;">
          Standard Boutique Express Delivery to ${customer.address?.city || 'your address'}
        </span>
      </div>

      <!-- Order Reference Pill -->
      <div style="text-align: center; margin: 18px 0;">
        <span style="font-size: 12px; color: #665C58;">Order Reference: </span>
        <span style="font-family: monospace; font-size: 15px; font-weight: bold; color: #4A0E17; background: #FAF7F2; padding: 4px 12px; border-radius: 8px; border: 1px solid #EEDCD0;">
          ${order.orderId}
        </span>
      </div>

      <!-- Itemized Table -->
      <div style="margin: 24px 0; background: #FFFFFF; border: 1px solid #EEDCD0; border-radius: 14px; overflow: hidden;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background: #4A0E17; color: #FFFFFF; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
              <th style="padding: 10px 8px; text-align: left;">Item</th>
              <th style="padding: 10px 8px; text-align: center; width: 40px;">Qty</th>
              <th style="padding: 10px 8px; text-align: right; width: 70px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="background: #FAF7F2; padding: 14px 16px; border-top: 1px solid #EEDCD0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; line-height: 1.8;">
            <tr>
              <td style="color: #665C58;">Subtotal:</td>
              <td style="text-align: right; font-weight: bold; color: #2D2522;">₹${Number(order.totalAmount || 0).toLocaleString('en-IN')}</td>
            </tr>
            <tr>
              <td style="color: #665C58;">Delivery Charge:</td>
              <td style="text-align: right; font-weight: bold; color: #137333;">${Number(order.shippingCharge || 0) === 0 ? 'FREE' : `₹${order.shippingCharge}`}</td>
            </tr>
            <tr style="border-top: 1px dashed #D9C5B6; font-size: 14px;">
              <td style="padding-top: 8px; font-weight: bold; color: #4A0E17;">Grand Total:</td>
              <td style="padding-top: 8px; text-align: right; font-weight: 900; color: #4A0E17; font-size: 16px;">₹${grandTotal.toLocaleString('en-IN')}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Payment & Address Details -->
      <div style="background: #FAF7F2; border: 1px solid #EEDCD0; border-radius: 14px; padding: 16px 20px; margin: 20px 0; font-size: 12px; line-height: 1.6;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="vertical-align: top; width: 50%; padding-right: 10px;">
              <strong style="color: #4A0E17; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Delivering To:</strong>
              <span style="font-weight: 600; color: #2D2522;">${customer.name}</span><br>
              <span style="color: #665C58;">
                ${customer.address?.street || ''}<br>
                ${customer.address?.city || ''}, ${customer.address?.state || ''} - ${customer.address?.pincode || ''}<br>
                Phone: +91 ${customer.phone || ''}
              </span>
            </td>
            <td style="vertical-align: top; width: 50%; padding-left: 10px;">
              <strong style="color: #4A0E17; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Payment Method:</strong>
              ${paymentBadge}<br>
              ${order.paymentDetails?.razorpayPaymentId ? `<span style="font-size: 11px; color: #665C58; display: block; margin-top: 4px;">Txn ID: <code style="font-family: monospace;">${order.paymentDetails.razorpayPaymentId}</code></span>` : ''}
              <span style="font-size: 11px; color: #8C5338; display: block; margin-top: 6px;">
                📎 <strong>Your Official Tax Invoice PDF</strong> is attached directly to this email.
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA Track Button -->
      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${trackUrl}" class="cta-btn" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4A0E17 0%, #681824 100%); color: #FFFFFF !important; text-decoration: none; padding: 15px 36px; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 9999px; box-shadow: 0 8px 20px rgba(74, 14, 23, 0.3); border: 1px solid #D4AF37;">
          Track Live Order Status →
        </a>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 20px;">
        Questions or need tailoring adjustments? Reach our Jamalia boutique team on WhatsApp at 
        <a href="https://wa.me/919500757024" style="color: #4A0E17; font-weight: 600;">+91 95007 57024</a>.
      </p>
    `;

    const html = wrapInFriendsTheme({
      title: `Order Confirmation #${order.orderId} - Friends Collections`,
      preheader: `Thank you for your order #${order.orderId}! Expected arrival: ${deliveryRange}. Tax Invoice attached.`,
      contentHtml
    });

    // Generate Invoice PDF to attach
    let pdfAttachment = [];
    try {
      const pdfBuffer = await generateInvoicePdf(order);
      pdfAttachment.push({
        filename: `Invoice-${order.orderId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    } catch (pdfErr) {
      console.error(`⚠️ Could not attach PDF invoice to email for order #${order.orderId}:`, pdfErr);
    }

    const info = await mailClient.sendMail({
      from: process.env.EMAIL_FROM || '"Friends Collections" <friends.collection06@gmail.com>',
      to,
      subject: `🛍️ Order Confirmed #${order.orderId} - Friends Collections (Invoice Attached)`,
      html,
      attachments: [...getLogoAttachment(), ...pdfAttachment]
    });

    return { success: true, messageId: info?.messageId };
  } catch (error) {
    console.error('❌ [Email Error] sendOrderConfirmationEmail:', error);
    return { success: false, error: error.message };
  }
};

exports.renderCampaignHtml = renderCampaignHtml;
