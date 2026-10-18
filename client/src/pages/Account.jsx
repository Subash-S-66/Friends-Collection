import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineShoppingBag,
  HiOutlineLocationMarker,
  HiOutlineUser,
  HiOutlineLogout,
  HiOutlineClock,
  HiCheckCircle,
  HiOutlineTruck,
  HiOutlinePhone,
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
  HiOutlineSearch
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const Account = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'address'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const fetchOrders = () => {
    setLoadingOrders(true);
    API.get('/orders/my')
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error fetching orders:', err))
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully.');
    navigate('/');
  };

  const handleLookupOrder = async (e) => {
    e.preventDefault();
    if (!lookupOrderId.trim()) return;
    setLookingUp(true);
    try {
      const res = await API.get(`/orders/track/${encodeURIComponent(lookupOrderId.trim())}`);
      const foundOrder = res.data;
      if (foundOrder) {
        setOrders((prev) => {
          const exists = prev.some((o) => o.orderId === foundOrder.orderId);
          return exists ? prev : [foundOrder, ...prev];
        });
        toast.success(`Found order #${foundOrder.orderId}!`, { icon: '📦' });
        setLookupOrderId('');
      }
    } catch {
      toast.error('No order found with this Order ID');
    } finally {
      setLookingUp(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Tracking number copied!');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Order Placed</span>;
      case 'confirmed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Confirmed</span>;
      case 'shipped':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Dispatched</span>;
      case 'delivered':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Delivered</span>;
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-2xl font-bold shadow-inner">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-neutral-900">{user?.name}</h1>
              <p className="text-xs text-neutral-500 mt-0.5">{user?.email} • +91 {user?.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/track"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-50 text-accent-800 text-xs font-semibold hover:bg-accent-100 transition-colors border border-accent-200"
            >
              <HiOutlineTruck className="w-4 h-4" />
              <span>Track Any Order</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-red-600 transition-colors"
            >
              <HiOutlineLogout className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between border-b border-accent-200/60 pb-3 mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`font-serif text-base sm:text-lg font-bold pb-2 transition-all relative ${
                activeTab === 'orders' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              My Orders ({orders.length})
              {activeTab === 'orders' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('address')}
              className={`font-serif text-base sm:text-lg font-bold pb-2 transition-all relative ${
                activeTab === 'address' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              Saved Address
              {activeTab === 'address' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
              )}
            </button>
          </div>

          {activeTab === 'orders' && (
            <form onSubmit={handleLookupOrder} className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Find by Order ID (FC-...)"
                value={lookupOrderId}
                onChange={(e) => setLookupOrderId(e.target.value)}
                className="px-3.5 py-1.5 text-xs font-mono rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-56"
              />
              <button
                type="submit"
                disabled={lookingUp}
                className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {lookingUp ? 'Searching...' : 'Find Order'}
              </button>
            </form>
          )}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {loadingOrders ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-accent-100 shadow-sm max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center mx-auto">
                  <HiOutlineShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-xl font-bold text-neutral-900">No Orders Yet</h3>
                <p className="text-sm text-neutral-500">
                  When you order dresses from Friends Collections, you can track them here in real time.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/shop"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary-light"
                  >
                    Start Shopping
                  </Link>
                  <Link
                    to="/track"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50"
                  >
                    Track Guest Order
                  </Link>
                </div>
              </div>
            ) : (
              orders.map((order) => {
                const totalWithShipping = order.totalAmount + (order.shippingCharge || 0);
                const whatsappMsg = encodeURIComponent(
                  `Hi Friends Collections! I would like to inquire regarding my Order #${order.orderId}.`
                );
                const hasTracking = Boolean(order.tracking?.trackingNumber || order.tracking?.courier);

                return (
                  <div
                    key={order._id}
                    className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-bold text-sm text-neutral-900">{order.orderId}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-xs text-neutral-500 block">Total Amount</span>
                        <span className="font-serif text-lg font-bold text-primary">
                          {formatPrice(totalWithShipping)}
                        </span>
                        <span className="block text-[10px] text-neutral-400 font-medium">Cash on Delivery</span>
                      </div>
                    </div>

                    {/* Shipment & Courier Live Tracking Card */}
                    <div className="p-4 rounded-2xl bg-cream-light/80 border border-accent-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shrink-0">
                            <HiOutlineTruck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Logistics & Tracking</span>
                            <span className="text-xs font-bold text-neutral-900">
                              {order.tracking?.courier ? `Shipped via ${order.tracking.courier}` : 'Direct Store Dispatch (Jamalia)'}
                            </span>
                          </div>
                        </div>

                        {order.tracking?.estimatedDelivery && (
                          <div className="text-xs font-semibold text-primary">
                            Expected: <strong className="text-neutral-900">{order.tracking.estimatedDelivery}</strong>
                          </div>
                        )}
                      </div>

                      {order.tracking?.trackingNumber ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-accent-200/50">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-neutral-500">AWB / Waybill:</span>
                            <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-accent-200">
                              {order.tracking.trackingNumber}
                            </span>
                            <button
                              onClick={() => handleCopy(order.tracking.trackingNumber)}
                              className="text-primary hover:text-accent p-1"
                              title="Copy"
                            >
                              <HiOutlineClipboardCopy className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {order.tracking?.trackingUrl && (
                              <a
                                href={order.tracking.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-light text-white text-[11px] font-bold shadow-2xs"
                              >
                                <span>Courier Site</span>
                                <HiOutlineExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <Link
                              to={`/track?orderId=${order.orderId}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 text-[11px] font-bold"
                            >
                              <span>Full Timeline</span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-accent-200/50 text-xs text-neutral-500">
                          <span>Packaging & Quality Inspection in progress at showroom</span>
                          <Link
                            to={`/track?orderId=${order.orderId}`}
                            className="text-primary font-bold hover:underline text-[11px]"
                          >
                            Track Live Progress →
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-neutral-100">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.title}
                            onError={handleImageError}
                            className="w-14 h-16 object-cover object-top rounded-xl border border-accent-100 bg-neutral-50"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-neutral-900 truncate">{item.title}</h4>
                            <p className="text-xs text-neutral-500">
                              Qty: {item.quantity} {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-neutral-800">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Address & Actions */}
                    <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-neutral-600">
                      <div className="flex items-center gap-2">
                        <HiOutlineLocationMarker className="w-4 h-4 text-accent-700 shrink-0" />
                        <span>
                          Delivering to: {order.customer?.name}, {order.customer?.address?.street}, {order.customer?.address?.city}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <a
                          href={`https://wa.me/919500757024?text=${whatsappMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <FaWhatsapp className="w-4 h-4" />
                          <span>Support on WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Address Tab */}
        {activeTab === 'address' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm max-w-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-neutral-900">Your Default Address</h3>
            {user?.savedAddresses && user.savedAddresses.length > 0 ? (
              <div className="p-4 rounded-2xl bg-cream-light border border-accent-100 space-y-1 text-sm text-neutral-800">
                <p className="font-bold">{user.name}</p>
                <p>{user.savedAddresses[0].street}</p>
                <p>
                  {user.savedAddresses[0].city}, {user.savedAddresses[0].state} - {user.savedAddresses[0].pincode}
                </p>
                <p className="text-xs text-neutral-500 pt-2 flex items-center gap-1.5">
                  <HiOutlinePhone className="w-4 h-4 text-accent-700" /> +91 {user.phone}
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">
                No saved address yet. Your address will be saved automatically when you place your first order.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
