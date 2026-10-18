import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HiOutlineShoppingBag, HiOutlineLockClosed, HiOutlineCheckCircle, HiArrowRight, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart, getSavedAddress, saveAddress } = useCart();
  const { user } = useAuth();

  const [threshold, setThreshold] = useState(999);
  useEffect(() => {
    API.get('/settings').then(res => {
      if (res.data?.freeShippingThreshold) {
        setThreshold(Number(res.data.freeShippingThreshold));
      }
    }).catch(() => {});
  }, []);

  const freeShippingThreshold = threshold;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const shippingCharge = isFreeShipping ? 0 : 79;
  const grandTotal = subtotal + shippingCharge;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    street: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '',
    saveInfo: true,
    paymentMethod: 'cod', // Cash / UPI on Delivery
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill form from user account or saved guest address
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    const saved = getSavedAddress();
    if (user) {
      const defaultAddr = user.savedAddresses?.[0] || {};
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
        street: defaultAddr.street || saved?.street || prev.street,
        city: defaultAddr.city || saved?.city || prev.city,
        state: defaultAddr.state || saved?.state || prev.state,
        pincode: defaultAddr.pincode || saved?.pincode || prev.pincode,
      }));
    } else if (saved) {
      setFormData((prev) => ({
        ...prev,
        name: saved.name || '',
        phone: saved.phone || '',
        email: saved.email || '',
        street: saved.street || '',
        city: saved.city || 'Chennai',
        state: saved.state || 'Tamil Nadu',
        pincode: saved.pincode || '',
      }));
    }
  }, [user, items.length, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    if (!formData.street.trim()) {
      setErrorMsg('Please enter your house/flat number and street address.');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      setErrorMsg('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setSubmitting(true);

    try {
      // Save address if opted
      if (formData.saveInfo) {
        saveAddress({
          name: formData.name,
          phone: cleanPhone,
          email: formData.email,
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        });
      }

      const orderPayload = {
        items: items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || '',
          title: item.title,
        })),
        customer: {
          name: formData.name.trim(),
          phone: cleanPhone,
          email: formData.email.trim() || undefined,
          address: {
            street: formData.street.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
          },
        },
        shippingCharge,
      };

      const res = await API.post('/orders', orderPayload);
      const placedOrder = res.data;

      // Clear cart
      clearCart();
      toast.success('🎉 Order placed successfully!');

      // Redirect to confirmation page
      navigate(`/order-success/${placedOrder.orderId}`, { state: { order: placedOrder } });
    } catch (err) {
      console.error('Checkout error:', err);
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 429
          ? 'Too many order attempts. Please wait a few minutes before trying again.'
          : 'Failed to place order. Please check your details and try again.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <nav className="text-xs text-neutral-500 mb-2 flex items-center gap-1.5">
            <Link to="/cart" className="hover:text-primary">Shopping Bag</Link>
            <span>/</span>
            <span className="text-primary font-semibold">Express Checkout</span>
          </nav>
          <h1 className="font-serif text-3xl font-bold text-neutral-900">Checkout</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Complete your order in seconds. No account password required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Delivery & Customer Info */}
          <div className="lg:col-span-7 space-y-6">
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium animate-shake">
                {errorMsg}
              </div>
            )}

            {/* Contact Details Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h2 className="font-serif text-lg font-bold text-neutral-900">1. Contact Information</h2>
                {!user && (
                  <span className="text-xs text-neutral-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">
                      Sign in
                    </Link>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Priya Sundaram"
                    className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Mobile Number (Mandatory for Delivery) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-xs font-bold text-neutral-500">+91</span>
                    <input
                      type="tel"
                      name="phone"
                      required
                      maxLength={10}
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="95007 57024"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Email Address (Optional — for order receipt & tracking)
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="priya@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-neutral-900 pb-3 border-b border-neutral-100">
                2. Delivery Address
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    House / Flat No., Building & Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="street"
                    required
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="Flat 3B, 7/4 Perambur High Road, Jamalia"
                    className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Chennai"
                      className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      required
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Tamil Nadu"
                      className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="600012"
                      className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-2 cursor-pointer text-xs font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    name="saveInfo"
                    checked={formData.saveInfo}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-accent-300 text-primary focus:ring-primary"
                  />
                  <span>Save this address on this browser for future orders</span>
                </label>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-neutral-900 pb-3 border-b border-neutral-100">
                3. Payment Method
              </h2>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-2xl border-2 border-primary bg-primary-50/30 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div>
                      <strong className="text-sm text-neutral-900 block font-semibold">
                        Cash on Delivery / UPI at Doorstep
                      </strong>
                      <span className="text-xs text-neutral-500">
                        Pay with GooglePay, PhonePe, Paytm, or Cash when your dress arrives
                      </span>
                    </div>
                  </div>
                  <HiOutlineCheckCircle className="w-5 h-5 text-primary shrink-0" />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-6 sticky top-24">
            <h2 className="font-serif text-xl font-bold text-neutral-900 pb-3 border-b border-neutral-100 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-semibold text-accent-700 font-sans">
                {items.length} {items.length === 1 ? 'Design' : 'Designs'}
              </span>
            </h2>

            {/* Items list preview */}
            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 pr-1 space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex items-center gap-3.5">
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.title}
                    onError={handleImageError}
                    className="w-14 h-16 object-cover object-top rounded-xl border border-accent-100 bg-neutral-50 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">{item.title}</h4>
                    <p className="text-[11px] text-neutral-500">
                      Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-neutral-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="border-t border-neutral-100 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-semibold text-neutral-900">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Delivery Charge</span>
                <span className="font-semibold text-neutral-900">
                  {isFreeShipping ? (
                    <span className="text-emerald-700 text-xs font-bold uppercase">FREE</span>
                  ) : (
                    formatPrice(shippingCharge)
                  )}
                </span>
              </div>
              <div className="border-t border-neutral-100 pt-3 flex justify-between text-base">
                <span className="font-bold text-neutral-900">Total Payable</span>
                <span className="font-serif text-2xl font-bold text-primary">{formatPrice(grandTotal)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-light text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HiOutlineLockClosed className="w-4 h-4" />
                  <span>Place Order • {formatPrice(grandTotal)}</span>
                  <HiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pt-2">
              <HiOutlineShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Safe & Secure • Direct Store Fulfillment by Friends Collections</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
