import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineShoppingBag,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiArrowRight,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineExclamationCircle
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, availableItems, outOfStockCount, subtotal, clearCart, getSavedAddress, saveAddress } = useCart();
  const { user, updateUser } = useAuth();
  const isOrderPlacedRef = useRef(false);

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

  // Razorpay Gateway Config
  const [razorpayConfig, setRazorpayConfig] = useState({ keyId: '', isConfigured: false });
  useEffect(() => {
    API.get('/payment/razorpay-key')
      .then((res) => {
        if (res.data) setRazorpayConfig(res.data);
      })
      .catch((err) => console.warn('Could not load Razorpay key from backend:', err));
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 10-Minute Stock Reservation Session
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('fc_checkout_session');
    if (!sid) {
      sid = 'chk_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      sessionStorage.setItem('fc_checkout_session', sid);
    }
    return sid;
  });

  const [holdState, setHoldState] = useState({
    active: false,
    remainingSeconds: 600,
    conflict: false,
    conflictMessage: '',
    expired: false,
    loading: true
  });

  const requestHold = async () => {
    if (!availableItems || availableItems.length === 0) return;
    setHoldState((prev) => ({ ...prev, loading: true, conflict: false }));
    try {
      const res = await API.post('/orders/reserve', {
        sessionId,
        items: availableItems.map((it) => ({
          product: it.product,
          quantity: it.quantity,
          size: it.size || '',
          color: it.color || '',
          title: it.title
        }))
      });
      setHoldState({
        active: true,
        remainingSeconds: res.data.remainingSeconds || 600,
        conflict: false,
        conflictMessage: '',
        expired: false,
        loading: false
      });
    } catch (err) {
      if (err.response?.status === 409) {
        setHoldState({
          active: false,
          remainingSeconds: 0,
          conflict: true,
          conflictMessage: err.response.data?.message || 'Another customer is holding this item in checkout.',
          expired: false,
          loading: false
        });
      } else {
        setHoldState((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  useEffect(() => {
    if (availableItems.length > 0) {
      requestHold();
    }
  }, [availableItems.length]);

  // Live countdown timer for 10-minute hold
  useEffect(() => {
    if (!holdState.active || holdState.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setHoldState((prev) => {
        if (prev.remainingSeconds <= 1) {
          return { ...prev, remainingSeconds: 0, active: false, expired: true };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [holdState.active, holdState.remainingSeconds]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    secondaryPhone: '',
    email: '',
    street: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '',
    saveInfo: true,
    paymentMethod: 'razorpay', // 'razorpay' | 'cod'
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill form from user account or saved guest address
  useEffect(() => {
    // If order has already been placed or is currently being processed, NEVER redirect to /cart!
    if (isOrderPlacedRef.current || submitting) return;

    if (availableItems.length === 0) {
      navigate('/cart');
      return;
    }

    const saved = getSavedAddress();
    if (user) {
      const defaultAddr =
        user.savedAddresses?.find((a) => a.isDefault) ||
        user.savedAddresses?.[0] ||
        {};

      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || defaultAddr.phone || prev.phone,
        secondaryPhone: user.secondaryPhone || defaultAddr.secondaryPhone || prev.secondaryPhone,
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
        secondaryPhone: saved.secondaryPhone || '',
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

  const handleSelectSavedAddress = (addr) => {
    setFormData((prev) => ({
      ...prev,
      street: addr.street,
      city: addr.city || prev.city,
      state: addr.state || prev.state,
      pincode: addr.pincode || prev.pincode,
      phone: addr.phone || user?.phone || prev.phone,
      secondaryPhone: addr.secondaryPhone || user?.secondaryPhone || prev.secondaryPhone,
    }));
    toast.success(`Loaded "${addr.label || 'Saved Address'}"! You can edit any details below.`, { icon: '📍' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // Prevent double entry clicks
    setErrorMsg('');

    // Validation for primary phone (strictly 10-digit Indian mobile)
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      const msg = 'Please enter a valid 10-digit Indian mobile number for primary contact.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // Validation for mandatory email address (strictly required for tax invoice & order tracking)
    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      const msg = 'Please enter a valid email address to receive your order confirmation & tax invoice.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    // Validation for 2nd phone number (optional)
    let cleanSecPhone = '';
    if (formData.secondaryPhone && formData.secondaryPhone.trim()) {
      cleanSecPhone = formData.secondaryPhone.replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanSecPhone)) {
        const msg = 'Please enter a valid 10-digit Indian mobile number for the 2nd number (or leave it blank).';
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if (cleanSecPhone === cleanPhone) {
        const msg = 'Alternate 2nd number should be different from your primary mobile number.';
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
    }

    if (!formData.street.trim()) {
      const msg = 'Please enter your house/flat number and street address.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode.trim())) {
      const msg = 'Please enter a valid 6-digit postal pincode.';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);

    try {
      // Save address locally if opted
      if (formData.saveInfo) {
        saveAddress({
          name: formData.name.trim(),
          phone: cleanPhone,
          secondaryPhone: cleanSecPhone,
          email: cleanEmail,
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        });

        // Also save/update address directly in User profile in MongoDB if logged in
        if (user) {
          try {
            const profileRes = await API.put('/auth/profile', {
              name: formData.name.trim(),
              phone: cleanPhone,
              secondaryPhone: cleanSecPhone,
              address: {
                street: formData.street.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                pincode: formData.pincode.trim(),
                label: 'Home'
              }
            });
            if (profileRes.data && updateUser) {
              updateUser(profileRes.data);
            }
          } catch (profileErr) {
            console.warn('Could not sync address to profile:', profileErr);
          }
        }
      }

      const orderPayload = {
        sessionId,
        items: availableItems.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || '',
          title: item.title,
        })),
        customer: {
          name: formData.name.trim(),
          phone: cleanPhone,
          secondaryPhone: cleanSecPhone,
          email: cleanEmail,
          address: {
            street: formData.street.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            pincode: formData.pincode.trim(),
          },
        },
        shippingCharge,
        saveAddress: formData.saveInfo
      };

      // 1. ONLINE PAYMENT VIA RAZORPAY
      if (formData.paymentMethod === 'razorpay') {
        const keyToUse = razorpayConfig.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;

        // If keys are not configured yet, advise the user
        if (!keyToUse && !razorpayConfig.isConfigured) {
          setSubmitting(false);
          const notice = 'Razorpay keys are not yet configured in server .env. Please fill RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or choose Cash on Delivery to complete your purchase.';
          setErrorMsg(notice);
          toast.error(notice, { duration: 6000 });
          return;
        }

        // Ensure Razorpay SDK script is ready
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded || typeof window.Razorpay === 'undefined') {
          setSubmitting(false);
          const err = 'Failed to load Razorpay payment gateway. Please check your internet connection or choose Cash on Delivery.';
          setErrorMsg(err);
          toast.error(err);
          return;
        }

        // Create secure Payment Draft and Razorpay Order on server (No order placed in MongoDB yet!)
        let rzpOrderData;
        try {
          const createRes = await API.post('/payment/create-order', {
            items: availableItems.map((item) => ({
              product: item.product,
              quantity: item.quantity,
              size: item.size || '',
              color: item.color || '',
              title: item.title,
            })),
            customer: {
              name: formData.name.trim(),
              phone: cleanPhone,
              secondaryPhone: cleanSecPhone,
              email: cleanEmail,
              address: {
                street: formData.street.trim(),
                city: formData.city.trim(),
                state: formData.state.trim(),
                pincode: formData.pincode.trim(),
              },
            },
            sessionId,
            saveAddress: formData.saveInfo
          });
          rzpOrderData = createRes.data;
        } catch (createErr) {
          setSubmitting(false);
          const errMsg = createErr.response?.data?.message || 'Could not initiate Razorpay payment.';
          setErrorMsg(errMsg);
          toast.error(errMsg, { duration: 6000 });
          return;
        }

        // Configure Razorpay checkout options
        const rzpOptions = {
          key: rzpOrderData.keyId || keyToUse,
          amount: rzpOrderData.amount,
          currency: rzpOrderData.currency || 'INR',
          name: 'Friends Collections',
          description: 'Online Payment (Cards, UPI, NetBanking)',
          image: '/logo.png',
          order_id: rzpOrderData.razorpayOrderId,
          prefill: {
            name: formData.name.trim(),
            email: cleanEmail,
            contact: cleanPhone
          },
          notes: {
            customerPhone: cleanPhone
          },
          theme: {
            color: '#54142D'
          },
          handler: async function (response) {
            // Cryptographically verify HMAC-SHA256 signature on backend and place confirmed order
            try {
              setSubmitting(true);
              toast.loading('Verifying secure payment with Razorpay...', { id: 'rzp-verify' });

              const verifyRes = await API.post('/payment/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.data?.success && verifyRes.data?.order) {
                // Mark order placed immediately to prevent any empty-cart redirection
                isOrderPlacedRef.current = true;
                toast.success('🎉 Payment verified! Order confirmed automatically.', { id: 'rzp-verify' });

                // SUCCESS ONLY: Clear hold session and clear cart!
                sessionStorage.removeItem('fc_checkout_session');
                clearCart();

                navigate(`/order-success/${verifyRes.data.order.orderId}`, {
                  replace: true,
                  state: { order: verifyRes.data.order }
                });
              } else {
                toast.error('Payment verification failed. Please contact support.', { id: 'rzp-verify' });
              }
            } catch (vErr) {
              console.error('Verification error:', vErr);
              const vMsg = vErr.response?.data?.message || 'Payment verification failed. Your items remain in your cart.';
              toast.error(vMsg, { id: 'rzp-verify' });
            } finally {
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              API.post('/payment/failure', {
                razorpayOrderId: rzpOrderData.razorpayOrderId,
                errorReason: 'Payment cancelled or dismissed by customer'
              }).catch(() => {});
              toast('Payment was not completed. No order was placed, and your items remain safely in your cart.', {
                icon: 'ℹ️',
                duration: 5000
              });
              // CRITICAL: DO NOT CLEAR CART!
            }
          }
        };

        const rzp = new window.Razorpay(rzpOptions);
        rzp.on('payment.failed', function (resp) {
          setSubmitting(false);
          API.post('/payment/failure', {
            razorpayOrderId: rzpOrderData.razorpayOrderId,
            errorReason: resp.error?.description || 'Transaction failed'
          }).catch(() => {});
          toast.error(`Payment Failed: ${resp.error?.description || 'Payment was unsuccessful'}. No order was placed, and your cart items are saved.`, {
            duration: 6000
          });
          // CRITICAL: DO NOT CLEAR CART!
        });

        rzp.open();
        return;
      }

      // 2. CASH ON DELIVERY (COD)
      const res = await API.post('/orders', {
        ...orderPayload,
        paymentMethod: 'cod',
        paymentStatus: 'payment_pending'
      });
      const placedOrder = res.data;

      // Mark order placed before clearing cart so empty-cart hook doesn't redirect to /cart
      isOrderPlacedRef.current = true;
      sessionStorage.removeItem('fc_checkout_session');
      clearCart();
      toast.success('🎉 Order placed successfully with Cash on Delivery!');

      // Redirect to confirmation page
      navigate(`/order-success/${placedOrder.orderId}`, {
        replace: true,
        state: { order: placedOrder }
      });
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
      if (formData.paymentMethod !== 'razorpay') {
        setSubmitting(false);
      }
    }
  };

  const cleanPhoneInput = (formData.phone || '').toString().replace(/\D/g, '');
  const isPhoneValid = /^[6-9]\d{9}$/.test(cleanPhoneInput);
  const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test((formData.email || '').toString().trim());

  return (
    <div className="min-h-screen bg-cream py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
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

        {/* 10-Minute Stock Reservation Banner */}
        {holdState.active && (
          <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-amber-500/10 border border-amber-300/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md animate-pulse">
                <HiOutlineClock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-sm sm:text-base text-neutral-900">
                    Stock Reserved for You
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    10-Min Hold Active
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">
                  We are temporarily holding your {items.length === 1 ? 'item' : 'items'} so no other customer can buy it out from under you while you enter your delivery address.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-amber-200 shadow-xs shrink-0 self-start sm:self-center">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Hold Expires In:</span>
              <span className="font-mono text-xl font-black text-primary tracking-wider">
                {formatTimer(holdState.remainingSeconds)}
              </span>
            </div>
          </div>
        )}

        {/* Conflict / Already Reserved Banner */}
        {holdState.conflict && (
          <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-red-50 border border-red-300 shadow-sm flex items-start gap-3.5 text-red-900 animate-fade-in">
            <HiOutlineExclamationCircle className="w-6 h-6 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 space-y-2">
              <h4 className="font-bold text-sm">High-Demand Item Notice</h4>
              <p className="text-xs text-red-700 leading-relaxed">
                {holdState.conflictMessage || 'Another customer is currently holding this item in their checkout session. If they do not complete the purchase within 10 minutes, the item will be released automatically.'}
              </p>
              <button
                type="button"
                onClick={requestHold}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <HiOutlineRefresh className="w-3.5 h-3.5" />
                Check Availability Again
              </button>
            </div>
          </div>
        )}

        {/* Expired Hold Banner */}
        {holdState.expired && (
          <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-amber-50 border border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-900 animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <HiOutlineClock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">10-Minute Hold Expired</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your reservation window has ended. You can still complete your order now if stock is still available, or re-hold your items for another 10 minutes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={requestHold}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <HiOutlineRefresh className="w-3.5 h-3.5" />
              Re-Hold for 10 Minutes
            </button>
          </div>
        )}

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

              {/* Logged-In User Banner */}
              {user && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Signed in as <strong>{user.name}</strong> ({user.email}). Details auto-filled from your profile — you can edit anything below.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
                    Auto-Filled
                  </span>
                </div>
              )}

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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Mobile Number (Mandatory) <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isPhoneValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : formData.phone.length > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {isPhoneValid ? '✓ 10 Digits Valid' : 'Primary Contact'}
                    </span>
                  </div>
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
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-neutral-50/50 ${
                        formData.phone.length > 0 && !isPhoneValid
                          ? 'border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/20'
                          : isPhoneValid
                          ? 'border-emerald-400 focus:ring-emerald-400 focus:border-emerald-400 bg-emerald-50/10'
                          : 'border-accent-200 focus:ring-primary focus:border-transparent'
                      }`}
                    />
                  </div>
                  {formData.phone.length > 0 && !isPhoneValid ? (
                    <p className="text-[11px] text-red-600 font-medium mt-1">
                      Must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 ({cleanPhoneInput.length}/10 digits).
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Required for order dispatch SMS alerts and delivery verification.
                    </p>
                  )}
                </div>

                {/* Option for 2nd Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Alternate / 2nd Mobile Number (Optional)
                    </label>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Backup Contact
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3.5 text-xs font-bold text-neutral-500">+91</span>
                    <input
                      type="tel"
                      name="secondaryPhone"
                      maxLength={10}
                      value={formData.secondaryPhone}
                      onChange={handleChange}
                      placeholder="e.g. 98401 12345 (Optional)"
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Courier will call this 2nd number if primary number is unreachable.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-neutral-700">
                      Email Address (Mandatory) <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      isEmailValid
                        ? 'bg-emerald-100 text-emerald-800'
                        : formData.email.length > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {isEmailValid ? '✓ Verified Format' : 'Receipt & Tax Invoice'}
                    </span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="priya@example.com"
                    className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-neutral-50/50 ${
                      formData.email.length > 0 && !isEmailValid
                        ? 'border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/20'
                        : isEmailValid
                        ? 'border-emerald-400 focus:ring-emerald-400 focus:border-emerald-400 bg-emerald-50/10'
                        : 'border-accent-200 focus:ring-primary focus:border-transparent'
                    }`}
                  />
                  {formData.email.length > 0 && !isEmailValid ? (
                    <p className="text-[11px] text-red-600 font-medium mt-1">
                      Please enter a valid email format (e.g. name@domain.com) to receive your invoice.
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Your official order confirmation & PDF tax invoice will be delivered here.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h2 className="font-serif text-lg font-bold text-neutral-900">
                  2. Delivery Address
                </h2>
                {user && (
                  <span className="text-xs text-neutral-500">
                    Edit or enter any address below
                  </span>
                )}
              </div>

              {/* Saved Addresses Selector for Logged-in User */}
              {user && user.savedAddresses?.length > 0 && (
                <div className="p-4 rounded-2xl bg-cream-light/80 border border-accent-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📍</span> Saved Addresses in Your Profile:
                    </span>
                    <span className="text-[11px] text-neutral-500">Click to auto-fill</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {user.savedAddresses.map((addr, idx) => {
                      const isSelected =
                        formData.street === addr.street && formData.pincode === addr.pincode;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSavedAddress(addr)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-white shadow-sm ring-2 ring-primary/20'
                              : 'border-neutral-200 bg-white/70 hover:bg-white hover:border-accent-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-neutral-900 mb-1">
                            <span>{addr.label || `Address #${idx + 1}`}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-700 line-clamp-1">{addr.street}</p>
                          <p className="text-[11px] text-neutral-500">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

                {/* Option to Save Address for Future Use */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-cream-light/60 border border-accent-200/60 cursor-pointer text-xs font-medium text-neutral-700 transition-colors hover:bg-cream-light">
                  <input
                    type="checkbox"
                    name="saveInfo"
                    checked={formData.saveInfo}
                    onChange={handleChange}
                    className="h-4 w-4 mt-0.5 rounded border-accent-300 text-primary focus:ring-primary shrink-0"
                  />
                  <div>
                    <span className="font-bold text-neutral-900 block">
                      {user
                        ? 'Save & update this address and numbers in my profile for future orders'
                        : 'Save this address and contact numbers on this browser for future orders'}
                    </span>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {user
                        ? 'Your account profile will be updated so your next checkout will pre-fill these details automatically.'
                        : 'Stores your address securely on this device so you will not have to type it again.'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Method Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <h2 className="font-serif text-lg font-bold text-neutral-900">
                  3. Select Payment Method
                </h2>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <HiOutlineShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  100% Secure Checkout
                </span>
              </div>

              <div className="space-y-3">
                {/* Option 1: Razorpay Instant Online Payment */}
                <label className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.paymentMethod === 'razorpay'
                    ? 'border-primary bg-primary-50/40 shadow-xs ring-2 ring-primary/20'
                    : 'border-neutral-200 hover:border-accent-300 bg-white'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={formData.paymentMethod === 'razorpay'}
                      onChange={handleChange}
                      className="h-4 w-4 mt-1 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-sm text-neutral-900 font-bold">
                          Online Payment (UPI, Cards, NetBanking, Wallets)
                        </strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase">
                          ⚡ Instant Confirmation
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Google Pay, PhonePe, Paytm, BHIM UPI, Credit/Debit Cards (Visa, Mastercard, RuPay), NetBanking
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-neutral-600 flex-wrap">
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 border border-neutral-200 text-[10px]">UPI</span>
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 border border-neutral-200 text-[10px]">Cards</span>
                        <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-700 border border-neutral-200 text-[10px]">NetBanking</span>
                        <span className="text-accent-800 text-[10px] font-bold">via Razorpay Gateway</span>
                      </div>
                    </div>
                  </div>
                  {formData.paymentMethod === 'razorpay' && (
                    <HiOutlineCheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  )}
                </label>

                {/* Option 2: Cash on Delivery / UPI at Doorstep */}
                <label className={`flex items-start justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.paymentMethod === 'cod'
                    ? 'border-primary bg-primary-50/40 shadow-xs ring-2 ring-primary/20'
                    : 'border-neutral-200 hover:border-accent-300 bg-white'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === 'cod'}
                      onChange={handleChange}
                      className="h-4 w-4 mt-1 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div>
                      <strong className="text-sm text-neutral-900 font-bold block">
                        Cash on Delivery / UPI at Doorstep
                      </strong>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Pay with GooglePay, PhonePe, Paytm QR or Cash when your parcel arrives
                      </p>
                    </div>
                  </div>
                  {formData.paymentMethod === 'cod' && (
                    <HiOutlineCheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-6 sticky top-24">
            <h2 className="font-serif text-xl font-bold text-neutral-900 pb-3 border-b border-neutral-100 flex items-center justify-between">
              <span>Order Summary</span>
              <span className="text-xs font-semibold text-accent-700 font-sans">
                {availableItems.length} {availableItems.length === 1 ? 'Design' : 'Designs'}
              </span>
            </h2>

            {/* Out of Stock Notice */}
            {outOfStockCount > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <HiOutlineExclamationCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {outOfStockCount} {outOfStockCount === 1 ? 'item' : 'items'} out of stock
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Excluded from your order and total. Only in-stock items are processed.
                  </p>
                </div>
              </div>
            )}

            {/* Items list preview */}
            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-100 pr-1 space-y-3">
              {availableItems.map((item, idx) => (
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
              className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-light text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {formData.paymentMethod === 'razorpay' ? 'Opening Secure Payment Gateway...' : 'Confirming Order... Please wait'}
                  </span>
                </>
              ) : formData.paymentMethod === 'razorpay' ? (
                <>
                  <HiOutlineLockClosed className="w-4 h-4 text-accent-300" />
                  <span>Pay Securely • {formatPrice(grandTotal)}</span>
                  <HiArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <HiOutlineShoppingBag className="w-4 h-4 text-accent-300" />
                  <span>Place Cash on Delivery Order • {formatPrice(grandTotal)}</span>
                  <HiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {(!isPhoneValid || !isEmailValid) && (
              <p className="text-center text-[11px] font-semibold text-amber-800 bg-amber-50 py-2 px-3 rounded-xl border border-amber-200/80 flex items-center justify-center gap-1.5">
                <HiOutlineExclamationCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Valid 10-digit mobile number and email address are required to place order.</span>
              </p>
            )}

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
