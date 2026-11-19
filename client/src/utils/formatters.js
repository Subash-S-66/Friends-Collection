export const formatPrice = (price) => {
  return `₹${Number(price).toLocaleString('en-IN')}`;
};

export const getDiscount = (price, salePrice) => {
  if (!salePrice || salePrice >= price) return 0;
  return Math.round(((price - salePrice) / price) * 100);
};

export const BANNER_FALLBACK = '/fallback-banner.webp';
export const PRODUCT_FALLBACK_1 = '/fallback-product-1.jpg';
export const PRODUCT_FALLBACK_2 = '/fallback-product-2.jpg';
export const CATEGORY_FALLBACK = '/fallback-product.jpg';

export const getImageUrl = (path, fallback = '/fallback-product-1.jpg', width = 800) => {
  const isBanner =
    fallback === '/fallback-banner.webp' ||
    fallback === '/fallback-banner.png' ||
    fallback === '/fallback-banner.jpg' ||
    (typeof fallback === 'string' && fallback.toLowerCase().includes('banner')) ||
    (typeof path === 'string' && path.toLowerCase().includes('banner'));

  const optimizeCloudinary = (url, targetWidth) => {
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) {
      return url;
    }
    if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/w_') || url.includes('/image/upload/q_auto')) {
      return url;
    }
    const finalWidth = targetWidth || (isBanner ? 1600 : 800);
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${finalWidth}/`);
  };

  // Strict enforcement: For banners, ALWAYS use /fallback-banner.webp when image is missing or invalid.
  // Never use product fallbacks or anything else under any circumstance.
  if (isBanner) {
    if (!path || typeof path !== 'string' || !path.trim() || path === 'null' || path === 'undefined') {
      return BANNER_FALLBACK;
    }
    const cleanBanner = path.trim();
    if (
      cleanBanner === '/fallback-banner.webp' ||
      cleanBanner === '/fallback-banner.png' ||
      cleanBanner === '/fallback-banner.jpg' ||
      cleanBanner.includes('fallback-product') ||
      cleanBanner.includes('card.png') ||
      cleanBanner.includes('logo.png') ||
      cleanBanner.includes('fallback-na')
    ) {
      return BANNER_FALLBACK;
    }
    if (cleanBanner.startsWith('http://') || cleanBanner.startsWith('https://')) {
      return optimizeCloudinary(cleanBanner, width || 1600);
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && cleanBanner.startsWith('/uploads')) {
      const backendOrigin = apiUrl.replace(/\/api\/?$/, '');
      return `${backendOrigin}${cleanBanner}`;
    }

    return cleanBanner;
  }

  const effectiveFallback = fallback;

  if (!path || typeof path !== 'string' || !path.trim() || path === 'null' || path === 'undefined') {
    return effectiveFallback;
  }
  const clean = path.trim();
  if (clean === '/uploads/card.png' || clean === '/card.png' || clean === '/fallback-product.png') {
    return effectiveFallback;
  }
  if (clean.includes('fallback-na-1')) return '/fallback-product-1.png';
  if (clean.includes('fallback-na-2')) return '/fallback-product-2.png';
  // Prevent store logo from being used as a product photo or banner
  if (clean.includes('logo.png') && !fallback.includes('logo')) {
    return effectiveFallback;
  }
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return optimizeCloudinary(clean, width || 800);
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && clean.startsWith('/uploads')) {
    const backendOrigin = apiUrl.replace(/\/api\/?$/, '');
    return `${backendOrigin}${clean}`;
  }

  return clean;
};

export const handleImageError = (e, fallback = '/fallback-product-1.jpg') => {
  if (e?.currentTarget) {
    e.currentTarget.onerror = null;
    let chosenFallback = fallback;
    const currentSrc = (e.currentTarget.src || '').toLowerCase();
    const alt = (e.currentTarget.alt || '').toLowerCase();
    const className = (e.currentTarget.className || '').toLowerCase();

    // Contextual autodetection: banners strictly use /fallback-banner.webp, never anything else!
    if (
      fallback === '/fallback-banner.webp' ||
      fallback === '/fallback-banner.jpg' ||
      fallback === '/fallback-banner.png' ||
      (typeof fallback === 'string' && fallback.toLowerCase().includes('banner')) ||
      currentSrc.includes('banner') ||
      alt.includes('banner') ||
      className.includes('banner') ||
      (e.currentTarget.closest && e.currentTarget.closest('[data-banner], .hero-banner, .banner-container, header, section[aria-label*="banner" i]'))
    ) {
      chosenFallback = BANNER_FALLBACK;
    } else if (fallback === '/fallback-product-1.jpg' || fallback === '/fallback-product-1.png') {
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

/**
 * Filter and format status history milestones for customers:
 * - Strips internal warehouse logs (e.g. "inventory restocked")
 * - Cleans raw developer/webhook jargon into elegant consumer-facing updates
 * - Deduplicates redundant status steps
 */
export const getCustomerMilestones = (statusHistory = []) => {
  if (!Array.isArray(statusHistory)) return [];

  const cleaned = [];
  const seenKeys = new Set();

  for (const h of statusHistory) {
    if (!h || !h.message) continue;
    let msg = h.message.trim();

    // 1. Convert or discard internal inventory restock logs
    if (/inventory restocked/i.test(msg) || /restocked back into/i.test(msg)) {
      msg = 'Order cancelled.';
    }

    // 2. Clean up webhook / technical jargon into customer-friendly wording
    if (/Payment received via Razorpay Webhook/i.test(msg) || /Online payment of .* received via Razorpay/i.test(msg)) {
      msg = 'Order placed & payment verified.';
    } else if (/Order placed & received at boutique with Cash on Delivery/i.test(msg)) {
      msg = 'Order placed successfully (Cash on Delivery).';
    } else if (/Refund of .* initiated via Razorpay/i.test(msg) || /Refund of .* initiated\./i.test(msg) || (/Refund of/i.test(msg) && /under process/i.test(msg))) {
      const amtMatch = msg.match(/Refund of ₹[\d,.]+/i);
      const amt = amtMatch ? amtMatch[0] : 'Refund';
      const refMatch = msg.match(/\(Refund ID:\s*([^)]+)\)/i);
      const refId = refMatch ? ` (${refMatch[1]})` : '';
      msg = `${amt} initiated${refId}. Refund under process — bank credit usually takes 5 to 7 working days.`;
    } else if (/Refund of .* confirmed & completed by bank/i.test(msg) || /Refund of .* successfully processed via Razorpay Dashboard/i.test(msg)) {
      const amtMatch = msg.match(/Refund of ₹[\d,.]+/i);
      const amt = amtMatch ? amtMatch[0] : 'Refund';
      msg = `${amt} completed & credited to your original payment account.`;
    } else if (/Order received & confirmed by admin/i.test(msg)) {
      msg = 'Order confirmed & packed with boutique care.';
    }

    // 3. Category-based deduplication (placed, cancelled, refund, confirmed, shipped, delivered)
    let dedupeKey = msg.toLowerCase();
    if (dedupeKey.includes('order placed') || dedupeKey.includes('payment verified')) {
      dedupeKey = 'milestone_placed';
    } else if (dedupeKey.includes('order cancelled') || dedupeKey.includes('cancelled')) {
      dedupeKey = 'milestone_cancelled';
    } else if (dedupeKey.includes('refund') && dedupeKey.includes('initiated')) {
      dedupeKey = 'milestone_refund_initiated';
    } else if (dedupeKey.includes('refund') && (dedupeKey.includes('completed') || dedupeKey.includes('credited'))) {
      dedupeKey = 'milestone_refund_completed';
    } else if (dedupeKey.includes('confirmed') || dedupeKey.includes('packed')) {
      dedupeKey = 'milestone_confirmed';
    } else if (dedupeKey.includes('dispatched') || dedupeKey.includes('shipped')) {
      dedupeKey = 'milestone_shipped';
    } else if (dedupeKey.includes('delivered')) {
      dedupeKey = 'milestone_delivered';
    }

    if (seenKeys.has(dedupeKey)) {
      continue;
    }
    seenKeys.add(dedupeKey);

    cleaned.push({
      ...h,
      message: msg
    });
  }

  return cleaned;
};
