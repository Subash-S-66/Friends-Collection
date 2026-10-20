import { useRef, useState, useEffect } from 'react';
import {
  HiOutlinePrinter,
  HiOutlineDownload,
  HiOutlineX,
  HiOutlinePhone
} from 'react-icons/hi';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice } from '../utils/formatters';

export const DEFAULT_INVOICE_SETTINGS = {
  companyName: 'Friends Collections',
  tagline: 'Traditional Silk Sarees • Designer Kurtis • Lehengas • Kids Wear',
  invoiceTitle: 'TAX INVOICE & BILL OF SUPPLY',
  address: '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012',
  phone: '+91 95007 57024',
  email: 'friends.collection06@gmail.com',
  gstin: '33AAACF1234M1Z5',
  authorizedSignatory: 'Authorized Signatory • Jamalia Boutique',
  signatorySubtitle: 'Friends Collections Jamalia Boutique',
  signatureImage: '',
  footerNote: 'Thank You for Shopping with Friends Collections!',
  terms: '7-Day Easy Exchange Policy on Unworn Items with Tags Intact • Defective items replaced free of charge.',
  notes: 'This is an authentic computer-generated Tax Invoice and requires no physical signature.',
  primaryColor: '#4A0E17',
  accentColor: '#C88A65'
};

const InvoiceView = ({
  order,
  isOpen = true,
  onClose,
  invoiceSettings: customSettings,
  asCard = false
}) => {
  const invoiceRef = useRef(null);
  const { confirmDownload } = useConfirm();
  const [fetchedSettings, setFetchedSettings] = useState(null);

  useEffect(() => {
    if (customSettings) return;
    let isMounted = true;
    API.get('/settings')
      .then((res) => {
        if (isMounted && res.data?.invoiceSettings) {
          setFetchedSettings(res.data.invoiceSettings);
        }
      })
      .catch((err) => console.warn('Could not load invoice settings:', err));
    return () => {
      isMounted = false;
    };
  }, [customSettings]);

  if (!isOpen || !order) return null;

  const inv = {
    ...DEFAULT_INVOICE_SETTINGS,
    ...(customSettings || fetchedSettings || {})
  };

  const handlePrint = () => {
    window.print();
  };

  const totalWithShipping = (order.totalAmount || 0) + (order.shippingCharge || 0);
  const invoiceDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isPaid = order.paymentStatus === 'paid';
  const isYetToMove = order.status === 'yet_to_move' || order.status === 'pending';

  const getFulfillmentLabel = (st) => {
    switch (st) {
      case 'yet_to_move':
      case 'pending':
        return 'YET TO MOVE';
      case 'confirmed':
        return 'CONFIRMED / PACKED';
      case 'shipped':
        return 'SHIPPED / IN TRANSIT';
      case 'delivered':
        return 'DELIVERED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return (st || 'PENDING').toUpperCase();
    }
  };

  const primaryColor = inv.primaryColor || '#4A0E17';
  const accentColor = inv.accentColor || '#C88A65';

  const downloadPdfUrl = order.orderId === 'FC-SAMPLE-8899'
    ? '/api/orders/invoice/sample/pdf'
    : `/api/orders/${order.orderId}/invoice.pdf`;

  const handleDownloadPdf = async (e) => {
    if (e) e.preventDefault();
    await confirmDownload({
      title: 'Download Tax Invoice?',
      message: `Would you like to generate and download the authentic Tax Invoice PDF for Order #${order.orderId}?`,
      orderId: order.orderId,
      downloadUrl: downloadPdfUrl,
      fileName: `Invoice-${order.orderId}.pdf`,
      details: `${inv.companyName || 'Friends Collections'} • High-Definition GST Vector PDF`
    });
  };

  const invoiceSheet = (
    <div
      ref={invoiceRef}
      className="p-6 sm:p-10 text-neutral-800 bg-white space-y-6 print:p-8 select-text"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* 1. Header with Universal Boutique Branding & Logo */}
      <div
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b-2"
        style={{ borderColor: `${primaryColor}30` }}
      >
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <img
            src="/logo.png"
            alt={inv.companyName || 'Friends Collections'}
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl p-1 bg-white border border-neutral-200/90 shadow-xs shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <h1
              className="font-serif text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: primaryColor }}
            >
              {inv.companyName}
            </h1>
            <p className="text-[11px] sm:text-xs text-neutral-500 font-semibold tracking-wide uppercase mt-1 leading-snug">
              {inv.tagline}
            </p>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
              <span>{inv.address}</span>
              <span className="block sm:inline sm:before:content-['•'] sm:before:mx-2 mt-0.5 sm:mt-0">
                Phone: <strong className="text-neutral-900">{inv.phone}</strong>
              </span>
              {inv.email && (
                <span className="block sm:inline sm:before:content-['•'] sm:before:mx-2 text-neutral-700">
                  Email: {inv.email}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right shrink-0 space-y-1.5 self-start md:self-auto">
          <span
            className="inline-flex items-center justify-center whitespace-nowrap px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider border shadow-2xs"
            style={{
              backgroundColor: `${primaryColor}12`,
              color: primaryColor,
              borderColor: `${primaryColor}35`
            }}
          >
            {inv.invoiceTitle}
          </span>
          <p className="font-mono text-xs text-neutral-500 pt-1">
            Invoice No: <strong className="text-neutral-900 font-bold">INV-{order.orderId}</strong>
          </p>
          <p className="text-xs text-neutral-500">
            Date: <strong className="text-neutral-900">{invoiceDate}</strong>
          </p>
          {inv.gstin && (
            <p className="text-xs text-neutral-500">
              GSTIN: <span className="font-mono text-neutral-900 font-bold">{inv.gstin}</span>
            </p>
          )}
        </div>
      </div>

      {/* 2. Customer & Order Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-6 rounded-2xl bg-neutral-50/70 border border-neutral-200 text-xs">
        {/* Bill / Ship To */}
        <div className="space-y-1.5">
          <span
            className="font-bold uppercase tracking-wider text-[11px] block"
            style={{ color: primaryColor }}
          >
            BILLED & SHIPPED TO:
          </span>
          <h3 className="font-bold text-neutral-900 text-sm">{order.customer?.name || 'Valued Customer'}</h3>
          <div className="text-neutral-700 leading-relaxed space-y-0.5">
            <p>{order.customer?.address?.street}</p>
            <p>
              {order.customer?.address?.city}, {order.customer?.address?.state} –{' '}
              <strong className="font-mono font-bold text-neutral-900">{order.customer?.address?.pincode}</strong>
            </p>
          </div>
          <div className="pt-2 space-y-1 text-neutral-600 border-t border-neutral-200/60 mt-2">
            <p className="flex items-center gap-1.5">
              <HiOutlinePhone className="w-3.5 h-3.5" style={{ color: accentColor }} />
              Primary: <strong className="font-mono text-neutral-900">+91 {order.customer?.phone}</strong>
            </p>
            {order.customer?.secondaryPhone && (
              <p className="flex items-center gap-1.5">
                <HiOutlinePhone className="w-3.5 h-3.5" style={{ color: accentColor }} />
                Alternate: <strong className="font-mono text-neutral-900">+91 {order.customer.secondaryPhone}</strong>
              </p>
            )}
            {order.customer?.email && (
              <p className="text-neutral-500 font-mono text-[11px]">{order.customer.email}</p>
            )}
          </div>
        </div>

        {/* Statuses & Payment Info */}
        <div className="space-y-2.5 md:border-l md:border-neutral-200 md:pl-6">
          <span
            className="font-bold uppercase tracking-wider text-[11px] block"
            style={{ color: primaryColor }}
          >
            ORDER & PAYMENT STATUS:
          </span>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Order ID:</span>
            <span className="font-mono font-bold text-neutral-900">{order.orderId}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Payment Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                isPaid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}
            >
              {isPaid ? 'PAID' : 'PAYMENT PENDING'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Payment Method:</span>
            <span className="font-semibold text-neutral-800 uppercase">
              {order.paymentMethod === 'razorpay'
                ? 'Online (Razorpay)'
                : order.paymentMethod === 'cod'
                ? 'Cash on Delivery (COD)'
                : (order.paymentMethod || 'COD')}
            </span>
          </div>
          {order.paymentDetails?.razorpayPaymentId && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Razorpay Txn ID:</span>
              <span className="font-mono font-bold text-neutral-900">{order.paymentDetails.razorpayPaymentId}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Fulfillment Status:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                isYetToMove
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : order.status === 'shipped'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : order.status === 'delivered'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              {getFulfillmentLabel(order.status)}
            </span>
          </div>

          {order.tracking?.trackingNumber && (
            <div className="pt-2 border-t border-neutral-200 text-[11px]">
              <span className="text-neutral-500 block">Courier Waybill (AWB):</span>
              <span className="font-mono font-bold" style={{ color: primaryColor }}>
                {order.tracking.courier || 'Express'} • {order.tracking.trackingNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Itemized Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr
              className="text-white font-bold uppercase tracking-wider text-[10px]"
              style={{ backgroundColor: primaryColor }}
            >
              <th className="py-3 px-3">#</th>
              <th className="py-3 px-3">Item Description</th>
              <th className="py-3 px-3 text-center">Size</th>
              <th className="py-3 px-3 text-center">Color</th>
              <th className="py-3 px-3 text-center">Qty</th>
              <th className="py-3 px-3 text-right">Unit Price</th>
              <th className="py-3 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {order.items?.map((item, idx) => (
              <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                <td className="py-3 px-3 text-neutral-400 font-mono">{idx + 1}</td>
                <td className="py-3 px-3">
                  <div className="font-bold text-neutral-900">{item.title}</div>
                  <span className="text-[10px] text-neutral-400 block font-mono">
                    SKU: {String(item.product || '').slice(-6).toUpperCase() || 'STD'}
                  </span>
                </td>
                <td className="py-3 px-3 text-center font-semibold text-neutral-700">
                  {item.size || 'Standard'}
                </td>
                <td className="py-3 px-3 text-center font-semibold text-neutral-700">
                  {item.color || 'Standard'}
                </td>
                <td className="py-3 px-3 text-center font-bold text-neutral-900">
                  {item.quantity}
                </td>
                <td className="py-3 px-3 text-right font-medium text-neutral-700">
                  {formatPrice(item.price)}
                </td>
                <td className="py-3 px-3 text-right font-bold text-neutral-900">
                  {formatPrice(item.price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Totals & Policy Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-neutral-200">
        <div className="max-w-xs text-[11px] text-neutral-500 space-y-1.5">
          <strong className="text-neutral-800 uppercase tracking-wider block text-[10px]">
            Declaration & Exchange Terms:
          </strong>
          <p className="leading-relaxed">
            {inv.terms}
          </p>
          <p className="text-[10px] text-neutral-400 italic">
            * {inv.notes}
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-2 text-xs">
          <div className="flex justify-between text-neutral-600">
            <span>Items Subtotal:</span>
            <span className="font-semibold text-neutral-900">{formatPrice(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Shipping & Packaging:</span>
            <span className="font-semibold text-emerald-700">
              {order.shippingCharge > 0 ? formatPrice(order.shippingCharge) : 'FREE'}
            </span>
          </div>
          <div
            className="flex justify-between text-base font-serif font-bold pt-2 border-t-2 border-neutral-300"
            style={{ color: primaryColor }}
          >
            <span>Grand Total:</span>
            <span>{formatPrice(totalWithShipping)}</span>
          </div>
          <div className="text-[10px] text-neutral-500 text-right">
            (Inclusive of all applicable GST & taxes)
          </div>
        </div>
      </div>

      {/* 5. Footer Signature & Authenticity Seal */}
      <div className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-neutral-500">
        <div className="text-center sm:text-left space-y-1 max-w-sm">
          <p className="font-bold text-neutral-800 text-sm">{inv.footerNote}</p>
          <p className="text-[11px] text-neutral-400">
            {inv.signatorySubtitle || `${inv.companyName} Jamalia Boutique`}
          </p>
        </div>

        <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 min-w-[200px]">
          {inv.signatureImage ? (
            <div className="h-14 flex items-end justify-center sm:justify-end mb-1">
              <img
                src={inv.signatureImage}
                alt="Authorized Signatory"
                className="max-h-12 max-w-[170px] object-contain"
              />
            </div>
          ) : (
            <div className="w-48 h-12 border-b border-dashed border-neutral-400 mx-auto sm:ml-auto mb-1 flex items-end justify-center pb-1">
              <span
                className="font-serif italic text-xs font-semibold"
                style={{ color: primaryColor }}
              >
                {inv.companyName}
              </span>
            </div>
          )}
          <div className="w-48 border-b border-neutral-300 mx-auto sm:ml-auto mb-1.5" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-700 block">
            {inv.authorizedSignatory}
          </span>
          {inv.signatorySubtitle && (
            <span className="text-[10px] text-neutral-400 block mt-0.5">
              {inv.signatorySubtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // If used as an embedded card (e.g. for Admin Live Preview)
  if (asCard) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        {invoiceSheet}
      </div>
    );
  }

  // Otherwise, full modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs print:p-0 print:bg-white print:fixed-none animate-fade-in">
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto border border-neutral-200 print:border-none print:shadow-none print:rounded-none print:max-w-none flex flex-col max-h-[92vh]">
        
        {/* Modal Action Bar (Fixed at top, hidden when printing) */}
        <div
          className="sticky top-0 z-30 print:hidden text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0 shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest font-bold text-accent-200">
              {inv.invoiceTitle}
            </span>
            <span className="font-mono text-xs bg-white/15 px-2 py-0.5 rounded text-white font-bold">
              {order.orderId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all shadow-xs cursor-pointer border border-white/20"
              title="Download Authentic PDF Invoice"
            >
              <HiOutlineDownload className="w-4 h-4 text-accent-300" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              title="Print or Save as PDF"
            >
              <HiOutlinePrinter className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer border border-white/20 shadow-2xs"
                aria-label="Close"
                title="Close (Esc)"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable invoice content sheet */}
        <div className="overflow-y-auto flex-1 print:overflow-visible">
          {invoiceSheet}
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
