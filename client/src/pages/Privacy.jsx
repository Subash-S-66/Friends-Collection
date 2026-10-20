import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineMail, HiOutlineLocationMarker } from 'react-icons/hi';
import API from '../utils/api';

const Privacy = () => {
  const [settings, setSettings] = useState({
    storeName: 'Friends Collections',
    storeEmail: 'friends.collection06@gmail.com',
    storePhone: '+91 95007 57024',
    storeAddress: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai - 600012'
  });

  useEffect(() => {
    API.get('/settings').then(res => {
      if (res.data && Object.keys(res.data).length > 0) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent-100 text-accent-800 border border-accent-200">
            <HiOutlineShieldCheck className="w-4 h-4 text-accent-700" />
            Trust & Transparency
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">
            Privacy Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Last Updated: October 2026 • Effective for {settings.storeName}
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              1. Introduction
            </h2>
            <p>
              Welcome to <strong>{settings.storeName}</strong> (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). We are committed to protecting your personal information and your right to privacy. This Privacy Policy describes how we collect, use, and protect your data when you visit our storefront or use Google Sign-In and Razorpay checkout on our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li><strong>Contact & Delivery Details:</strong> Your name, email address, phone number, and physical shipping address when placing an order or registering.</li>
              <li><strong>Google Authentication:</strong> When you choose 1-Click Sign-In with Google, we receive basic profile info (your verified email, display name, and avatar) via Google OAuth. We do not receive or store your Google password.</li>
              <li><strong>Payment Information:</strong> Online transactions are handled through Razorpay. We do not store credit/debit card numbers, CVVs, or UPI PINs on our servers.</li>
              <li><strong>Order History:</strong> Record of garments purchased, sizes selected, tracking status, and generated invoices.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              3. How We Use Your Information
            </h2>
            <p>We process your personal information for purposes based on legitimate boutique business interests:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>To fulfill, ship, and deliver your boutique fashion orders.</li>
              <li>To send order confirmation emails, digital invoices (PDF), and live dispatch updates.</li>
              <li>To verify your identity and protect against fraudulent checkout transactions.</li>
              <li>To send back-in-stock notifications for products you subscribed to on our waitlist.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              4. Data Sharing & Third Parties
            </h2>
            <p>
              We do <strong>not</strong> sell, rent, or trade your personal data to marketers. Your data is only shared with trusted service providers essential for store operations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li><strong>Razorpay:</strong> To process secure online payments.</li>
              <li><strong>Google OAuth:</strong> To provide instant, passwordless authentication.</li>
              <li><strong>Courier Partners:</strong> To deliver physical parcels to your shipping address.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              5. Your Rights & Data Deletion
            </h2>
            <p>
              You have the right to review, update, or request the deletion of your account and personal information. To request account deletion or data removal, please contact us at <a href={`mailto:${settings.storeEmail}`} className="text-primary font-semibold underline">{settings.storeEmail}</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              6. Contact Us
            </h2>
            <div className="bg-neutral-50 rounded-2xl p-4 space-y-2 border border-neutral-200">
              <p className="font-semibold text-neutral-900">{settings.storeName}</p>
              <p className="flex items-center gap-2 text-xs text-neutral-600">
                <HiOutlineLocationMarker className="w-4 h-4 text-accent-700 shrink-0" />
                <span>{settings.storeAddress}</span>
              </p>
              <p className="flex items-center gap-2 text-xs text-neutral-600">
                <HiOutlineMail className="w-4 h-4 text-accent-700 shrink-0" />
                <span>{settings.storeEmail}</span>
              </p>
            </div>
          </section>
        </div>

        {/* Footer Navigation Back to Store */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-light transition-all"
          >
            ← Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
