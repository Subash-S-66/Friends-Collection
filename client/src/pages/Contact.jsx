import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineClock,
  HiCheck,
  HiOutlineExternalLink,
  HiOutlineEye,
  HiOutlineSparkles,
  HiX
} from 'react-icons/hi';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Contact = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Dress & Saree Styling Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'business'
  const [settings, setSettings] = useState({});

  // Auto-populate logged-in user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        if (res.data && typeof res.data === 'object') {
          setSettings(res.data);
        }
      })
      .catch((err) => console.error('Error loading settings in contact:', err));
  }, []);

  const storePhone = settings.storePhone || '+91 95007 57024';
  const whatsappNum = settings.whatsappNumber || '919500757024';
  const storeAddress =
    settings.storeAddress ||
    '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012, Tamil Nadu';
  const storeHours = settings.storeHours || 'Monday to Sunday: 10:00 AM – 9:30 PM';
  const storeEmail = settings.storeEmail || 'friends.collection06@gmail.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const emailTrimmed = (formData.email || '').trim();
    if (!emailTrimmed || !/\S+@\S+\.\S+/.test(emailTrimmed)) {
      toast.error('Please enter a valid email address so we can send your confirmation.');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter your message or inquiry details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/contact', {
        name: formData.name.trim(),
        email: emailTrimmed.toLowerCase(),
        phone: formData.phone.trim(),
        subject: formData.subject,
        message: formData.message.trim()
      });

      if (res.data && res.data.success) {
        toast.success('Your request has been received! Confirmation emails dispatched.');
        setSubmittedInquiry(res.data);
        setActiveTab('user');
        setShowPreviewModal(true);

        // Reset message but preserve user contact info
        setFormData((prev) => ({
          ...prev,
          message: ''
        }));
      } else {
        toast.error(res.data?.message || 'Failed to submit inquiry. Please try again.');
      }
    } catch (err) {
      console.error('Contact form submission error:', err);
      const msg = err.response?.data?.message || 'Unable to submit your request. Please try again or WhatsApp us directly.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePreview =
    activeTab === 'user'
      ? submittedInquiry?.previews?.userEmail
      : submittedInquiry?.previews?.businessEmail;

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent-700 bg-accent-100/60 px-4 py-1.5 rounded-full border border-accent-200">
            Get in Touch
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-neutral-900">
            Contact & Store Location
          </h1>
          <p className="text-sm text-neutral-600">
            We love hearing from you! Visit our boutique or reach out via phone, WhatsApp, or email.
          </p>
        </div>

        {/* View Previous Submission Preview Banner */}
        {submittedInquiry && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <HiCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900">
                  Request #{submittedInquiry.inquiry?.inquiryId} Safely Received!
                </p>
                <p className="text-xs text-emerald-700">
                  Confirmation email dispatched to <strong>{submittedInquiry.inquiry?.email}</strong> and store team.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all whitespace-nowrap"
            >
              <HiOutlineEye className="w-4 h-4" />
              <span>Show Email Preview</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Store Info Cards from DB Settings */}
          <div className="lg:col-span-6 space-y-6">
            {/* Address */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                <HiOutlineLocationMarker className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-neutral-900">Boutique Address</h3>
                <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                  {storeAddress}
                </p>
                <p className="text-xs text-neutral-500 pt-1">Landmark: Near Jamalia main junction</p>
              </div>
            </div>

            {/* Direct Phone Numbers */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center shrink-0">
                  <HiOutlinePhone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Store Helplines</h3>
                  <p className="text-xs text-neutral-500">Call for dress availability, sizes, or custom orders</p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`tel:${storePhone.replace(/\s/g, '')}`}
                  className="inline-block px-5 py-2.5 rounded-xl text-center text-xs font-bold bg-primary text-white border border-primary shadow-xs hover:bg-primary-light transition-all"
                >
                  {storePhone}
                </a>
              </div>
            </div>

            {/* Timings & WhatsApp Action */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <HiOutlineClock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Opening Hours</h3>
                  <p className="text-sm text-neutral-700 font-medium">{storeHours}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">Open All 7 Days</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/${whatsappNum}?text=Hi%20Friends%20Collections%2C%20I%20have%20an%20inquiry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FaWhatsapp className="w-5 h-5" />
                  <span>Chat on WhatsApp</span>
                </a>
                <a
                  href="https://instagram.com/friends_collection_in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FaInstagram className="w-5 h-5" />
                  <span>@friends_collection_in</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Contact Form */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-sm space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary text-[11px] font-bold uppercase tracking-wider mb-2">
                <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-600" />
                <span>Instant Confirmation & Email Preview</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-neutral-900">Send Us a Request</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Have a styling query, need a custom order, or checking sizes? Send us a request — we&apos;ll notify our boutique and send you an instant confirmation!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Deepika Sundaram"
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Your Email Address <span className="text-neutral-400 font-normal">(Receipt & confirmation will be sent here)</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. deepika@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 95007 57024"
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Inquiry / Request Topic</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                >
                  <option value="Dress & Saree Styling Inquiry">👗 Dress & Saree Styling Inquiry</option>
                  <option value="Size, Fit & Custom Stitching">📏 Size, Fit & Custom Tailoring / Stitching</option>
                  <option value="Order Status & Delivery Assistance">📦 Order Status & Delivery Assistance</option>
                  <option value="Boutique Visit & Bridal / Party Collections">✨ Boutique Visit & Bridal / Party Collections</option>
                  <option value="General Inquiry & Store Feedback">💬 General Inquiry & Store Feedback</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Your Message or Request Details</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us what style, saree, dress collection, or assistance you are looking for..."
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-light text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Dispatching Request & Generating Preview...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Request & View Email Preview</span>
                    <span className="text-amber-300">→</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreviewModal && submittedInquiry && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-accent-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-primary-950 text-white p-5 sm:p-6 flex items-start justify-between border-b border-accent-500/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                    ✓ Request Dispatched
                  </span>
                  <span className="text-xs font-mono text-accent-300">
                    #{submittedInquiry.inquiry?.inquiryId}
                  </span>
                </div>
                <h3 className="font-serif text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                  <span>Emails Generated & Dispatched</span>
                </h3>
                <p className="text-xs text-neutral-300 max-w-xl">
                  An email has been sent to the business email and a confirmation receipt to your email address. Below is the live preview of both emails.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
                title="Close Preview"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-neutral-100 border-b border-neutral-200 px-4 sm:px-6 pt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('user')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'user'
                      ? 'bg-white text-primary border-t-2 border-primary shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  <HiOutlineMail className="w-4 h-4 text-emerald-600" />
                  <span>Sender Confirmation Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('business')}
                  className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'business'
                      ? 'bg-white text-primary border-t-2 border-primary shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  <HiOutlineMail className="w-4 h-4 text-amber-600" />
                  <span>Boutique Business Email</span>
                </button>
              </div>

              {activePreview?.previewUrl && (
                <a
                  href={activePreview.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 text-xs font-semibold text-primary hover:text-primary-light flex items-center gap-1.5 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 transition-all"
                >
                  <HiOutlineExternalLink className="w-4 h-4" />
                  <span>Open Live Ethereal View</span>
                </a>
              )}
            </div>

            {/* Email Metadata Strip */}
            <div className="bg-neutral-50 px-4 sm:px-6 py-2.5 border-b border-neutral-200 text-xs text-neutral-600 flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p>
                  <strong className="text-neutral-800">To:</strong> {activePreview?.to || '—'}
                </p>
                <p>
                  <strong className="text-neutral-800">Subject:</strong> {activePreview?.subject || '—'}
                </p>
              </div>
              <div className="text-[11px] text-neutral-500 bg-white px-2.5 py-1 rounded-md border border-neutral-200">
                {activeTab === 'user' ? '📥 Delivered to customer' : '📥 Delivered to store desk'}
              </div>
            </div>

            {/* Live HTML Email Preview Frame */}
            <div className="flex-1 overflow-hidden p-2 sm:p-4 bg-neutral-200/40">
              <div className="w-full h-[440px] sm:h-[480px] bg-white rounded-2xl shadow-inner border border-neutral-300 overflow-hidden">
                <iframe
                  title="Live Email Preview"
                  srcDoc={activePreview?.html || '<p style="padding:20px;text-align:center;">Preview loading...</p>'}
                  className="w-full h-full border-0"
                  sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                />
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-white p-4 sm:p-5 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={`https://wa.me/${whatsappNum}?text=Hi%20Friends%20Collections%2C%20I%20have%20an%20inquiry%20regarding%20request%20%23${submittedInquiry.inquiry?.inquiryId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <FaWhatsapp className="w-4 h-4" />
                <span>Chat on WhatsApp ({storePhone})</span>
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Contact;
