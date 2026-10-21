import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  HiOutlineSearch,
  HiOutlineTruck,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiCheckCircle,
  HiOutlineClock,
  HiOutlineClipboardCopy,
  HiOutlineShoppingBag,
  HiArrowRight,
  HiOutlineDownload
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const OrderTracking = () => {
  const { confirmDownload } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlOrderId = searchParams.get('orderId') || '';
  const urlPhone = searchParams.get('phone') || '';

  const [orderIdInput, setOrderIdInput] = useState(urlOrderId);
  const [phoneInput, setPhoneInput] = useState(urlPhone);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchTracking = async (id, phone) => {
    if (!id || !id.trim()) {
      setErrorMsg('Please enter a valid Order ID (e.g. FC-20261018-0003)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const cleanId = id.trim();
      const params = new URLSearchParams();
      if (phone && phone.trim()) {
        params.append('phone', phone.trim().replace(/\s/g, ''));
      }

      const res = await API.get(`/orders/track/${encodeURIComponent(cleanId)}?${params.toString()}`);
      setOrder(res.data);
      setSearchParams({ orderId: cleanId, ...(phone ? { phone: phone.trim() } : {}) });
    } catch (err) {
      console.error('Track error:', err);
      const msg = err.response?.data?.message || 'Order not found. Please verify the Order ID or phone number.';
      setErrorMsg(msg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlOrderId) {
      fetchTracking(urlOrderId, urlPhone);
    }
  }, [urlOrderId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchTracking(orderIdInput, phoneInput);
  };

  const handleCopyTrackingNumber = (num) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopied(true);
    toast.success('Tracking number copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadInvoice = async () => {
    if (!order?.orderId) return;
    await confirmDownload({
      title: 'Download Tax Invoice',
      message: `Would you like to generate and download the authentic Tax Invoice PDF for Order #${order.orderId}?`,
      orderId: order.orderId,
      downloadUrl: `/api/orders/${order.orderId}/invoice.pdf`,
      fileName: `Invoice-${order.orderId}.pdf`,
      details: `Friends Collections • Order #${order.orderId}`
    });
  };

  // Helper for tracking steps progress
  const getStepProgress = (status) => {
    switch (status) {
      case 'confirmed':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return -1;
      case 'order_received':
      case 'yet_to_move':
      case 'pending':
      default:
        return 1;
    }
  };

  const currentStep = order ? getStepProgress(order.status) : 1;

  const trackingSteps = [
    { step: 1, title: 'Order Received', desc: 'Order placed & received at boutique' },
    { step: 2, title: 'Confirmed / Packed', desc: 'Packed & inspected with boutique care' },
    { step: 3, title: 'Dispatched / In Transit', desc: order?.tracking?.courier ? `Handed over to ${order.tracking.courier}` : 'Dispatched from Jamalia store' },
    { step: 4, title: 'Delivered', desc: 'Delivered to your doorstep' }
  ];

  return (
    <div className="min-h-screen bg-cream py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs uppercase tracking-[0.25em] text-accent-700 font-semibold block">
            Shipment Dispatch & Real-Time Tracking
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-neutral-900">
            Track Your Order
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Enter your Friends Collections Order ID to monitor packaging, courier dispatch, and doorstep arrival in real time.
          </p>
        </div>

        {/* Tracking Search Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <HiOutlineSearch className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. FC-20261018-0003"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary uppercase placeholder:normal-case"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5">
                  10-Digit Mobile No. <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <HiOutlinePhone className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. 9500757024"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-light text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Locating Shipment...</span>
                </>
              ) : (
                <>
                  <HiOutlineTruck className="w-5 h-5" />
                  <span>Check Live Tracking</span>
                </>
              )}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 animate-fade-in flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Order Details & Tracking Card */}
        {order && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-sm space-y-8 animate-fade-in">
            {/* Header: Reference ID, Status Pill, and Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-accent-700 font-bold block">
                  Shipment Summary
                </span>
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-xl sm:text-2xl font-bold text-neutral-900">
                    {order.orderId}
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    order.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'shipped'
                      ? 'bg-purple-100 text-purple-800'
                      : order.status === 'confirmed'
                      ? 'bg-blue-100 text-blue-800'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {order.status === 'shipped'
                      ? 'Dispatched / In Transit'
                      : order.status === 'confirmed'
                      ? 'Confirmed / Packed'
                      : order.status === 'delivered'
                      ? 'Delivered'
                      : order.status === 'cancelled'
                      ? 'Cancelled'
                      : 'Order Received'}
                  </span>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      order.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="flex flex-col sm:items-end justify-between gap-3">
                <div className="text-left sm:text-right">
                  <span className="text-xs text-neutral-500 block">Total Amount</span>
                  <span className="font-numeric text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
                    {formatPrice(order.totalAmount + (order.shippingCharge || 0))}
                  </span>
                  <span className="block text-[11px] text-neutral-400 font-medium mt-0.5 uppercase">
                    Payment: {order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : (order.paymentMethod || 'COD')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadInvoice}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-50 text-accent-800 hover:bg-accent-100 border border-accent-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <HiOutlineDownload className="w-4 h-4 text-accent-700" />
                  <span>Download Tax Invoice</span>
                </button>
              </div>
            </div>

            {/* Visual Tracking Stepper */}
            {order.status !== 'cancelled' ? (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Live Dispatch Progress
                </h3>

                <div className="relative">
                  {/* Progress Line */}
                  <div className="hidden sm:block absolute top-5 left-8 right-8 h-1 bg-neutral-100 z-0">
                    <div
                      className="h-full bg-primary transition-all duration-700"
                      style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
                    {trackingSteps.map((st) => {
                      const isComplete = currentStep >= st.step;
                      const isCurrent = currentStep === st.step;

                      return (
                        <div
                          key={st.step}
                          className={`flex sm:flex-col items-center sm:text-center gap-3.5 p-3 rounded-2xl transition-all ${
                            isCurrent
                              ? 'bg-cream-light border border-accent-200 shadow-2xs'
                              : 'bg-transparent'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
                              isComplete
                                ? 'bg-primary text-white shadow-sm ring-4 ring-primary/10'
                                : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                            }`}
                          >
                            {isComplete ? <HiCheckCircle className="w-5 h-5" /> : st.step}
                          </div>
                          <div className="text-left sm:text-center">
                            <span className={`block text-xs font-bold ${
                              isComplete ? 'text-neutral-900' : 'text-neutral-400'
                            }`}>
                              {st.title}
                            </span>
                            <span className="block text-[11px] text-neutral-500 mt-0.5 leading-tight">
                              {st.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
                <span className="font-bold">This order was cancelled. Restocked back into our collection.</span>
              </div>
            )}

            {/* Courier & Waybill Information Box */}
            <div className="p-5 sm:p-6 rounded-2xl bg-cream-light border border-accent-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 shadow-sm">
                    <HiOutlineTruck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                      Courier Partner & Waybill Number
                    </h4>
                    <p className="text-xs text-neutral-600 font-medium">
                      {order.tracking?.courier || 'Jamalia Direct Store Dispatch'}
                    </p>
                  </div>
                </div>

                {order.tracking?.estimatedDelivery && (
                  <div className="sm:text-right">
                    <span className="text-[11px] text-neutral-500 block">Expected Arrival:</span>
                    <span className="text-xs sm:text-sm font-bold text-primary">
                      {order.tracking.estimatedDelivery}
                    </span>
                  </div>
                )}
              </div>

              {/* Waybill / Tracking Link Row */}
              {order.tracking?.trackingNumber ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-accent-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-medium">Tracking / AWB #:</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
                      {order.tracking.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTrackingNumber(order.tracking.trackingNumber)}
                      className="p-1 text-neutral-500 hover:text-primary transition-colors"
                      title="Copy Tracking Number"
                    >
                      <HiOutlineClipboardCopy className="w-4 h-4" />
                    </button>
                    {copied && <span className="text-[10px] text-emerald-600 font-bold">Copied!</span>}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white border border-accent-100 text-xs text-neutral-600">
                  <p>
                    Your order is currently being packed with boutique care at our Jamalia store. A tracking number will appear here as soon as our logistics partner picks it up!
                  </p>
                </div>
              )}

              {/* Status History / Milestone logs */}
              {Array.isArray(order.tracking?.statusHistory) && order.tracking.statusHistory.length > 0 && (
                <div className="pt-2 border-t border-accent-200/50 space-y-2">
                  <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider block">
                    Milestone Updates:
                  </span>
                  <div className="space-y-1.5">
                    {order.tracking.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-700 shrink-0 mt-1.5" />
                        <div className="flex-1">
                          <span className="font-semibold text-neutral-800">{h.message || h.status}</span>
                          {h.location && <span className="text-neutral-500 text-[11px]"> • {h.location}</span>}
                        </div>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          {new Date(h.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Address & Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700">
              <div className="space-y-1">
                <span className="font-bold text-neutral-900 uppercase tracking-wider block text-[11px]">
                  Shipping Destination:
                </span>
                <p className="font-semibold text-neutral-800">{order.customer?.name}</p>
                <p>{order.customer?.address?.street}</p>
                <p>
                  {order.customer?.address?.city}, {order.customer?.address?.state} - {order.customer?.address?.pincode}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-neutral-900 uppercase tracking-wider block text-[11px]">
                  Contact & Assistance:
                </span>
                <p className="flex items-center gap-1.5">
                  <HiOutlinePhone className="w-4 h-4 text-accent-700" />
                  <span>+91 {order.customer?.phone}</span>
                </p>
                {order.customer?.secondaryPhone && (
                  <p className="text-neutral-500">2nd Phone: +91 {order.customer.secondaryPhone}</p>
                )}
                {order.customer?.email && (
                  <p className="text-neutral-500">{order.customer.email}</p>
                )}
                <div className="pt-2">
                  <a
                    href={`https://wa.me/919500757024?text=${encodeURIComponent(
                      `Hi Friends Collections! I am checking on my Order #${order.orderId}. Could you please update me on delivery?`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white font-semibold text-[11px] hover:bg-[#20ba59] transition-colors"
                  >
                    <FaWhatsapp className="w-3.5 h-3.5" />
                    <span>Inquire on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Items in this Order */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Items in This Order ({order.items?.length || 0}):
              </h3>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl p-4">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        onError={handleImageError}
                        className="w-14 h-18 object-cover object-top rounded-xl border border-neutral-200 bg-neutral-100"
                      />
                      <div>
                        <h4 className="font-bold text-neutral-900 text-sm line-clamp-1">{item.title}</h4>
                        <p className="text-neutral-500 text-xs mt-0.5">
                          Quantity: <span className="font-numeric font-bold text-neutral-800">{item.quantity}</span> {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-numeric font-bold text-neutral-900 text-sm">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Shopping button */}
            <div className="text-center pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all"
              >
                <span>Continue Shopping Collections</span>
                <HiArrowRight className="w-4 h-4 text-accent" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
