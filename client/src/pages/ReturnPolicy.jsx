import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineVideoCamera,
  HiOutlineMail,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineScale,
  HiOutlineDocumentText
} from 'react-icons/hi';
import API from '../utils/api';

const ReturnPolicy = () => {
  const [settings, setSettings] = useState({
    storeName: 'Friends Collections',
    storeEmail: 'friends.collection.support@gmail.com',
    storePhone: '+91 95007 57024',
    whatsappNumber: '919500757024',
    storeAddress: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012, Tamil Nadu'
  });

  const [activeSection, setActiveSection] = useState('all');

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          setSettings((prev) => ({
            ...prev,
            ...res.data,
            storeAddress: res.data.contactInfo?.address || res.data.storeAddress || prev.storeAddress,
            storeEmail: res.data.contactInfo?.email || res.data.storeEmail || prev.storeEmail,
            storePhone: res.data.contactInfo?.phones?.[0] || res.data.storePhone || prev.storePhone,
            whatsappNumber: res.data.whatsappNumber || (res.data.contactInfo?.phones?.[0] ? res.data.contactInfo.phones[0].replace(/[^0-9]/g, '') : prev.whatsappNumber)
          }));
        }
      })
      .catch(() => {});
  }, []);

  const cleanPhone = (settings.storePhone || '+91 95007 57024').replace(/\s+/g, '');
  const cleanWhatsapp = (settings.whatsappNumber || '919500757024').replace(/[^0-9]/g, '');

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
          <Link
            to="/privacy"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-white/70 transition-all"
          >
            <HiOutlineShieldCheck className="w-4 h-4 text-neutral-500" />
            <span>Privacy Policy</span>
          </Link>
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white font-semibold shadow-sm">
            <HiOutlineRefresh className="w-4 h-4 text-accent-300" />
            <span>Return & Refund Policy</span>
          </span>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent-100 text-accent-900 border border-accent-200">
            <HiOutlineShieldCheck className="w-4 h-4 text-accent-800" />
            Buyer Protection & Satisfaction Guarantee
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Cancellation, Return & Refund Policy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Governing {settings.storeName} • Prepared in full accordance with the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce) Rules, 2020.
          </p>
        </div>

        {/* Quick Highlights Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <HiOutlineClock className="w-5 h-5" />
            </div>
            <span className="text-xs text-neutral-400 font-semibold uppercase">Return Window</span>
            <span className="text-base font-bold text-neutral-900">3 Days</span>
            <span className="text-[11px] text-neutral-500 mt-1">From physical delivery date</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 mb-2">
              <HiOutlineRefresh className="w-5 h-5" />
            </div>
            <span className="text-xs text-neutral-400 font-semibold uppercase">Size Exchange</span>
            <span className="text-base font-bold text-emerald-800">Free 1st Exchange</span>
            <span className="text-[11px] text-neutral-500 mt-1">Subject to size availability</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 mb-2">
              <HiOutlineCash className="w-5 h-5" />
            </div>
            <span className="text-xs text-neutral-400 font-semibold uppercase">Refund Processing</span>
            <span className="text-base font-bold text-amber-900">5 – 7 Business Days</span>
            <span className="text-[11px] text-neutral-500 mt-1">Direct to original source / UPI</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700 mb-2">
              <HiOutlineVideoCamera className="w-5 h-5" />
            </div>
            <span className="text-xs text-neutral-400 font-semibold uppercase">Transit Damage</span>
            <span className="text-base font-bold text-purple-900">Unboxing Video</span>
            <span className="text-[11px] text-neutral-500 mt-1">Mandatory within 48 hrs</span>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200 shadow-sm space-y-8 text-neutral-700 leading-relaxed text-sm">
          
          {/* Section 1: Overview */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">1</span>
              <span>General Philosophy & Fair Customer Commitment</span>
            </h2>
            <p>
              At <strong>{settings.storeName}</strong>, we strive to deliver authentic ethnic apparel, designer sarees, anarkalis, kurtis, and festive wear crafted with superior fabrics and attention to detail. We understand that shopping for ethnic apparel online requires confidence in fit, fabric texture, and genuine condition.
            </p>
            <p>
              To maintain the highest hygiene standards, authentic fabric integrity, and transparency akin to premier e-commerce leaders like Amazon and Flipkart, our return and cancellation guidelines are structured to protect genuine shoppers while guarding against misuse, transit tampering, and fraudulent claims.
            </p>
          </section>

          {/* Section 2: Order Cancellations */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">2</span>
              <span>Order Cancellation Policy</span>
            </h2>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>A. Cancellation Prior to Dispatch (100% Full Instant Refund)</span>
                </h3>
                <p className="text-xs text-neutral-600">
                  You may cancel your order at zero cost any time before the product has been packaged and handed over to our logistics partner for dispatch.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600">
                  <li>To cancel, visit your <strong>My Orders</strong> dashboard or contact our customer desk via WhatsApp at <a href={`https://wa.me/${cleanWhatsapp}`} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">{settings.storePhone}</a> with your Order ID.</li>
                  <li>Upon cancellation before dispatch, 100% of the transaction amount (including taxes and delivery fees) will be immediately reversed back to your original payment mode (Razorpay / UPI / Card) without any cancellation fee.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                  <HiOutlineExclamationCircle className="w-5 h-5 text-amber-700" />
                  <span>B. Cancellation After Dispatch (Order in Transit)</span>
                </h3>
                <p className="text-xs text-amber-800">
                  Once an order is handed over to the courier partner and an AWB tracking number has been generated, it is classified as <em>In-Transit</em> and cannot be revoked from the vehicle.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800">
                  <li>If you no longer wish to receive the parcel, you may refuse acceptance at your doorstep when the delivery executive arrives.</li>
                  <li>For prepaid orders declined at doorstep without a defect reason, the refund will be initiated once the package completes Return-to-Origin (RTO) back to our Chennai facility, minus the outward courier freight charge.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <HiOutlineShieldCheck className="w-5 h-5 text-neutral-700" />
                  <span>C. Cancellation by {settings.storeName}</span>
                </h3>
                <p className="text-xs text-neutral-600">
                  {settings.storeName} reserves the right to decline or cancel an order under exceptional circumstances, including:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600">
                  <li>Sudden inventory exhaustion or damaged last-piece stock detected during pre-dispatch quality audit.</li>
                  <li>Incomplete, fraudulent, or unserviceable delivery pincode / phone number that cannot be verified.</li>
                  <li>Flagged suspected fraudulent payment or chargeback risk by our Razorpay gateway.</li>
                  <li>Obvious technical error or typographical glitch displaying an incorrect product price.</li>
                </ul>
                <p className="text-xs font-semibold text-neutral-800">
                  In all such store-initiated cancellations, the customer will receive an immediate notification and a 100% full refund with priority.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Return & Size Exchange Window */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">3</span>
              <span>Return & Size Exchange Eligibility Window</span>
            </h2>
            <p>
              We provide a <strong>3-Day Hassle-Free Return & Exchange Window</strong> commencing from the date and time the courier partner marks the parcel as <em>Delivered</em> to your shipping address.
            </p>
            
            <div className="border border-neutral-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-100 border-b border-neutral-200 text-neutral-800 font-bold">
                  <tr>
                    <th className="p-3">Scenario</th>
                    <th className="p-3">Eligible Resolution</th>
                    <th className="p-3">Window</th>
                    <th className="p-3">Courier Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-neutral-900">Size Mismatch / Fitting Issue</td>
                    <td className="p-3">Free Size Exchange (or Store Credit if size out of stock)</td>
                    <td className="p-3">Within 3 Days</td>
                    <td className="p-3 text-emerald-700 font-bold">Free (1st Exchange)</td>
                  </tr>
                  <tr className="bg-neutral-50">
                    <td className="p-3 font-semibold text-neutral-900">Manufacturing Defect or Stitching Flaw</td>
                    <td className="p-3">Free Replacement or 100% Full Refund</td>
                    <td className="p-3">Within 3 Days</td>
                    <td className="p-3 text-emerald-700 font-bold">Covered by Store</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-neutral-900">Transit Damage / Tampered Outer Parcel</td>
                    <td className="p-3">Immediate Replacement or 100% Full Refund</td>
                    <td className="p-3 font-bold text-amber-800">Within 48 Hours</td>
                    <td className="p-3 text-emerald-700 font-bold">Covered by Store</td>
                  </tr>
                  <tr className="bg-neutral-50">
                    <td className="p-3 font-semibold text-neutral-900">Wrong Item or Wrong Color Shipped</td>
                    <td className="p-3">Free Replacement with Correct Item or Full Refund</td>
                    <td className="p-3">Within 3 Days</td>
                    <td className="p-3 text-emerald-700 font-bold">Covered by Store</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-primary-50/50 p-4 rounded-2xl border border-primary-100 text-xs text-primary-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <HiOutlineCheckCircle className="w-4 h-4 text-primary" />
                <span>Condition Requirements for Returned Items:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                <li>The garment must remain completely <strong>unworn, unwashed, unaltered</strong>, and free from body odors, deodorants, perfumes, or makeup stains.</li>
                <li>All original brand security tags, price labels, embroidery protectors, and barcodes must remain firmly attached.</li>
                <li>The item must be returned in its original transparent polybag / fabric bag along with the retail invoice copy.</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Mandatory Unboxing Video & Courier Tamper Rule */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-700 text-white text-xs flex items-center justify-center font-mono">4</span>
              <span>Crucial: Damaged Parcel & Mandatory Unboxing Video Policy</span>
            </h2>
            
            <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-950 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <HiOutlineVideoCamera className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-purple-900">
                    Why do we require an Unboxing Video for transit damage or missing item claims?
                  </p>
                  <p className="text-purple-800 leading-relaxed">
                    Following standard industry guidelines instituted by Amazon India, Flipkart, and leading logistics networks (Delhivery, BlueDart, DTDC), high-value boutique ethnic wear is vulnerable to in-transit pilferage, courier tampering, or fraudulent claims.
                  </p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-purple-200/80 space-y-2">
                <p className="font-bold text-neutral-900 text-xs uppercase tracking-wider">
                  Unboxing Video Standards:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5 text-neutral-700">
                  <li><strong>Single Continuous Take:</strong> The video must be recorded in one single continuous shot without cuts, pauses, fast-forwarding, or post-editing.</li>
                  <li><strong>Start Before Opening:</strong> The camera must clearly capture all 6 sides of the sealed outer parcel bag, including a readable view of the printed shipping AWB label showing recipient name and barcode.</li>
                  <li><strong>Physical Opening:</strong> The package must be opened on camera, displaying the unwrapping of the garment and a close-up demonstration of the claimed defect, transit tear, or missing element.</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 pt-1">
                <HiOutlineExclamationCircle className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  Please Note: Claims for &ldquo;Parcel Arrived Empty&rdquo;, &ldquo;Garment Missing&rdquo;, or &ldquo;Physically Torn in Transit&rdquo; without an authentic unboxing video cannot be validated with our third-party logistics insurers and will be summarily rejected.
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <HiOutlineTruck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p>
                <strong>Delivery Inspection Tip:</strong> If the outer courier bag arrives severely punctured, torn, re-taped with plain brown or unbranded tape, or visibly tampered with, <strong>please refuse delivery immediately</strong> and instruct the executive to record &ldquo;Refused due to tampered packaging&rdquo;. Take a quick photo of the package and notify us immediately.
              </p>
            </div>
          </section>

          {/* Section 5: Non-Returnable & Non-Exchangeable Items */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">5</span>
              <span>Non-Returnable & Non-Exchangeable Categories</span>
            </h2>
            <p>
              In alignment with Indian e-commerce standards and personal hygiene regulations, the following items cannot be accepted for return, exchange, or refund:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700 pt-1">
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Custom Alterations:</strong> Garments customized, fitted, or altered upon specific customer instruction (e.g. customized sleeve attachment, falls & pico completed on request).</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Intimate & Innerwear:</strong> Petticoats, inner linings, shapewear, and personal hygiene essentials.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Damaged by Customer:</strong> Garments showing evidence of wash cycles, ironing burns, fabric pulls caused by jewelry, perfume fragrance, or missing original tags.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200">
                <span className="text-red-500 font-bold">✕</span>
                <span><strong>Clearance & Final Sale:</strong> Deep-discount clearance items explicitly marked as &ldquo;Final Sale — No Returns&rdquo; on the product page (unless received with a verified manufacturing defect).</span>
              </li>
            </ul>
          </section>

          {/* Section 6: Step-by-Step Return Process */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">6</span>
              <span>How to Initiate a Return or Size Exchange</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-900 font-bold flex items-center justify-center text-xs">1</span>
                <p className="font-bold text-neutral-900">Submit Request</p>
                <p className="text-neutral-600">
                  Within 3 days of delivery, message us on WhatsApp or email <a href={`mailto:${settings.storeEmail}`} className="underline text-primary">{settings.storeEmail}</a> with your Order ID, clear photos, and unboxing video.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-900 font-bold flex items-center justify-center text-xs">2</span>
                <p className="font-bold text-neutral-900">Reverse Pickup</p>
                <p className="text-neutral-600">
                  Our courier partner will arrange a doorstep pickup from your address within 24 to 48 hours. Keep the garment securely packaged with tags intact.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-900 font-bold flex items-center justify-center text-xs">3</span>
                <p className="font-bold text-neutral-900">Quality Check (QC)</p>
                <p className="text-neutral-600">
                  Upon receiving the package at our Chennai showroom, our quality control team audits the garment condition within 24 to 48 hours.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-900 font-bold flex items-center justify-center text-xs">4</span>
                <p className="font-bold text-neutral-900">Exchange or Refund</p>
                <p className="text-neutral-600">
                  Your replacement piece is dispatched with express tracking, or your full refund is reversed directly to your source account within 5-7 business days.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-500 pt-1">
              <em>Non-Serviceable Pincodes:</em> If reverse courier pickup is temporarily unserviceable at your location, our support team will authorize you to safely courier the parcel back via India Speed Post or DTDC. We will reimburse registered courier postal charges up to ₹100 upon receipt of the postal receipt.
            </p>
          </section>

          {/* Section 7: Refund Timelines & Payment Modes */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">7</span>
              <span>Refund Modes, Calculations & Timelines</span>
            </h2>
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h3 className="font-bold text-neutral-900 text-sm">A. Online Prepaid Orders (Razorpay Gateway)</h3>
                <p className="text-neutral-600">
                  Refunds are credited directly back to the original funding instrument used during checkout:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600">
                  <li><strong>UPI (Google Pay, PhonePe, Paytm, BHIM):</strong> 2 to 4 business days after QC approval.</li>
                  <li><strong>NetBanking / Debit Cards:</strong> 4 to 7 business days depending on your bank&apos;s settlement schedule.</li>
                  <li><strong>Credit Cards:</strong> Credited to your card statement within 5 to 7 business days.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h3 className="font-bold text-neutral-900 text-sm">B. Cash on Delivery (COD) Orders</h3>
                <p className="text-neutral-600">
                  Since cash is collected by the delivery agent, refunds cannot be paid in physical paper currency. For your convenience and audit safety:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600">
                  <li>Our customer care executive will securely request your verified <strong>UPI ID (VPA)</strong> or <strong>Bank Account Number + IFSC Code</strong>.</li>
                  <li>The refund is transferred directly via IMPS / NEFT or UPI within 5 to 7 business days following QC clearance.</li>
                  <li>Alternatively, customers may opt for an instant Store Credit Coupon code valid for 12 months with zero expiry deductions.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 8: Anti-Abuse & COD Fraud Prevention */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">8</span>
              <span>Fair Usage, Anti-Fraud & Abuse Prevention Policy</span>
            </h2>
            <p className="text-xs text-neutral-600">
              To keep our boutique prices honest and prevent predatory chargeback fraud, wardrobing (wearing dresses for an event and returning them), or serial fake orders:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600">
              <li><strong>Quality Check Rejection:</strong> Any returned item displaying wash detergent fragrance, body odor, foundation stains, or removed tags will fail inspection. The item will be returned to the customer at customer&apos;s expense and no refund will be issued.</li>
              <li><strong>COD Restriction:</strong> Customers who repeatedly decline or fail to accept Cash on Delivery shipments at their door (RTO) without a valid grievance will have COD privileges permanently revoked for their mobile number, email, and delivery address. Future orders will require mandatory pre-payment via Razorpay.</li>
              <li><strong>Dispute Evidence:</strong> All dispatches are electronically logged with dispatch weight logs and CCTV packaging records at our Chennai hub. These records are submitted as binding proof to payment gateways in the event of baseless chargeback claims.</li>
            </ul>
          </section>

          {/* Section 9: Customer Support & Grievance Contact */}
          <section className="space-y-3">
            <h2 className="font-serif text-lg font-bold text-neutral-900 border-b pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-mono">9</span>
              <span>Customer Helpdesk & Dispute Redressal</span>
            </h2>
            <p className="text-xs text-neutral-600">
              Have an issue with your delivery or need assistance with sizing? Our friendly support team in Chennai is here to assist you promptly:
            </p>
            
            <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <HiOutlinePhone className="w-4 h-4 text-accent-700" />
                  <span>Call & WhatsApp</span>
                </span>
                <p>
                  <a href={`tel:${cleanPhone}`} className="hover:text-primary font-semibold text-neutral-800">
                    {settings.storePhone}
                  </a>
                </p>
                <p className="text-neutral-500 text-[11px]">Mon – Sat: 10:00 AM – 8:00 PM</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <HiOutlineMail className="w-4 h-4 text-accent-700" />
                  <span>Email Helpdesk</span>
                </span>
                <p>
                  <a href={`mailto:${settings.storeEmail}`} className="hover:text-primary font-semibold text-neutral-800 break-all">
                    {settings.storeEmail}
                  </a>
                </p>
                <p className="text-neutral-500 text-[11px]">24 to 48 hr response SLA</p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                  <HiOutlineLocationMarker className="w-4 h-4 text-accent-700" />
                  <span>Physical Boutique</span>
                </span>
                <p className="text-neutral-700 leading-snug">
                  {settings.storeAddress}
                </p>
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
            ← Explore Collections
          </Link>
          <Link
            to="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-white border border-neutral-300 text-neutral-700 text-xs font-bold hover:bg-neutral-50 transition-all"
          >
            Contact Customer Support
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ReturnPolicy;
