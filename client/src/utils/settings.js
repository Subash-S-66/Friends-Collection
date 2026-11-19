import API from './api';

const SETTINGS_CACHE_KEY = 'fc_store_settings_cache';

/**
 * Synchronously retrieves cached store settings from localStorage
 */
export const getCachedSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}
  return null;
};

/**
 * Persists store settings into localStorage for zero-latency initial render
 */
export const setCachedSettings = (data) => {
  try {
    if (!data || typeof data !== 'object') return;
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('store_settings_updated', { detail: data }));
  } catch {}
};

/**
 * Normalizes shipping charges, free shipping threshold, and GST rate
 * Strictly returns null for uninitialized values instead of hardcoded numbers
 */
export const parseShippingSettings = (data) => {
  if (!data || typeof data !== 'object') {
    return {
      shippingFee: null,
      freeShippingThreshold: null,
      gstPercentage: null,
      isLoaded: false
    };
  }

  let shippingFee = null;
  let freeShippingThreshold = null;
  let gstPercentage = null;

  if (data.shippingCharge && typeof data.shippingCharge === 'object') {
    if (data.shippingCharge.amount !== undefined && data.shippingCharge.amount !== null && data.shippingCharge.amount !== '') {
      shippingFee = Number(data.shippingCharge.amount);
    }
    if (data.shippingCharge.freeAbove !== undefined && data.shippingCharge.freeAbove !== null && data.shippingCharge.freeAbove !== '') {
      freeShippingThreshold = Number(data.shippingCharge.freeAbove);
    }
  }

  if (data.shippingFee !== undefined && data.shippingFee !== null && data.shippingFee !== '') {
    shippingFee = Number(data.shippingFee);
  }
  if (data.freeShippingThreshold !== undefined && data.freeShippingThreshold !== null && data.freeShippingThreshold !== '') {
    freeShippingThreshold = Number(data.freeShippingThreshold);
  }

  if (data.invoiceSettings?.gstPercentage !== undefined && data.invoiceSettings.gstPercentage !== null) {
    gstPercentage = Number(data.invoiceSettings.gstPercentage);
  } else if (data.gstPercentage !== undefined && data.gstPercentage !== null) {
    gstPercentage = Number(data.gstPercentage);
  }

  const isLoaded = shippingFee !== null || freeShippingThreshold !== null;

  return { shippingFee, freeShippingThreshold, gstPercentage, isLoaded };
};

/**
 * Fetch settings from API with cache-first and background revalidation
 */
export const fetchStoreSettings = async () => {
  try {
    const res = await API.get('/settings');
    if (res.data && typeof res.data === 'object') {
      setCachedSettings(res.data);
      return { ...parseShippingSettings(res.data), raw: res.data };
    }
  } catch (err) {
    console.warn('Could not fetch store settings:', err);
  }
  const cached = getCachedSettings();
  return { ...parseShippingSettings(cached), raw: cached };
};
