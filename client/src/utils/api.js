import axios from 'axios';

let globalAlertHandler = null;

export const setGlobalAlertHandler = (handler) => {
  globalAlertHandler = handler;
};

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000 // 15 seconds timeout prevents non-stop spinning everywhere
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

    // 1. Timeout / Aborted Error: prevent infinite spinning and prompt user to try again
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      const url = error.config?.url || '';
      const isOtp =
        url.includes('token') ||
        url.includes('otp') ||
        url.includes('email-change') ||
        url.includes('forgot-password') ||
        url.includes('verification');

      globalAlertHandler?.onOtpError?.({
        title: isOtp ? 'Verification Code Timed Out' : 'Server Request Timed Out',
        message:
          'The server took too long to deliver your request. Please try again in a few moments instead of waiting.',
        retryAfter: 15
      });
      return Promise.reject(error);
    }

    // 2. 429 Rate Limit Exceeded: show custom dynamic popup with live ticking timer
    if (error.response?.status === 429 || error.response?.data?.isRateLimit) {
      const retryAfter = error.response?.data?.retryAfter || 60;
      const message =
        error.response?.data?.message ||
        'Too many attempts detected. For your security and smooth performance, please pause before trying again.';
      globalAlertHandler?.onRateLimit?.(retryAfter, message);
    }
    // 3. 502 / Mail Delivery or OTP Failure: show friendly dynamic alert popup
    else if (
      error.response?.status === 502 ||
      error.response?.data?.isMailError ||
      error.response?.data?.isOtpError ||
      error.response?.data?.error === 'MAIL_DELIVERY_FAILED'
    ) {
      const message =
        error.response?.data?.message ||
        'Unable to deliver verification code right now due to a temporary dispatch delay. Please try again in 30 seconds or contact us on WhatsApp.';
      const email = error.response?.data?.email || '';
      const retryAfter = error.response?.data?.retryAfter || 30;
      globalAlertHandler?.onOtpError?.({
        title: 'Unable to Send Verification Code',
        message,
        email,
        retryAfter
      });
    }
    // 4. 503 / Cloud Storage (Cloudinary) Unreachable: show user-friendly storage alert popup
    else if (
      error.response?.status === 503 &&
      (error.response?.data?.isStorageError ||
       error.response?.data?.code === 'CLOUDINARY_UNREACHABLE' ||
       error.response?.data?.error === 'CLOUD_STORAGE_UNREACHABLE' ||
       error.response?.data?.message?.toLowerCase().includes('cloudinary') ||
       error.response?.data?.message?.toLowerCase().includes('cloud storage'))
    ) {
      const message =
        error.response?.data?.message ||
        'Cloud storage (Cloudinary) is currently unreachable. Please check your connection or try again later.';
      const retryAfter = error.response?.data?.retryAfter || 30;
      globalAlertHandler?.onStorageError?.({
        title: 'Cloud Storage Unreachable',
        message,
        retryAfter
      });
    }
    // 5. Network / Offline Error: show connection popup
    else if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      globalAlertHandler?.onNetworkError?.(
        'Unable to reach the Friends Collections server. Please check your internet connection or try again shortly.'
      );
    }

    return Promise.reject(error);
  }
);

export default API;
