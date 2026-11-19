import API from './api';
import { getImageUrl } from './formatters';

/**
 * Ultra-fast client-side product caching and background prefetching
 * Enables instantaneous 0ms transitions when opening product detail pages
 */

const cache = new Map();
const inFlight = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

export const getCachedProduct = (slug) => {
  if (!slug) return null;
  const entry = cache.get(slug);
  if (entry && Date.now() - entry.timestamp < TTL) {
    return entry.data;
  }
  if (entry) cache.delete(slug);
  return null;
};

export const setCachedProduct = (slug, data) => {
  if (!slug || !data) return;
  cache.set(slug, {
    data,
    timestamp: Date.now()
  });
  // Cap cache size to avoid memory buildup
  if (cache.size > 60) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
};

export const prefetchProduct = (slug) => {
  if (!slug) return;
  if (getCachedProduct(slug)) return;
  if (inFlight.has(slug)) return inFlight.get(slug);

  const p = API.get(`/products/${slug}`)
    .then((res) => {
      if (res.data) {
        setCachedProduct(slug, res.data);
        // Preload hero image into browser network disk cache
        const firstImg = res.data.images?.[0] || res.data.image;
        if (firstImg) {
          const img = new Image();
          img.src = getImageUrl(firstImg, '/fallback-product-1.jpg', 900);
        }
      }
    })
    .catch(() => {})
    .finally(() => {
      inFlight.delete(slug);
    });

  inFlight.set(slug, p);
  return p;
};
