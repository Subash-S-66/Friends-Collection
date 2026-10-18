import axios from 'axios';

let globalAlertHandler = null;

export const setGlobalAlertHandler = (handler) => {
  globalAlertHandler = handler;
};

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('fc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses & errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fc_token');
      localStorage.removeItem('fc_user');
    }

    // 429 Rate Limit Exceeded: show custom dynamic popup with live ticking timer
    if (error.response?.status === 429 || error.response?.data?.isRateLimit) {
      const retryAfter = error.response?.data?.retryAfter || 60;
      const message =
        error.response?.data?.message ||
        'Too many attempts detected. For your security and smooth performance, please pause before trying again.';
      globalAlertHandler?.onRateLimit?.(retryAfter, message);
    }
    // 502 / Mail Delivery Failure: show friendly email alert popup
    else if (
      error.response?.status === 502 ||
      error.response?.data?.isMailError ||
      error.response?.data?.error === 'MAIL_DELIVERY_FAILED'
    ) {
      const message =
        error.response?.data?.message ||
        'Our email service encountered a temporary delivery delay. Please check your spam folder or contact us via WhatsApp for instant assistance.';
      globalAlertHandler?.onMailError?.(message);
    }
    // Network / Offline Error: show connection popup
    else if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      globalAlertHandler?.onNetworkError?.(
        'Unable to reach the Friends Collections server. Please check your internet connection or try again shortly.'
      );
    }

    return Promise.reject(error);
  }
);

export default API;
