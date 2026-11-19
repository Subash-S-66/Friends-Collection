const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');

const DEFAULT_INVOICE_SETTINGS = {
  companyName: 'Friends Collections',
  tagline: 'Traditional Silk Sarees • Designer Kurtis • Lehengas • Kids Wear',
  invoiceTitle: 'TAX INVOICE & BILL OF SUPPLY',
  address: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012',
  phone: '+91 95007 57024',
  email: 'friends.collection.support@gmail.com',
  gstin: '',
  gstPercentage: 5,
  authorizedSignatory: 'Authorized Signatory',
  signatorySubtitle: '',
  signatureImage: '',
  footerNote: 'Thank You for Shopping with Us!',
  terms: '7-Day Easy Exchange Policy on Unworn Items with Tags Intact.',
  notes: 'This is an authentic computer-generated Tax Invoice and requires no physical signature.',
  primaryColor: '#4A0E17',
  accentColor: '#C88A65'
};

let cachedInvoiceSettings = null;
let lastInvoiceSettingsFetch = 0;
const INVOICE_SETTINGS_TTL_MS = 60 * 1000;

/**
 * Retrieve saved invoice settings from MongoDB, falling back to boutique defaults
 */
async function getInvoiceSettings() {
  const now = Date.now();
  if (cachedInvoiceSettings && now - lastInvoiceSettingsFetch < INVOICE_SETTINGS_TTL_MS) {
    return cachedInvoiceSettings;
  }

  try {
    if (mongoose.connection.readyState !== 1) {
      return DEFAULT_INVOICE_SETTINGS;
    }
    const settingDoc = await Settings.findOne({ key: 'invoiceSettings' }).lean();
    if (settingDoc && settingDoc.value) {
      cachedInvoiceSettings = { ...DEFAULT_INVOICE_SETTINGS, ...settingDoc.value };
      lastInvoiceSettingsFetch = now;
      return cachedInvoiceSettings;
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
async function generateInvoicePdf(orderInput, customSettings = null) {
  const cfg = customSettings
    ? { ...DEFAULT_INVOICE_SETTINGS, ...customSettings }
    : await getInvoiceSettings();

  // Normalize order: convert Mongoose Document or raw object to plain JS object so schema properties are preserved
  const order = orderInput && typeof orderInput.toObject === 'function'
    ? orderInput.toObject()
    : (orderInput ? JSON.parse(JSON.stringify(orderInput)) : {});

  return new Promise((resolve, reject) => {
    try {
      const displayOrderId = order.orderId || 'FC-ORDER';

      const doc = new PDFDocument({
        size: 'A4',
        margin: 32,
        bufferPages: true,
        info: {
          Title: `${cfg.invoiceTitle || 'Tax Invoice'} - ${displayOrderId}`,
          Author: cfg.companyName || 'Friends Collections',
          Subject: `Order #${displayOrderId} Tax Invoice`
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
      const deliveryRange = order.expectedDeliveryDate || order.tracking?.estimatedDelivery || getExpectedDeliveryRange(order.createdAt || new Date());
      const isPaid = order.paymentStatus === 'paid';
      const isCancelled = order.status === 'cancelled';
      const isRefunded = order.paymentStatus === 'refunded' || order.paymentDetails?.refundStatus === 'processed';
      const isRefundProcessing = !isRefunded && (
        order.paymentStatus === 'refund_processing' ||
        order.paymentDetails?.refundStatus === 'pending' ||
        (isCancelled && (order.paymentStatus === 'refund_processing' || Boolean(order.paymentDetails?.refundId)))
      );
      const refundId = order.paymentDetails?.refundId || order.paymentDetails?.razorpayPaymentId || order.orderId;
      const grandTotal = (Number(order.totalAmount) || 0) + (Number(order.shippingCharge) || 0);

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
        .text(displayOrderId, badgeX, badgeY + 25, { align: 'center', width: badgeWidth, lineBreak: false });

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
      const customerName = (customer.name || order.customerName || order.user?.name || '').trim();
      const addr = customer.address || order.shippingAddress || {};

      doc.fillColor(DARK)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text(customerName || 'Customer', 44, boxY + 24, { width: boxWidth - 24, lineBreak: false, ellipsis: true });

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(8);

      let currentAddrY = boxY + 38;
      if (addr.street) {
        doc.text(addr.street, 44, currentAddrY, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
        currentAddrY += 12;
      }
      const cityStateParts = [addr.city, addr.state].filter(Boolean).join(', ');
      const locLine = [cityStateParts, addr.pincode].filter(Boolean).join(' - ');
      if (locLine) {
        doc.text(locLine, 44, currentAddrY, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
        currentAddrY += 12;
      }
      if (customer.phone) {
        doc.text(`Primary Phone: +91 ${customer.phone}`, 44, currentAddrY, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
        currentAddrY += 12;
      }

      if (customer.secondaryPhone) {
        doc.text(`Alternate Phone: +91 ${customer.secondaryPhone}`, 44, currentAddrY, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
      } else if (customer.email) {
        doc.text(`Email: ${customer.email}`, 44, currentAddrY, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
      }

      const custGst = (customer.gstNumber || order.gstNumber || '').toString().trim().toUpperCase();
      const hasCustGst = custGst && !['NONE', 'NULL', 'UNDEFINED', 'N/A', '-'].includes(custGst);
      if (hasCustGst) {
        doc.fillColor(DARK)
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text(`Customer GSTIN: ${custGst}`, 44, boxY + 86, { width: boxWidth - 24, lineBreak: false, ellipsis: true });
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

      if (isCancelled || isRefundProcessing || isRefunded) {
        doc.fillColor(MUTED).font('Helvetica').text('Order Status:', rightBoxX + 12, boxY + 38);
        const statusText = isRefunded
          ? 'Refunded'
          : isRefundProcessing
          ? 'Cancelled (Refund Processing)'
          : 'Item Cancelled';
        const statusColor = isRefunded ? '#2D3748' : (isRefundProcessing ? '#C05621' : '#991B1B');
        doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(8).text(statusText, rightBoxX + 88, boxY + 38, { width: boxWidth - 96, lineBreak: false, ellipsis: true });
      } else {
        doc.fillColor(MUTED).font('Helvetica').text('Expected Date:', rightBoxX + 12, boxY + 38);
        doc.fillColor(GREEN).font('Helvetica-Bold').text(deliveryRange, rightBoxX + 88, boxY + 38);
      }

      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Payment Status:', rightBoxX + 12, boxY + 51);
      let statusLabel = isPaid ? 'PAID / CONFIRMED' : 'PAYMENT PENDING';
      let statusColor = isPaid ? GREEN : '#C05621';
      if (isRefunded) {
        statusLabel = 'REFUNDED';
        statusColor = '#2D3748';
      } else if (isRefundProcessing) {
        statusLabel = 'REFUND IN PROGRESS';
        statusColor = '#C05621';
      } else if (isCancelled) {
        statusLabel = 'CANCELLED';
        statusColor = '#991B1B';
      }
      doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(8).text(statusLabel, rightBoxX + 88, boxY + 51);

      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Payment Method:', rightBoxX + 12, boxY + 64);
      const methodLabel = order.paymentMethod === 'razorpay' ? 'Razorpay Online' : 'Cash on Delivery (COD)';
      doc.fillColor(DARK).font('Helvetica-Bold').text(methodLabel, rightBoxX + 88, boxY + 64);

      if (order.paymentDetails?.refundId) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Refund ID:', rightBoxX + 12, boxY + 77);
        doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(7.5).text(order.paymentDetails.refundId, rightBoxX + 88, boxY + 77, { width: boxWidth - 96, lineBreak: false, ellipsis: true });
      } else if (order.paymentDetails?.razorpayPaymentId) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Transaction ID:', rightBoxX + 12, boxY + 77);
        doc.fillColor(DARK).font('Helvetica').fontSize(8).text(order.paymentDetails.razorpayPaymentId, rightBoxX + 88, boxY + 77, { width: boxWidth - 96, lineBreak: false, ellipsis: true });
      } else {
        doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('Fulfillment:', rightBoxX + 12, boxY + 77);
        doc.fillColor(DARK).font('Helvetica').fontSize(8).text((order.status || 'Confirmed').toUpperCase(), rightBoxX + 88, boxY + 77, { width: boxWidth - 96, lineBreak: false, ellipsis: true });
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
        item: 54,
        qty: 258,
        productPrice: 294,
        gst: 382,
        total: 474
      };

      function renderTableHeader(y) {
        doc.rect(32, y, doc.page.width - 64, 22).fill(PRIMARY);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        doc.text('#', colX.num + 4, y + 6);
        doc.text('DRESS / ITEM', colX.item, y + 6);
        doc.text('QTY', colX.qty, y + 6, { align: 'center', width: 32 });
        doc.text('PRODUCT PRICE', colX.productPrice, y + 6, { align: 'right', width: 84 });
        doc.text('GST', colX.gst, y + 6, { align: 'right', width: 88 });
        doc.text('TOTAL', colX.total, y + 6, { align: 'right', width: 89 });
      }

      let tableY = 220;
      renderTableHeader(tableY);
      tableY += 22;

      const items = Array.isArray(order.items) ? order.items : [];
      const MAX_PAGE_1_TABLE_Y = 650;
      const MAX_PAGE_2_TABLE_Y = 650;
      const rowHeight = 28;

      // Universal Invoice Global GST percentage
      const invoiceGlobalGst = Number(
        cfg.gstPercentage !== undefined && cfg.gstPercentage !== null ? cfg.gstPercentage : 5
      );

      // Place of Supply: Intra-state (Within Tamil Nadu -> CGST + SGST) vs Inter-state (Outside Tamil Nadu -> IGST)
      const customerState = (addr.state || '').trim().toLowerCase();
      const isInterState = Boolean(
        customerState &&
        !customerState.includes('tamil nadu') &&
        !customerState.includes('tamilnadu') &&
        !customerState.includes('tn') &&
        !customerState.includes('chennai')
      );

      // Process items: calculate product price, resolve specific vs global GST, add GST to make total
      const processedItems = items.map((rawIt) => {
        const it = rawIt && typeof rawIt.toObject === 'function'
          ? rawIt.toObject()
          : (rawIt ? JSON.parse(JSON.stringify(rawIt)) : {});

        const itemTitle = (it.title || it.name || it.productName || it.product?.title || it.product?.name || '').trim();
        const price = Number(it.price || 0);
        const quantity = Number(it.quantity || 1);
        const lineGross = price * quantity;

        let itemGstRate;
        let isSpecific = false;

        if (it.isSpecificGst === true && it.gstRate !== null && it.gstRate !== undefined) {
          itemGstRate = Number(it.gstRate);
          isSpecific = true;
        } else if (it.isSpecificGst === false) {
          itemGstRate = invoiceGlobalGst;
          isSpecific = false;
        } else if (it.gstRate !== null && it.gstRate !== undefined) {
          if (order.gstRate !== undefined && order.gstRate !== null && Number(it.gstRate) !== Number(order.gstRate)) {
            itemGstRate = Number(it.gstRate);
            isSpecific = true;
          } else {
            itemGstRate = invoiceGlobalGst;
            isSpecific = false;
          }
        } else {
          itemGstRate = invoiceGlobalGst;
          isSpecific = false;
        }

        const taxableAmount = itemGstRate > 0
          ? Math.round((lineGross / (1 + itemGstRate / 100)) * 100) / 100
          : lineGross;
        const gstAmount = itemGstRate > 0
          ? Math.round((lineGross - taxableAmount) * 100) / 100
          : 0;
        const lineTotal = lineGross;

        return {
          ...it,
          title: itemTitle || 'Item',
          price,
          quantity,
          itemGstRate,
          isSpecific,
          taxableAmount,
          gstAmount,
          lineTotal
        };
      });

      processedItems.forEach((it, index) => {
        // Multi-page page break: If this row will exceed page boundary, start page 2
        if (tableY + rowHeight > (doc.bufferedPageRange().count === 1 ? MAX_PAGE_1_TABLE_Y : MAX_PAGE_2_TABLE_Y)) {
          doc.addPage();
          doc.rect(0, 0, doc.page.width, 42).fill(PRIMARY);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
            .text((cfg.companyName || 'FRIENDS COLLECTIONS').toUpperCase(), 32, 14, { characterSpacing: 1 });
          doc.fillColor('#D4AF37').font('Helvetica-Bold').fontSize(8.5)
            .text(`${(cfg.invoiceTitle || 'TAX INVOICE').split('&')[0].trim()} (CONTINUED) • #${displayOrderId}`, doc.page.width - 250, 16, { align: 'right', width: 218 });

          tableY = 54;
          renderTableHeader(tableY);
          tableY += 22;
        }

        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FAF8F5';
        doc.rect(32, tableY, doc.page.width - 64, rowHeight).fill(rowBg);
        doc.rect(32, tableY, doc.page.width - 64, rowHeight).stroke(BORDER_COLOR);

        doc.fillColor(DARK).font('Helvetica').fontSize(8);
        doc.text(String(index + 1), colX.num + 4, tableY + 6);

        // Item Title
        doc.font('Helvetica-Bold').fontSize(8)
          .text(it.title, colX.item, tableY + 5, { width: 198, lineBreak: false, ellipsis: true });

        // Clean Variant details (NO "Specific" or "Global" badge printed)
        const varParts = [
          it.size && it.size.toLowerCase() !== 'no size' ? `Size: ${it.size}` : '',
          it.color ? `Color: ${it.color}` : ''
        ].filter(Boolean);
        const varTxt = varParts.join(' • ');
        if (varTxt) {
          doc.font('Helvetica').fontSize(6.8).fillColor(MUTED)
            .text(varTxt, colX.item, tableY + 16, { width: 198, lineBreak: false, ellipsis: true });
        }

        // Qty
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8)
          .text(String(it.quantity), colX.qty, tableY + 5, { align: 'center', width: 32 });

        // Product Price (Taxable Base)
        doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
          .text(`INR ${it.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX.productPrice, tableY + 5, { align: 'right', width: 84 });
        doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
          .text(it.quantity > 1 ? `INR ${(it.taxableAmount / it.quantity).toFixed(2)}/pc` : 'Taxable Base', colX.productPrice, tableY + 16, { align: 'right', width: 84 });

        // GST (Rate & Amount in table)
        doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK)
          .text(`INR ${it.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, colX.gst, tableY + 5, { align: 'right', width: 88 });
        doc.font('Helvetica').fontSize(6.8).fillColor(MUTED)
          .text(it.itemGstRate > 0 ? `${it.itemGstRate}%` : '0%', colX.gst, tableY + 16, { align: 'right', width: 88 });

        // Row Total (Product Price + GST)
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
          .text(`INR ${it.lineTotal.toLocaleString('en-IN')}`, colX.total, tableY + 5, { align: 'right', width: 89 });
        doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
          .text('Incl. All Taxes', colX.total, tableY + 16, { align: 'right', width: 89 });

        tableY += rowHeight;
      });

      // ==========================================
      // 4. SUMMARY & TOTALS SECTION
      // ==========================================
      const totalTaxable = Math.round(processedItems.reduce((sum, it) => sum + it.taxableAmount, 0) * 100) / 100;
      const totalGst = Math.round(processedItems.reduce((sum, it) => sum + it.gstAmount, 0) * 100) / 100;
      const totalProductsAmount = Math.round(processedItems.reduce((sum, it) => sum + it.lineTotal, 0) * 100) / 100;
      const hasGst = totalGst > 0;

      const totalsBoxHeight = hasGst ? (isInterState ? 94 : 106) : 74;
      let totalsY = tableY + 10;
      if (totalsY + totalsBoxHeight > doc.page.height - 95) {
        doc.addPage();
        totalsY = 40;
      }

      const totalsWidth = 230;
      const totalsX = doc.page.width - 32 - totalsWidth;
      doc.roundedRect(totalsX, totalsY, totalsWidth, totalsBoxHeight, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);

      if (hasGst) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(7.5);
        doc.text('Product Subtotal (Taxable):', totalsX + 10, totalsY + 8);
        doc.fillColor(DARK).font('Helvetica-Bold')
          .text(`INR ${totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + 115, totalsY + 8, { align: 'right', width: 105 });

        if (isInterState) {
          doc.fillColor(MUTED).font('Helvetica')
            .text('IGST (Integrated GST):', totalsX + 10, totalsY + 22);
          doc.fillColor(DARK).font('Helvetica-Bold')
            .text(`+INR ${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + 115, totalsY + 22, { align: 'right', width: 105 });

          doc.fillColor(MUTED).font('Helvetica')
            .text('Delivery Charge:', totalsX + 10, totalsY + 36);
          const shipTxt = Number(order.shippingCharge || 0) === 0 ? 'FREE' : `INR ${order.shippingCharge}`;
          doc.fillColor(GREEN).font('Helvetica-Bold')
            .text(shipTxt, totalsX + 115, totalsY + 36, { align: 'right', width: 105 });

          // Line
          doc.moveTo(totalsX + 10, totalsY + 50).lineTo(totalsX + totalsWidth - 10, totalsY + 50).stroke(BORDER_COLOR);

          // Grand Total
          doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(10)
            .text('Grand Total:', totalsX + 10, totalsY + 57);
          doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11)
            .text(`INR ${grandTotal.toLocaleString('en-IN')}`, totalsX + 80, totalsY + 56, { align: 'right', width: 140 });

          doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(6.5)
            .text(`(Product Price + IGST & all applicable taxes)`, totalsX + 10, totalsY + 76, { align: 'center', width: totalsWidth - 20 });
        } else {
          doc.fillColor(MUTED).font('Helvetica')
            .text('CGST (Central GST 50%):', totalsX + 10, totalsY + 21);
          doc.fillColor(DARK).font('Helvetica-Bold')
            .text(`+INR ${(totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + 115, totalsY + 21, { align: 'right', width: 105 });

          doc.fillColor(MUTED).font('Helvetica')
            .text('SGST (State GST 50%):', totalsX + 10, totalsY + 34);
          doc.fillColor(DARK).font('Helvetica-Bold')
            .text(`+INR ${(totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, totalsX + 115, totalsY + 34, { align: 'right', width: 105 });

          doc.fillColor(MUTED).font('Helvetica')
            .text('Delivery Charge:', totalsX + 10, totalsY + 47);
          const shipTxt = Number(order.shippingCharge || 0) === 0 ? 'FREE' : `INR ${order.shippingCharge}`;
          doc.fillColor(GREEN).font('Helvetica-Bold')
            .text(shipTxt, totalsX + 115, totalsY + 47, { align: 'right', width: 105 });

          // Line
          doc.moveTo(totalsX + 10, totalsY + 61).lineTo(totalsX + totalsWidth - 10, totalsY + 61).stroke(BORDER_COLOR);

          // Grand Total
          doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(10)
            .text('Grand Total:', totalsX + 10, totalsY + 68);
          doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11)
            .text(`INR ${grandTotal.toLocaleString('en-IN')}`, totalsX + 80, totalsY + 67, { align: 'right', width: 140 });

          doc.fillColor(MUTED).font('Helvetica-Oblique').fontSize(6.5)
            .text(`(Product Price + CGST & SGST & all applicable taxes)`, totalsX + 10, totalsY + 87, { align: 'center', width: totalsWidth - 20 });
        }
      } else {
        doc.fillColor(MUTED).font('Helvetica').fontSize(8);
        doc.text('Subtotal:', totalsX + 14, totalsY + 10);
        doc.fillColor(DARK).font('Helvetica-Bold')
          .text(`INR ${orderSubtotal.toLocaleString('en-IN')}`, totalsX + 110, totalsY + 10, { align: 'right', width: 96 });

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
      }

      // Left of Totals: Delivery Guarantee / Refund Status Banner
      const guaranteeX = 32;
      const guaranteeWidth = totalsX - guaranteeX - 12;

      if (isRefundProcessing) {
        doc.roundedRect(guaranteeX, totalsY, guaranteeWidth, totalsBoxHeight, 8).fillAndStroke('#FFFBEB', '#FCD34D');
        doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(8.5)
          .text('REFUND IN PROGRESS', guaranteeX + 12, totalsY + 8);
        doc.fillColor('#78350F').font('Helvetica-Bold').fontSize(9)
          .text(`Item is cancelled and refund is processing with ID: ${refundId}`, guaranteeX + 12, totalsY + 20, { width: guaranteeWidth - 24 });
        doc.fillColor('#92400E').font('Helvetica').fontSize(7)
          .text('The refund has been initiated and takes 5 to 7 working days to reflect in your original payment account.', guaranteeX + 12, totalsY + 41, { width: guaranteeWidth - 24 });
      } else if (isRefunded) {
        doc.roundedRect(guaranteeX, totalsY, guaranteeWidth, totalsBoxHeight, 8).fillAndStroke('#F3F4F6', '#D1D5DB');
        doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(8.5)
          .text('PAYMENT REFUNDED', guaranteeX + 12, totalsY + 8);
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(10)
          .text('Refunded', guaranteeX + 12, totalsY + 20);
        const arnText = order.paymentDetails?.refundArn ? `Bank ARN: ${order.paymentDetails.refundArn} • ` : (order.paymentDetails?.refundId ? `Refund ID: ${order.paymentDetails.refundId} • ` : '');
        doc.fillColor('#4B5563').font('Helvetica').fontSize(7.5)
          .text(`${arnText}Payment has been successfully settled and refunded back to your account.`, guaranteeX + 12, totalsY + 38, { width: guaranteeWidth - 24 });
      } else if (isCancelled) {
        doc.roundedRect(guaranteeX, totalsY, guaranteeWidth, totalsBoxHeight, 8).fillAndStroke('#FEF2F2', '#FECACA');
        doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(8.5)
          .text('ORDER CANCELLED', guaranteeX + 12, totalsY + 8);
        doc.fillColor('#7F1D1D').font('Helvetica-Bold').fontSize(10)
          .text('Item is cancelled', guaranteeX + 12, totalsY + 20);
        doc.fillColor('#991B1B').font('Helvetica').fontSize(7.5)
          .text('This order has been cancelled and garments restocked back into collection.', guaranteeX + 12, totalsY + 38, { width: guaranteeWidth - 24 });
      } else {
        doc.roundedRect(guaranteeX, totalsY, guaranteeWidth, totalsBoxHeight, 8).fillAndStroke('#F6FAF7', '#C6E3D0');
        doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9)
          .text('ESTIMATED ARRIVAL WINDOW', guaranteeX + 12, totalsY + 10);
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
          .text(deliveryRange, guaranteeX + 12, totalsY + 24);
        doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
          .text('Hand-inspected & packaged with care. Track live status using your Order Reference on our website.', guaranteeX + 12, totalsY + 40, { width: guaranteeWidth - 24 });
      }

      // ==========================================
      // 5. FOOTER & AUTHENTICITY NOTE (Strictly pinned to last page with no overflow)
      // ==========================================
      const footerY = doc.page.height - 72;
      const prevBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 5; // Prevent any accidental page break

      doc.rect(32, footerY, doc.page.width - 64, 0.75).fill(BORDER_COLOR);

      // Left Column: Terms, notes & gratitude
      const footerNotice = isRefunded
        ? 'Order Refunded • Payment Credited Back'
        : isRefundProcessing
        ? `Item is cancelled and refund is processing with ID: ${refundId}`
        : isCancelled
        ? 'Order Cancelled'
        : (cfg.footerNote || 'Thank You for Shopping with Us!');

      doc.fillColor(PRIMARY)
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(footerNotice, 32, footerY + 6, { width: 330, lineBreak: false });

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(6.8)
        .text(cfg.terms || '7-Day Easy Exchange Policy on Unworn Items with Tags Intact.', 32, footerY + 18, { width: 330, lineBreak: false });

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
