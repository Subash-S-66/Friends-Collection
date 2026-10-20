import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineClock,
  HiOutlineMail,
  HiOutlineExclamationCircle,
  HiOutlineWifi,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineQuestionMarkCircle,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineSparkles
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { useAlert } from '../context/AlertContext';

const DynamicAlertModal = () => {
  const { alertState, closeAlert } = useAlert();
  const {
    isOpen,
    type,
    title,
    message,
    retryAfter = 30,
    email = '',
    actionText,
    onAction,
    secondaryText,
    onSecondary
  } = alertState;

  // Live ticking countdown for rate-limit and OTP cooldown
  const [secondsLeft, setSecondsLeft] = useState(retryAfter);
  const [totalSeconds, setTotalSeconds] = useState(retryAfter);

  // Sync initial countdown whenever alert opens or retryAfter changes
  useEffect(() => {
    if (isOpen) {
      const initial = Math.max(1, parseInt(retryAfter, 10) || 30);
      setSecondsLeft(initial);
      setTotalSeconds(initial);
    }
  }, [isOpen, retryAfter]);

  // Ticking countdown effect
  useEffect(() => {
    const isTimedType = type === 'rate-limit' || type === 'otp-error' || type === 'otp-verify-error';
    if (!isOpen || !isTimedType || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, type, secondsLeft]);

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m > 0 ? `${m}m ` : ''}${s < 10 && m > 0 ? `0${s}` : s}s`;
  };

  const progressPercent = totalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100))
    : 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAlert}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden z-10 my-8"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div
            className={`h-2.5 w-full ${
              type === 'rate-limit'
                ? secondsLeft > 0
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : (type === 'otp-error' || type === 'otp-verify-error')
                ? secondsLeft > 0
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-primary animate-pulse'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-primary'
                : type === 'mail-error'
                ? 'bg-gradient-to-r from-primary via-accent to-primary-light'
                : type === 'network-error'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                : 'bg-gradient-to-r from-rose-500 to-primary'
            }`}
          />

          {/* Close button */}
          <button
            onClick={closeAlert}
            aria-label="Close dialog"
            className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            {/* ===================== RATE LIMIT POPUP ===================== */}
            {type === 'rate-limit' && (
              <div className="text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-4 bg-amber-50 text-amber-800 border border-amber-200/80">
                  {secondsLeft > 0 ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Rate Limit Protection Active
                    </>
                  ) : (
                    <>
                      <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Cooldown Complete</span>
                    </>
                  )}
                </div>

                {/* Animated Clock / Counter Visual */}
                <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
                  {/* Outer subtle spinning ring */}
                  <div
                    className={`absolute inset-0 rounded-full border-4 ${
                      secondsLeft > 0
                        ? 'border-amber-100 border-t-amber-500 animate-spin'
                        : 'border-emerald-100 border-emerald-500'
                    }`}
                    style={{ animationDuration: '3s' }}
                  />
                  {/* Center Circle */}
                  <div
                    className={`w-18 h-18 rounded-full flex flex-col items-center justify-center shadow-inner ${
                      secondsLeft > 0 ? 'bg-amber-50/80 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {secondsLeft > 0 ? (
                      <HiOutlineClock className="w-9 h-9 animate-pulse" />
                    ) : (
                      <HiOutlineCheckCircle className="w-10 h-10 text-emerald-600" />
                    )}
                  </div>
                </div>

                {/* Live Countdown Display */}
                {secondsLeft > 0 ? (
                  <div className="mb-4">
                    <div className="text-4xl font-extrabold tracking-tight text-neutral-900 font-mono">
                      {formatTime(secondsLeft)}
                    </div>
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wider mt-1">
                      Cooldown timer active — Please wait
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden mt-3 max-w-xs mx-auto border border-neutral-200/60">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                      Ready to Proceed!
                    </div>
                    <p className="text-xs font-medium text-neutral-500 mt-1">
                      The security cooldown has ended. You can try your request again.
                    </p>
                  </div>
                )}

                {/* Title & Message */}
                <h3 className="text-lg font-serif font-bold text-neutral-900 mb-2">
                  {secondsLeft > 0 ? (title || 'Too Many Requests Detected') : 'You May Now Continue'}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto mb-6">
                  {secondsLeft > 0
                    ? (message ||
                      'To protect store security and guarantee fast browsing for all shoppers, requests from this connection have been temporarily throttled. Once the timer finishes, you can retry immediately.')
                    : 'The pause period has passed. Feel free to resume your action!'}
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {secondsLeft > 0 ? (
                    <button
                      disabled
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-100 text-neutral-400 font-medium text-sm cursor-not-allowed border border-neutral-200"
                    >
                      Please wait ({formatTime(secondsLeft)})
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (onAction) onAction();
                        closeAlert();
                      }}
                      className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:-translate-y-0.5"
                    >
                      Try Again Now ✨
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (onSecondary) onSecondary();
                      closeAlert();
                    }}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-sm font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* ===================== OTP & VERIFICATION ERROR POPUP ===================== */}
            {(type === 'otp-error' || type === 'otp-verify-error') && (
              <div className="text-center sm:text-left">
                {/* Dynamic Status Badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3.5">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase border ${
                      secondsLeft > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {secondsLeft > 0 ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        <span>{type === 'otp-verify-error' ? 'Verification Alert' : 'OTP Delivery Notice'}</span>
                      </>
                    ) : (
                      <>
                        <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Ready to Retry</span>
                      </>
                    )}
                  </div>

                  {secondsLeft > 0 && (
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-lg border border-amber-200/50">
                      Try again in {formatTime(secondsLeft)}
                    </span>
                  )}
                </div>

                {/* Header Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                      secondsLeft > 0
                        ? 'bg-amber-100/80 text-amber-800 border border-amber-200/60'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                    }`}
                  >
                    {type === 'otp-verify-error' ? (
                      <HiOutlineShieldCheck className="w-7 h-7" />
                    ) : (
                      <HiOutlineMail className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-neutral-900 leading-snug">
                      {title ||
                        (type === 'otp-verify-error'
                          ? 'Verification Code Issue'
                          : 'Unable to Send Verification Code')}
                    </h3>
                    {email ? (
                      <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-mono truncate max-w-xs">
                        <span>📧</span>
                        <span className="truncate">{email}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Friends Collections Security System
                      </p>
                    )}
                  </div>
                </div>

                {/* Dynamic Message Box */}
                <div className="p-4 rounded-2xl bg-cream border border-neutral-200/80 mb-4 text-xs sm:text-sm text-neutral-700 leading-relaxed text-left">
                  {message ||
                    'Our email delivery system experienced a temporary delay dispatching your 6-digit code. Your account details remain completely safe. Please wait a moment and try again.'}
                </div>

                {/* Live Countdown Progress Bar (during cooldown) */}
                {secondsLeft > 0 && (
                  <div className="mb-5 bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-between text-xs text-amber-900 font-semibold mb-1.5">
                      <span>Cooldown active — please pause</span>
                      <span className="font-mono">{formatTime(secondsLeft)}</span>
                    </div>
                    <div className="w-full bg-amber-200/50 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-1000 ease-linear"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Helpful Guidance Cards */}
                <div className="space-y-2 mb-6 text-left">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-600">
                    <span className="font-bold text-primary">1.</span>
                    <span>
                      <strong>Check Spam & Promotions:</strong> One-time security codes may occasionally filter into secondary inboxes.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-600">
                    <span className="font-bold text-primary">2.</span>
                    <span>
                      <strong>Check Spelling:</strong> Make sure there are no typos in the target email address.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 text-xs text-emerald-900">
                    <span className="font-bold text-emerald-700">3.</span>
                    <span>
                      <strong>Instant Assistance:</strong> Our Jamalia boutique team can assist you directly on WhatsApp.
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {secondsLeft > 0 ? (
                    <button
                      disabled
                      className="flex-1 px-5 py-3 rounded-2xl bg-neutral-100 text-neutral-400 font-medium text-xs sm:text-sm cursor-not-allowed border border-neutral-200 text-center"
                    >
                      Try Again in ({formatTime(secondsLeft)})
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (onAction) onAction();
                        closeAlert();
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <HiOutlineRefresh className="w-4 h-4" />
                      <span>{actionText || 'Try Again Now ✨'}</span>
                    </button>
                  )}

                  <a
                    href={`https://wa.me/919500757024?text=${encodeURIComponent(
                      `Hello Friends Collections, I encountered an issue receiving my verification OTP code for ${email || 'my account'}. Please assist me.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeAlert}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <FaWhatsapp className="w-4 h-4 text-white" />
                    <span>WhatsApp Help</span>
                  </a>

                  <button
                    onClick={() => {
                      if (onSecondary) onSecondary();
                      closeAlert();
                    }}
                    className="px-4 py-3 rounded-2xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                  >
                    {secondaryText || 'Close'}
                  </button>
                </div>
              </div>
            )}

            {/* ===================== MAIL DELIVERY ERROR POPUP ===================== */}
            {type === 'mail-error' && (
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-3 bg-rose-50 text-rose-800 border border-rose-200/80">
                  <HiOutlineMail className="w-3.5 h-3.5 text-primary" />
                  Email Dispatch Notice
                </div>

                {/* Header Icon + Title */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                    <HiOutlineMail className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif font-bold text-neutral-900">
                      {title || 'Email Delivery Notice'}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {email ? `Target Inbox: ${email}` : 'Friends Collections Notification System'}
                    </p>
                  </div>
                </div>

                {/* Friendly explanation */}
                <div className="p-4 rounded-2xl bg-cream border border-neutral-200/60 mb-5 text-sm text-neutral-700 leading-relaxed">
                  {message ||
                    'Our email dispatch service experienced a temporary delay communicating with your mail provider. Your account details and progress remain completely safe!'}
                </div>

                {/* Actionable Tips Card */}
                <div className="space-y-2.5 mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-dark flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                      1
                    </span>
                    <span>
                      <strong>Check Spam / Junk Folder:</strong> Verification emails often land in Spam, Updates, or Promotions folders.
                    </span>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent-dark flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                      2
                    </span>
                    <span>
                      <strong>Verify Spelling:</strong> Double check that your email address does not have typos (e.g. <code>.con</code> instead of <code>.com</code>).
                    </span>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 text-[11px]">
                      3
                    </span>
                    <span>
                      <strong>Direct WhatsApp Assistance:</strong> Our boutique team can verify your account manually or help you place your order in 30 seconds!
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://wa.me/919500757024?text=${encodeURIComponent(
                      `Hello Friends Collections, I need assistance with an email verification / notification on your store website for: ${email || 'my account'}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeAlert}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#25D366] text-white font-semibold text-sm shadow-md hover:bg-[#20ba59] transition-all transform hover:-translate-y-0.5"
                  >
                    <FaWhatsapp className="w-4 h-4 text-white" />
                    Help via WhatsApp Support
                  </a>

                  <button
                    onClick={() => {
                      if (onSecondary) onSecondary();
                      closeAlert();
                    }}
                    className="px-5 py-3 rounded-2xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-sm font-medium transition-colors"
                  >
                    {secondaryText || 'I Understand'}
                  </button>
                </div>
              </div>
            )}

            {/* ===================== NETWORK / OFFLINE POPUP ===================== */}
            {type === 'network-error' && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <HiOutlineWifi className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-xl font-serif font-bold text-neutral-900 mb-2">
                  {title || 'Connection Offline'}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto mb-6">
                  {message ||
                    'We are having trouble reaching the Friends Collections server. Please check your internet connection or Wi-Fi and try again.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      if (onAction) onAction();
                      closeAlert();
                    }}
                    className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold text-sm shadow-md hover:bg-primary-dark transition-all"
                  >
                    {actionText || 'Retry Now'}
                  </button>
                  <button
                    onClick={closeAlert}
                    className="px-5 py-3 rounded-2xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-sm font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* ===================== GENERAL / CUSTOM ERROR POPUP ===================== */}
            {type === 'general-error' && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
                  <HiOutlineExclamationCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-serif font-bold text-neutral-900 mb-2">
                  {title || 'Something Went Wrong'}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed max-w-md mx-auto mb-6">
                  {message || 'An unexpected error occurred. Please try again in a few moments.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      if (onAction) onAction();
                      closeAlert();
                    }}
                    className="px-6 py-3 rounded-2xl bg-neutral-900 text-white font-semibold text-sm shadow-md hover:bg-neutral-800 transition-all"
                  >
                    {actionText || 'Dismiss'}
                  </button>
                  {secondaryText && (
                    <button
                      onClick={() => {
                        if (onSecondary) onSecondary();
                        closeAlert();
                      }}
                      className="px-5 py-3 rounded-2xl text-neutral-600 hover:bg-neutral-100 text-sm font-medium transition-colors"
                    >
                      {secondaryText}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DynamicAlertModal;
