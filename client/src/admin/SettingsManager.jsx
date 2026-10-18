import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  HiOutlineColorSwatch,
  HiOutlineSpeakerphone,
  HiOutlineTruck,
  HiOutlineOfficeBuilding,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineLocationMarker,
  HiOutlineArrowRight,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useTheme, THEME_PRESETS, adjustColor } from '../context/ThemeContext';
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

const SettingsManager = () => {
  const { theme, changeTheme, applyPreset, presets } = useTheme();
  const { confirm, confirmDownload } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab control from URL (?tab=invoice, theming, hero, shipping, contact)
  const currentTab = searchParams.get('tab') || 'invoice';
  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // 1. Theme customizer state
  const [selectedPresetId, setSelectedPresetId] = useState(theme.id || 'wine');
  const [customPrimary, setCustomPrimary] = useState(theme.primary || '#54142D');
  const [customAccent, setCustomAccent] = useState(theme.accent || '#C88A65');
  const [customBg, setCustomBg] = useState(theme.bgTint || '#FAF7F2');

  // 2. Homepage Hero Headline & Copy state
  const [heroBadge, setHeroBadge] = useState("Chennai's Trendy Fashion House");
  const [heroTitle, setHeroTitle] = useState('Style That Defines You');
  const [heroDescription, setHeroDescription] = useState(
    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'
  );
  const [storeVisitText, setStoreVisitText] = useState('Visit Store');

  // 3. Announcement Bar state
  const [announcementText, setAnnouncementText] = useState('🎉 Free Shipping on Orders Above ₹999!');
  const [announcementActive, setAnnouncementActive] = useState(true);

  // 4. Shipping state
  const [shippingFee, setShippingFee] = useState('79');
  const [freeAbove, setFreeAbove] = useState('999');

  // 5. Store Info state
  const [storeAddress, setStoreAddress] = useState('7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 12');
  const [storePhone, setStorePhone] = useState('9500757024');
  const [storeEmail, setStoreEmail] = useState('friends.collection06@gmail.com');
  const [storeInstagram, setStoreInstagram] = useState('friends_collection_in');

  // 6. Universal Invoice Format state
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
    footerNote: DEFAULT_INVOICE_SETTINGS.footerNote,
    terms: DEFAULT_INVOICE_SETTINGS.terms,
    notes: DEFAULT_INVOICE_SETTINGS.notes,
    primaryColor: DEFAULT_INVOICE_SETTINGS.primaryColor,
    accentColor: DEFAULT_INVOICE_SETTINGS.accentColor
  });

  const [savingTheme, setSavingTheme] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [downloadingSample, setDownloadingSample] = useState(false);

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        const data = res.data;
        if (data.heroBadge) setHeroBadge(data.heroBadge);
        if (data.heroTitle) setHeroTitle(data.heroTitle);
        if (data.heroDescription) setHeroDescription(data.heroDescription);
        if (data.storeVisitText) setStoreVisitText(data.storeVisitText);
        if (data.announcementBar) {
          setAnnouncementText(data.announcementBar.text || '');
          setAnnouncementActive(Boolean(data.announcementBar.isActive));
        }
        if (data.shippingCharge) {
          setShippingFee(data.shippingCharge.amount?.toString() || '79');
          setFreeAbove(data.shippingCharge.freeAbove?.toString() || '999');
        }
        if (data.contactInfo) {
          setStoreAddress(data.contactInfo.address || '');
          setStorePhone(data.contactInfo.phones?.[0] || '9500757024');
          setStoreEmail(data.contactInfo.email || '');
          setStoreInstagram(data.contactInfo.instagram || '');
        }
        if (data.invoiceSettings) {
          setInvoiceForm((prev) => ({
            ...prev,
            ...data.invoiceSettings
          }));
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));
  }, []);

  // Handle Preset Selection
  const handleSelectPreset = async (presetId) => {
    setSelectedPresetId(presetId);
    const p = presets[presetId];
    if (p) {
      setCustomPrimary(p.primary);
      setCustomAccent(p.accent);
      setCustomBg(p.bgTint);
      try {
        await applyPreset(presetId);
        toast.success(`Theme updated to ${p.name}!`);
      } catch {
        toast.error('Failed to apply theme');
      }
    }
  };

  // Handle Custom Color Apply
  const handleSaveCustomTheme = async () => {
    if (savingTheme) return;
    const ok = await confirm({
      title: 'Apply Custom Brand Theme?',
      message: 'Save and apply these custom brand colors across the entire boutique website?',
      type: 'save',
      confirmText: 'Apply Theme',
      cancelText: 'Cancel',
      details: `Primary: ${customPrimary} • Accent: ${customAccent} • Background: ${customBg}`
    });
    if (!ok) return;

    setSavingTheme(true);
    try {
      const customConfig = {
        id: 'custom',
        name: 'Custom Brand Theme',
        primary: customPrimary,
        primaryLight: adjustColor(customPrimary, 0.25),
        primaryDark: adjustColor(customPrimary, -0.35),
        accent: customAccent,
        accentLight: adjustColor(customAccent, 0.25),
        accentDark: adjustColor(customAccent, -0.25),
        bgTint: customBg,
      };
      await changeTheme(customConfig);
      toast.success('Custom theme saved & applied across the website!');
    } catch {
      toast.error('Failed to save theme settings');
    } finally {
      setSavingTheme(false);
    }
  };

  // Save Hero Section & Copy
  const handleSaveHero = async (e) => {
    e.preventDefault();
    if (savingHero) return;
    const ok = await confirm({
      title: 'Update Homepage Hero Copy?',
      message: 'Are you sure you want to publish these hero headlines and promotional text to the live storefront?',
      type: 'save',
      confirmText: 'Update Hero Copy',
      cancelText: 'Keep Editing',
      details: `Headline: "${heroTitle.trim() || 'Default'}"`
    });
    if (!ok) return;

    setSavingHero(true);
    try {
      await API.put('/settings/admin/heroSection', {
        value: {
          heroBadge: heroBadge.trim(),
          heroTitle: heroTitle.trim(),
          heroDescription: heroDescription.trim(),
          storeVisitText: storeVisitText.trim(),
        },
      });
      toast.success('Homepage hero copy updated and saved to database!');
    } catch {
      toast.error('Failed to update hero copy');
    } finally {
      setSavingHero(false);
    }
  };

  // Save Announcement Bar
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (savingAnnouncement) return;
    const ok = await confirm({
      title: 'Update Top Announcement Bar?',
      message: `Save and update the store-wide announcement strip (${announcementActive ? 'ACTIVE' : 'HIDDEN'})?`,
      type: 'save',
      confirmText: 'Save Announcement',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setSavingAnnouncement(true);
    try {
      await API.put('/settings/admin/announcementBar', {
        value: { text: announcementText, isActive: announcementActive },
      });
      toast.success('Announcement bar updated!');
    } catch {
      toast.error('Failed to update announcement bar');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Save Shipping Settings
  const handleSaveShipping = async (e) => {
    e.preventDefault();
    if (savingShipping) return;
    const ok = await confirm({
      title: 'Save Shipping & Delivery Rates?',
      message: `Update standard shipping fee to ₹${shippingFee} with free delivery above ₹${freeAbove}?`,
      type: 'save',
      confirmText: 'Save Shipping Rules',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setSavingShipping(true);
    try {
      await API.put('/settings/admin/shippingCharge', {
        value: { amount: Number(shippingFee), freeAbove: Number(freeAbove) },
      });
      toast.success('Shipping settings saved!');
    } catch {
      toast.error('Failed to update shipping rules');
    } finally {
      setSavingShipping(false);
    }
  };

  // Save Contact Info
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (savingContact) return;
    const ok = await confirm({
      title: 'Save Store Contact Details?',
      message: 'Update showroom address, contact phones, and social media handles in the database?',
      type: 'save',
      confirmText: 'Save Contact Details',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setSavingContact(true);
    try {
      await API.put('/settings/admin/contactInfo', {
        value: {
          address: storeAddress,
          phones: [storePhone.trim() || '9500757024'],
          email: storeEmail,
          instagram: storeInstagram,
        },
      });
      toast.success('Store details saved!');
    } catch {
      toast.error('Failed to update store information');
    } finally {
      setSavingContact(false);
    }
  };

  // Invoice field updater
  const handleInvoiceFieldChange = (field, value) => {
    setInvoiceForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Save Invoice Settings
  const handleSaveInvoice = async (e) => {
    if (e) e.preventDefault();
    if (savingInvoice) return;
    const ok = await confirm({
      title: 'Save Universal Tax Invoice Format?',
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
      toast.success('Universal Tax Invoice format saved! Applied to all receipts, PDFs & emails.');
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      toast.error('Failed to save invoice format');
    } finally {
      setSavingInvoice(false);
    }
  };

  // Reset to Defaults
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

  // Download Live Test Sample PDF with Cool Animation
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

  const tabs = [
    { id: 'invoice', name: 'Universal Tax Invoice', icon: HiOutlineDocumentText, badge: 'Unified' },
    { id: 'theming', name: 'Theme & Brand Colors', icon: HiOutlineColorSwatch },
    { id: 'hero', name: 'Hero Headline & Copy', icon: HiOutlineSpeakerphone },
    { id: 'shipping', name: 'Shipping Rules', icon: HiOutlineTruck },
    { id: 'contact', name: 'Store Contact & Info', icon: HiOutlineOfficeBuilding },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            Store Settings & Invoice Studio
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Configure universal tax invoice format, theme colors, shipping rules, and homepage copy
          </p>
        </div>
      </div>

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent-300' : 'text-neutral-400'}`} />
              <span>{tab.name}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-accent-100 text-accent-800 border border-accent-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: UNIVERSAL TAX INVOICE FORMAT STUDIO                     */}
      {/* ============================================================== */}
      {currentTab === 'invoice' && (
        <div className="space-y-6">
          {/* Architectural Notice Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-primary-950 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-primary-900 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-accent-500/20 text-accent-300 flex items-center justify-center shrink-0 mt-0.5">
                <HiOutlineShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Unified Universal Tax Invoice Architecture</span>
                  <span className="text-[10px] bg-accent-500 text-primary-950 font-black px-2 py-0.5 rounded-full uppercase">
                    Only 1 Standard
                  </span>
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl">
                  Friends Collections strictly enforces <strong>one standardized, authentic tax invoice layout</strong> across the entire system. Any change saved here immediately updates customer printable sheets, post-purchase receipts, account order modals, email PDF attachments, and automated server-side PDF generation.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-stretch md:self-auto justify-end shrink-0">
              <button
                type="button"
                onClick={handleResetInvoiceDefaults}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
                title="Reset to Jamalia Boutique Defaults"
              >
                <HiOutlineRefresh className="w-4 h-4 text-neutral-300" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSamplePdf}
                disabled={downloadingSample}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Download Sample PDF to test print layout"
              >
                <HiOutlineDownload className="w-4 h-4 text-accent-300" />
                <span>{downloadingSample ? 'Generating...' : 'Test PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handleSaveInvoice}
                disabled={savingInvoice}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-light text-primary-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                    Universal Live Preview
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

              {/* The Universal Invoice View rendered as a card */}
              <div className="border border-neutral-200 rounded-3xl shadow-lg overflow-hidden bg-white">
                <InvoiceView
                  order={SAMPLE_PREVIEW_ORDER}
                  invoiceSettings={invoiceForm}
                  asCard={true}
                />
              </div>

              <p className="text-[11px] text-neutral-400 text-center px-4">
                💡 What you see above is the exact visual template customers see when tracking orders, downloading invoices from their account, and receiving automated PDF confirmations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: THEME STUDIO                                            */}
      {/* ============================================================== */}
      {currentTab === 'theming' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <HiOutlineColorSwatch className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-900">Dynamic Theme Studio</h2>
              <p className="text-xs text-neutral-500">
                Transform the website colors dynamically without editing code. Changes apply immediately!
              </p>
            </div>
          </div>

          {/* Curated Theme Presets */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              Curated Luxury Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Object.values(presets).map((p) => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-neutral-50/80 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{p.name}</span>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: p.primary }} title={`Primary: ${p.primary}`} />
                      <div className="w-7 h-7 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: p.accent }} title={`Accent: ${p.accent}`} />
                      <div className="w-7 h-7 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: p.bgTint }} title={`Background: ${p.bgTint}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Hex Color Pickers */}
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              Custom Hex Color Palette
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Primary Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Accent Bronze / Gold</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Background Cream Tint</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="text-right pt-4">
              <button
                type="button"
                onClick={handleSaveCustomTheme}
                disabled={savingTheme}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingTheme ? 'Applying & Saving...' : 'Save & Apply Custom Theme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: HERO SECTION & ANNOUNCEMENTS                           */}
      {/* ============================================================== */}
      {currentTab === 'hero' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveHero} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <HiOutlineSparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900">Homepage Hero Headline & Copy</h2>
                <p className="text-xs text-neutral-500">Edit the prominent title, subtitle, and badge on the homepage hero banner</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Hero Eyebrow Badge</label>
                <input
                  type="text"
                  required
                  value={heroBadge}
                  onChange={(e) => setHeroBadge(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Main Hero Headline</label>
                <input
                  type="text"
                  required
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-serif text-base focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Hero Subtitle & Brand Story</label>
                <textarea
                  rows={3}
                  required
                  value={heroDescription}
                  onChange={(e) => setHeroDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Store Visit Button Label</label>
                <input
                  type="text"
                  required
                  value={storeVisitText}
                  onChange={(e) => setStoreVisitText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                type="submit"
                disabled={savingHero}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingHero ? 'Saving Hero Copy...' : 'Save Hero Copy'}
              </button>
            </div>
          </form>

          {/* Announcement Bar */}
          <form onSubmit={handleSaveAnnouncement} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center">
                <HiOutlineSpeakerphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900">Announcement Bar</h2>
                <p className="text-xs text-neutral-500">Top strip message displayed above the navigation bar</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Announcement Text</label>
                <input
                  type="text"
                  required
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="annActive"
                  checked={announcementActive}
                  onChange={(e) => setAnnouncementActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="annActive" className="text-xs font-medium text-neutral-700 cursor-pointer">
                  Enable Announcement Bar on Storefront
                </label>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                type="submit"
                disabled={savingAnnouncement}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingAnnouncement ? 'Saving...' : 'Save Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SHIPPING RULES                                          */}
      {/* ============================================================== */}
      {currentTab === 'shipping' && (
        <form onSubmit={handleSaveShipping} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HiOutlineTruck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-900">Shipping Rules & Free Delivery</h2>
              <p className="text-xs text-neutral-500">Configure delivery charges and free shipping threshold</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Standard Shipping Fee (₹)</label>
              <input
                type="number"
                min="0"
                required
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Free Delivery Above Cart Total (₹)</label>
              <input
                type="number"
                min="0"
                required
                value={freeAbove}
                onChange={(e) => setFreeAbove(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={savingShipping}
              className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingShipping ? 'Saving...' : 'Save Shipping Rates'}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 5: STORE INFORMATION                                       */}
      {/* ============================================================== */}
      {currentTab === 'contact' && (
        <form onSubmit={handleSaveContact} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <HiOutlineOfficeBuilding className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-900">Store Information</h2>
              <p className="text-xs text-neutral-500">Physical address, primary helpline, and social links</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">Physical Boutique Address</label>
              <input
                type="text"
                required
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Primary Store Phone / WhatsApp</label>
              <input
                type="text"
                required
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Store Email</label>
              <input
                type="email"
                required
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={savingContact}
              className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingContact ? 'Saving...' : 'Save Store Info'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsManager;
