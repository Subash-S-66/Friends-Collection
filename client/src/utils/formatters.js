export const formatPrice = (price) => {
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

export const getDiscount = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const getImageUrl = (path, fallback = '/fallback-product-1.png') => {
  if (!path) return fallback;
  if (path === '/uploads/card.png' || path === '/card.png' || path === '/fallback-product.png') {
    return fallback;
  }
  if (path.includes('fallback-na-1')) return '/fallback-product-1.png';
  if (path.includes('fallback-na-2')) return '/fallback-product-2.png';
  // Prevent store logo from being used as a product photo
  if (path.includes('logo.png') && !fallback.includes('logo')) {
    return fallback;
  }
  if (path.startsWith('http')) return path;

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && path.startsWith('/uploads')) {
    const backendOrigin = apiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${path}`;
  }

  return path;
};

export const handleImageError = (e, fallback = '/fallback-product-1.png') => {
  if (e?.currentTarget) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallback;
  }
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
