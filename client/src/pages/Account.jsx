import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
  HiOutlineSearch,
  HiOutlineDownload,
  HiOutlineEye,
  HiOutlineX,
  HiOutlinePrinter,
  HiOutlineShieldCheck,
  HiOutlinePencilAlt,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineArrowRight
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';
import InvoiceView from '../components/InvoiceView';
import AddressModal from '../components/AddressModal';
import EditProfileModal from '../components/EditProfileModal';

const TRACKING_STEPS = [
  { step: 1, title: 'Order Placed', desc: 'Received at Jamalia boutique' },
  { step: 2, title: 'Confirmed & Packaged', desc: 'Quality checked & packed' },
  { step: 3, title: 'Shipped / Dispatched', desc: 'In transit with courier' },
  { step: 4, title: 'Delivered', desc: 'Delivered to your doorstep' },
];

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
    case 'yet_to_move':
    case 'pending':
    default:
      return 1;
  }
};

const Account = () => {
  const { user, logout, updateUser } = useAuth();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'phone_lookup' | 'track' | 'address'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Address Modal States
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedAddressForEdit, setSelectedAddressForEdit] = useState(null);

  // Edit Profile (Email & Phone Dual OTP) Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const handleOpenAddAddress = () => {
    setSelectedAddressForEdit(null);
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr) => {
    setSelectedAddressForEdit(addr);
    setAddressModalOpen(true);
  };

  const handleAddressSuccess = (updatedAddresses) => {
    if (user && updatedAddresses) {
      updateUser({ ...user, savedAddresses: updatedAddresses });
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    try {
      const res = await API.put(`/auth/address/${addr._id}`, { isDefault: true });
      if (user) {
        updateUser({ ...user, savedAddresses: res.data });
      }
      toast.success(`"${addr.label || 'Home'}" set as default delivery address!`, { icon: '⭐' });
    } catch (err) {
      console.error('Error setting default address:', err);
      toast.error(err.response?.data?.message || 'Could not set default address');
    }
  };

  const handleDeleteAddress = async (addr) => {
    const ok = await confirm({
      title: 'Delete Saved Address?',
      message: `Are you sure you want to remove this ${addr.label || 'Home'} address from your profile? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Yes, Delete Address',
      cancelText: 'Keep Address',
      details: `${addr.street}, ${addr.city}, ${addr.state} - ${addr.pincode}`
    });
    if (!ok) return;

    try {
      const res = await API.delete(`/auth/address/${addr._id}`);
      if (user) {
        updateUser({ ...user, savedAddresses: res.data });
      }
      toast.success('Address removed from profile', { icon: '🗑️' });
    } catch (err) {
      console.error('Error deleting address:', err);
      toast.error(err.response?.data?.message || 'Could not delete address');
    }
  };

  // Search & Live Tracking state
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [trackedOrderResult, setTrackedOrderResult] = useState(null);

  // Phone lookup states (available for guest and logged-in users)
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookingUpPhone, setLookingUpPhone] = useState(false);
  const [phoneOrders, setPhoneOrders] = useState([]);
  const [hasSearchedPhone, setHasSearchedPhone] = useState(false);

  // Modal states
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [allOrdersModal, setAllOrdersModal] = useState({ isOpen: false, title: '', ordersList: [] });
  const [allOrdersSearch, setAllOrdersSearch] = useState('');

  const fetchOrders = () => {
    if (!user) return;
    setLoadingOrders(true);
    API.get('/orders/my')
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error fetching orders:', err))
      .finally(() => setLoadingOrders(false));
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      // Default to phone lookup if not logged in
      setActiveTab('phone_lookup');
    }
  }, [user]);

  // Handle URL query parameters (?orderId=... or ?tab=track)
  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    const tabParam = searchParams.get('tab');
    if (orderIdParam) {
      handleLookupOrder(null, orderIdParam);
    } else if (tabParam === 'track') {
      setActiveTab('track');
    }
  }, [searchParams]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign Out of Account?',
      message: 'Are you sure you want to sign out? You will need to sign in again to view your order history.',
      type: 'logout',
      confirmText: 'Yes, Sign Out',
      cancelText: 'Stay Signed In',
      details: user ? `Logged in as: ${user.name} (${user.email || user.phone})` : null
    });
    if (!ok) return;

    logout();
    toast.success('Signed out successfully.');
    setActiveTab('phone_lookup');
  };

  // Lookup order by Order ID
  const handleLookupOrder = async (e, directId) => {
    if (e) e.preventDefault();
    const idToSearch = directId || lookupOrderId;
    if (!idToSearch || !idToSearch.trim()) return;
    setLookingUp(true);
    try {
      const res = await API.get(`/orders/track/${encodeURIComponent(idToSearch.trim())}`);
      const foundOrder = res.data;
      if (foundOrder) {
        if (user) {
          setOrders((prev) => {
            const exists = prev.some((o) => o.orderId === foundOrder.orderId);
            return exists ? prev : [foundOrder, ...prev];
          });
        }
        setTrackedOrderResult(foundOrder);
        setTrackingOrder(foundOrder);
        toast.success(`Found order #${foundOrder.orderId}!`, { icon: '📦' });
        setLookupOrderId('');
      }
    } catch {
      toast.error('No order found with this Order ID');
    } finally {
      setLookingUp(false);
    }
  };

  // Lookup all orders by Mobile Phone Number
  const handlePhoneLookup = async (e) => {
    e?.preventDefault();
    const clean = lookupPhone.replace(/\D/g, '').slice(-10);
    if (!clean || clean.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setLookingUpPhone(true);
    try {
      const res = await API.get(`/orders/by-phone/${clean}`);
      const found = Array.isArray(res.data) ? res.data : [];
      setPhoneOrders(found);
      setHasSearchedPhone(true);
      if (found.length === 0) {
        toast('No orders found for this mobile number', { icon: 'ℹ️' });
      } else {
        toast.success(`Found ${found.length} order${found.length > 1 ? 's' : ''}!`);
      }
    } catch (err) {
      console.error('Phone lookup error:', err);
      toast.error(err.response?.data?.message || 'Failed to search orders by phone');
    } finally {
      setLookingUpPhone(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getFulfillmentBadge = (status) => {
    switch (status) {
      case 'yet_to_move':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Yet to Move
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Confirmed
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <HiOutlineTruck className="w-3.5 h-3.5 text-purple-600" />
            Shipped
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <HiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status, method = '') => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <HiCheckCircle className="w-3 h-3 text-emerald-600" />
          Paid {method === 'razorpay' ? '(Razorpay)' : ''}
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
          Payment Failed
        </span>
      );
    }
    if (status === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-300">
          Refunded
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
        <HiOutlineClock className="w-3 h-3 text-amber-700" />
        {method === 'razorpay' ? 'Payment Pending (Online)' : 'Payment Pending (COD)'}
      </span>
    );
  };

  // Render the visual tracking timeline and logistics card
  const renderTrackingTimeline = (order) => {
    if (!order) return null;
    const currentStep = getStepProgress(order.status);
    const totalWithShipping = (order.totalAmount || 0) + (order.shippingCharge || 0);

    return (
      <div className="space-y-6">
        {/* Visual Stepper */}
        {order.status !== 'cancelled' ? (
          <div className="p-5 sm:p-6 rounded-3xl bg-cream border border-accent-200/80 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Dispatch & Delivery Timeline
              </h4>
              <span className="text-xs font-semibold text-primary">
                Order #{order.orderId}
              </span>
            </div>

            <div className="relative pt-2">
              {/* Progress line */}
              <div className="hidden sm:block absolute top-7 left-10 right-10 h-1 bg-neutral-200 z-0">
                <div
                  className="h-full bg-primary transition-all duration-700 rounded-full"
                  style={{ width: `${Math.max(0, ((currentStep - 1) / 3) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative z-10">
                {TRACKING_STEPS.map((st) => {
                  const isComplete = currentStep >= st.step;
                  const isCurrent = currentStep === st.step;

                  return (
                    <div
                      key={st.step}
                      className={`flex sm:flex-col items-center sm:text-center gap-3.5 p-3 rounded-2xl transition-all ${
                        isCurrent
                          ? 'bg-white border-2 border-primary shadow-sm'
                          : isComplete
                          ? 'bg-white/80 border border-emerald-200'
                          : 'bg-white/40 border border-neutral-200'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
                          isComplete
                            ? 'bg-primary text-white shadow-sm ring-4 ring-primary/10'
                            : 'bg-neutral-100 text-neutral-400 border border-neutral-200'
                        }`}
                      >
                        {isComplete ? <HiCheckCircle className="w-5 h-5 text-white" /> : st.step}
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

        {/* Logistics & Courier Information Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white border border-accent-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shrink-0 shadow-sm">
                <HiOutlineTruck className="w-6 h-6" />
              </div>
              <div>
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  Logistics Courier & Dispatch
                </h5>
                <p className="text-sm font-bold text-neutral-900">
                  {order.tracking?.courier ? `Shipped via ${order.tracking.courier}` : 'Direct Store Dispatch (Jamalia Boutique)'}
                </p>
              </div>
            </div>

            {order.tracking?.estimatedDelivery && (
              <div className="sm:text-right bg-primary-50 px-3.5 py-1.5 rounded-xl border border-primary/20">
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">Expected Arrival</span>
                <span className="text-xs sm:text-sm font-bold text-neutral-900">
                  {order.tracking.estimatedDelivery}
                </span>
              </div>
            )}
          </div>

          {order.tracking?.trackingNumber ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              <div className="flex items-center gap-2.5 text-xs">
                <span className="text-neutral-500 font-medium">Waybill / AWB:</span>
                <span className="font-mono font-bold text-neutral-900 bg-neutral-50 px-2.5 py-1 rounded-lg border border-neutral-200">
                  {order.tracking.trackingNumber}
                </span>
                <button
                  onClick={() => handleCopy(order.tracking.trackingNumber)}
                  className="text-primary hover:text-accent p-1 cursor-pointer"
                  title="Copy AWB Number"
                >
                  <HiOutlineClipboardCopy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100">
              📦 The parcel is currently being inspected and packaged at our Jamalia showroom. Tracking number will update once assigned to the courier.
            </div>
          )}

          {/* Milestones History */}
          {order.tracking?.statusHistory?.length > 0 && (
            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <span className="text-xs font-bold uppercase text-neutral-700 tracking-wider block">
                Recent Milestones & Status Logs
              </span>
              <div className="space-y-2">
                {order.tracking.statusHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                    <span className="font-medium text-neutral-800">• {h.message}</span>
                    <span className="text-neutral-400 font-mono text-[11px]">
                      {new Date(h.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Destination & Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-neutral-200 text-xs space-y-1.5">
            <strong className="block text-neutral-900 font-bold uppercase tracking-wider text-[11px]">
              Delivery Destination
            </strong>
            <p className="font-semibold text-neutral-800">{order.customer?.name}</p>
            <p className="text-neutral-600">{order.customer?.address?.street}</p>
            <p className="text-neutral-600">
              {order.customer?.address?.city}, {order.customer?.address?.state} - <strong className="text-neutral-800">{order.customer?.address?.pincode}</strong>
            </p>
            <p className="text-neutral-600 font-mono mt-1">📞 +91 {order.customer?.phone}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-neutral-200 text-xs space-y-1.5 flex flex-col justify-between">
            <div>
              <strong className="block text-neutral-900 font-bold uppercase tracking-wider text-[11px]">
                Payment & Order Value
              </strong>
              <p className="text-neutral-700 font-medium mt-1">
                Method: <span className="uppercase font-bold text-primary">{order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : (order.paymentMethod === 'cod' ? 'Cash on Delivery' : (order.paymentMethod || 'COD'))}</span>
              </p>
              {order.paymentDetails?.razorpayPaymentId && (
                <p className="font-mono text-[11px] text-neutral-600">
                  Txn ID: <strong className="text-neutral-800">{order.paymentDetails.razorpayPaymentId}</strong>
                </p>
              )}
              <p className="text-neutral-700">
                Payment Status: <strong className="capitalize">{order.paymentStatus || 'pending'}</strong>
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-neutral-500 font-bold">Total Bill:</span>
              <span className="font-numeric text-base sm:text-lg font-extrabold text-primary">{formatPrice(totalWithShipping)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render an individual Order Card
  const renderOrderCard = (order) => {
    const totalWithShipping = (order.totalAmount || 0) + (order.shippingCharge || 0);
    const whatsappMsg = encodeURIComponent(
      `Hi Friends Collections! I am checking regarding my Order #${order.orderId}.`
    );

    return (
      <div
        key={order._id}
        className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-5 transition-all hover:shadow-md hover:border-accent-200"
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-base text-neutral-900">{order.orderId}</span>
              {getFulfillmentBadge(order.status)}
              {getPaymentBadge(order.paymentStatus, order.paymentMethod)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center sm:text-right justify-between sm:justify-end gap-4">
            <div>
              <span className="text-xs text-neutral-500 block">Total Amount</span>
              <span className="font-numeric text-lg sm:text-xl font-extrabold text-primary">
                {formatPrice(totalWithShipping)}
              </span>
              <span className="block text-[10px] text-neutral-400 font-medium uppercase">
                {order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : (order.paymentMethod === 'cod' ? 'Cash on Delivery' : (order.paymentMethod || 'COD'))}
              </span>
            </div>

            <button
              onClick={() => setInvoiceOrder(order)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-50 text-accent-800 hover:bg-accent-100 border border-accent-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Download or Print Tax Invoice"
            >
              <HiOutlineDownload className="w-4 h-4 text-accent-700" />
              <span>Invoice</span>
            </button>
          </div>
        </div>

        {/* Courier & Tracking Bar */}
        <div className="p-4 rounded-2xl bg-cream-light/80 border border-accent-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center shrink-0">
                <HiOutlineTruck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Logistics & Courier</span>
                <span className="text-xs font-bold text-neutral-900">
                  {order.tracking?.courier ? `Shipped via ${order.tracking.courier}` : 'Direct Store Dispatch (Jamalia Boutique)'}
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
                  className="text-primary hover:text-accent p-1 cursor-pointer"
                  title="Copy Tracking Number"
                >
                  <HiOutlineClipboardCopy className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrackingOrder(order)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-light text-white text-[11px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <HiOutlineTruck className="w-3.5 h-3.5 text-accent-300" />
                  <span>Track Status</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailOrder(order)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 text-[11px] font-bold cursor-pointer"
                >
                  <HiOutlineEye className="w-3 h-3" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-accent-200/50 text-xs text-neutral-500">
              <span>Packaging & quality inspection underway at Jamalia showroom</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTrackingOrder(order)}
                  className="text-primary font-bold hover:underline text-xs flex items-center gap-1 cursor-pointer"
                >
                  <HiOutlineTruck className="w-3.5 h-3.5" />
                  <span>Track Live Progress →</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailOrder(order)}
                  className="text-neutral-600 hover:text-neutral-900 font-medium text-xs underline cursor-pointer"
                >
                  View Details
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Items Preview */}
        <div className="divide-y divide-neutral-100">
          {(order.items || []).slice(0, 5).map((item, idx) => (
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
                  Qty: <span className="font-numeric font-bold text-neutral-800">{item.quantity}</span> {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                </p>
              </div>
              <span className="font-numeric text-xs sm:text-sm font-bold text-neutral-900">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}

          {order.items && order.items.length > 5 && (
            <div className="pt-3 pb-1 flex items-center justify-between text-xs bg-accent-50/50 px-3.5 py-2.5 rounded-xl border border-accent-200/60 mt-2">
              <span className="text-neutral-700 font-medium">
                Showing 5 of {order.items.length} items (+{order.items.length - 5} more items in this order)
              </span>
              <button
                type="button"
                onClick={() => setDetailOrder(order)}
                className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary-light cursor-pointer hover:underline"
              >
                <span>View All Items</span>
                <HiOutlineArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions: Address, View Details, WhatsApp */}
        <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <HiOutlineLocationMarker className="w-4 h-4 text-accent-700 shrink-0" />
            <span className="truncate max-w-sm">
              Deliver to: {order.customer?.name}, {order.customer?.address?.city} ({order.customer?.address?.pincode})
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setInvoiceOrder(order)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-50 hover:bg-accent-100 text-accent-800 border border-accent-200 font-bold transition-colors cursor-pointer text-xs"
              title="View & Download Tax Invoice"
            >
              <HiOutlineDownload className="w-4 h-4 text-accent-700" />
              <span>Tax Invoice</span>
            </button>

            <button
              onClick={() => setDetailOrder(order)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold transition-colors cursor-pointer"
            >
              <HiOutlineEye className="w-4 h-4" />
              <span>Order Details</span>
            </button>

            <a
              href={`https://wa.me/919500757024?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100 transition-colors"
            >
              <FaWhatsapp className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile or Guest Header */}
        {user ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left min-w-0 flex-1 sm:max-w-xl">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif text-xl sm:text-2xl font-bold shadow-inner shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <h1 
                    className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 truncate min-w-0"
                    title={user?.name}
                  >
                    {user?.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-white border border-primary/20 transition-all duration-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95 shrink-0 ml-auto"
                    title="Edit Email & Phone"
                  >
                    <HiOutlinePencilAlt className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1 truncate" title={`${user?.email || ''} ${user?.phone ? `• +91 ${user.phone}` : ''}`}>
                  <span>{user?.email}</span>
                  {user?.phone && <span className="mx-1.5 text-neutral-400">•</span>}
                  {user?.phone && <span>+91 {user.phone}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-50 text-accent-800 text-xs font-semibold hover:bg-accent-100 transition-colors border border-accent-200 cursor-pointer"
              >
                <HiOutlineTruck className="w-4 h-4 text-primary" />
                <span>Track Live Order</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer shadow-2xs"
                title="Sign Out of account"
              >
                <HiOutlineLogout className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-200/80 shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 text-center sm:text-left relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase tracking-wider">
                <HiOutlineTruck className="w-3.5 h-3.5 text-primary" />
                <span>Order Tracking & Customer Portal</span>
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary tracking-tight">
                View Previous Orders & Download Invoices
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-xl">
                Enter your mobile number or Order ID below to view all orders placed with Friends Collections, monitor live courier status, and print tax invoices.
              </p>
            </div>

            <div className="flex items-center gap-3 relative z-10 shrink-0">
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <HiOutlineUser className="w-4 h-4" />
                <span>Sign In to Account</span>
              </Link>
            </div>
          </div>
        )}

        {/* Tab Controls & Fast Search Bars */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-accent-200/60 pb-3 mb-8 gap-4">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {user && (
              <button
                onClick={() => setActiveTab('orders')}
                className={`font-serif text-base sm:text-lg font-bold pb-2 transition-all relative cursor-pointer ${
                  activeTab === 'orders' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                My Account Orders ({orders.length})
                {activeTab === 'orders' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('phone_lookup')}
              className={`font-serif text-base sm:text-lg font-bold pb-2 transition-all relative cursor-pointer ${
                activeTab === 'phone_lookup' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              Lookup by Mobile {phoneOrders.length > 0 ? `(${phoneOrders.length})` : ''}
              {activeTab === 'phone_lookup' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`font-serif text-base sm:text-lg font-bold pb-2 transition-all relative cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'track' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
              }`}
            >
              <HiOutlineTruck className="w-4 h-4" />
              <span>Track Order by ID</span>
              {activeTab === 'track' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
              )}
            </button>

            {user && (
              <button
                onClick={() => setActiveTab('address')}
                className={`font-serif text-base sm:text-lg font-bold pb-2 transition-all relative cursor-pointer ${
                  activeTab === 'address' ? 'text-primary' : 'text-neutral-400 hover:text-neutral-700'
                }`}
              >
                Saved Addresses {user.savedAddresses?.length > 0 ? `(${user.savedAddresses.length})` : ''}
                {activeTab === 'address' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full animate-fade-in" />
                )}
              </button>
            )}
          </div>

          {/* Quick Search By Order ID */}
          <form onSubmit={handleLookupOrder} className="flex items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              placeholder="Find by Order ID (FC-...)"
              value={lookupOrderId}
              onChange={(e) => setLookupOrderId(e.target.value)}
              className="px-3.5 py-2 text-xs font-mono rounded-xl border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-56"
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="px-3.5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-xs"
            >
              {lookingUp ? 'Searching...' : 'Find Order'}
            </button>
          </form>
        </div>

        {/* Tab 1: Logged-in User Orders */}
        {activeTab === 'orders' && user && (
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
                <h3 className="font-serif text-xl font-bold text-neutral-900">No Orders in Account</h3>
                <p className="text-sm text-neutral-500">
                  If you ordered without logging in, click <strong>"Lookup by Mobile Number"</strong> above to find your orders!
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    to="/shop"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary-light"
                  >
                    Start Shopping
                  </Link>
                  <button
                    onClick={() => setActiveTab('phone_lookup')}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                  >
                    Search by Mobile Number
                  </button>
                </div>
              </div>
            ) : (
              <>
                {orders.slice(0, 5).map(renderOrderCard)}

                {orders.length > 5 && (
                  <div className="bg-white rounded-3xl p-6 border border-accent-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-2">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <HiOutlineShoppingBag className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-serif text-base sm:text-lg font-bold text-neutral-900">
                          Showing 5 of {orders.length} Orders
                        </h4>
                        <p className="text-xs text-neutral-500">
                          You have {orders.length - 5} older order{orders.length - 5 > 1 ? 's' : ''} in your account history.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllOrdersModal({ isOpen: true, title: 'My Account Orders', ordersList: orders })}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <HiOutlineEye className="w-4 h-4 text-accent-300" />
                      <span>View All Orders ({orders.length})</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Lookup by Mobile Phone Number */}
        {activeTab === 'phone_lookup' && (
          <div className="space-y-8">
            {/* Search Input Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-accent-700 font-bold">Mobile Order Lookup</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
                  Enter Your Mobile Number
                </h2>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  We will search all past orders associated with this phone number and provide full order status and instant invoice downloads.
                </p>
              </div>

              <form onSubmit={handlePhoneLookup} className="space-y-4 pt-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-sm font-bold text-neutral-400">🇮🇳 +91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={lookupPhone}
                    onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-20 pr-4 py-3 rounded-2xl border border-neutral-300 font-mono text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50 focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={lookingUpPhone || lookupPhone.length < 10}
                  className="w-full py-3 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-2xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {lookingUpPhone ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Searching Orders...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineSearch className="w-5 h-5" />
                      <span>Show All Previous Orders</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Phone Orders Results */}
            {hasSearchedPhone && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-accent-100 pb-2">
                  <h3 className="font-serif text-lg font-bold text-neutral-900">
                    Orders Linked to +91 {lookupPhone} ({phoneOrders.length})
                  </h3>
                  <span className="text-xs text-neutral-500">
                    {phoneOrders.length > 0 ? 'Click Invoice to print or save as PDF' : ''}
                  </span>
                </div>

                {phoneOrders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-accent-100 shadow-sm max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center mx-auto">
                      <HiOutlineShoppingBag className="w-8 h-8" />
                    </div>
                    <h3 className="font-serif text-xl font-bold text-neutral-900">No Orders Found</h3>
                    <p className="text-sm text-neutral-500">
                      No orders have been placed using the mobile number <strong>+91 {lookupPhone}</strong> yet.
                    </p>
                    <Link
                      to="/shop"
                      className="inline-block px-6 py-2.5 rounded-full bg-primary text-white text-xs font-semibold shadow-md hover:bg-primary-light"
                    >
                      Browse Boutique Collection
                    </Link>
                  </div>
                ) : (
                  <>
                    {phoneOrders.slice(0, 5).map(renderOrderCard)}

                    {phoneOrders.length > 5 && (
                      <div className="bg-white rounded-3xl p-6 border border-accent-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left mt-2">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <HiOutlineShoppingBag className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-serif text-base sm:text-lg font-bold text-neutral-900">
                              Showing 5 of {phoneOrders.length} Orders
                            </h4>
                            <p className="text-xs text-neutral-500">
                              Found {phoneOrders.length - 5} more order{phoneOrders.length - 5 > 1 ? 's' : ''} linked to +91 {lookupPhone}.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllOrdersModal({ isOpen: true, title: `Orders for +91 ${lookupPhone}`, ordersList: phoneOrders })}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <HiOutlineEye className="w-4 h-4 text-accent-300" />
                          <span>View All Orders ({phoneOrders.length})</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Track Order by ID */}
        {activeTab === 'track' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm max-w-2xl mx-auto space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-widest text-accent-700 font-bold">
                  Live Dispatch & Courier Tracking
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
                  Track Your Friends Collections Order
                </h2>
                <p className="text-xs text-neutral-500 max-w-md mx-auto">
                  Enter your Order ID (e.g. <span className="font-mono font-bold text-neutral-700">FC-20261018-0003</span>) sent to your mobile or email at checkout.
                </p>
              </div>

              <form onSubmit={handleLookupOrder} className="space-y-4 pt-2">
                <div className="relative">
                  <input
                    type="text"
                    value={lookupOrderId}
                    onChange={(e) => setLookupOrderId(e.target.value)}
                    placeholder="Enter Order ID (e.g., FC-20261018-0003)"
                    className="w-full px-4 py-3 rounded-2xl border border-neutral-300 font-mono text-sm sm:text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50 focus:bg-white uppercase tracking-wider transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={lookingUp || !lookupOrderId.trim()}
                  className="w-full py-3 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-2xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {lookingUp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Tracking Order...</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineTruck className="w-5 h-5" />
                      <span>Track Order Live</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Tracked Result Display */}
            {trackedOrderResult && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-accent-100 gap-3">
                  <div>
                    <span className="text-xs text-neutral-500 block">Live Tracking Result</span>
                    <div className="flex items-center gap-3 flex-wrap mt-0.5">
                      <h3 className="font-mono text-xl font-bold text-neutral-900">
                        #{trackedOrderResult.orderId}
                      </h3>
                      {getFulfillmentBadge(trackedOrderResult.status)}
                      {getPaymentBadge(trackedOrderResult.paymentStatus, trackedOrderResult.paymentMethod)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInvoiceOrder(trackedOrderResult)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-50 text-accent-800 hover:bg-accent-100 border border-accent-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <HiOutlineDownload className="w-4 h-4 text-accent-700" />
                      <span>Invoice</span>
                    </button>
                    <button
                      onClick={() => setDetailOrder(trackedOrderResult)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer"
                    >
                      <HiOutlineEye className="w-4 h-4" />
                      <span>Order Items ({trackedOrderResult.items?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setTrackedOrderResult(null)}
                      className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                      title="Clear tracking"
                    >
                      <HiOutlineX className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {renderTrackingTimeline(trackedOrderResult)}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Saved Addresses Management */}
        {activeTab === 'address' && user && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent-700 block">
                  Delivery Preferences
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 mt-1">
                  Saved Delivery Addresses
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                  Manage your home, office, and alternate boutique delivery locations. You can edit, set as default, or delete any saved address below.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span>Add New Address</span>
              </button>
            </div>

            {user?.savedAddresses && user.savedAddresses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {user.savedAddresses.map((addr, idx) => (
                  <div
                    key={addr._id || idx}
                    className={`bg-white rounded-3xl p-6 border transition-all relative flex flex-col justify-between ${
                      addr.isDefault
                        ? 'border-primary ring-2 ring-primary/10 shadow-md'
                        : 'border-accent-100 hover:border-accent-300 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Label & Badges & Action Buttons */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                            {addr.label === 'Work' ? (
                              <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-accent-700" />
                            ) : addr.label === 'Home' ? (
                              <HiOutlineHome className="w-3.5 h-3.5 text-accent-700" />
                            ) : (
                              <HiOutlineLocationMarker className="w-3.5 h-3.5 text-accent-700" />
                            )}
                            <span>{addr.label || 'Home'}</span>
                          </span>

                          {addr.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                              <HiCheckCircle className="w-3.5 h-3.5 text-primary" />
                              <span>Default Address</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Edit & Delete */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAddress(addr)}
                            className="p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition-colors cursor-pointer border border-neutral-200/60"
                            title="Edit Address"
                          >
                            <HiOutlinePencilAlt className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr)}
                            className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-neutral-200/60"
                            title="Delete Address"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Recipient & Street */}
                      <div className="space-y-1.5 text-sm text-neutral-800">
                        <p className="font-bold text-neutral-900 text-base">{user.name}</p>
                        <p className="text-neutral-700 leading-relaxed">{addr.street}</p>
                        <p className="font-medium text-neutral-600">
                          {addr.city}, {addr.state} - <strong className="font-mono text-neutral-900">{addr.pincode}</strong>
                        </p>
                      </div>

                      {/* Contact Phone Details */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-500 space-y-1">
                        <p className="flex items-center gap-2">
                          <HiOutlinePhone className="w-3.5 h-3.5 text-accent-700 shrink-0" />
                          <span>Phone: <strong className="text-neutral-800">+91 {addr.phone || user.phone}</strong></span>
                        </p>
                        {addr.secondaryPhone && (
                          <p className="flex items-center gap-2 text-neutral-500 pl-5.5">
                            <span>Alternate: <strong className="text-neutral-700">+91 {addr.secondaryPhone}</strong></span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action: Set as Default */}
                    {!addr.isDefault && (
                      <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAddress(addr)}
                          className="text-xs font-bold text-primary hover:text-primary-dark hover:underline transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Set as Default Delivery Address</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 border border-accent-100 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-cream-light border border-accent-200 mx-auto flex items-center justify-center text-accent-700">
                  <HiOutlineLocationMarker className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-serif text-lg font-bold text-neutral-900">
                    No Saved Addresses Yet
                  </h4>
                  <p className="text-xs text-neutral-500">
                    You haven't saved any delivery locations yet. Add an address now for quick, 1-click checkout!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  <span>Add Delivery Address</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Full Order Details Modal */}
        {detailOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-accent-100">
              {/* Fixed Header with Pinned Close "X" Button */}
              <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0">
                <div>
                  <span className="text-xs uppercase font-bold text-accent-700 tracking-wider">
                    Order Summary & Tracking
                  </span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <h3 className="font-mono text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">{detailOrder.orderId}</h3>
                    {getFulfillmentBadge(detailOrder.status)}
                    {getPaymentBadge(detailOrder.paymentStatus, detailOrder.paymentMethod)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOrder(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200/80 shadow-2xs bg-white cursor-pointer active:scale-95 shrink-0"
                  title="Close (Esc)"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
                {/* Customer & Address Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-cream-light/60 border border-accent-100 text-xs">
                <div>
                  <strong className="block text-neutral-900 font-bold mb-1">Customer Info:</strong>
                  <p className="font-semibold text-neutral-800">{detailOrder.customer?.name}</p>
                  <p className="flex items-center gap-1 mt-1 text-neutral-600 font-mono">
                    <HiOutlinePhone className="w-3.5 h-3.5 text-accent-700" />
                    +91 {detailOrder.customer?.phone}
                  </p>
                  {detailOrder.customer?.secondaryPhone && (
                    <p className="flex items-center gap-1 mt-0.5 text-neutral-600 font-mono text-[11px]">
                      <span className="text-accent-700 font-bold">2nd:</span> +91 {detailOrder.customer.secondaryPhone}
                    </p>
                  )}
                  {detailOrder.customer?.email && (
                    <p className="text-neutral-500 mt-1">{detailOrder.customer.email}</p>
                  )}
                </div>

                <div>
                  <strong className="block text-neutral-900 font-bold mb-1">Delivery Destination:</strong>
                  <p className="text-neutral-700 font-medium">{detailOrder.customer?.address?.street}</p>
                  <p className="text-neutral-700">
                    {detailOrder.customer?.address?.city}, {detailOrder.customer?.address?.state} -{' '}
                    <span className="font-bold">{detailOrder.customer?.address?.pincode}</span>
                  </p>
                  <div className="mt-2 text-[11px] font-semibold text-neutral-600">
                    Payment Method: <span className="uppercase font-bold text-primary">{detailOrder.paymentMethod || 'COD'}</span>
                  </div>
                </div>
              </div>

              {/* Live Shipment Details */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-accent-200/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HiOutlineTruck className="w-4 h-4 text-primary" />
                    <span className="font-bold text-neutral-900">
                      {detailOrder.tracking?.courier ? `Courier: ${detailOrder.tracking.courier}` : 'Direct Store Dispatch'}
                    </span>
                  </div>
                  {detailOrder.tracking?.trackingNumber && (
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-neutral-300 font-bold">
                      AWB: {detailOrder.tracking.trackingNumber}
                    </span>
                  )}
                </div>

                {detailOrder.tracking?.statusHistory?.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 tracking-wider block">
                      Milestones
                    </span>
                    {detailOrder.tracking.statusHistory.slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-neutral-700">
                        <span className="font-medium">• {h.message}</span>
                        <span className="text-neutral-400 text-[10px]">
                          {new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <strong className="text-xs uppercase font-bold text-neutral-500 block">Ordered Garments:</strong>
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl p-4 bg-white">
                  {detailOrder.items?.map((item, idx) => (
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
                            Qty: <span className="font-numeric font-bold text-neutral-800">{item.quantity}</span> {item.size && `• Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-numeric font-bold text-neutral-900 text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-600">Grand Total Payable</span>
                  <span className="font-numeric text-base font-extrabold text-primary">
                    {formatPrice((detailOrder.totalAmount || 0) + (detailOrder.shippingCharge || 0))}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceOrder(detailOrder);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <HiOutlinePrinter className="w-4 h-4" />
                  <span>Download / Print Invoice</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setTrackingOrder(detailOrder);
                      setDetailOrder(null);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <HiOutlineTruck className="w-4 h-4 text-primary" />
                    <span>Live Tracking</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailOrder(null)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Live Tracking Modal Overlay */}
        {trackingOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-accent-100">
              {/* Fixed Header with Pinned Close "X" Button */}
              <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0">
                <div>
                  <span className="text-[11px] uppercase font-bold text-accent-700 tracking-wider flex items-center gap-1.5">
                    <HiOutlineTruck className="w-4 h-4" />
                    Live Shipment & Delivery Tracking
                  </span>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <h3 className="font-mono text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                      #{trackingOrder.orderId}
                    </h3>
                    {getFulfillmentBadge(trackingOrder.status)}
                    {getPaymentBadge(trackingOrder.paymentStatus, trackingOrder.paymentMethod)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackingOrder(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200/80 shadow-2xs bg-white cursor-pointer active:scale-95 shrink-0"
                  title="Close (Esc)"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1">
                {/* Visual Timeline and Logistics Info */}
                {renderTrackingTimeline(trackingOrder)}

                {/* Modal Footer Controls */}
                <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceOrder(trackingOrder);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-50 hover:bg-accent-100 text-accent-800 border border-accent-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <HiOutlineDownload className="w-4 h-4 text-accent-700" />
                    <span>Download / Print Tax Invoice</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDetailOrder(trackingOrder);
                        setTrackingOrder(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold cursor-pointer"
                    >
                      View Order Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackingOrder(null)}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Orders Pop-up Modal */}
        {allOrdersModal.isOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-fade-in"
            onClick={() => {
              setAllOrdersModal({ isOpen: false, title: '', ordersList: [] });
              setAllOrdersSearch('');
            }}
          >
            <div
              className="bg-neutral-50 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-accent-200/80 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header */}
              <div className="p-4 sm:p-6 bg-white border-b border-accent-200/60 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <HiOutlineShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-neutral-900 truncate">
                        {allOrdersModal.title || 'All Orders History'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-100 text-accent-800 border border-accent-200">
                        {allOrdersModal.ordersList?.length || 0} Total Orders
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      Full view of all placed orders, tracking info & tax invoices
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAllOrdersModal({ isOpen: false, title: '', ordersList: [] });
                    setAllOrdersSearch('');
                  }}
                  className="p-2.5 rounded-2xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors border border-neutral-200 cursor-pointer shrink-0"
                  title="Close (ESC)"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              {/* Fast Search & Filter Bar inside Modal */}
              <div className="p-4 bg-white/80 border-b border-neutral-200/70 shrink-0">
                <div className="relative max-w-md">
                  <HiOutlineSearch className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={allOrdersSearch}
                    onChange={(e) => setAllOrdersSearch(e.target.value)}
                    placeholder="Search by Order ID (FC-...), product name, or status..."
                    className="w-full pl-10 pr-16 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  />
                  {allOrdersSearch && (
                    <button
                      type="button"
                      onClick={() => setAllOrdersSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-xs font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Modal Body: Scrollable Orders List */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {(() => {
                  const query = allOrdersSearch.trim().toLowerCase();
                  const filtered = (allOrdersModal.ordersList || []).filter((o) => {
                    if (!query) return true;
                    const orderId = (o.orderId || '').toLowerCase();
                    const status = (o.status || '').toLowerCase();
                    const payment = (o.paymentMethod || '').toLowerCase();
                    const customerName = (o.customer?.name || '').toLowerCase();
                    const itemsMatch = (o.items || []).some((item) =>
                      (item.title || '').toLowerCase().includes(query)
                    );
                    return (
                      orderId.includes(query) ||
                      status.includes(query) ||
                      payment.includes(query) ||
                      customerName.includes(query) ||
                      itemsMatch
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="bg-white rounded-3xl p-12 text-center border border-accent-100 shadow-xs max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                          <HiOutlineSearch className="w-6 h-6" />
                        </div>
                        <h4 className="font-serif text-base font-bold text-neutral-900">No Orders Found</h4>
                        <p className="text-xs text-neutral-500">
                          No orders match &ldquo;{allOrdersSearch}&rdquo;. Try another search term or clear the filter.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAllOrdersSearch('')}
                          className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>
                    );
                  }

                  return filtered.map((ord) => renderOrderCard(ord));
                })()}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-white border-t border-accent-200/60 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-neutral-500 font-medium">
                  Showing {allOrdersModal.ordersList?.length || 0} orders
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAllOrdersModal({ isOpen: false, title: '', ordersList: [] });
                    setAllOrdersSearch('');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tax Invoice Modal */}
        {invoiceOrder && (
          <InvoiceView
            order={invoiceOrder}
            isOpen={Boolean(invoiceOrder)}
            onClose={() => setInvoiceOrder(null)}
          />
        )}

        {/* Address Modal (Add / Edit) */}
        <AddressModal
          isOpen={addressModalOpen}
          onClose={() => setAddressModalOpen(false)}
          address={selectedAddressForEdit}
          onSuccess={handleAddressSuccess}
          defaultPhone={user?.phone || ''}
          defaultSecondaryPhone={user?.secondaryPhone || ''}
        />

        {/* Edit Profile Modal (Email & Phone Change with Dual OTP) */}
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          user={user}
          onSuccess={(updatedUser) => {
            if (updatedUser) {
              updateUser(updatedUser);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Account;
