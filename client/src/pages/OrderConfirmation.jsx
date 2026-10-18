import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  HiCheckCircle,
  HiOutlineShoppingBag,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiArrowRight,
  HiOutlineDownload,
  HiOutlineTruck,
  HiOutlineClipboardCopy,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlinePrinter,
  HiOutlineExternalLink,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';
import InvoiceView from '../components/InvoiceView';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);
  const [showInvoice, setShowInvoice] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!order && orderId) {
      API.get(`/orders/track/${orderId}`)
        .then((res) => setOrder(res.data))
        .catch((err) => console.error('Track order error:', err))
        .finally(() => setLoading(false));
    }
  }, [orderId, order]);

  // Calculate Expected Delivery Range (3 to 6 business days from order placement)
  const getExpectedDeliveryRange = (orderDate) => {
    const d = new Date(orderDate || Date.now());
    const start = new Date(d);
    start.setDate(d.getDate() + 3);
    const end = new Date(d);
    end.setDate(d.getDate() + 6);

    const startStr = start.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
    const endStr = end.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return `${startStr} – ${endStr}`;
  };

  const handleCopyOrderId = () => {
    const idToCopy = order?.orderId || orderId;
    if (idToCopy) {
      navigator.clipboard.writeText(idToCopy);
      toast.success('Order Reference copied to clipboard!', { icon: '📋' });
    }
  };

  const handleDownloadPdf = async () => {
    if (!order?.orderId) return;
    setDownloadingPdf(true);
    toast.loading('Generating your official Tax Invoice PDF...', { id: 'pdf-dl' });
    try {
      const response = await fetch(`/api/orders/${order.orderId}/invoice.pdf`);
      if (!response.ok) throw new Error('Could not download PDF invoice');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Invoice-${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Tax Invoice PDF downloaded successfully!', { id: 'pdf-dl', icon: '📄' });
    } catch (err) {
      console.error('Invoice download error:', err);
      toast.error('Could not download PDF directly. Opening printable invoice view...', { id: 'pdf-dl' });
      setShowInvoice(true);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-accent-300 border-t-primary rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase font-bold tracking-widest text-neutral-500">
          Loading your order confirmation...
        </span>
      </div>
    );
  }

  const effectiveOrderId = order?.orderId || orderId;
  const deliveryRange = getExpectedDeliveryRange(order?.createdAt);
  const isPaid = order?.paymentStatus === 'paid';
  const grandTotal = (Number(order?.totalAmount) || 0) + (Number(order?.shippingCharge) || 0);

  const whatsappMessage = encodeURIComponent(
    `Hello Friends Collections! I placed an order with Order ID #${effectiveOrderId}. Please confirm my order details.`
  );

  // Stepper milestones
  const steps = [
    { key: 'placed', label: 'Order Placed', desc: 'Received at Jamalia Store', done: true },
    { key: 'confirmed', label: 'Confirmed & Packaged', desc: isPaid ? 'Paid & Verified' : 'Awaiting Dispatch', done: isPaid || order?.status === 'confirmed' || order?.status === 'shipped' || order?.status === 'delivered' },
    { key: 'shipped', label: 'Dispatched / In Transit', desc: order?.tracking?.courier || 'Express Courier', done: order?.status === 'shipped' || order?.status === 'delivered' },
    { key: 'delivered', label: 'Delivered', desc: 'At Your Doorstep', done: order?.status === 'delivered' }
  ];

  return (
    <div className="min-h-screen bg-cream py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Main Success Hero Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-card text-center space-y-6 relative overflow-hidden">
          {/* Subtle Royal Background Accent */}
          <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-primary via-accent to-primary" />
          
          {/* Animated Celebration Badge */}
          <div className="relative inline-block mx-auto">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-200">
              <HiCheckCircle className="w-12 h-12 sm:w-14 sm:h-14 animate-scale-up" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-accent text-white shadow-md">
              <HiOutlineSparkles className="w-4 h-4" />
            </span>
          </div>

          {/* Heading & Thank You Message */}
          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200 inline-block">
              {isPaid ? '✦ Payment Verified & Order Confirmed ✦' : '✦ Order Received • Cash on Delivery ✦'}
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-neutral-900 leading-tight">
              Thank You for Shopping with Us!
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Dear <strong className="text-neutral-900">{order?.customer?.name || 'Valued Customer'}</strong>, your order has been received. Our boutique artisans at Jamalia, Chennai are packing your garments with supreme care.
            </p>
          </div>

          {/* Order ID Reference Pill with 1-Click Copy */}
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-cream-dark/60 border border-accent-200 text-xs sm:text-sm">
            <span className="text-neutral-500 font-medium">Order Reference:</span>
            <span className="font-mono font-bold text-primary text-base sm:text-lg">{effectiveOrderId}</span>
            <button
              onClick={handleCopyOrderId}
              type="button"
              className="ml-1 p-1 rounded-lg text-accent-700 hover:text-primary hover:bg-white/80 transition-colors"
              title="Copy Order Reference"
            >
              <HiOutlineClipboardCopy className="w-4 h-4" />
            </button>
          </div>

          {/* Expected Delivery Date Range Banner */}
          <div className="bg-gradient-to-r from-cream via-cream-light to-cream rounded-2xl border border-accent-200/80 p-4 sm:p-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary text-accent-300 flex items-center justify-center shrink-0 shadow-sm">
                <HiOutlineTruck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-800 block">
                  Estimated Arrival Window
                </span>
                <span className="font-serif text-lg sm:text-xl font-bold text-neutral-900 block">
                  {deliveryRange}
                </span>
                <span className="text-[11px] text-neutral-500">
                  Standard Boutique Express • Hand-packaged at Jamalia Boutique, Chennai
                </span>
              </div>
            </div>

            <div className="sm:text-right">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {isPaid ? <HiOutlineShieldCheck className="w-4 h-4" /> : <HiOutlineClock className="w-4 h-4" />}
                <span>{isPaid ? 'Paid Online via Razorpay' : 'Pay at Delivery (COD)'}</span>
              </span>
              {order?.paymentDetails?.razorpayPaymentId && (
                <span className="block text-[10px] font-mono text-neutral-400 mt-1">
                  Txn: {order.paymentDetails.razorpayPaymentId}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Fulfillment Timeline Stepper */}
          <div className="pt-2 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Live Fulfillment Progress
              </span>
              <Link
                to={`/account?tab=track&orderId=${effectiveOrderId}`}
                className="text-xs font-semibold text-primary hover:text-primary-light flex items-center gap-1 transition-colors"
              >
                <span>Full Tracking Page</span>
                <HiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {steps.map((st, i) => (
                <div
                  key={st.key}
                  className={`p-3 rounded-2xl border text-xs transition-all ${
                    st.done
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 shadow-xs'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      st.done ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {st.done ? '✓' : i + 1}
                    </span>
                    <span className="font-bold text-[11px] truncate">{st.label}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 line-clamp-1">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Details Grid */}
          {order && (
            <div className="text-left bg-cream-light p-5 sm:p-6 rounded-2xl border border-accent-100 space-y-5">
              {/* Customer & Delivery Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-accent-200/50 text-xs text-neutral-700">
                <div>
                  <span className="font-bold text-neutral-900 block mb-1 flex items-center gap-1.5">
                    <HiOutlineLocationMarker className="w-4 h-4 text-primary" />
                    <span>Delivering to:</span>
                  </span>
                  <p className="font-semibold text-sm text-neutral-900">{order.customer?.name}</p>
                  <p className="text-neutral-600 mt-0.5">{order.customer?.address?.street}</p>
                  <p className="text-neutral-600">
                    {order.customer?.address?.city}, {order.customer?.address?.state} - {order.customer?.address?.pincode}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-neutral-900 block mb-1 flex items-center gap-1.5">
                    <HiOutlinePhone className="w-4 h-4 text-primary" />
                    <span>Contact Details:</span>
                  </span>
                  <p className="font-medium text-neutral-800">
                    Primary: +91 {order.customer?.phone}
                  </p>
                  {order.customer?.secondaryPhone && (
                    <p className="text-neutral-600 text-[11px] mt-0.5">
                      Alternate: +91 {order.customer.secondaryPhone}
                    </p>
                  )}
                  {order.customer?.email && (
                    <p className="text-neutral-500 mt-1">
                      Email: {order.customer.email}
                    </p>
                  )}
                  <p className="text-[11px] text-emerald-800 mt-2 font-medium">
                    ✉️ Order confirmation & Tax Invoice PDF dispatched to email.
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-neutral-600 block">
                  Items in this order ({order.items?.length || 0}):
                </span>
                <div className="divide-y divide-neutral-200/60 max-h-60 overflow-y-auto pr-1">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.title}
                          onError={handleImageError}
                          className="w-12 h-14 object-cover object-top rounded-xl border border-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 truncate">{item.title}</p>
                          <p className="text-neutral-500 text-[11px]">
                            Qty: {item.quantity} {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                          </p>
                          <p className="text-neutral-400 text-[10px]">
                            Unit: {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-neutral-900 shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="border-t border-accent-200/60 pt-4 space-y-1.5 text-xs text-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Items Subtotal:</span>
                  <span className="font-semibold text-neutral-900">{formatPrice(order.totalAmount || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Boutique Express Delivery:</span>
                  <span className="font-semibold text-emerald-700">
                    {Number(order.shippingCharge || 0) === 0 ? 'FREE' : formatPrice(order.shippingCharge)}
                  </span>
                </div>
                <div className="border-t border-neutral-200 pt-2 flex items-center justify-between text-sm sm:text-base">
                  <span className="font-bold text-neutral-900">
                    {isPaid ? 'Total Amount Paid:' : 'Total Payable upon Delivery:'}
                  </span>
                  <span className="font-serif text-xl sm:text-2xl font-bold text-primary">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {/* Direct 1-Click PDF Download */}
            {order && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-light text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <HiOutlineDownload className="w-4 h-4 text-accent-300" />
                <span>{downloadingPdf ? 'Downloading PDF...' : 'Download Invoice PDF'}</span>
              </button>
            )}

            {/* View / Print Invoice in Modal */}
            {order && (
              <button
                type="button"
                onClick={() => setShowInvoice(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <HiOutlinePrinter className="w-4 h-4 text-neutral-600" />
                <span>Print Invoice</span>
              </button>
            )}

            {/* Direct WhatsApp Contact */}
            <a
              href={`https://wa.me/919500757024?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md transition-all"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>WhatsApp Support</span>
            </a>

            {/* Continue Shopping */}
            <Link
              to="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-cream-dark/60 hover:bg-cream-dark text-neutral-900 border border-accent-200 font-semibold text-xs sm:text-sm shadow-xs transition-all"
            >
              <span>Continue Shopping</span>
              <HiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Printable Invoice Modal */}
        {order && (
          <InvoiceView
            order={order}
            isOpen={showInvoice}
            onClose={() => setShowInvoice(false)}
          />
        )}
      </div>
    </div>
  );
};

export default OrderConfirmation;
