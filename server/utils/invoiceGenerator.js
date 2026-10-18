const PDFDocument = require('pdfkit');

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
 * Generate a PDF invoice Buffer for a given Order
 * @param {Object} order - Mongoose Order document or plain object
 * @returns {Promise<Buffer>}
 */
function generateInvoicePdf(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Tax Invoice - ${order.orderId}`,
          Author: 'Friends Collections',
          Subject: `Order #${order.orderId} Tax Invoice & Bill of Supply`
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      const MAROON = '#4A0E17';
      const GOLD = '#C88A65';
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
      // 1. TOP HEADER BANNER
      // ==========================================
      doc.rect(0, 0, doc.page.width, 100).fill(MAROON);

      // Store Title
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(22)
        .text('FRIENDS COLLECTIONS', 36, 26, { characterSpacing: 1.5 });

      // Tagline
      doc.fillColor('#E2BFB3')
        .font('Helvetica')
        .fontSize(8.5)
        .text('LUXURY ETHNIC & CONTEMPORARY WEAR • JAMALIA BOUTIQUE', 36, 52, { characterSpacing: 1 });

      // Contact & Address
      doc.fillColor('#F5EDE4')
        .font('Helvetica')
        .fontSize(8)
        .text('7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 600012 | WhatsApp: +91 95007 57024', 36, 68);

      // Invoice Badge on Top Right
      doc.rect(doc.page.width - 190, 24, 154, 52).fillAndStroke('#380910', GOLD);
      doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('TAX INVOICE', doc.page.width - 180, 32, { align: 'center', width: 134 });
      doc.fillColor('#D4AF37')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(order.orderId || 'FC-ORDER', doc.page.width - 180, 48, { align: 'center', width: 134 });

      // ==========================================
      // 2. METADATA CARDS (Bill To & Order Details)
      // ==========================================
      const boxY = 115;
      const boxHeight = 110;
      const boxWidth = (doc.page.width - 72 - 14) / 2;

      // Left Box: Delivery Address
      doc.roundedRect(36, boxY, boxWidth, boxHeight, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.fillColor(MAROON)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('DELIVERY ADDRESS', 48, boxY + 12);

      const customer = order.customer || {};
      const addr = customer.address || {};

      doc.fillColor(DARK)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(customer.name || 'Valued Customer', 48, boxY + 28);

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(8.5)
        .text(addr.street || '', 48, boxY + 43, { width: boxWidth - 24 })
        .text(`${addr.city || 'Chennai'}, ${addr.state || 'Tamil Nadu'} - ${addr.pincode || ''}`, 48, boxY + 57)
        .text(`Phone: +91 ${customer.phone || ''}${customer.secondaryPhone ? ' / +91 ' + customer.secondaryPhone : ''}`, 48, boxY + 72)
        .text(`Email: ${customer.email || 'N/A'}`, 48, boxY + 86);

      // Right Box: Order & Payment Info
      const rightBoxX = 36 + boxWidth + 14;
      doc.roundedRect(rightBoxX, boxY, boxWidth, boxHeight, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);

      doc.fillColor(MAROON)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .text('ORDER & PAYMENT DETAILS', rightBoxX + 12, boxY + 12);

      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5);
      doc.text('Order Date:', rightBoxX + 12, boxY + 28);
      doc.fillColor(DARK).font('Helvetica-Bold').text(orderDate, rightBoxX + 90, boxY + 28);

      doc.fillColor(MUTED).font('Helvetica').text('Expected Date:', rightBoxX + 12, boxY + 43);
      doc.fillColor(GREEN).font('Helvetica-Bold').text(deliveryRange, rightBoxX + 90, boxY + 43);

      doc.fillColor(MUTED).font('Helvetica').text('Payment Method:', rightBoxX + 12, boxY + 58);
      const methodLabel = order.paymentMethod === 'razorpay' ? 'Razorpay Online' : 'Cash on Delivery (COD)';
      doc.fillColor(DARK).font('Helvetica-Bold').text(methodLabel, rightBoxX + 90, boxY + 58);

      doc.fillColor(MUTED).font('Helvetica').text('Payment Status:', rightBoxX + 12, boxY + 73);
      const statusLabel = isPaid ? 'PAID / CONFIRMED' : 'PAYMENT PENDING';
      doc.fillColor(isPaid ? GREEN : '#C05621').font('Helvetica-Bold').text(statusLabel, rightBoxX + 90, boxY + 73);

      if (order.paymentDetails?.razorpayPaymentId) {
        doc.fillColor(MUTED).font('Helvetica').text('Transaction ID:', rightBoxX + 12, boxY + 88);
        doc.fillColor(DARK).font('Helvetica').text(order.paymentDetails.razorpayPaymentId, rightBoxX + 90, boxY + 88);
      } else {
        doc.fillColor(MUTED).font('Helvetica').text('Tracking Status:', rightBoxX + 12, boxY + 88);
        doc.fillColor(DARK).font('Helvetica').text((order.status || 'Confirmed').toUpperCase(), rightBoxX + 90, boxY + 88);
      }

      // ==========================================
      // 3. ITEMS TABLE
      // ==========================================
      let tableY = boxY + boxHeight + 18;
      const colX = {
        num: 36,
        item: 60,
        variant: 260,
        qty: 370,
        price: 430,
        total: 500
      };

      // Table Header Row
      doc.rect(36, tableY, doc.page.width - 72, 24).fill(MAROON);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
      doc.text('#', colX.num + 6, tableY + 7);
      doc.text('DRESS / ITEM', colX.item, tableY + 7);
      doc.text('VARIANT / SIZE', colX.variant, tableY + 7);
      doc.text('QTY', colX.qty, tableY + 7, { align: 'center', width: 40 });
      doc.text('UNIT PRICE', colX.price, tableY + 7, { align: 'right', width: 55 });
      doc.text('TOTAL', colX.total, tableY + 7, { align: 'right', width: 55 });

      tableY += 24;

      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((it, index) => {
        const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FAF8F5';
        doc.rect(36, tableY, doc.page.width - 72, 28).fill(rowBg);

        // Row border
        doc.rect(36, tableY, doc.page.width - 72, 28).stroke(BORDER_COLOR);

        doc.fillColor(DARK).font('Helvetica').fontSize(8.5);
        doc.text(String(index + 1), colX.num + 6, tableY + 9);

        // Item Title
        doc.font('Helvetica-Bold')
          .text(it.title || 'Designer Dress', colX.item, tableY + 9, { width: 190, lineBreak: false });

        // Variant / Color / Size
        const varTxt = [it.color, it.size].filter(Boolean).join(' • ') || 'Standard';
        doc.font('Helvetica').fillColor(MUTED).text(varTxt, colX.variant, tableY + 9, { width: 100 });

        // Qty
        doc.fillColor(DARK).text(String(it.quantity || 1), colX.qty, tableY + 9, { align: 'center', width: 40 });

        // Unit Price
        doc.text(`INR ${Number(it.price || 0).toLocaleString('en-IN')}`, colX.price, tableY + 9, { align: 'right', width: 55 });

        // Row Total
        const rowTotal = (Number(it.price || 0) * Number(it.quantity || 1));
        doc.font('Helvetica-Bold')
          .text(`INR ${rowTotal.toLocaleString('en-IN')}`, colX.total, tableY + 9, { align: 'right', width: 55 });

        tableY += 28;
      });

      // ==========================================
      // 4. SUMMARY & TOTALS SECTION
      // ==========================================
      const totalsY = tableY + 12;
      const totalsWidth = 220;
      const totalsX = doc.page.width - 36 - totalsWidth;

      doc.roundedRect(totalsX, totalsY, totalsWidth, 80, 8).fillAndStroke(LIGHT_BG, BORDER_COLOR);

      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5);
      doc.text('Subtotal:', totalsX + 16, totalsY + 12);
      doc.fillColor(DARK).font('Helvetica-Bold')
        .text(`INR ${Number(order.totalAmount || 0).toLocaleString('en-IN')}`, totalsX + 120, totalsY + 12, { align: 'right', width: 85 });

      doc.fillColor(MUTED).font('Helvetica')
        .text('Delivery Charge:', totalsX + 16, totalsY + 28);
      const shipTxt = Number(order.shippingCharge || 0) === 0 ? 'FREE' : `INR ${order.shippingCharge}`;
      doc.fillColor(GREEN).font('Helvetica-Bold')
        .text(shipTxt, totalsX + 120, totalsY + 28, { align: 'right', width: 85 });

      // Horizontal line
      doc.moveTo(totalsX + 16, totalsY + 44).lineTo(totalsX + totalsWidth - 16, totalsY + 44).stroke(BORDER_COLOR);

      // Grand Total
      doc.fillColor(MAROON).font('Helvetica-Bold').fontSize(11)
        .text('Grand Total:', totalsX + 16, totalsY + 54);
      doc.fillColor(MAROON).font('Helvetica-Bold').fontSize(12)
        .text(`INR ${grandTotal.toLocaleString('en-IN')}`, totalsX + 100, totalsY + 53, { align: 'right', width: 105 });

      // Left of Totals: Delivery Guarantee Banner
      const guaranteeX = 36;
      const guaranteeWidth = totalsX - guaranteeX - 16;
      doc.roundedRect(guaranteeX, totalsY, guaranteeWidth, 80, 8).fillAndStroke('#F6FAF7', '#C6E3D0');
      doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(9.5)
        .text('ESTIMATED DELIVERY WINDOW', guaranteeX + 14, totalsY + 12);
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11)
        .text(deliveryRange, guaranteeX + 14, totalsY + 28);
      doc.fillColor(MUTED).font('Helvetica').fontSize(8)
        .text('Your package is being hand-inspected & securely packaged at our Jamalia boutique. Track live updates using your Order ID on our website.', guaranteeX + 14, totalsY + 46, { width: guaranteeWidth - 28 });

      // ==========================================
      // 5. FOOTER & AUTHENTICITY NOTE
      // ==========================================
      const footerY = doc.page.height - 75;
      doc.rect(36, footerY, doc.page.width - 72, 1).fill(BORDER_COLOR);

      doc.fillColor(MAROON)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('Thank You for Shopping with Friends Collections!', 36, footerY + 10, { align: 'center', width: doc.page.width - 72 });

      doc.fillColor(MUTED)
        .font('Helvetica')
        .fontSize(7.5)
        .text('7-Day Easy Exchange Policy on Unworn Items with Tags Intact • Jamalia, Perambur, Chennai - 600012', 36, footerY + 24, { align: 'center', width: doc.page.width - 72 })
        .text('This is an authentic computer-generated Tax Invoice and requires no physical signature.', 36, footerY + 36, { align: 'center', width: doc.page.width - 72 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf,
  getExpectedDeliveryRange
};
