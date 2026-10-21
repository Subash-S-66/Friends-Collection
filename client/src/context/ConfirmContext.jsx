import { createContext, useContext, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
    type: 'primary', // 'save' | 'danger' | 'logout' | 'download' | 'warning' | 'primary'
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    details: null,
    isDownloading: false,
    downloadProgress: 0,
    downloadStepText: '',
    downloadSuccess: false,
  });

  const resolverRef = useRef(null);

  // Close and resolve false
  const handleCancel = useCallback(() => {
    if (confirmState.isDownloading) return; // Prevent closing mid-download
    setConfirmState((prev) => ({ ...prev, isOpen: false, isDownloading: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, [confirmState.isDownloading]);

  // Standard confirmation prompt (returns Promise<boolean>)
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        type: options.type || 'primary',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        details: options.details || null,
        isDownloading: false,
        downloadProgress: 0,
        downloadStepText: '',
        downloadSuccess: false,
      });
    });
  }, []);

  // Handle standard confirm click
  const handleConfirmAction = useCallback(() => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  // Specialized animated download confirmation
  const confirmDownload = useCallback(
    ({
      title = 'Download Tax Invoice',
      message = 'Would you like to generate and download the authentic Tax Invoice PDF?',
      orderId = '',
      downloadUrl = '',
      fileName = '',
      onExecuteDownload = null,
      details = null,
    }) => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setConfirmState({
          isOpen: true,
          title,
          message:
            message ||
            (orderId
              ? `Would you like to generate and download the official GST Tax Invoice for Order #${orderId}?`
              : 'Would you like to download this document?'),
          type: 'download',
          confirmText: 'Download Invoice PDF',
          cancelText: 'Cancel',
          details: details || (orderId ? `Order Reference: ${orderId}` : null),
          isDownloading: false,
          downloadProgress: 0,
          downloadStepText: '',
          downloadSuccess: false,
          _downloadConfig: {
            orderId,
            downloadUrl,
            fileName: fileName || (orderId ? `Invoice-${orderId}.pdf` : 'Tax-Invoice.pdf'),
            onExecuteDownload,
          },
        });
      });
    },
    []
  );

  // Trigger cool animated download sequence when user confirms download
  const startDownloadSequence = useCallback(async () => {
    const config = confirmState._downloadConfig || {};

    setConfirmState((prev) => ({
      ...prev,
      isDownloading: true,
      downloadProgress: 10,
      downloadStepText: 'Initializing authentic invoice format...',
      downloadSuccess: false,
    }));

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    try {
      await sleep(350);
      setConfirmState((prev) => ({
        ...prev,
        downloadProgress: 38,
        downloadStepText: 'Compiling GST items, addresses & tax summary...',
      }));

      await sleep(400);
      setConfirmState((prev) => ({
        ...prev,
        downloadProgress: 72,
        downloadStepText: 'Rendering vector graphics & signatures...',
      }));

      // Execute actual file retrieval / generation
      if (typeof config.onExecuteDownload === 'function') {
        await config.onExecuteDownload();
      } else if (config.downloadUrl) {
        // Fetch blob or anchor click
        try {
          let targetUrl = config.downloadUrl;
          if (
            targetUrl &&
            targetUrl.startsWith('/api') &&
            import.meta.env.VITE_API_URL &&
            import.meta.env.VITE_API_URL !== '/api'
          ) {
            targetUrl = `${import.meta.env.VITE_API_URL}${targetUrl.replace(/^\/api/, '')}`;
          }
          const headers = {};
          const token = localStorage.getItem('fc_token');
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(targetUrl, { headers });
          if (!res.ok) throw new Error('Download failed from server');
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = config.fileName || 'Tax-Invoice.pdf';
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(blobUrl);
        } catch {
          // Fallback direct open
          const link = document.createElement('a');
          link.href = config.downloadUrl;
          link.download = config.fileName || 'Tax-Invoice.pdf';
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      }

      await sleep(300);
      setConfirmState((prev) => ({
        ...prev,
        downloadProgress: 100,
        downloadStepText: 'Tax Invoice Downloaded Successfully!',
        downloadSuccess: true,
      }));

      toast.success('Invoice PDF downloaded to your device!', { icon: '📄', id: 'invoice-dl-toast' });

      // Keep success state visible for clean transition
      await sleep(850);

      setConfirmState((prev) => ({ ...prev, isOpen: false, isDownloading: false }));
      if (resolverRef.current) {
        resolverRef.current(true);
        resolverRef.current = null;
      }
    } catch (err) {
      console.error('Invoice download animation error:', err);
      toast.error('Could not generate PDF. Please try again.');
      setConfirmState((prev) => ({ ...prev, isOpen: false, isDownloading: false }));
      if (resolverRef.current) {
        resolverRef.current(false);
        resolverRef.current = null;
      }
    }
  }, [confirmState._downloadConfig]);

  return (
    <ConfirmContext.Provider
      value={{
        confirmState,
        confirm,
        confirmDownload,
        handleConfirmAction,
        handleCancel,
        startDownloadSequence,
      }}
    >
      {children}
    </ConfirmContext.Provider>
  );
};
