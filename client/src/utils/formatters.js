export const formatPrice = (price) => {
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

export const getDiscount = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const BANNER_FALLBACK = '/fallback-banner.png';
export const PRODUCT_FALLBACK_1 = '/fallback-product-1.png';
export const PRODUCT_FALLBACK_2 = '/fallback-product-2.png';
export const CATEGORY_FALLBACK = '/fallback-product.png';

export const getImageUrl = (path, fallback = '/fallback-product-1.png') => {
  const isBanner =
    fallback === '/fallback-banner.png' ||
    fallback === '/fallback-banner.jpg' ||
    (typeof path === 'string' && path.toLowerCase().includes('banner'));

  const effectiveFallback = isBanner ? BANNER_FALLBACK : fallback;

  if (!path || typeof path !== 'string' || !path.trim() || path === 'null' || path === 'undefined') {
    return effectiveFallback;
  }
  const clean = path.trim();
  if (clean === '/uploads/card.png' || clean === '/card.png' || clean === '/fallback-product.png') {
    return effectiveFallback;
  }
  if (clean === '/fallback-banner.png' || clean === '/fallback-banner.jpg') {
    return BANNER_FALLBACK;
  }
  if (clean.includes('fallback-na-1')) return isBanner ? BANNER_FALLBACK : '/fallback-product-1.png';
  if (clean.includes('fallback-na-2')) return isBanner ? BANNER_FALLBACK : '/fallback-product-2.png';
  // Prevent store logo from being used as a product photo or banner
  if (clean.includes('logo.png') && !fallback.includes('logo')) {
    return effectiveFallback;
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

    // Contextual autodetection: banners strictly use fallback-banner.png, never product fallbacks
    if (
      fallback === '/fallback-banner.jpg' ||
      fallback === '/fallback-banner.png' ||
      currentSrc.includes('banner') ||
      alt.includes('banner') ||
      className.includes('banner')
    ) {
      chosenFallback = BANNER_FALLBACK;
    } else if (fallback === '/fallback-product-1.png') {
      if (currentSrc.includes('category') || alt.includes('category') || className.includes('category')) {
        chosenFallback = CATEGORY_FALLBACK;
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
