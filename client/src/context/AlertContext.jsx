import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setGlobalAlertHandler } from '../utils/api';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'general-error', // 'rate-limit' | 'mail-error' | 'network-error' | 'general-error'
    title: '',
    message: '',
    retryAfter: 60,
    email: '',
    actionText: '',
    onAction: null,
    secondaryText: '',
    onSecondary: null
  });

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const showRateLimitAlert = useCallback((seconds = 60, customMessage = '') => {
    setAlertState({
      isOpen: true,
      type: 'rate-limit',
      title: 'Too Many Requests — Please Pause a Moment',
      message:
        customMessage ||
        'To protect store security and keep our boutique server fast for everyone, requests have been temporarily paused. Please wait for the timer below before trying again.',
      retryAfter: Math.max(5, parseInt(seconds, 10) || 60),
      actionText: 'I Understand',
      onAction: null
    });
  }, []);

  const showMailErrorAlert = useCallback((customMessage = '', email = '') => {
    setAlertState({
      isOpen: true,
      type: 'mail-error',
      title: 'Email Delivery Notice',
      message:
        customMessage ||
        'Our email dispatch server encountered a temporary delay reaching your inbox. Please check your spam folder or reach our boutique team on WhatsApp for instant assistance.',
      email,
      actionText: 'Contact Store on WhatsApp',
      onAction: () => {
        const text = encodeURIComponent(
          `Hello Friends Collections, I need help with email verification / account notification for ${email || 'my account'}.`
        );
        window.open(`https://wa.me/919500757024?text=${text}`, '_blank');
      },
      secondaryText: 'Dismiss'
    });
  }, []);

  const showOtpErrorAlert = useCallback((opts = {}) => {
    const {
      title = 'Unable to Send Verification Code',
      message = '',
      email = '',
      retryAfter = 30,
      onRetry = null,
      isVerification = false
    } = opts;

    setAlertState({
      isOpen: true,
      type: isVerification ? 'otp-verify-error' : 'otp-error',
      title,
      message:
        message ||
        (isVerification
          ? 'The verification code could not be processed at this moment. Please double check the code for typos or request a fresh OTP.'
          : 'Our email dispatch system could not send the verification code to your inbox right now. Please try again in a few moments or reach our team on WhatsApp for instant assistance.'),
      retryAfter: Math.max(5, parseInt(retryAfter, 10) || 30),
      email: email || '',
      actionText: isVerification ? 'Try Entering Again' : 'Try Again Now',
      onAction: onRetry,
      secondaryText: 'Close'
    });
  }, []);

  const showCustomAlert = useCallback((opts = {}) => {
    setAlertState({
      isOpen: true,
      type: opts.type || 'general-error',
      title: opts.title || 'Notice',
      message: opts.message || 'An unexpected event occurred. Please try again.',
      retryAfter: opts.retryAfter || 60,
      email: opts.email || '',
      actionText: opts.actionText || 'OK',
      onAction: opts.onAction || null,
      secondaryText: opts.secondaryText || ''
    });
  }, []);

  // Register global axios interceptor hook
  useEffect(() => {
    setGlobalAlertHandler({
      onRateLimit: (seconds, message) => showRateLimitAlert(seconds, message),
      onOtpError: (opts) => showOtpErrorAlert(opts),
      onMailError: (message) => showMailErrorAlert(message),
      onNetworkError: (message) =>
        showCustomAlert({
          type: 'network-error',
          title: 'Connection Offline',
          message:
            message ||
            'Unable to reach Friends Collections server. Please check your internet connection and try again.'
        })
    });
  }, [showRateLimitAlert, showMailErrorAlert, showOtpErrorAlert, showCustomAlert]);

  return (
    <AlertContext.Provider
      value={{
        alertState,
        closeAlert,
        showRateLimitAlert,
        showMailErrorAlert,
        showOtpErrorAlert,
        showCustomAlert
      }}
    >
      {children}
    </AlertContext.Provider>
  );
};
