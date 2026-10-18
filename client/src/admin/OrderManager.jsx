import { useState, useEffect } from 'react';
import {
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineTruck,
  HiOutlineExternalLink,
  HiOutlineClipboardCopy,
  HiOutlineCheckCircle,
  HiOutlinePrinter,
  HiOutlineClock,
  HiOutlineDownload
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';
import InvoiceView from '../components/InvoiceView';

const COURIER_OPTIONS = [
  { value: 'Delhivery', label: 'Delhivery' },
  { value: 'DTDC', label: 'DTDC Courier' },
  { value: 'Blue Dart', label: 'Blue Dart' },
  { value: 'Speed Post', label: 'India Post / Speed Post' },
  { value: 'Professional Couriers', label: 'The Professional Couriers' },
  { value: 'ST Courier', label: 'ST Courier (South India)' },
  { value: 'Xpressbees', label: 'Xpressbees' },
  { value: 'Shadowfax', label: 'Shadowfax' },
  { value: 'Store Direct', label: 'Direct Store Delivery (Jamalia / Chennai)' },
  { value: 'Other', label: 'Other Courier Partner' }
];

const OrderManager = () => {
  const { confirm, confirmDownload } = useConfirm();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  // Track in-flight row updates to prevent double clicks and render micro-loaders over specific buttons/selects
  const [rowUpdating, setRowUpdating] = useState({}); // { [orderId]: 'status' | 'payment' }

  // Tracking & Status form states
  const [modalStatus, setModalStatus] = useState('yet_to_move');
  const [modalPaymentStatus, setModalPaymentStatus] = useState('payment_pending');
  const [modalPaymentNotes, setModalPaymentNotes] = useState('');
  const [trackingCourier, setTrackingCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');

  // Invoice state
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedPaymentStatus !== 'all') params.append('paymentStatus', selectedPaymentStatus);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', page);
      params.append('limit', '15');

      const res = await API.get(`/orders/admin/all?${params.toString()}`);
      setOrders(Array.isArray(res.data?.orders) ? res.data.orders : (Array.isArray(res.data) ? res.data : []));
      setTotalPages(res.data?.pages || 1);
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      toast.error('Failed to load orders');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, selectedPaymentStatus, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setModalStatus(order.status || 'yet_to_move');
    setModalPaymentStatus(order.paymentStatus || 'payment_pending');
    setModalPaymentNotes(order.paymentNotes || '');
    setAdminNotes(order.notes || '');
    setTrackingCourier(order.tracking?.courier || '');
    setTrackingNumber(order.tracking?.trackingNumber || '');
    setTrackingUrl(order.tracking?.trackingUrl || '');
    setEstimatedDelivery(order.tracking?.estimatedDelivery || '');
    setTrackingMessage('');
  };

  const handleQuickStatusUpdate = async (e, orderId, newStatus, currentStatus) => {
    const selectEl = e?.target;
    // Prevent double submission / duplicate in-flight requests
    if (rowUpdating[orderId]) {
      if (selectEl) selectEl.value = currentStatus;
      return;
    }
    if (newStatus === currentStatus) return;

    const ok = await confirm({
      title: 'Update Fulfillment Status?',
      message: `Change fulfillment status to "${newStatus.replace('_', ' ').toUpperCase()}"?`,
      type: 'warning',
      confirmText: 'Yes, Update Status',
      cancelText: 'Cancel'
    });

    if (!ok) {
      // Revert select visual state immediately without reloading the entire table
      if (selectEl) selectEl.value = currentStatus;
      setOrders((prev) => [...prev]);
      return;
    }

    setRowUpdating((prev) => ({ ...prev, [orderId]: 'status' }));
    try {
      const res = await API.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      toast.success(`Fulfillment status updated to ${newStatus.replace('_', ' ')}`);
      // Update order in state directly in background - no full table reload!
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, ...res.data } : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error(err.response?.data?.message || 'Failed to update order status');
      if (selectEl) selectEl.value = currentStatus;
      setOrders((prev) => [...prev]);
    } finally {
      setRowUpdating((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const handleQuickPaymentUpdate = async (e, orderId, newPaymentStatus, currentPaymentStatus) => {
    const selectEl = e?.target;
    // Prevent double submission / duplicate in-flight requests
    if (rowUpdating[orderId]) {
      if (selectEl) selectEl.value = currentPaymentStatus;
      return;
    }
    if (newPaymentStatus === currentPaymentStatus) return;

    const ok = await confirm({
      title: 'Update Payment Status?',
      message: `Change payment status to "${newPaymentStatus.replace('_', ' ').toUpperCase()}"?`,
      type: 'warning',
      confirmText: 'Yes, Update Payment',
      cancelText: 'Cancel'
    });

    if (!ok) {
      if (selectEl) selectEl.value = currentPaymentStatus;
      setOrders((prev) => [...prev]);
      return;
    }

    setRowUpdating((prev) => ({ ...prev, [orderId]: 'payment' }));
    try {
      const res = await API.put(`/orders/admin/${orderId}/status`, { paymentStatus: newPaymentStatus });
      toast.success(`Payment status marked as ${newPaymentStatus.replace('_', ' ')}`);
      // Update order in state directly in background - no full table reload!
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, ...res.data } : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to update payment status:', err);
      toast.error(err.response?.data?.message || 'Failed to update payment status');
      if (selectEl) selectEl.value = currentPaymentStatus;
      setOrders((prev) => [...prev]);
    } finally {
      setRowUpdating((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    }
  };

  const handleSaveTrackingAndStatus = async () => {
    if (!selectedOrder || updatingStatus) return;
    const ok = await confirm({
      title: 'Save Order Status & Tracking?',
      message: `Save updated fulfillment details and courier tracking information for order #${selectedOrder.orderId}?`,
      type: 'save',
      confirmText: 'Save Order Changes',
      cancelText: 'Keep Editing',
      details: `${trackingCourier || 'Direct Store Delivery'} • AWB: ${trackingNumber || 'Pending'} • Status: ${modalStatus}`
    });
    if (!ok) return;

    setUpdatingStatus(true);
    try {
      const payload = {
        status: modalStatus,
        paymentStatus: modalPaymentStatus,
        paymentNotes: modalPaymentNotes,
        notes: adminNotes,
        tracking: {
          courier: trackingCourier,
          trackingNumber: trackingNumber,
          trackingUrl: trackingUrl,
          estimatedDelivery: estimatedDelivery,
          message: trackingMessage.trim() || undefined
        }
      };

      const res = await API.put(`/orders/admin/${selectedOrder._id}/status`, payload);
      toast.success('Order status, payment & tracking saved successfully!');
      setSelectedOrder(res.data);
      // Update table data in-place without triggering full table reload spinner
      setOrders((prev) =>
        prev.map((o) => (o._id === res.data._id ? res.data : o))
      );
    } catch (err) {
      console.error('Failed to update order details:', err);
      toast.error(err.response?.data?.message || 'Failed to update order details');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Order Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Update fulfillment (Yet to Move, Shipped, Delivered), manage payment statuses (Payment Pending, Paid), and generate invoices
          </p>
        </div>

        <button
          onClick={() => fetchOrders(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:text-primary transition-colors shadow-xs cursor-pointer"
        >
          <HiOutlineRefresh className="w-4 h-4" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-accent-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Order ID, Name, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
            />
          </form>

          {/* Status Dropdowns */}
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-end">
            
            {/* Fulfillment Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-neutral-500 font-semibold">Fulfillment:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Fulfillment</option>
                <option value="pending">Yet to Move</option>
                <option value="confirmed">Confirmed / Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-neutral-500 font-semibold">Payment:</span>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => {
                  setSelectedPaymentStatus(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Payments</option>
                <option value="payment_pending">Payment Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-accent-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Order ID & Date</th>
                <th className="py-3.5 px-6">Customer & Phone</th>
                <th className="py-3.5 px-6">Logistics / Courier</th>
                <th className="py-3.5 px-6">Garments</th>
                <th className="py-3.5 px-6">Total</th>
                <th className="py-3.5 px-6">Payment Status</th>
                <th className="py-3.5 px-6">Fulfillment Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center">
                    <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
                    <span className="text-xs text-neutral-400 mt-2 block">Loading customer orders...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-neutral-400">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const hasTracking = Boolean(order.tracking?.trackingNumber);
                  const isPaid = order.paymentStatus === 'paid';
                  const currentStatusVal = order.status === 'pending' ? 'yet_to_move' : (order.status || 'yet_to_move');
                  const currentPaymentVal = order.paymentStatus || 'payment_pending';
                  const isYetToMove = currentStatusVal === 'yet_to_move';
                  const isRowUpdating = Boolean(rowUpdating[order._id]);
                  const isUpdatingThisStatus = rowUpdating[order._id] === 'status';
                  const isUpdatingThisPayment = rowUpdating[order._id] === 'payment';

                  return (
                    <tr key={order._id} className="hover:bg-cream-light/40 transition-colors">
                      {/* Order ID & Date */}
                      <td className="py-4 px-6 font-medium">
                        <span className="font-mono font-bold text-neutral-900 block text-xs">{order.orderId}</span>
                        <span className="text-[11px] text-neutral-400 block">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            order.paymentMethod === 'razorpay'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}>
                            {order.paymentMethod === 'razorpay' ? '⚡ Razorpay' : '💵 COD'}
                          </span>
                          {order.paymentDetails?.razorpayPaymentId && (
                            <span className="font-mono text-[9px] text-neutral-500 truncate max-w-[85px]" title={`Razorpay Payment ID: ${order.paymentDetails.razorpayPaymentId}`}>
                              {order.paymentDetails.razorpayPaymentId.slice(-8)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-neutral-900 block">{order.customer?.name}</span>
                        <a
                          href={`tel:+91${order.customer?.phone}`}
                          className="text-neutral-500 hover:text-primary flex items-center gap-1 font-mono text-[11px]"
                        >
                          <HiOutlinePhone className="w-3.5 h-3.5 text-accent-700" />
                          +91 {order.customer?.phone}
                        </a>
                        {order.customer?.secondaryPhone && (
                          <a
                            href={`tel:+91${order.customer.secondaryPhone}`}
                            className="text-neutral-500 hover:text-primary flex items-center gap-1 mt-0.5 text-[11px] font-mono"
                            title="Alternate / 2nd number"
                          >
                            <span className="text-accent-700 font-bold text-[10px]">2nd:</span>
                            +91 {order.customer.secondaryPhone}
                          </a>
                        )}
                      </td>

                      {/* Courier & Tracking */}
                      <td className="py-4 px-6">
                        {hasTracking ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                              <HiOutlineTruck className="w-3 h-3 text-emerald-600" />
                              {order.tracking.courier || 'Courier'}
                            </span>
                            <span className="block font-mono text-[11px] text-neutral-700">
                              {order.tracking.trackingNumber}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openOrderModal(order)}
                            className="text-[11px] text-accent-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <HiOutlineTruck className="w-3.5 h-3.5" />
                            + Add Tracking
                          </button>
                        )}
                      </td>

                      {/* Garments Preview */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="relative group/thumb">
                              <img
                                src={getImageUrl(item.image)}
                                alt={item.title}
                                onError={handleImageError}
                                className="w-9 h-11 object-cover object-top rounded-md border border-neutral-200"
                              />
                              <div className="hidden group-hover/thumb:block absolute bottom-full left-0 z-20 bg-neutral-900 text-white text-[10px] p-1.5 rounded whitespace-nowrap shadow-lg">
                                {item.title} ({item.size || 'Std'}) x {item.quantity}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-4 px-6 font-bold text-neutral-900">
                        {formatPrice(order.totalAmount + (order.shippingCharge || 0))}
                      </td>

                      {/* Payment Status Dropdown */}
                      <td className="py-4 px-6">
                        <div className="relative inline-flex items-center">
                          <select
                            value={currentPaymentVal}
                            disabled={isRowUpdating}
                            onChange={(e) => handleQuickPaymentUpdate(e, order._id, e.target.value, currentPaymentVal)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none transition-all ${
                              isRowUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            } ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : order.paymentStatus === 'failed'
                                ? 'bg-red-50 text-red-800 border-red-300'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            <option value="payment_pending">Payment Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                          {isUpdatingThisPayment && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-lg flex items-center justify-center gap-1.5 shadow-xs pointer-events-none">
                              <div className="w-3.5 h-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                              <span className="text-[10px] font-bold text-emerald-800">Updating...</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Fulfillment Status Dropdown */}
                      <td className="py-4 px-6">
                        <div className="relative inline-flex items-center">
                          <select
                            value={currentStatusVal}
                            disabled={isRowUpdating}
                            onChange={(e) => handleQuickStatusUpdate(e, order._id, e.target.value, currentStatusVal)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border focus:outline-none transition-all ${
                              isRowUpdating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            } ${
                              isYetToMove
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : order.status === 'confirmed'
                                ? 'bg-blue-50 text-blue-800 border-blue-300'
                                : order.status === 'shipped'
                                ? 'bg-purple-50 text-purple-800 border-purple-300'
                                : order.status === 'delivered'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-red-50 text-red-800 border-red-300'
                            }`}
                          >
                            <option value="yet_to_move">Yet to Move</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          {isUpdatingThisStatus && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-lg flex items-center justify-center gap-1.5 shadow-xs pointer-events-none">
                              <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                              <span className="text-[10px] font-bold text-neutral-800">Updating...</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceOrder(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-50 hover:bg-accent-100 text-accent-800 border border-accent-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Print Tax Invoice"
                          >
                            <HiOutlinePrinter className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          <button
                            onClick={() => openOrderModal(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold transition-colors cursor-pointer text-[11px]"
                          >
                            <HiOutlineEye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-neutral-500 font-medium">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Details & Tracking Edit Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto border border-accent-100">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <span className="text-xs uppercase font-bold text-accent-700 tracking-wider">
                  Order Management & Dispatch
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <h3 className="font-serif text-2xl font-bold text-neutral-900">{selectedOrder.orderId}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-neutral-100 text-neutral-700 border">
                    {modalStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>

            {/* Customer & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-cream-light border border-accent-100 text-xs">
              <div>
                <strong className="block text-neutral-900 font-bold mb-1">Customer Info:</strong>
                <p className="font-semibold text-neutral-800">{selectedOrder.customer?.name}</p>
                <p className="flex items-center gap-1 mt-1 text-neutral-600">
                  <HiOutlinePhone className="w-3.5 h-3.5 text-accent-700" />
                  <a href={`tel:+91${selectedOrder.customer?.phone}`} className="hover:underline font-mono">
                    +91 {selectedOrder.customer?.phone}
                  </a>
                </p>
                {selectedOrder.customer?.secondaryPhone && (
                  <p className="flex items-center gap-1 mt-1 text-neutral-600">
                    <span className="text-[10px] font-bold text-accent-700 bg-accent-50 px-1.5 py-0.5 rounded border border-accent-200">
                      2nd Phone
                    </span>
                    <a href={`tel:+91${selectedOrder.customer.secondaryPhone}`} className="hover:underline font-mono">
                      +91 {selectedOrder.customer.secondaryPhone}
                    </a>
                  </p>
                )}
                {selectedOrder.customer?.email && (
                  <p className="text-neutral-500 mt-1">{selectedOrder.customer.email}</p>
                )}
              </div>
              <div>
                <strong className="block text-neutral-900 font-bold mb-1">Delivery Destination:</strong>
                <p className="text-neutral-700 font-medium">{selectedOrder.customer?.address?.street}</p>
                <p className="text-neutral-700">
                  {selectedOrder.customer?.address?.city}, {selectedOrder.customer?.address?.state} -{' '}
                  <span className="font-bold">{selectedOrder.customer?.address?.pincode}</span>
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedOrder.paymentMethod === 'razorpay'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {selectedOrder.paymentMethod === 'razorpay' ? '⚡ Razorpay Online' : '💵 Cash on Delivery'}
                  </span>
                  {selectedOrder.paymentDetails?.razorpayPaymentId && (
                    <span className="font-mono text-[11px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      Payment ID: <strong className="text-neutral-900">{selectedOrder.paymentDetails.razorpayPaymentId}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dual Status Settings (Payment & Fulfillment) */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
              <strong className="text-xs uppercase font-bold text-neutral-700 block">Status Controls:</strong>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Fulfillment Status */}
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Fulfillment Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="yet_to_move">Yet to Move</option>
                    <option value="confirmed">Confirmed / Packed</option>
                    <option value="shipped">Shipped / In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block font-bold text-neutral-800 mb-1">Payment Status</label>
                  <select
                    value={modalPaymentStatus}
                    onChange={(e) => setModalPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  >
                    <option value="payment_pending">Payment Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              {/* Payment Notes */}
              <div>
                <label className="block font-bold text-neutral-700 mb-1 text-xs">
                  Payment Reference / Notes <span className="font-normal text-neutral-400">(e.g. Paid via GPay / Collected in cash)</span>
                </label>
                <input
                  type="text"
                  value={modalPaymentNotes}
                  onChange={(e) => setModalPaymentNotes(e.target.value)}
                  placeholder="e.g. Cash collected on delivery by courier driver"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                />
              </div>
            </div>

            {/* Shipment & Live Tracking Section */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-neutral-50 to-cream-light border border-accent-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                    <HiOutlineTruck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">Live Shipment & Courier Tracking</h4>
                    <p className="text-[11px] text-neutral-500">
                      Enter tracking details to enable real-time order tracking for the customer
                    </p>
                  </div>
                </div>

                {selectedOrder.tracking?.trackingNumber && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Tracking Active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Courier Selection */}
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Courier Partner</label>
                  <select
                    value={trackingCourier}
                    onChange={(e) => setTrackingCourier(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="">-- Select Courier --</option>
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tracking Number / AWB */}
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Waybill / Tracking (AWB) #</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. 123456789 or DTDC12345"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                    />
                    {trackingNumber && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trackingNumber)}
                        className="p-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl text-neutral-600 cursor-pointer"
                        title="Copy Tracking #"
                      >
                        <HiOutlineClipboardCopy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Estimated Delivery */}
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Estimated Delivery Date / Time</label>
                  <input
                    type="text"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    placeholder="e.g. 21 Oct 2026 or 2 to 3 Business Days"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  />
                </div>

                {/* Custom Tracking URL */}
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    Courier URL <span className="font-normal text-neutral-400">(Auto-filled if empty)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono"
                    />
                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl text-neutral-600 cursor-pointer"
                        title="Open Tracking URL"
                      >
                        <HiOutlineExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestone update message */}
              <div>
                <label className="block font-bold text-neutral-700 mb-1 text-xs">
                  New Status Milestone Note <span className="font-normal text-neutral-400">(Appears in live tracking timeline)</span>
                </label>
                <input
                  type="text"
                  value={trackingMessage}
                  onChange={(e) => setTrackingMessage(e.target.value)}
                  placeholder="e.g. Parcel packed and handed over to courier driver at Chennai hub"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                />
              </div>

              {/* Status History Milestones Log */}
              {selectedOrder.tracking?.statusHistory?.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider block mb-1.5">
                    Tracking Milestones Log ({selectedOrder.tracking.statusHistory.length})
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 p-2.5 rounded-xl bg-white border border-neutral-200 text-xs">
                    {selectedOrder.tracking.statusHistory.slice().reverse().map((hist, i) => (
                      <div key={i} className="flex items-center justify-between text-neutral-700 border-b border-neutral-100 last:border-b-0 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                            {hist.status}
                          </span>
                          <span className="text-[11px]">{hist.message}</span>
                        </div>
                        <span className="text-neutral-400 text-[10px] whitespace-nowrap ml-2">
                          {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ordered Items */}
            <div className="space-y-3">
              <strong className="text-xs uppercase font-bold text-neutral-500 block">Ordered Garments:</strong>
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl p-4 bg-white">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        onError={handleImageError}
                        className="w-12 h-14 object-cover object-top rounded-lg border border-neutral-200"
                      />
                      <div>
                        <h4 className="font-bold text-neutral-900">{item.title}</h4>
                        <p className="text-neutral-500">
                          Qty: {item.quantity} {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-neutral-900">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Internal Admin Notes</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Customer requested evening delivery; verified address on call"
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={handleSaveTrackingAndStatus}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {updatingStatus ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Updates...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineTruck className="w-4 h-4" />
                      <span>Save Status & Tracking</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceOrder(selectedOrder)}
                  className="px-4 py-2.5 rounded-xl bg-accent-50 text-accent-800 hover:bg-accent-100 border border-accent-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <HiOutlinePrinter className="w-4 h-4 text-accent-700" />
                  <span>Invoice</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {/* WhatsApp Notification with Live Tracking Link */}
                <a
                  href={`https://wa.me/91${selectedOrder.customer?.phone}?text=${encodeURIComponent(
                    `Dear ${selectedOrder.customer?.name},\n\nYour Friends Collections order #${selectedOrder.orderId} status: ${modalStatus.replace('_', ' ').toUpperCase()} (Payment: ${modalPaymentStatus.replace('_', ' ').toUpperCase()}).\n` +
                    (trackingNumber ? `\n📦 Courier: ${trackingCourier || 'Direct Dispatch'}\nAWB / Tracking #: ${trackingNumber}\n` : '') +
                    (estimatedDelivery ? `📅 Estimated Delivery: ${estimatedDelivery}\n` : '') +
                    `\nYou can track your parcel live anytime here:\n${window.location.origin}/track?orderId=${selectedOrder.orderId}\n\nThank you for choosing Friends Collections!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  <span>WhatsApp Alert</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal for Admin Printing */}
      {invoiceOrder && (
        <InvoiceView
          order={invoiceOrder}
          isOpen={Boolean(invoiceOrder)}
          onClose={() => setInvoiceOrder(null)}
        />
      )}
    </div>
  );
};

export default OrderManager;
