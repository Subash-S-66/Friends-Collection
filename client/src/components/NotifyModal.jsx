import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  HiOutlineBell,
  HiOutlineX,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineUser,
  HiOutlineCheck
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { formatPrice, getImageUrl, handleImageError } from '../utils/formatters';
import GoogleAuthButton from './GoogleAuthButton';

const NotifyModal = ({ isOpen, onClose, product, selectedColor, selectedSize, onSubscribed }) => {
  const { user } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successDone, setSuccessDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Sync initial values from logged-in user
  useEffect(() => {
    if (user) {
      if (user.email) setEmail(user.email);
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user, isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product || typeof document === 'undefined') return null;

  const variantDesc = [selectedColor, selectedSize].filter(Boolean).join(' • ');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    const targetEmail = (user?.email || email || '').trim();
    if (!targetEmail || !/\S+@\S+\.\S+/.test(targetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (cleanPhone && cleanPhone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/notifications/subscribe', {
        productId: product._id || product.product || product.id,
        color: selectedColor || '',
        size: selectedSize || '',
        email: targetEmail,
        phone: cleanPhone,
        name: (user?.name || name || '').trim()
      });

      toast.success(res.data.message || 'Waitlist confirmed! Restock confirmation sent to your email.', {
        icon: '🔔',
        duration: 5000
      });

      setSubmittedEmail(targetEmail);
      setSuccessDone(true);
      if (onSubscribed) onSubscribed();
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error(err.response?.data?.message || 'Failed to subscribe to waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (googleUser) => {
    if (googleUser?.email) {
      setEmail(googleUser.email);
      if (googleUser.name) setName(googleUser.name);
      // Auto submit with Google user details
      setLoading(true);
      try {
        const res = await API.post('/notifications/subscribe', {
          productId: product._id || product.product || product.id,
          color: selectedColor || '',
          size: selectedSize || '',
          email: googleUser.email,
          phone: phone.trim().replace(/[^\d+]/g, ''),
          name: googleUser.name || ''
        });
        toast.success(`Waitlist confirmed for ${googleUser.name || googleUser.email}!`, { icon: '🔔' });
        setSubmittedEmail(googleUser.email);
        setSuccessDone(true);
        if (onSubscribed) onSubscribed();
      } catch (err) {
        console.error('Subscription error:', err);
        toast.error('Failed to subscribe to waitlist');
      } finally {
        setLoading(false);
      }
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-accent-100 relative max-h-[92vh] flex flex-col overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Fixed Close Button Header */}
        <div className="sticky top-0 z-30 flex items-center justify-end px-5 pt-4 pb-1 bg-white/95 backdrop-blur-md shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200/80 shadow-2xs bg-white cursor-pointer active:scale-95"
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 flex-1 space-y-4">
          {/* Modal Header */}
          <div className="text-center space-y-2 pb-4 border-b border-neutral-100">
            <div className="w-14 h-14 rounded-full bg-accent-100/80 text-primary flex items-center justify-center mx-auto shadow-sm">
              <HiOutlineBell className="w-7 h-7 text-accent-700" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
              {successDone ? "You're on the Waitlist!" : "Notify Me When Available"}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              {successDone
                ? "We've registered your alert. We'll send you an email the instant this garment restocks!"
                : "Never miss out. Enter your details to get an instant email when this design arrives."}
            </p>
          </div>

        {/* Product Quick Snapshot Card */}
        <div className="my-4 p-3 rounded-2xl bg-cream border border-accent-200/60 flex items-center gap-3">
          <div className="w-14 h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
            <img
              src={getImageUrl(product.images?.[0] || product.image)}
              alt={product.title}
              onError={handleImageError}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-bold text-xs text-neutral-900 truncate">
              {product.title}
            </h4>
            {variantDesc && (
              <span className="text-[11px] text-accent-800 font-semibold block truncate">
                Variant: {variantDesc}
              </span>
            )}
            <span className="text-xs font-bold text-primary block mt-0.5">
              {formatPrice(product.salePrice || product.price)}
            </span>
          </div>
        </div>

        {/* Success Confirmed State */}
        {successDone ? (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1.5 text-left">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <HiOutlineCheck className="w-4 h-4" />
                </div>
                <span>Waitlist Confirmed!</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-700">
                A confirmation has been sent to{' '}
                <strong className="underline text-emerald-900">{submittedEmail || email}</strong>.
              </p>
              <p className="text-[11px] text-emerald-600">
                When new stock arrives at our boutique, you'll receive a notification email with direct checkout access and exclusive boutique contact assistance.
              </p>
            </div>

            {/* Boutique Assistance Card */}
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-left space-y-1">
              <span className="text-[11px] font-bold text-neutral-700 block">
                Have questions or urgent wedding requirements?
              </span>
              <p className="text-xs text-neutral-600">
                📞 Call Store: <a href="tel:+919500757024" className="font-bold text-primary">+91 95007 57024</a>
              </p>
              <p className="text-xs text-neutral-600">
                💬 WhatsApp:{' '}
                <a
                  href={`https://wa.me/919500757024?text=Hi%20Friends%20Collections,%20I%20have%20waitlisted%20for%20${encodeURIComponent(product.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-600"
                >
                  Chat with Boutique (+91 95007 57024)
                </a>
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              Done & Return to Boutique
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* If Logged In */}
            {user ? (
              <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Logged in Account:
                </span>
                <p className="text-xs font-bold text-neutral-900">
                  {user.name} ({user.email})
                </p>
                <p className="text-[11px] text-neutral-500">
                  We'll email restock alerts directly to this verified address.
                </p>
              </div>
            ) : (
              /* If Guest: Email Input */
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Mobile / WhatsApp Number (for both guest & user) */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                <span>Phone / WhatsApp Number</span>
                <span className="text-[10px] font-normal text-neutral-400">Optional</span>
              </label>
              <div className="relative">
                <HiOutlinePhone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9500757024"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">
                Receive an optional SMS/WhatsApp alert when restocked
              </p>
            </div>

            {/* Name (if guest) */}
            {!user && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                  <span>Your Name</span>
                  <span className="text-[10px] font-normal text-neutral-400">Optional</span>
                </label>
                <div className="relative">
                  <HiOutlineUser className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Main Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HiOutlineBell className="w-4 h-4" />
                  <span>Notify Me When Available</span>
                </>
              )}
            </button>

            {/* Guest Quick Google Sign-In */}
            {!user && (
              <div className="pt-2 border-t border-neutral-100 flex flex-col items-center gap-2">
                <span className="text-[11px] text-neutral-400">Or quick subscribe with</span>
                <GoogleAuthButton onSuccess={handleGoogleSuccess} text="continue_with" />
              </div>
            )}
          </form>
        )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default NotifyModal;
