export const formatPrice = (price) => {
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

export const getDiscount = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const getImageUrl = (path, fallback = '/fallback-product-1.png') => {
  if (!path || typeof path !== 'string' || !path.trim() || path === 'null' || path === 'undefined') {
    return fallback;
  }
  const clean = path.trim();
  if (clean === '/uploads/card.png' || clean === '/card.png' || clean === '/fallback-product.png') {
    return fallback;
  }
  if (clean === '/fallback-banner.png' || clean === '/fallback-banner.jpg') {
    return '/fallback-banner.jpg';
  }
  if (clean.includes('fallback-na-1')) return '/fallback-product-1.png';
  if (clean.includes('fallback-na-2')) return '/fallback-product-2.png';
  // Prevent store logo from being used as a product photo
  if (clean.includes('logo.png') && !fallback.includes('logo')) {
    return fallback;
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && clean.startsWith('/uploads')) {
    const backendOrigin = apiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${clean}`;
  }

  return clean;
};

export const handleImageError = (e, fallback = '/fallback-product-1.png') => {
  if (e?.currentTarget) {
    e.currentTarget.onerror = null;
    let chosenFallback = fallback;
    const currentSrc = (e.currentTarget.src || '').toLowerCase();
    const alt = (e.currentTarget.alt || '').toLowerCase();
    const className = (e.currentTarget.className || '').toLowerCase();

    // Contextual autodetection if default fallback was provided
    if (fallback === '/fallback-product-1.png') {
      if (currentSrc.includes('banner') || alt.includes('banner') || className.includes('banner')) {
        chosenFallback = '/fallback-banner.jpg';
      } else if (currentSrc.includes('category') || alt.includes('category') || className.includes('category')) {
        chosenFallback = '/fallback-product.png';
      }
    }

    e.currentTarget.src = chosenFallback;
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
