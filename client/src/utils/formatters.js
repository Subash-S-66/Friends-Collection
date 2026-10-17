export const formatPrice = (price) => {
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

export const getDiscount = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const getImageUrl = (path) => {
  if (!path) return '/logo.png';
  if (path.startsWith('http')) return path;
  return path;
};

export const truncate = (str, len = 60) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
};

export const getStatusColor = (status) => {
  const colors = {
    pending: 'warning',
    confirmed: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'error'
  };
  return colors[status] || 'info';
};
