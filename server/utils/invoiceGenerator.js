const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');

const DEFAULT_INVOICE_SETTINGS = {
  companyName: 'Friends Collections',
  tagline: 'Traditional Silk Sarees • Designer Kurtis • Lehengas • Kids Wear',
  invoiceTitle: 'TAX INVOICE & BILL OF SUPPLY',
  address: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012',
  phone: '+91 95007 57024',
  email: 'friends.collection06@gmail.com',
  gstin: '33AAACF1234M1Z5',
  authorizedSignatory: 'Authorized Signatory • Jamalia Boutique',
  signatorySubtitle: 'Friends Collections Jamalia Boutique',
  signatureImage: '',
  footerNote: 'Thank You for Shopping with Friends Collections!',
  terms: '7-Day Easy Exchange Policy on Unworn Items with Tags Intact • Defective items replaced free of charge.',
  notes: 'This is an authentic computer-generated Tax Invoice and requires no physical signature.',
  primaryColor: '#4A0E17',
  accentColor: '#C88A65'
};

/**
 * Retrieve saved invoice settings from MongoDB, falling back to boutique defaults
 */
async function getInvoiceSettings() {
  try {
    const settingDoc = await Settings.findOne({ key: 'invoiceSettings' });
    if (settingDoc && settingDoc.value) {
      return { ...DEFAULT_INVOICE_SETTINGS, ...settingDoc.value };
    }
  } catch (err) {
    console.warn('Could not read invoiceSettings from DB, using defaults:', err.message);
  }
  return DEFAULT_INVOICE_SETTINGS;
}

function getExpectedDeliveryRange(orderDate = new Date()) {
  const d = new Date(orderDate);
  const startDate = new Date(d);
  startDate.setDate(d.getDate() + 3);
  const endDate = new Date(d);
  endDate.setDate(d.getDate() + 6);

  const startFormatted = startDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
  const endFormatted = endDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Generate a PDF invoice Buffer for a given Order using universal invoice settings
 * @param {Object} order - Mongoose Order document or plain object
 * @param {Object} [customSettings] - Optional settings override (e.g. for live preview)
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePdf(order, customSettings = null) {
  const cfg = customSettings
    ? { ...DEFAULT_INVOICE_SETTINGS, ...customSettings }
    : await getInvoiceSettings();

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 32,
        bufferPages: true,
        info: {
          Title: `${cfg.invoiceTitle || 'Tax Invoice'} - ${order.orderId}`,
          Author: cfg.companyName || 'Friends Collections',
          Subject: `Order #${order.orderId} Tax Invoice`
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      const PRIMARY = cfg.primaryColor || '#4A0E17';
      const ACCENT = cfg.accentColor || '#C88A65';
      const DARK = '#2B2321';
      const MUTED = '#665C58';
      const LIGHT_BG = '#FBF8F5';
      const BORDER_COLOR = '#EBDCD2';
      const GREEN = '#1B7A43';

      const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      const deliveryRange = getExpectedDeliveryRange(order.createdAt || new Date());
      const isPaid = order.paymentStatus === 'paid';
      const grandTotal = (Number(order.totalAmount) || 0) + (Number(order.shippingCharge) || 0);

      // ==========================================
      // 1. TOP HEADER BANNER (Page 1)
      // ==========================================
      // 1. TOP HEADER BANNER (Page 1)
      // ==========================================
      doc.rect(0, 0, doc.page.width, 94).fill(PRIMARY);

      // Check for store logo image
      const possibleLogoPaths = [
        path.join(__dirname, '../assets/logo.png'),
        path.join(__dirname, '../../client/public/logo.png')
      ];
      let resolvedLogo = null;
      for (const lp of possibleLogoPaths) {
        if (fs.existsSync(lp)) {
          resolvedLogo = lp;
          break;
        }
      }

      let textStartX = 32;
      if (resolvedLogo) {
        try {
          doc.roundedRect(32, 14, 64, 64, 8).fillAndStroke('#FFFFFF', ACCENT);
          doc.image(resolvedLogo, 36, 18, { fit: [56, 56], align: 'center', valign: 'center' });
          textStartX = 106;
        } catch (logoErr) {
          console.warn('Could not draw logo in PDF:', logoErr.message);
          textStartX = 32;
        }
      }

      // Invoice Badge on Top Right
      const badgeWidth = 142;
      const badgeHeight = 64;
      const badgeX = doc.page.width - 32 - badgeWidth;
      const badgeY = 14;

      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 6).fillAndStroke('#2E060C', ACCENT);
      const shortTitle = (cfg.invoiceTitle || 'TAX INVOICE').split('&')[0].trim();
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .text(shortTitle, badgeX, badgeY + 10, { align: 'center', width: badgeWidth, lineBreak: false });

      doc.fillColor('#D4AF37')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(order.orderId || 'FC-ORDER', badgeX, badgeY + 25, { align: 'center', width: badgeWidth, lineBreak: false });

      if (cfg.gstin) {
        doc.fillColor('#E2BFB3')
          .font('Helvetica')
          .fontSize(7.2)
          .text(`GSTIN: ${cfg.gstin}`, badgeX, badgeY + 42, { align: 'center', width: badgeWidth, lineBreak: false });
      }

      // Available width between logo and badge (with breathing room)
      const headerTextRightLimit = badgeX - 12;
      const maxTextWidth = Math.max(260, headerTextRightLimit - textStartX);

      // Store Title
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(textStartX > 32 ? 15.5 : 17.5)
        .text((cfg.companyName || 'FRIENDS COLLECTIONS').toUpperCase(), textStartX, 15, {
          characterSpacing: 0.8,
          width: maxTextWidth,
          lineBreak: false,
          ellipsis: true
        });

      // Tagline / Categories
      doc.fillColor('#E2BFB3')
        .font('Helvetica')
        .fontSize(7)
        .text((cfg.tagline || 'TRADITIONAL SILK SAREES • DESIGNER KURTIS • LEHENGAS • KIDS WEAR').toUpperCase(), textStartX, 35, {
          characterSpacing: 0.1,
          width: maxTextWidth,
          lineBreak: false,
          ellipsis: true
        });

      // Address
      doc.fillColor('#F5EDE4')
        .font('Helvetica')
        .fontSize(7.2)
        .text(cfg.address || '7/4 Perambur High Road, Jamalia, Chennai – 600012', textStartX, 48, {
          width: maxTextWidth,
          lineBreak: true,
          height: 18,
          ellipsis: true
        });

      // Contact Line: Phone & Email
      const contactParts = [];
      if (cfg.phone) contactParts.push(`Phone: ${cfg.phone}`);
      if (cfg.email) contactParts.push(`Email: ${cfg.email}`);
      const contactText = contactParts.join('   •   ');

      if (contactText) {
        const addressHeight = doc.heightOfString(cfg.address || '', { width: maxTextWidth });
        const contactY = Math.min(73, Math.max(61, 48 + addressHeight + 4));
        doc.fillColor('#E2BFB3')
          .font('Helvetica')
          .fontSize(7.2)
          .text(contactText, textStartX, contactY, {
            width: maxTextWidth,
            lineBreak: false,
            ellipsis: true
          });
      }

      // ==========================================
      // 2. METADATA CARDS (Bill To & Order Details)
      // ==========================================
      const boxY = 104;
      const boxHeight = 104;
      const boxWidth = (doc.page.width - 64 - 14) / 2;

      // Left Box: Delivery Address
      doc.roundedRect(32, boxY, boxWidth, boxHeight, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(PRIMARY)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('BILLED & DELIVERED TO:', 44, boxY + 10);

      const customer = order.customer || {};
      const addr = customer.address || {};

      doc.fillColor(DARK)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(customer.name || 'Valued Customer', 44, boxY + 24, { width: boxWidth - 24, lineBreak: false, ellipsis: true });

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(8)
        .text(addr.street || '', 44, boxY + 38, { width: boxWidth - 24, lineBreak: false, ellipsis: true })
        .text(`${addr.city || 'Chennai'}, ${addr.state || 'Tamil Nadu'} - ${addr.pincode || ''}`, 44, boxY + 50, { width: boxWidth - 24, lineBreak: false, ellipsis: true })
        .text(`Primary Phone: +91 ${customer.phone || ''}`, 44, boxY + 63, { width: boxWidth - 24, lineBreak: false, ellipsis: true });

      if (customer.secondaryPhone) {
        doc.text(`Alternate Phone: +91 ${customer.secondaryPhone}`, 44, boxY + 76, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
      } else if (customer.email) {
        doc.text(`Email: ${customer.email}`, 44, boxY + 76, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
      }

      // Right Box: Order & Payment Info
      const rightBoxX = 32 + boxWidth + 14;
      doc.roundedRect(rightBoxX, boxY, boxWidth, boxHeight, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);

      doc.fillColor(PRIMARY)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('ORDER & PAYMENT DETAILS:', rightBoxX + 12, boxY + 10);

      doc.fillColor(MUTED).font('Helvetica').fontSize(8);
      doc.text('Order Date:', rightBoxX + 12, boxY + 24);
      doc.fillColor(DARK).font('Helvetica-Bold').text(orderDate, rightBoxX + 88, boxY + 24);

      doc.fillColor(MUTED).font('Helvetica').text('Expected Date:', rightBoxX + 12, boxY + 38);
      doc.fillColor(GREEN).font('Helvetica-Bold').text(deliveryRange, rightBoxX + 88, boxY + 38);

      doc.fillColor(MUTED).font('Helvetica').text('Payment Method:', rightBoxX + 12, boxY + 51);
      const methodLabel = order.paymentMethod === 'razorpay' ? 'Razorpay Online' : 'Cash on Delivery (COD)';
      doc.fillColor(DARK).font('Helvetica-Bold').text(methodLabel, rightBoxX + 88, boxY + 51);

      doc.fillColor(MUTED).font('Helvetica').text('Payment Status:', rightBoxX + 12, boxY + 64);
      const statusLabel = isPaid ? 'PAID / CONFIRMED' : 'PAYMENT PENDING';
      doc.fillColor(isPaid ? GREEN : '#C05621').font('Helvetica-Bold').text(statusLabel, rightBoxX + 88, boxY + 64);

      if (order.paymentDetails?.razorpayPaymentId) {
        doc.fillColor(MUTED).font('Helvetica').text('Transaction ID:', rightBoxX + 12, boxY + 77);
        doc.fillColor(DARK).font('Helvetica').text(order.paymentDetails.razorpayPaymentId, rightBoxX + 88, boxY + 77, { width: boxWidth - 96, lineBreak: false, ellipsis: true });
      } else {
        doc.fillColor(MUTED).font('Helvetica').text('Fulfillment:', rightBoxX + 12, boxY + 77);
        doc.fillColor(DARK).font('Helvetica').text((order.status || 'Confirmed').toUpperCase(), rightBoxX + 88, boxY + 77, { width: boxWidth - 96, lineBreak: false, ellipsis: true });
      }

      if (cfg.gstin) {
        doc.fillColor(MUTED).font('Helvetica').text('Store GSTIN:', rightBoxX + 12, boxY + 90);
        doc.fillColor(DARK).font('Helvetica-Bold').text(cfg.gstin, rightBoxX + 88, boxY + 90);
      }

      // ==========================================
      // 3. ITEMS TABLE
      // ==========================================
      const colX = {
        num: 32,
        item: 56,
        variant: 265,
        qty: 375,
        price: 415,
        total: 475
      };

      function renderTableHeader(y) {
        doc.rect(32, y, doc.page.width - 64, 22).fill(PRIMARY);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
        doc.text('#', colX.num + 6, y + 6);
        doc.text('DRESS / ITEM', colX.item, y + 6);
        doc.text('VARIANT / SIZE', colX.variant, y + 6);
        doc.text('QTY', colX.qty, y + 6, { align: 'center', width: 35 });
        doc.text('UNIT PRICE', colX.price, y + 6, { align: 'right', width: 55 });
        doc.text('TOTAL', colX.total, y + 6, { align: 'right', width: 56 });
      }

      let tableY = 220;
      renderTableHeader(tableY);
      tableY += 22;

      const items = Array.isArray(order.items) ? order.items : [];
      const MAX_PAGE_1_TABLE_Y = 660;
      const MAX_PAGE_2_TABLE_Y = 660;

      items.forEach((it, index) => {
        // Multi-page page break: If this row will exceed page boundary, start page 2
        if (tableY + 25 > (doc.bufferedPageRange().count === 1 ? MAX_PAGE_1_TABLE_Y : MAX_PAGE_2_TABLE_Y)) {
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 42).fill(PRIMARY);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
            .text((cfg.companyName || 'FRIENDS COLLECTIONS').toUpperCase(), 32, 14, { characterSpacing: 1 });
          doc.fillColor('#D4AF37').font('Helvetica-Bold').fontSize(8.5)
            .text(`${(cfg.invoiceTitle || 'TAX INVOICE').split('&')[0].trim()} (CONTINUED) • #${order.orderId}`, doc.page.width - 250, 16, { align: 'right', width: 218 });

          tableY = 54;
          renderTableHeader(tableY);
          tableY += 22;
        }

        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FAF8F5';
        doc.rect(32, tableY, doc.page.width - 64, 25).fill(rowBg);
        doc.rect(32, tableY, doc.page.width - 64, 25).stroke(BORDER_COLOR);

        doc.fillColor(DARK).font('Helvetica').fontSize(8);
        doc.text(String(index + 1), colX.num + 6, tableY + 8);

        // Item Title
        doc.font('Helvetica-Bold')
          .text(it.title || 'Designer Dress', colX.item, tableY + 8, { width: 200, lineBreak: false });

        // Variant / Color / Size
        const varTxt = [it.color, it.size].filter(Boolean).join(' • ') || 'Standard';
        doc.font('Helvetica').fillColor(MUTED).text(varTxt, colX.variant, tableY + 8, { width: 100, lineBreak: false });

        // Qty
        doc.fillColor(DARK).text(String(it.quantity || 1), colX.qty, tableY + 8, { align: 'center', width: 35 });

        // Unit Price
        doc.text(`INR ${Number(it.price || 0).toLocaleString('en-IN')}`, colX.price, tableY + 8, { align: 'right', width: 55 });

        // Row Total
        const rowTotal = Number(it.price || 0) * Number(it.quantity || 1);
        doc.font('Helvetica-Bold')
          .text(`INR ${rowTotal.toLocaleString('en-IN')}`, colX.total, tableY + 8, { align: 'right', width: 56 });

        tableY += 25;
      });

      // ==========================================
      // 4. SUMMARY & TOTALS SECTION
      // ==========================================
      let totalsY = tableY + 10;
      if (totalsY + 74 > doc.page.height - 95) {
        doc.addPage();
        totalsY = 40;
      }

      const totalsWidth = 220;
      const totalsX = doc.page.width - 32 - totalsWidth;
      doc.roundedRect(totalsX, totalsY, totalsWidth, 74, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);

      doc.fillColor(MUTED).font('Helvetica').fontSize(8);
      doc.text('Subtotal:', totalsX + 14, totalsY + 10);
      doc.fillColor(DARK).font('Helvetica-Bold')
        .text(`INR ${Number(order.totalAmount || 0).toLocaleString('en-IN')}`, totalsX + 110, totalsY + 10, { align: 'right', width: 96 });

      doc.fillColor(MUTED).font('Helvetica')
        .text('Delivery Charge:', totalsX + 14, totalsY + 24);
      const shipTxt = Number(order.shippingCharge || 0) === 0 ? 'FREE' : `INR ${order.shippingCharge}`;
      doc.fillColor(GREEN).font('Helvetica-Bold')
        .text(shipTxt, totalsX + 110, totalsY + 24, { align: 'right', width: 96 });

      // Horizontal line
      doc.moveTo(totalsX + 14, totalsY + 39).lineTo(totalsX + totalsWidth - 14, totalsY + 39).stroke(BORDER_COLOR);

      // Grand Total
      doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(10.5)
        .text('Grand Total:', totalsX + 14, totalsY + 48);
      doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11.5)
        .text(`INR ${grandTotal.toLocaleString('en-IN')}`, totalsX + 90, totalsY + 47, { align: 'right', width: 116 });

      // Left of Totals: Delivery Guarantee Banner
      const guaranteeX = 32;
      const guaranteeWidth = totalsX - guaranteeX - 12;
      doc.roundedRect(guaranteeX, totalsY, guaranteeWidth, 74, 8).fillAndStroke('#F6FAF7', '#C6E3D0');
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
        .text('ESTIMATED ARRIVAL WINDOW', guaranteeX + 12, totalsY + 10);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
        .text(deliveryRange, guaranteeX + 12, totalsY + 24);
      doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
        .text('Hand-inspected & packaged with love at our Jamalia boutique. Track live status using your Order Reference on our website.', guaranteeX + 12, totalsY + 40, { width: guaranteeWidth - 24 });

      // ==========================================
      // 5. FOOTER & AUTHENTICITY NOTE (Strictly pinned to last page with no overflow)
      // ==========================================
      const footerY = doc.page.height - 72;
      const prevBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 5; // Prevent any accidental page break

      doc.rect(32, footerY, doc.page.width - 64, 0.75).fill(BORDER_COLOR);

      // Left Column: Terms, notes & gratitude
      doc.fillColor(PRIMARY)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(cfg.footerNote || 'Thank You for Shopping with Friends Collections!', 32, footerY + 6, { width: 330, lineBreak: false });

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(6.8)
        .text(cfg.terms || '7-Day Easy Exchange Policy on Unworn Items with Tags Intact • Jamalia, Perambur, Chennai - 600012', 32, footerY + 18, { width: 330, lineBreak: false });

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(6.8)
        .text(cfg.notes || 'This is an authentic computer-generated Tax Invoice and requires no physical signature.', 32, footerY + 30, { width: 330, lineBreak: false });

      // Right Column: Signatory block with signature image
      let sigRendered = false;
      if (cfg.signatureImage) {
        try {
          let sigImgSource = null;
          if (typeof cfg.signatureImage === 'string') {
            if (cfg.signatureImage.startsWith('data:image')) {
              const base64Data = cfg.signatureImage.split(',')[1];
              sigImgSource = Buffer.from(base64Data, 'base64');
            } else {
              const localSigPath = cfg.signatureImage.startsWith('/')
                ? path.join(__dirname, '..', cfg.signatureImage)
                : path.join(__dirname, '../uploads', cfg.signatureImage);
              if (fs.existsSync(localSigPath)) {
                sigImgSource = localSigPath;
              }
            }
          }
          if (sigImgSource) {
            doc.image(sigImgSource, doc.page.width - 180, footerY + 2, { fit: [140, 24], align: 'right' });
            sigRendered = true;
          }
        } catch (sigErr) {
          console.warn('Could not embed signature image in PDF:', sigErr.message);
        }
      }

      if (!sigRendered) {
        doc.fillColor(PRIMARY)
          .font('Helvetica-Oblique')
          .fontSize(8)
          .text(cfg.companyName || 'Friends Collections', doc.page.width - 200, footerY + 11, { align: 'right', width: 168 });
      }

      // Horizontal signature underline
      doc.moveTo(doc.page.width - 190, footerY + 27).lineTo(doc.page.width - 32, footerY + 27).stroke(BORDER_COLOR);

      if (cfg.authorizedSignatory) {
        doc.fillColor(DARK)
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text(cfg.authorizedSignatory, doc.page.width - 210, footerY + 31, { align: 'right', width: 178, lineBreak: false });
      }

      if (cfg.signatorySubtitle) {
        doc.fillColor(MUTED)
          .font('Helvetica')
          .fontSize(6.5)
          .text(cfg.signatorySubtitle, doc.page.width - 210, footerY + 41, { align: 'right', width: 178, lineBreak: false });
      }

      doc.page.margins.bottom = prevBottomMargin;

      // Stamp Page Numbers if multi-page
      const range = doc.bufferedPageRange();
      const totalPages = range.count;
      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
        if (totalPages > 1) {
          doc.fillColor(MUTED)
            .font('Helvetica')
            .fontSize(7)
            .text(`Page ${i + 1} of ${totalPages}`, doc.page.width - 120, doc.page.height - 22, { align: 'right', width: 88 });
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf,
  getExpectedDeliveryRange,
  getInvoiceSettings,
  DEFAULT_INVOICE_SETTINGS
};
