import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineDocumentText, HiOutlineScale, HiOutlineMail, HiOutlineLocationMarker } from 'react-icons/hi';
import API from '../utils/api';

const Terms = () => {
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
            <HiOutlineScale className="w-4 h-4 text-accent-700" />
            Terms of Service
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">
            Terms & Conditions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Last Updated: October 2026 • Governing {settings.storeName}
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the <strong>{settings.storeName}</strong> website, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              2. User Accounts & Google Authentication
            </h2>
            <p>
              You may register an account or sign in securely using Google OAuth. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              3. Products, Pricing & Availability
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li>All garments, sarees, and apparel displayed on our storefront are subject to availability.</li>
              <li>We make every effort to display true fabric colors accurately, though monitor displays may exhibit minor hue variations.</li>
              <li>Prices are listed in Indian Rupees (₹ INR) and include applicable taxes unless stated otherwise. We reserve the right to revise pricing or promotions at any time.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              4. Orders, Payments & Cash on Delivery (COD)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-600">
              <li><strong>Online Payments:</strong> Online transactions are processed in real-time through Razorpay via UPI, Credit/Debit cards, or NetBanking.</li>
              <li><strong>Cash on Delivery (COD):</strong> COD is available for eligible items. Items marked as COD-restricted will require pre-payment at checkout.</li>
              <li><strong>Order Cancellation:</strong> We reserve the right to decline or cancel orders in cases of stock discrepancies or suspect transactions, with immediate full refund.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              5. Shipping & Deliveries
            </h2>
            <p>
              Orders are dispatched from our Jamalia boutique in Chennai. Standard delivery timelines range from 2 to 5 business days within Tamil Nadu, and 4 to 8 business days across other regions of India.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              6. Governing Law
            </h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of India, under the jurisdiction of the courts located in Chennai, Tamil Nadu.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2">
              7. Customer Support
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

export default Terms;
