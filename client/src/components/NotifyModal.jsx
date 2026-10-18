import { useState } from 'react';
import {
  HiOutlineBell,
  HiOutlineX,
  HiOutlineMail,
  HiOutlineCheck,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineKey
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { formatPrice, getImageUrl } from '../utils/formatters';
import GoogleAuthButton from './GoogleAuthButton';

const NotifyModal = ({ isOpen, onClose, product, selectedColor, selectedSize, onSubscribed }) => {
  const { user, requestToken, verifyToken, login } = useAuth();

  // Active auth mode: 'token' (default for quick email code), 'google', 'password'
  const [authMode, setAuthMode] = useState('token');

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  if (!isOpen || !product) return null;

  const variantDesc = [selectedColor, selectedSize].filter(Boolean).join(' • ');

  // Direct subscription for logged in user or post-login
  const handleDirectSubscribe = async (userEmail, userName) => {
    setLoading(true);
    try {
      const res = await API.post('/notifications/subscribe', {
        productId: product._id,
        color: selectedColor || '',
        size: selectedSize || '',
        email: userEmail || user?.email
      });

      toast.success(res.data.message || 'Waitlist confirmed! Check your email.', {
        icon: '🔔',
        duration: 4500
      });

      setSuccessDone(true);
      if (onSubscribed) onSubscribed();
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error(err.response?.data?.message || 'Failed to subscribe to waitlist');
    } finally {
      setLoading(false);
    }
  };

  // 1. Send 6-digit verification token via Nodemailer
  const handleSendToken = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await requestToken(email);
      toast.success(res.message || '6-digit verification code sent to your email!', {
        icon: '📬'
      });
      setCodeSent(true);
    } catch (err) {
      console.error('Token request error:', err);
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify 6-digit token, log in, and auto-subscribe
  const handleVerifyTokenAndSubscribe = async (e) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      toast.error('Please enter the 6-digit code sent to your email');
      return;
    }

    setLoading(true);
    try {
      const authData = await verifyToken(email, code, name);
      toast.success(`Welcome ${authData.user.name || email}!`, { icon: '✨' });
      // Now auto-subscribe
      await handleDirectSubscribe(authData.user.email, authData.user.name);
    } catch (err) {
      console.error('Token verification error:', err);
      toast.error(err.response?.data?.message || 'Invalid or expired verification code');
      setLoading(false);
    }
  };

  // 3. Password login then auto-subscribe
  const handlePasswordLoginAndSubscribe = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const authData = await login(email, password);
      toast.success(`Welcome back ${authData.user.name}!`);
      await handleDirectSubscribe(authData.user.email, authData.user.name);
    } catch (err) {
      console.error('Password login error:', err);
      toast.error(err.response?.data?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  // 4. Google Auth success callback
  const handleGoogleSuccess = async (googleUser) => {
    await handleDirectSubscribe(googleUser.email, googleUser.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-accent-100 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="Close modal"
        >
          <HiOutlineX className="w-5 h-5" />
        </button>

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
              ? "We've registered your alert. We'll send you an email the instant it restocks!"
              : "Never miss out. Get notified by email as soon as this item is back in our boutique."}
          </p>
        </div>

        {/* Product Quick Snapshot Card */}
        <div className="my-4 p-3 rounded-2xl bg-cream border border-accent-200/60 flex items-center gap-3">
          <div className="w-14 h-16 rounded-xl overflow-hidden bg-neutral-200 shrink-0">
            <img
              src={getImageUrl(product.images?.[0])}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-bold text-xs text-neutral-900 truncate">
              {product.title}
            </h4>
            {variantDesc && (
              <span className="text-[11px] text-accent-800 font-semibold block truncate">
                Selected: {variantDesc}
              </span>
            )}
            <span className="text-xs font-bold text-primary block mt-0.5">
              {formatPrice(product.salePrice || product.price)}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CASE 1: SUCCESS CONFIRMED STATE                          */}
        {/* ======================================================== */}
        {successDone ? (
          <div className="space-y-4 py-2 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                <HiOutlineCheck className="w-5 h-5 text-emerald-600" />
                <span>Waitlist Confirmed!</span>
              </div>
              <p className="text-xs leading-relaxed text-emerald-700">
                A confirmation email has been dispatched via <strong>Nodemailer</strong> to{' '}
                <span className="font-bold underline">{user?.email || email}</span>.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
            >
              Done & Return to Boutique
            </button>
          </div>
        ) : user ? (
          /* ======================================================== */
          /* CASE 2: USER IS ALREADY LOGGED IN                        */
          /* ======================================================== */
          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">
                Logged in Account:
              </span>
              <p className="text-xs font-bold text-neutral-900">
                {user.name} ({user.email})
              </p>
              <p className="text-[11px] text-neutral-500">
                We will email restock notifications directly to this verified address.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDirectSubscribe(user.email, user.name)}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <HiOutlineBell className="w-4 h-4" />
                  <span>Notify Me at {user.email}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* CASE 3: USER IS NOT LOGGED IN                            */
          /* ======================================================== */
          <div className="space-y-4 pt-1">
            <div className="text-center">
              <span className="text-xs font-bold text-neutral-700 block">
                Sign in to activate restock alerts
              </span>
              <span className="text-[11px] text-neutral-400">
                Choose Google or verify your email manually with a 6-digit token
              </span>
            </div>

            {/* Google OAuth Section */}
            <div className="pt-1 pb-2 border-b border-neutral-100 flex flex-col items-center">
              <GoogleAuthButton onSuccess={handleGoogleSuccess} text="continue_with" />
            </div>

            {/* Divider */}
            <div className="relative text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <span className="relative px-3 bg-white text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Or Manual Authentication
              </span>
            </div>

            {/* Switcher: Token (OTP) vs Password */}
            <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode('token'); setCodeSent(false); }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  authMode === 'token' ? 'bg-white text-primary shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                🔑 6-Digit Email Token
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('password')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  authMode === 'password' ? 'bg-white text-primary shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                🔒 Password Login
              </button>
            </div>

            {/* SUB-FLOW A: 6-DIGIT EMAIL TOKEN VERIFICATION */}
            {authMode === 'token' && (
              !codeSent ? (
                <form onSubmit={handleSendToken} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Email Address
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <HiOutlineKey className="w-4 h-4" />
                        <span>Send 6-Digit Verification Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyTokenAndSubscribe} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-accent-50 border border-accent-200/60 text-center">
                    <span className="text-[11px] text-accent-900 font-semibold block">
                      Code dispatched via Nodemailer to:
                    </span>
                    <strong className="text-xs text-primary font-bold">{email}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Enter 6-Digit Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-3 py-2.5 rounded-xl border-2 border-accent-300 text-center text-lg font-mono tracking-[0.3em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <HiOutlineCheck className="w-4 h-4" />
                        <span>Verify & Confirm Waitlist</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCodeSent(false)}
                    className="text-[11px] text-neutral-500 hover:text-primary font-semibold block mx-auto pt-1"
                  >
                    ← Change Email or Resend
                  </button>
                </form>
              )
            )}

            {/* SUB-FLOW B: STANDARD PASSWORD LOGIN */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordLoginAndSubscribe} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineSparkles className="w-4 h-4" />
                      <span>Sign In & Subscribe</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotifyModal;
