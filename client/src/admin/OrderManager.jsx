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
  HiOutlineCheckCircle
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Tracking form states
  const [modalStatus, setModalStatus] = useState('pending');
  const [trackingCourier, setTrackingCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [trackingMessage, setTrackingMessage] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setModalStatus(order.status || 'pending');
    setAdminNotes(order.notes || '');
    setTrackingCourier(order.tracking?.courier || '');
    setTrackingNumber(order.tracking?.trackingNumber || '');
    setTrackingUrl(order.tracking?.trackingUrl || '');
    setEstimatedDelivery(order.tracking?.estimatedDelivery || '');
    setTrackingMessage('');
  };

  const handleQuickStatusUpdate = async (orderId, newStatus) => {
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await API.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(res.data);
      }
      fetchOrders();
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveTrackingAndStatus = async () => {
    if (!selectedOrder || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const payload = {
        status: modalStatus,
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
      toast.success('Tracking & Order status updated successfully!');
      setSelectedOrder(res.data);
      fetchOrders();
    } catch (err) {
      console.error('Failed to update tracking & status:', err);
      toast.error(err.response?.data?.message || 'Failed to update tracking');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Order Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track customer orders, assign courier waybills, and update live shipment tracking
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:text-primary transition-colors shadow-xs"
        >
          <HiOutlineRefresh className="w-4 h-4" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'shipped', label: 'Dispatched' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => {
                setSelectedStatus(st.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                selectedStatus === st.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <HiOutlineSearch className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search phone, name, or Order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50"
          />
        </form>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-6">Order ID & Date</th>
                <th className="py-3.5 px-6">Customer & Phone</th>
                <th className="py-3.5 px-6">Tracking / Waybill</th>
                <th className="py-3.5 px-6">Items & Size</th>
                <th className="py-3.5 px-6">Total Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-neutral-400">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const hasTracking = Boolean(order.tracking?.trackingNumber);
                  return (
                    <tr key={order._id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-neutral-900 block">{order.orderId}</span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-neutral-900">{order.customer?.name}</p>
                        <a
                          href={`tel:+91${order.customer?.phone}`}
                          className="text-neutral-500 hover:text-primary flex items-center gap-1 mt-0.5"
                        >
                          <HiOutlinePhone className="w-3.5 h-3.5 text-accent-700" />
                          +91 {order.customer?.phone}
                        </a>
                        {order.customer?.secondaryPhone && (
                          <a
                            href={`tel:+91${order.customer.secondaryPhone}`}
                            className="text-neutral-500 hover:text-primary flex items-center gap-1 mt-0.5 text-[11px]"
                            title="Alternate / 2nd number"
                          >
                            <span className="text-accent-700 font-bold text-[10px]">2nd:</span>
                            +91 {order.customer.secondaryPhone}
                          </a>
                        )}
                      </td>
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
                            className="text-[11px] text-accent-700 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <HiOutlineTruck className="w-3.5 h-3.5" />
                            + Add Tracking
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
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
                      <td className="py-4 px-6 font-bold text-neutral-900">
                        {formatPrice(order.totalAmount + (order.shippingCharge || 0))}
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={order.status}
                          onChange={(e) => handleQuickStatusUpdate(order._id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                            order.status === 'pending'
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
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openOrderModal(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold transition-colors"
                        >
                          <HiOutlineEye className="w-4 h-4" />
                          <span>Details</span>
                        </button>
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
              className="px-3 py-1.5 rounded-lg border border-neutral-200 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-neutral-500 font-medium">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Details & Tracking Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <span className="text-xs uppercase font-bold text-accent-700 tracking-wider">
                  Order Management & Dispatch
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <h3 className="font-serif text-2xl font-bold text-neutral-900">{selectedOrder.orderId}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-neutral-100 text-neutral-700 border">
                    {modalStatus}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
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
                <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Cash on Delivery
                </span>
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
                        className="p-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl text-neutral-600"
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
                        className="p-2 border border-neutral-300 bg-white hover:bg-neutral-100 rounded-xl text-neutral-600"
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
              <strong className="text-xs uppercase font-bold text-neutral-500 block">Ordered Items:</strong>
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

            {/* Status & Save Actions */}
            <div className="space-y-4 pt-2 border-t border-neutral-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <span className="font-bold text-neutral-800 block text-xs">Fulfillment Status:</span>
                  <span className="text-[11px] text-neutral-500">Select the order lifecycle status</span>
                </div>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped / Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

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
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={handleSaveTrackingAndStatus}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
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

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* WhatsApp Notification with Live Tracking Link */}
                  <a
                    href={`https://wa.me/91${selectedOrder.customer?.phone}?text=${encodeURIComponent(
                      `Dear ${selectedOrder.customer?.name},\n\nYour Friends Collections order #${selectedOrder.orderId} status is: ${modalStatus.toUpperCase()}.\n` +
                      (trackingNumber ? `\n📦 Courier: ${trackingCourier || 'Direct Dispatch'}\nAWB / Tracking #: ${trackingNumber}\n` : '') +
                      (estimatedDelivery ? `📅 Estimated Delivery: ${estimatedDelivery}\n` : '') +
                      `\nYou can track your parcel live anytime here:\n${window.location.origin}/track?orderId=${selectedOrder.orderId}\n\nThank you for choosing Friends Collections!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <FaWhatsapp className="w-4 h-4" />
                    <span>WhatsApp Tracking Alert</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;
