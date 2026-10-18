import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineTrash,
  HiOutlineLogout,
  HiOutlineDownload,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineX,
  HiOutlineSave,
  HiOutlineDocumentText,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { useConfirm } from '../context/ConfirmContext';

const DynamicConfirmModal = () => {
  const {
    confirmState,
    handleConfirmAction,
    handleCancel,
    startDownloadSequence,
  } = useConfirm();

  const {
    isOpen,
    title,
    message,
    type,
    confirmText,
    cancelText,
    details,
    isDownloading,
    downloadProgress,
    downloadStepText,
    downloadSuccess,
  } = confirmState;

  // Listen for Escape key to close modal (if not currently downloading)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDownloading) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDownloading, handleCancel]);

  if (!isOpen) return null;

  // Color schemes based on action type
  const themeStyles = {
    save: {
      bar: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100 ring-4 ring-emerald-500/10',
      button:
        'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25',
      badgeLabel: 'Save Changes',
      icon: HiOutlineSave,
    },
    danger: {
      bar: 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100 ring-4 ring-rose-500/10',
      button:
        'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-lg shadow-rose-600/25',
      badgeLabel: 'Remove Item',
      icon: HiOutlineTrash,
    },
    logout: {
      bar: 'bg-gradient-to-r from-red-500 via-amber-500 to-rose-600',
      badgeBg: 'bg-amber-50 text-amber-900 border-amber-200',
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100 ring-4 ring-rose-500/10',
      button:
        'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-600/25',
      badgeLabel: 'Security Check',
      icon: HiOutlineLogout,
    },
    download: {
      bar: 'bg-gradient-to-r from-blue-500 via-indigo-500 to-accent',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100 ring-4 ring-blue-500/10',
      button:
        'bg-gradient-to-r from-primary via-primary-dark to-neutral-900 hover:from-primary-dark hover:to-neutral-950 text-white shadow-lg shadow-primary/25',
      badgeLabel: 'Official Tax Invoice',
      icon: HiOutlineDownload,
    },
    warning: {
      bar: 'bg-gradient-to-r from-amber-500 to-rose-500',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100 ring-4 ring-amber-500/10',
      button:
        'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-600/25',
      badgeLabel: 'Confirmation',
      icon: HiOutlineExclamationCircle,
    },
    primary: {
      bar: 'bg-gradient-to-r from-primary via-accent to-primary-light',
      badgeBg: 'bg-cream text-primary-dark border-accent-200',
      iconBg: 'bg-primary/10 text-primary border border-primary/20 ring-4 ring-primary/10',
      button:
        'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-neutral-900 text-white shadow-lg shadow-primary/25',
      badgeLabel: 'Please Confirm',
      icon: HiOutlineSparkles,
    },
  };

  const currentTheme = themeStyles[type] || themeStyles.primary;
  const IconComponent = currentTheme.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isDownloading) handleCancel();
          }}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200/80 overflow-hidden z-10 my-8"
        >
          {/* Top Decorative Gradient Accent Bar */}
          <div className={`h-2.5 w-full ${currentTheme.bar}`} />

          {/* Close button (Hidden during active download) */}
          {!isDownloading && (
            <button
              onClick={handleCancel}
              aria-label="Close confirmation dialog"
              className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          )}

          <div className="p-6 sm:p-8">
            {/* ===================== ANIMATED DOWNLOAD PROGRESS VIEW ===================== */}
            {isDownloading ? (
              <div className="text-center py-4">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-5 bg-blue-50 text-blue-800 border border-blue-200">
                  <HiOutlineDocumentText className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>GST Invoice Generator</span>
                </div>

                {/* Animated Graphic & Spinning Progress Halo */}
                <div className="relative mx-auto w-28 h-28 mb-6 flex items-center justify-center">
                  {/* Outer spinning gradient ring */}
                  <div
                    className={`absolute inset-0 rounded-full border-4 ${
                      downloadSuccess
                        ? 'border-emerald-500 scale-105 transition-transform'
                        : 'border-blue-100 border-t-primary animate-spin'
                    }`}
                    style={{ animationDuration: '1.2s' }}
                  />

                  {/* Pulsing Center Icon */}
                  <div
                    className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-inner transition-colors duration-500 ${
                      downloadSuccess
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {downloadSuccess ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 14 }}
                      >
                        <HiOutlineCheckCircle className="w-12 h-12 text-emerald-600" />
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <HiOutlineDownload className="w-10 h-10" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Percentage Counter */}
                <div className="mb-3">
                  <div className="text-4xl font-extrabold tracking-tight text-neutral-900 font-mono">
                    {downloadProgress}%
                  </div>
                  <p className="text-xs font-semibold text-neutral-500 mt-1 h-5">
                    {downloadStepText || 'Generating invoice...'}
                  </p>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden max-w-xs mx-auto border border-neutral-200/80 mb-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-accent to-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>

                <p className="text-[11px] text-neutral-400 mt-3">
                  {downloadSuccess
                    ? 'Saved directly to your browser downloads folder.'
                    : 'Please hold on while we build your PDF file...'}
                </p>
              </div>
            ) : (
              /* ===================== STANDARD CONFIRMATION VIEW ===================== */
              <div className="text-center">
                {/* Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4 border ${currentTheme.badgeBg}`}
                >
                  <IconComponent className="w-3.5 h-3.5" />
                  <span>{currentTheme.badgeLabel}</span>
                </div>

                {/* Main Icon Visual */}
                <div
                  className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:scale-105 ${currentTheme.iconBg}`}
                >
                  <IconComponent className="w-8 h-8" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif font-bold text-neutral-900 mb-2 leading-tight">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-sm text-neutral-600 leading-relaxed mb-4 max-w-sm mx-auto">
                  {message}
                </p>

                {/* Optional Details Box */}
                {details && (
                  <div className="mb-6 p-3 rounded-2xl bg-cream-light/80 border border-accent-200/60 text-xs font-medium text-neutral-700 text-center">
                    {details}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 justify-center mt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:w-1/2 px-5 py-3 rounded-2xl border border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 text-xs font-bold transition-all cursor-pointer"
                  >
                    {cancelText}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (type === 'download') {
                        startDownloadSequence();
                      } else {
                        handleConfirmAction();
                      }
                    }}
                    className={`w-full sm:w-1/2 px-5 py-3 rounded-2xl text-xs font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${currentTheme.button}`}
                  >
                    {confirmText}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DynamicConfirmModal;
