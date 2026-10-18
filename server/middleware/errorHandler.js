const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }

  // Detect Nodemailer / SMTP delivery failures
  const isMailError =
    err.code === 'EENVELOPE' ||
    err.code === 'EAUTH' ||
    err.code === 'ESOCKET' ||
    err.command === 'MAIL FROM' ||
    (err.message && (
      err.message.toLowerCase().includes('mail') ||
      err.message.toLowerCase().includes('smtp') ||
      err.message.toLowerCase().includes('nodemailer') ||
      err.message.toLowerCase().includes('transporter')
    ));

  if (isMailError) {
    return res.status(502).json({
      error: 'MAIL_DELIVERY_FAILED',
      isMailError: true,
      message: 'Unable to deliver email at this moment due to a temporary dispatch server issue. Please check your email spelling, try resending in a few moments, or reach our boutique directly on WhatsApp (+91 95007 57024).',
      technicalDetails: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
