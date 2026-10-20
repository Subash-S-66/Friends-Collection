import { useState, useEffect } from 'react';
import {
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineDownload,
  HiOutlineDocumentText,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineExclamation,
  HiOutlineX,
  HiOutlineLockClosed
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import InvoiceView, { DEFAULT_INVOICE_SETTINGS } from '../components/InvoiceView';

const SAMPLE_PREVIEW_ORDER = {
  orderId: 'FC-SAMPLE-8899',
  createdAt: new Date().toISOString(),
  customer: {
    name: 'Priya Sharma',
    phone: '9876543210',
    secondaryPhone: '9500757024',
    email: 'priya.sharma@example.com',
    address: {
      street: 'Flat 4B, Lotus Apartments, 2nd Main Road, Anna Nagar',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040'
    }
  },
  items: [
    {
      title: 'Kanchipuram Pure Silk Bridal Saree (Crimson Red)',
      size: 'Free Size',
      color: 'Crimson Wine & Gold',
      quantity: 1,
      price: 3499
    },
    {
      title: 'Zari Embroidered Designer Anarkali Suit',
      size: 'M',
      color: 'Rose Gold',
      quantity: 1,
      price: 1899
    }
  ],
  totalAmount: 5398,
  shippingCharge: 0,
  paymentMethod: 'razorpay',
  paymentStatus: 'paid',
  status: 'confirmed',
  paymentDetails: {
    razorpayPaymentId: 'pay_sample_test_998124'
  }
};

const InvoiceSettingsManager = () => {
  const { confirm, confirmDownload } = useConfirm();

  const [invoiceForm, setInvoiceForm] = useState({
    companyName: DEFAULT_INVOICE_SETTINGS.companyName,
    tagline: DEFAULT_INVOICE_SETTINGS.tagline,
    invoiceTitle: DEFAULT_INVOICE_SETTINGS.invoiceTitle,
    address: DEFAULT_INVOICE_SETTINGS.address,
    phone: DEFAULT_INVOICE_SETTINGS.phone,
    email: DEFAULT_INVOICE_SETTINGS.email,
    gstin: DEFAULT_INVOICE_SETTINGS.gstin,
    authorizedSignatory: DEFAULT_INVOICE_SETTINGS.authorizedSignatory,
    signatorySubtitle: DEFAULT_INVOICE_SETTINGS.signatorySubtitle,
    signatureImage: '',
    footerNote: DEFAULT_INVOICE_SETTINGS.footerNote,
    terms: DEFAULT_INVOICE_SETTINGS.terms,
    notes: DEFAULT_INVOICE_SETTINGS.notes,
    primaryColor: DEFAULT_INVOICE_SETTINGS.primaryColor,
    accentColor: DEFAULT_INVOICE_SETTINGS.accentColor
  });

  const [savingInvoice, setSavingInvoice] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  // Security OTP state for modifying signature
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'upload' | 'remove'
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        if (res.data?.invoiceSettings) {
          setInvoiceForm((prev) => ({
            ...prev,
            ...res.data.invoiceSettings
          }));
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleInvoiceFieldChange = (field, value) => {
    setInvoiceForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Triggered when admin selects a signature image file
  const handleSignatureFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WEBP, SVG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Signature image file size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingFile(file);
      setPendingPreview(event.target.result);
      setPendingAction('upload');
      setWarningModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Triggered when admin requests to remove signature image
  const handleRemoveSignatureRequest = () => {
    setPendingAction('remove');
    setPendingFile(null);
    setPendingPreview(null);
    setWarningModalOpen(true);
  };

  // Dispatches OTP to admin's registered email
  const handleProceedToSendOtp = async () => {
    if (sendingOtp) return;
    setSendingOtp(true);
    try {
      const res = await API.post('/settings/admin/signature-otp');
      setMaskedEmail(res.data.maskedEmail || 'your administrator email');
      toast.success(res.data.message || 'Security verification code sent to your email!');
      setWarningModalOpen(false);
      setOtpModalOpen(true);
      setOtpCode('');
      setResendTimer(60);
    } catch (err) {
      console.error('Error requesting signature OTP:', err);
      toast.error(err.response?.data?.message || 'Failed to dispatch security OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || sendingOtp) return;
    setSendingOtp(true);
    try {
      const res = await API.post('/settings/admin/signature-otp');
      setMaskedEmail(res.data.maskedEmail || 'your administrator email');
      toast.success('A new 6-digit verification code has been dispatched.');
      setResendTimer(60);
    } catch (err) {
      console.error('Error resending signature OTP:', err);
      toast.error(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Submits OTP + image / remove action to verify and save
  const handleVerifyOtpAndSave = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Please enter the 6-digit authorization code');
      return;
    }
    if (verifyingOtp) return;

    setVerifyingOtp(true);
    try {
      const formData = new FormData();
      formData.append('otp', otpCode.trim());
      if (pendingAction === 'upload' && pendingFile) {
        formData.append('signature', pendingFile);
      } else if (pendingAction === 'remove') {
        formData.append('action', 'remove');
      }

      const res = await API.post('/settings/admin/signature-verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setInvoiceForm((prev) => ({
        ...prev,
        signatureImage: res.data.signatureImage || ''
      }));

      toast.success(res.data.message || 'Authorized signature updated successfully!');
      setOtpModalOpen(false);
      setPendingFile(null);
      setPendingPreview(null);
      setPendingAction(null);
      setOtpCode('');
    } catch (err) {
      console.error('Error verifying signature OTP:', err);
      toast.error(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSaveInvoice = async (e) => {
    if (e) e.preventDefault();
    if (savingInvoice) return;
    const ok = await confirm({
      title: 'Save Tax Invoice Format?',
      message: 'Save this invoice format? It will be applied everywhere across customer receipts, PDF downloads, and email confirmations.',
      type: 'save',
      confirmText: 'Save Invoice Format',
      cancelText: 'Keep Editing',
      details: `${invoiceForm.companyName || 'Friends Collections'} • GSTIN: ${invoiceForm.gstin || 'None'} • Title: ${invoiceForm.invoiceTitle || 'Tax Invoice'}`
    });
    if (!ok) return;

    setSavingInvoice(true);
    try {
      await API.put('/settings/admin/invoiceSettings', {
        value: invoiceForm
      });
      toast.success('Tax Invoice format saved! Applied to all receipts, PDFs & emails.');
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      toast.error('Failed to save invoice format');
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleResetInvoiceDefaults = async () => {
    const ok = await confirm({
      title: 'Restore Jamalia Boutique Defaults?',
      message: 'Reset all invoice labels, company address, and default terms to factory defaults?',
      type: 'warning',
      confirmText: 'Restore Defaults',
      cancelText: 'Keep Custom Settings'
    });
    if (ok) {
      setInvoiceForm(DEFAULT_INVOICE_SETTINGS);
      toast.success('Restored Jamalia boutique defaults. Click "Save Invoice Format" to persist.');
    }
  };

  const handleDownloadSamplePdf = async () => {
    if (downloadingSample) return;
    setDownloadingSample(true);
    try {
      await confirmDownload({
        title: 'Download Sample Tax Invoice',
        message: 'Generate and download an official sample PDF using your customized invoice settings?',
        fileName: `Sample-Tax-Invoice-${(invoiceForm.companyName || 'Friends_Collections').replace(/\s+/g, '_')}.pdf`,
        details: `${invoiceForm.companyName || 'Friends Collections'} • High Definition Vector PDF`,
        onExecuteDownload: async () => {
          const res = await API.post(
            '/orders/invoice/sample/pdf',
            { invoiceSettings: invoiceForm },
            { responseType: 'blob' }
          );
          const blob = new Blob([res.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Sample-Tax-Invoice-${(invoiceForm.companyName || 'Friends_Collections').replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        }
      });
    } catch (err) {
      console.error('Download sample error:', err);
      toast.error('Could not generate sample invoice PDF');
    } finally {
      setDownloadingSample(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <HiOutlineDocumentText className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
              Tax Invoice Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Customize official tax invoice layout, boutique branding, GSTIN, and return policies applied across receipts and PDFs.
          </p>
        </div>

        {/* Quick Actions in Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetInvoiceDefaults}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-all border border-neutral-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Reset to Jamalia Boutique Defaults"
          >
            <HiOutlineRefresh className="w-4 h-4 text-neutral-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSamplePdf}
            disabled={downloadingSample}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-all border border-neutral-200 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title="Download Sample PDF to test print layout"
          >
            <HiOutlineDownload className="w-4 h-4 text-primary" />
            <span>{downloadingSample ? 'Generating...' : 'Test PDF'}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={savingInvoice}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <HiOutlineCheck className="w-4 h-4" />
            <span>{savingInvoice ? 'Saving...' : 'Save Format'}</span>
          </button>
        </div>
      </div>

      {/* Split Screen: Form Inputs on Left, Live Interactive Invoice Sheet on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Controls (5 cols on xl) */}
        <form onSubmit={handleSaveInvoice} className="xl:col-span-5 space-y-6">
          {/* Section A: Boutique & Document Identity */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                01
              </div>
              <div>
                <h2 className="font-serif text-sm font-bold text-neutral-900">Boutique & Document Identity</h2>
                <p className="text-[11px] text-neutral-500">Header title, categories, document type and GSTIN</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Store / Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.companyName}
                  onChange={(e) => handleInvoiceFieldChange('companyName', e.target.value)}
                  placeholder="Friends Collections"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Boutique Tagline / Categories
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.tagline}
                  onChange={(e) => handleInvoiceFieldChange('tagline', e.target.value)}
                  placeholder="Traditional Silk Sarees • Designer Kurtis • Lehengas • Kids Wear"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Invoice Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceTitle}
                    onChange={(e) => handleInvoiceFieldChange('invoiceTitle', e.target.value)}
                    placeholder="TAX INVOICE & BILL OF SUPPLY"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.gstin}
                    onChange={(e) => handleInvoiceFieldChange('gstin', e.target.value.toUpperCase())}
                    placeholder="33AAACF1234M1Z5"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Boutique Address & Helplines */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                02
              </div>
              <div>
                <h2 className="font-serif text-sm font-bold text-neutral-900">Boutique Location & Helplines</h2>
                <p className="text-[11px] text-neutral-500">Official contact lines printed in invoice header</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Boutique Physical Address
                </label>
                <textarea
                  rows={2}
                  required
                  value={invoiceForm.address}
                  onChange={(e) => handleInvoiceFieldChange('address', e.target.value)}
                  placeholder="7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Customer Helpline / Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.phone}
                    onChange={(e) => handleInvoiceFieldChange('phone', e.target.value)}
                    placeholder="+91 95007 57024"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    required
                    value={invoiceForm.email}
                    onChange={(e) => handleInvoiceFieldChange('email', e.target.value)}
                    placeholder="friends.collection06@gmail.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Signatory, Policy & Notes */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                03
              </div>
              <div>
                <h2 className="font-serif text-sm font-bold text-neutral-900">Signatory Seal & Return Terms</h2>
                <p className="text-[11px] text-neutral-500">Legal authenticity note, seal and exchange policies</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Authorized Signatory Title
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.authorizedSignatory}
                    onChange={(e) => handleInvoiceFieldChange('authorizedSignatory', e.target.value)}
                    placeholder="Authorized Signatory • Jamalia Boutique"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Signatory Subtitle / Branch
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.signatorySubtitle}
                    onChange={(e) => handleInvoiceFieldChange('signatorySubtitle', e.target.value)}
                    placeholder="Friends Collections Jamalia Boutique"
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Authorized Legal Signature Image Asset */}
              <div className="pt-1 pb-1">
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Official Authorized Signature (Printed on Invoices)
                </label>
                <div className="p-4 rounded-2xl bg-neutral-50/80 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {invoiceForm.signatureImage ? (
                      <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs shrink-0">
                        <img
                          src={invoiceForm.signatureImage}
                          alt="Current Authorized Signature"
                          className="h-12 max-w-[140px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-32 border border-dashed border-neutral-300 rounded-xl bg-white flex items-center justify-center text-[11px] text-neutral-400 italic shrink-0">
                        No image uploaded
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h4 className="text-xs font-bold text-neutral-900 truncate">
                          {invoiceForm.signatureImage ? 'Custom Signature Active' : 'Default Boutique Font'}
                        </h4>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Protected asset: Changing requires Administrator Email OTP authorization.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
                      <HiOutlineUpload className="w-4 h-4" />
                      <span>{invoiceForm.signatureImage ? 'Change Image' : 'Upload Signature'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleSignatureFileSelect}
                      />
                    </label>
                    {invoiceForm.signatureImage && (
                      <button
                        type="button"
                        onClick={handleRemoveSignatureRequest}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Remove custom signature image"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Exchange & Return Policy (Terms)
                </label>
                <textarea
                  rows={2}
                  required
                  value={invoiceForm.terms}
                  onChange={(e) => handleInvoiceFieldChange('terms', e.target.value)}
                  placeholder="7-Day Easy Exchange Policy on Unworn Items with Tags Intact • Defective items replaced free of charge."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Authenticity & Computerized Invoice Note
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.notes}
                  onChange={(e) => handleInvoiceFieldChange('notes', e.target.value)}
                  placeholder="This is an authentic computer-generated Tax Invoice and requires no physical signature."
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Footer Gratitude Note
                </label>
                <input
                  type="text"
                  required
                  value={invoiceForm.footerNote}
                  onChange={(e) => handleInvoiceFieldChange('footerNote', e.target.value)}
                  placeholder="Thank You for Shopping with Friends Collections!"
                  className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Section D: Invoice Theming Palette */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                04
              </div>
              <div>
                <h2 className="font-serif text-sm font-bold text-neutral-900">Invoice Colors & Accents</h2>
                <p className="text-[11px] text-neutral-500">Color styling for invoice headings, table banners and highlights</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Invoice Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={invoiceForm.primaryColor || '#4A0E17'}
                    onChange={(e) => handleInvoiceFieldChange('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={invoiceForm.primaryColor}
                    onChange={(e) => handleInvoiceFieldChange('primaryColor', e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Invoice Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={invoiceForm.accentColor || '#C88A65'}
                    onChange={(e) => handleInvoiceFieldChange('accentColor', e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={invoiceForm.accentColor}
                    onChange={(e) => handleInvoiceFieldChange('accentColor', e.target.value)}
                    className="w-28 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetInvoiceDefaults}
              className="px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold transition-all cursor-pointer"
            >
              Reset Defaults
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSamplePdf}
                disabled={downloadingSample}
                className="px-4 py-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-50 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadingSample ? 'Generating...' : 'Test PDF'}
              </button>
              <button
                type="submit"
                disabled={savingInvoice}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {savingInvoice ? 'Saving Settings...' : 'Save Invoice Format'}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Live Interactive WYSIWYG Invoice Sheet Preview (7 cols on xl) */}
        <div className="xl:col-span-7 space-y-3 xl:sticky xl:top-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                Live Preview
              </span>
              <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                (Sample Order #FC-SAMPLE-8899)
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSamplePdf}
              disabled={downloadingSample}
              className="text-xs text-primary hover:text-primary-light font-bold flex items-center gap-1 cursor-pointer"
            >
              <HiOutlineDownload className="w-3.5 h-3.5" />
              <span>Download Live Sample PDF</span>
            </button>
          </div>

          {/* The Invoice View rendered as a card */}
          <div className="border border-neutral-200 rounded-3xl shadow-lg overflow-hidden bg-white">
            <InvoiceView
              order={SAMPLE_PREVIEW_ORDER}
              invoiceSettings={invoiceForm}
              asCard={true}
            />
          </div>

          <p className="text-[11px] text-neutral-400 text-center px-4">
            What you see above is the exact visual template customers see when tracking orders, downloading invoices from their account, and receiving automated PDF confirmations.
          </p>
        </div>
      </div>

      {/* Dynamic Warning Confirmation Modal for Legal Signatory Change */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-7 border border-neutral-200 space-y-5">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                <HiOutlineExclamation className="w-7 h-7" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setWarningModalOpen(false);
                  setPendingFile(null);
                  setPendingPreview(null);
                  setPendingAction(null);
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                Security Warning: Legal Signatory Change
              </h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                You are about to modify the official authorized signatory asset that appears on all customer receipts, tax invoices, and legal GST documents issued by Friends Collections.
              </p>
            </div>

            {/* Preview of pending change */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 block">
                {pendingAction === 'remove' ? 'Action Requested:' : 'New Signature Asset Preview:'}
              </span>
              {pendingAction === 'remove' ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  🗑️ Reverting from image signature back to standard computerized typography.
                </div>
              ) : pendingPreview ? (
                <div className="bg-white p-3 rounded-xl border border-neutral-200 flex items-center justify-center shadow-xs">
                  <img
                    src={pendingPreview}
                    alt="Pending Signature"
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
              ) : null}
            </div>

            {/* Email OTP requirement notice */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 leading-snug">
              <HiOutlineShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Identity Verification Mandate:</strong>
                <p className="text-amber-800/90 mt-0.5">
                  A 6-digit OTP verification code will be dispatched to your registered administrator email before this signature can be applied.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setWarningModalOpen(false);
                  setPendingFile(null);
                  setPendingPreview(null);
                  setPendingAction(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingOtp}
                onClick={handleProceedToSendOtp}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <HiOutlineLockClosed className="w-4 h-4" />
                <span>{sendingOtp ? 'Sending Code...' : 'Proceed & Send OTP'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic OTP Verification Modal */}
      {otpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleVerifyOtpAndSave}
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-7 border border-neutral-200 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
                <HiOutlineLockClosed className="w-6 h-6" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpModalOpen(false);
                  setOtpCode('');
                }}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                Enter Security Verification Code
              </h3>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                We sent a 6-digit one-time authorization code to:
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-lg text-xs font-mono font-bold text-neutral-900">
                {maskedEmail}
              </div>
            </div>

            {/* 6-Digit OTP Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-700">
                6-Digit Authorization Code
              </label>
              <input
                type="text"
                autoFocus
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                className="w-full text-center text-2xl font-mono font-bold tracking-[0.4em] py-3 px-4 rounded-2xl border-2 border-neutral-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-neutral-900 placeholder:text-neutral-300 transition-all uppercase"
              />
              <p className="text-[11px] text-neutral-400 text-center">
                Check your inbox and spam folder for the Friends Collections security code.
              </p>
            </div>

            {/* Resend Timer or Resend Button */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
              <span className="text-neutral-500">Didn't receive the code?</span>
              {resendTimer > 0 ? (
                <span className="text-neutral-400 font-mono text-[11px]">
                  Resend in <strong>{resendTimer}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={sendingOtp}
                  onClick={handleResendOtp}
                  className="text-primary hover:text-primary-light font-bold cursor-pointer disabled:opacity-50"
                >
                  {sendingOtp ? 'Resending...' : 'Resend Code'}
                </button>
              )}
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOtpModalOpen(false);
                  setOtpCode('');
                }}
                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifyingOtp || otpCode.trim().length !== 6}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <HiOutlineCheck className="w-4 h-4" />
                <span>{verifyingOtp ? 'Verifying...' : 'Verify & Apply Signature'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InvoiceSettingsManager;
