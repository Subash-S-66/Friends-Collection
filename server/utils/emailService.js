const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

let transporter = null;

// Initialize or get the transporter
const getTransporter = async () => {
  if (transporter) return transporter;

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
      }
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
    .logo-img {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      border: 3px solid #D4AF37;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
      background-color: #4A0E17;
      display: inline-block;
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
            <img src="cid:friends_logo" alt="Friends Collections" class="logo-img" />
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

// 2. Send Back In Stock Subscription Confirmation
exports.sendBackInStockSubscriptionEmail = async ({ to, name, product, variant }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';
    const variantDesc = variant && (variant.color || variant.size)
      ? `(${[variant.color, variant.size].filter(Boolean).join(' • ')})`
      : '';
    const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
    const productUrl = `${clientUrl}/product/${product.slug || product._id}`;

    const contentHtml = `
      <h2 class="content-title">You're on the Waitlist! 🔔</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        Thank you for your interest! We have registered your request for this exclusive design. As soon as our master weavers and artisans restock it, you will be the first to know!
      </p>

      <div class="product-box">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <h3 style="margin: 0 0 4px; font-family: Georgia, serif; font-size: 16px; color: #3B0A11;">
                ${product.title}
              </h3>
              ${variantDesc ? `<p style="margin: 0 0 6px; font-size: 12px; color: #8C5338; font-weight: 600;">Selected: ${variantDesc}</p>` : ''}
              <p style="margin: 0; font-size: 14px; font-weight: 700; color: #4A0E17;">
                Price: ₹${product.salePrice || product.price}
              </p>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 24px 0 10px;">
        <a href="${productUrl}" class="cta-btn" target="_blank">View Product in Boutique</a>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 20px;">
        Have a question or custom tailoring requirement? Chat directly with our Jamalia boutique team on WhatsApp at 
        <a href="https://wa.me/919500757024" style="color: #4A0E17; font-weight: 600;">+91 95007 57024</a>.
      </p>
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
    // Non-critical, do not crash subscription endpoint
    return { success: false, error: error.message };
  }
};

// 3. Send Back In Stock Alert When Product Restocked
exports.sendBackInStockAlertEmail = async ({ to, name, product, variant }) => {
  try {
    const mailClient = await getTransporter();
    const greeting = name ? `Dear ${name},` : 'Hello,';
    const variantDesc = variant && (variant.color || variant.size)
      ? `(${[variant.color, variant.size].filter(Boolean).join(' • ')})`
      : '';
    const clientUrl = process.env.CLIENT_URL || 'https://friends-collection.vercel.app';
    const productUrl = `${clientUrl}/product/${product.slug || product._id}`;

    const contentHtml = `
      <div style="text-align: center; margin-bottom: 12px;">
        <span style="background: #E8F5E9; color: #1B5E20; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">
          ✦ BACK IN STOCK ✦
        </span>
      </div>
      <h2 class="content-title">Great News! Your Favorite Item is Back! ✨</h2>
      <p class="content-text" style="text-align: center;">
        ${greeting}<br>
        The wait is over! <strong>"${product.title}"</strong> ${variantDesc} has been freshly restocked at our Chennai boutique and is now ready for order.
      </p>

      <div class="product-box">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          <tr>
            <td style="vertical-align: middle;">
              <h3 style="margin: 0 0 4px; font-family: Georgia, serif; font-size: 17px; color: #3B0A11;">
                ${product.title}
              </h3>
              ${variantDesc ? `<p style="margin: 0 0 6px; font-size: 12px; color: #8C5338; font-weight: 600;">Combination: ${variantDesc}</p>` : ''}
              <p style="margin: 0; font-size: 16px; font-weight: 800; color: #4A0E17;">
                Special Price: ₹${product.salePrice || product.price}
              </p>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 26px 0 10px;">
        <a href="${productUrl}" class="cta-btn" target="_blank">Order Now Before Stock Runs Out →</a>
      </div>

      <p class="content-text" style="font-size: 12px; color: #7A726E; text-align: center; margin-top: 18px;">
        Quantities are strictly limited due to handwoven craftsmanship. We encourage you to place your order promptly to avoid missing out!
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

exports.renderCampaignHtml = renderCampaignHtml;
