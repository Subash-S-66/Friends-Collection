import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineScale,
  HiOutlineRefresh,
  HiOutlineMail,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDatabase,
  HiOutlineKey
} from 'react-icons/hi';
import API from '../utils/api';

const Privacy = () => {
  const [settings, setSettings] = useState({
    storeName: 'Friends Collections',
    storeEmail: 'friends.collection.support@gmail.com',
    storePhone: '+91 95007 57024',
    whatsappNumber: '919500757024',
    storeAddress: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012, Tamil Nadu'
  });

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          setSettings((prev) => ({
            ...prev,
            ...res.data,
            storeAddress: res.data.contactInfo?.address || res.data.storeAddress || prev.storeAddress,
            storeEmail: res.data.supportEmail || res.data.storeEmail || res.data.contactInfo?.email || prev.storeEmail,
            storePhone: res.data.contactInfo?.phones?.[0] || res.data.storePhone || prev.storePhone,
            whatsappNumber: res.data.whatsappNumber || (res.data.contactInfo?.phones?.[0] ? res.data.contactInfo.phones[0].replace(/[^0-9]/g, '') : prev.whatsappNumber)
          }));
        }
      })
      .catch(() => {});
  }, []);

  const cleanPhone = (settings.storePhone || '+91 95007 57024').replace(/\s+/g, '');

  return (
    <div className="min-h-screen bg-cream py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        
        {/* Navigation Tabs between Legal Documents */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 p-1.5 bg-neutral-100 rounded-2xl border border-neutral-200 text-xs sm:text-sm font-medium">
          <Link
            to="/terms"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-white/70 transition-all"
          >
            <HiOutlineScale className="w-4 h-4 text-neutral-500" />
            <span>Terms of Service</span>
          </Link>
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-semibold shadow-sm">
            <HiOutlineShieldCheck className="w-4 h-4 text-accent-300" />
            <span>Privacy Policy</span>
          </span>
          <Link
            to="/returns"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-white/70 transition-all"
          >
            <HiOutlineRefresh className="w-4 h-4 text-neutral-500" />
            <span>Return & Refund Policy</span>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent-100 text-accent-900 border border-accent-200">
            <HiOutlineLockClosed className="w-4 h-4 text-accent-800" />
            Data Protection & Consumer Privacy
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Privacy & Data Security Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Governing {settings.storeName} • Structured under the Digital Personal Data Protection Act, 2023 (DPDP Act, India) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
          </p>
          <p className="text-[11px] text-neutral-400">
            Last Updated: November 2026 • Effective Immediately
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
          
          {/* Statutory Preamble */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1">
            <p className="font-bold text-neutral-900">
              Statutory Preamble & Commitment to Your Privacy:
            </p>
            <p>
              At <strong>{settings.storeName}</strong>, safeguarding your personal data and honoring your fundamental right to informational privacy is paramount. This comprehensive Privacy Policy explains transparently how we collect, process, store, protect, and dispose of your personal information when you use our website, mobile interface, or connect with us via Google Sign-In, Razorpay, WhatsApp, or phone.
            </p>
          </div>

          {/* Section 1: Categories of Information We Collect */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">1</span>
              <span>Categories of Information We Collect</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-900">A. Personal Identity & Contact Information:</p>
                <p className="text-neutral-600">
                  When you register, checkout, or interact with our storefront, we collect your full legal name, shipping street address, apartment/door number, landmark, city, state, postal PIN code, mobile telephone number, secondary contact number, and email address.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-900">B. 1-Click Google Authentication (OAuth 2.0):</p>
                <p className="text-neutral-600">
                  If you sign in using Google 1-Click login, Google shares only basic identity data (your verified email address, full display name, and profile picture avatar URL). <strong>We never request, access, or store your Google account password</strong>, contact book, or Google Drive data.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <p className="font-bold text-emerald-950">C. Financial & Payment Gateway Information (Zero Card Storage):</p>
                <p className="text-emerald-900">
                  All online payments are processed through <strong>Razorpay Software Private Limited</strong>, an RBI-licensed, PCI-DSS Level 1 certified payment aggregator. When you pay using UPI, Credit Card, Debit Card, or NetBanking, your financial credentials are typed directly into Razorpay&apos;s 256-bit encrypted secure payment vault. <strong>{settings.storeName} never captures, views, or stores your Credit/Debit Card numbers, expiry dates, CVVs, or UPI PINs.</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-900">D. Order, Billing & Tax Records:</p>
                <p className="text-neutral-600">
                  We maintain transactional logs of products ordered, sizes, quantities, total billing amount, chosen payment method, GSTIN (if provided for business billing), shipping status, tracking AWB numbers, and generated tax invoices.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <p className="font-bold text-neutral-900">E. Technical Device & Diagnostic Data:</p>
                <p className="text-neutral-600">
                  Like all modern e-commerce sites, our web servers log standard technical data such as IP address, browser type, device operating system, referring URL, and session tokens necessary to keep your shopping cart intact while browsing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Lawful Basis & Purposes of Data Processing */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">2</span>
              <span>Lawful Purpose & How We Use Your Data</span>
            </h2>
            <p className="text-xs text-neutral-600">
              Under the Digital Personal Data Protection Act, 2023, your personal data is processed solely for explicit, legitimate retail business purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-600">
              <li><strong>Order Fulfillment & Doorstep Delivery:</strong> Generating shipping manifests, printing dispatch labels, and routing parcels through our contracted courier partners to your doorstep.</li>
              <li><strong>Statutory Tax Invoicing (GST):</strong> Complying with Indian Goods and Services Tax laws and corporate financial audits by generating valid computerized tax invoices.</li>
              <li><strong>Customer Support & Size Exchanges:</strong> Assisting you with size consultations, inquiries, 3-day exchange requests, or refund transfers.</li>
              <li><strong>Transactional Notifications:</strong> Sending automated order confirmation messages, live courier dispatch tracking links, and delivery status alerts via WhatsApp, SMS, or email.</li>
              <li><strong>Fraud Detection & Store Security:</strong> Auditing suspicious high-volume checkouts, preventing duplicate COD abuse, and shielding our platform against malicious bot attacks.</li>
              <li><strong>Waitlist Notifications:</strong> Alerting you when an out-of-stock dress or kurti size is back in stock, only if you explicitly requested an in-stock alert.</li>
            </ul>
          </section>

          {/* Section 3: Third-Party Service Providers & Absolute No-Sale Pledge */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">3</span>
              <span>Third-Party Data Sharing & Our Absolute No-Sale Pledge</span>
            </h2>
            
            <div className="p-3.5 rounded-2xl bg-primary-50/60 border border-primary-200 text-xs text-primary-950 font-medium">
              ★ <strong>Our Unconditional Guarantee:</strong> {settings.storeName} DOES NOT sell, rent, license, or trade your personal telephone numbers, email addresses, or shopping habits to telemarketers, data brokers, or advertising networks for third-party commercial marketing.
            </div>

            <p className="text-xs text-neutral-600">
              Your personal data is shared strictly on a confidential &ldquo;need-to-know&rdquo; basis with trusted operational service partners:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-600">
              <li><strong>Logistics & Courier Networks (Delhivery, BlueDart, DTDC, India Post):</strong> We provide only your recipient name, delivery address, postal pincode, and contact number so delivery executives can deliver the parcel and call you for delivery coordination.</li>
              <li><strong>Payment Aggregators (Razorpay Software Pvt Ltd):</strong> Transmitting transaction reference codes and order values to authorize payments securely.</li>
              <li><strong>Transactional Communication Gateways:</strong> Cloud infrastructure (such as transactional email SMTP and WhatsApp business APIs) used solely to send your order confirmations and delivery updates.</li>
              <li><strong>Legal & Law Enforcement Obligations:</strong> We may disclose data only if required by a valid judicial court order, statutory subpoena, or government investigative agency under Section 69 of the Information Technology Act, 2000.</li>
            </ul>
          </section>

          {/* Section 4: Cookies & Storage Technologies */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">4</span>
              <span>Cookies & Local Browser Storage</span>
            </h2>
            <p className="text-xs text-neutral-600">
              Our website utilizes essential browser cookies and local storage tokens strictly required for the core functioning of your shopping experience:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-600">
              <li><strong>Session & Cart Persistence:</strong> Remembering items added to your shopping cart or saved delivery addresses while you browse across different pages.</li>
              <li><strong>Authentication Tokens:</strong> Maintaining your secure login state without asking you to re-enter your password on every page reload.</li>
              <li><strong>Theme & View Preferences:</strong> Caching your preference for light/dark display and catalog filter views.</li>
            </ul>
            <p className="text-xs text-neutral-500">
              You can instruct your browser to refuse all cookies or notify you when a cookie is set. However, disabling essential cookies may prevent your cart items from persisting or inhibit checkout completion.
            </p>
          </section>

          {/* Section 5: Data Security & Storage Standards */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">5</span>
              <span>Data Security Architecture & Storage Standards</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <HiOutlineLockClosed className="w-5 h-5 text-emerald-700" />
                <p className="font-bold text-neutral-900">256-Bit SSL/TLS Encryption</p>
                <p className="text-neutral-600">
                  All communications between your browser and our servers are encrypted using high-grade Transport Layer Security (TLS 1.3).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <HiOutlineKey className="w-5 h-5 text-emerald-700" />
                <p className="font-bold text-neutral-900">Cryptographic Password Hashing</p>
                <p className="text-neutral-600">
                  Customer passwords are never stored in plain text; they are protected with salted bcrypt cryptographic hashes.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <HiOutlineDatabase className="w-5 h-5 text-emerald-700" />
                <p className="font-bold text-neutral-900">Enterprise Cloud Database</p>
                <p className="text-neutral-600">
                  Data is housed in secure, firewall-protected database clusters with strict role-based administrative access controls.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Data Retention & Tax Mandates */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">6</span>
              <span>Data Retention Period</span>
            </h2>
            <p className="text-xs text-neutral-600">
              We retain your personal information only for as long as necessary to fulfill the purposes for which it was gathered:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-600">
              <li><strong>Active Accounts:</strong> Maintained for the duration of your customer relationship so you can access purchase histories and track dispatches.</li>
              <li><strong>Statutory Tax & Accounting Mandate:</strong> In accordance with Section 36 of the Central Goods and Services Tax (CGST) Act, 2017 and Indian accounting standards, sales invoices and corresponding transaction records must be legally archived for a statutory period of up to 6 years.</li>
              <li><strong>Non-Transactional Data:</strong> Temporary session logs and abandoned checkout records are automatically purged periodically.</li>
            </ul>
          </section>

          {/* Section 7: Your Privacy Rights under DPDP Act 2023 */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">7</span>
              <span>Your Statutory Rights under the DPDP Act, 2023</span>
            </h2>
            <p className="text-xs text-neutral-600">
              Under the Digital Personal Data Protection Act, 2023, you hold valuable rights regarding your personal data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Right to Access & Summary:</span>
                <span className="text-neutral-600">You may review your profile details, past orders, and download official tax invoices directly inside your Account portal anytime.</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Right to Correction & Update:</span>
                <span className="text-neutral-600">You have the right to correct inaccurate or outdated phone numbers, delivery addresses, or contact names via your profile settings.</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</span>
                <span className="text-neutral-600">You may request the deletion of your account and personal data by emailing our Privacy Desk, subject only to mandatory statutory tax retention requirements.</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="font-bold text-neutral-900 block mb-1">Right to Grievance Redressal:</span>
                <span className="text-neutral-600">You have the right to register complaints regarding data processing directly with our designated Data Protection Officer.</span>
              </div>
            </div>
          </section>

          {/* Section 8: Children's Privacy */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">8</span>
              <span>Protection of Minor Privacy</span>
            </h2>
            <p className="text-xs text-neutral-600">
              Our storefront is intended for general audiences who are competent to enter into legal contracts. We do not knowingly solicit or collect personal information from children under the age of 18 without verifiable parental consent. If we learn that we have inadvertently gathered personal data from a minor without parental consent, we will promptly delete such information from our records.
            </p>
          </section>

          {/* Section 9: Data Protection Officer & Grievance Contact */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">9</span>
              <span>Data Protection Officer & Privacy Grievance Desk</span>
            </h2>
            <p className="text-xs text-neutral-600">
              If you have any questions, wish to exercise your rights under the DPDP Act 2023, or have concerns regarding how your data is handled, please contact our designated Data Protection Officer:
            </p>

            <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-3 text-xs">
              <div className="border-b border-neutral-200 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Data Privacy Officer
                </span>
                <p className="font-bold text-sm text-neutral-900 mt-1">
                  Compliance & Privacy Officer • {settings.storeName}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-700">
                <div className="flex items-start gap-2.5">
                  <HiOutlineLocationMarker className="w-4 h-4 text-accent-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900 block">Postal Address:</span>
                    <span>{settings.storeAddress}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <HiOutlineMail className="w-4 h-4 text-accent-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900 block">Direct Privacy Email:</span>
                    <a href={`mailto:${settings.storeEmail}`} className="text-primary underline font-medium">
                      {settings.storeEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <HiOutlinePhone className="w-4 h-4 text-accent-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900 block">Helpline Number:</span>
                    <a href={`tel:${cleanPhone}`} className="text-neutral-900 font-medium">
                      {settings.storePhone}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <HiOutlineClock className="w-4 h-4 text-accent-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900 block">Response Commitment:</span>
                    <span>All verified privacy requests are acknowledged within <strong>48 hours</strong>.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-light transition-all"
          >
            ← Return to Storefront
          </Link>
          <Link
            to="/terms"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-white border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-all"
          >
            Review Terms of Service →
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Privacy;
