import { useState, useEffect } from 'react';
import {
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineEye,
  HiOutlinePhone,
  HiOutlineLocationMarker,
  HiOutlineX,
  HiOutlineRefresh
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { formatPrice, getImageUrl } from '../utils/formatters';

const OrderManager = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

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

  const handleStatusUpdate = async (orderId, newStatus, notes) => {
    try {
      const payload = { status: newStatus };
      if (notes !== undefined) payload.notes = notes;

      const res = await API.put(`/orders/admin/${orderId}/status`, payload);
      toast.success(`Order marked as ${newStatus}`);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(res.data);
      }
      fetchOrders();
    } catch {
      toast.error('Failed to update order status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-neutral-900">Order Management</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track customer orders, manage fulfillment statuses, and verify delivery details
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
                <th className="py-3.5 px-6">Order ID</th>
                <th className="py-3.5 px-6">Customer & Phone</th>
                <th className="py-3.5 px-6">Items & Size</th>
                <th className="py-3.5 px-6">Total Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-neutral-400">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-neutral-900">{order.orderId}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-900">{order.customer?.name}</p>
                      <a
                        href={`tel:+91${order.customer?.phone}`}
                        className="text-neutral-500 hover:text-primary flex items-center gap-1 mt-0.5"
                      >
                        <HiOutlinePhone className="w-3.5 h-3.5 text-accent-700" />
                        +91 {order.customer?.phone}
                      </a>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="relative group/thumb">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.title}
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
                        onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
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
                        onClick={() => {
                          setSelectedOrder(order);
                          setAdminNotes(order.notes || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold transition-colors"
                      >
                        <HiOutlineEye className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
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

      {/* Order Details Modal Popup */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <span className="text-xs uppercase font-bold text-accent-700 tracking-wider">Order Details</span>
                <h3 className="font-serif text-2xl font-bold text-neutral-900">{selectedOrder.orderId}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
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
                  +91 {selectedOrder.customer?.phone}
                </p>
                {selectedOrder.customer?.email && (
                  <p className="text-neutral-500 mt-0.5">{selectedOrder.customer.email}</p>
                )}
              </div>
              <div>
                <strong className="block text-neutral-900 font-bold mb-1">Delivery Address:</strong>
                <p className="text-neutral-700">{selectedOrder.customer?.address?.street}</p>
                <p className="text-neutral-700">
                  {selectedOrder.customer?.address?.city}, {selectedOrder.customer?.address?.state} - {selectedOrder.customer?.address?.pincode}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <strong className="text-xs uppercase font-bold text-neutral-500 block">Ordered Items:</strong>
              <div className="divide-y divide-neutral-100 border rounded-2xl p-4">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        className="w-12 h-14 object-cover object-top rounded-lg border border-neutral-200"
                      />
                      <div>
                        <h4 className="font-bold text-neutral-900">{item.title}</h4>
                        <p className="text-neutral-500">
                          Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
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

            {/* Status & Admin Notes */}
            <div className="space-y-4 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-neutral-700">Update Order Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusUpdate(selectedOrder._id, e.target.value, adminNotes)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary"
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
                  placeholder="e.g. Dispatched via courier DTDC tracking #123456"
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(selectedOrder._id, selectedOrder.status, adminNotes)}
                  className="mt-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-semibold"
                >
                  Save Notes
                </button>
              </div>

              {/* Direct WhatsApp Notify */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <a
                  href={`https://wa.me/91${selectedOrder.customer?.phone}?text=${encodeURIComponent(
                    `Hi ${selectedOrder.customer?.name}! This is Friends Collections regarding your order #${selectedOrder.orderId}. Status: ${selectedOrder.status}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <FaWhatsapp className="w-4 h-4" />
                  <span>Notify Customer on WhatsApp</span>
                </a>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 font-semibold hover:bg-neutral-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;
