import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  HiOutlineCheck,
  HiOutlineMail,
  HiOutlineKey,
  HiOutlineSparkles,
  HiArrowRight,
  HiOutlineShieldCheck
} from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Verification States: 'input' | 'verifying' | 'celebrate'
  const [status, setStatus] = useState(initialToken && initialEmail ? 'verifying' : 'input');
  const [countdown, setCountdown] = useState(3);
  const [verifiedUser, setVerifiedUser] = useState(null);

  const { verifyEmailToken, resendVerification } = useAuth();
  const { showMailErrorAlert, showOtpErrorAlert } = useAlert();
  const navigate = useNavigate();
  const autoVerifiedRef = useRef(false);

  // Auto-verify if URL contains both token and email
  useEffect(() => {
    if (initialToken && initialEmail && !autoVerifiedRef.current) {
      autoVerifiedRef.current = true;
      executeVerification(initialEmail, initialToken);
    }
  }, [initialToken, initialEmail]);

  // Execute verification API call
  const executeVerification = async (targetEmail, targetToken) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await verifyEmailToken({
        email: targetEmail.trim().toLowerCase(),
        token: targetToken.trim()
      });

      setVerifiedUser(res.user);
      setStatus('celebrate');
      toast.success('Account successfully verified!', { icon: '🎉' });
      startCountdown(res.user);
    } catch (err) {
      console.error('Verification error:', err);
      const msg = err.response?.data?.message || 'Invalid or expired verification token. Please request a new code.';
      setErrorMsg(msg);
      setStatus('input');
      toast.error(msg);
      if (
        err.response?.status === 502 ||
        err.response?.data?.isMailError ||
        err.response?.data?.isOtpError ||
        err.code === 'ECONNABORTED'
      ) {
        showOtpErrorAlert({
          title: 'Verification Service Issue',
          message: msg,
          email: targetEmail,
          isVerification: true,
          retryAfter: 15,
          onRetry: () => executeVerification(targetEmail, targetToken)
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 3, 2, 1 Countdown Animation before navigating into the requested page
  const startCountdown = (user) => {
    setCountdown(3);
    let count = 3;
    const redirectUrl =
      searchParams.get('redirect') ||
      searchParams.get('redirectTo') ||
      sessionStorage.getItem('post_auth_redirect') ||
      (user?.role === 'admin' ? '/admin' : '/');

    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        sessionStorage.removeItem('post_auth_redirect');
        navigate(redirectUrl);
      }
    }, 1000);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!token || token.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    executeVerification(email, token);
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Please enter your email address to resend');
      return;
    }
    if (resendCooldown > 0) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await resendVerification(email);
      toast.success(res.message || 'Verification code resent!', { icon: '📬' });
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      setErrorMsg(msg);
      toast.error(msg);
      showOtpErrorAlert({
        title: 'Unable to Resend Verification Code',
        message: msg,
        email,
        retryAfter: err.response?.data?.retryAfter || 30,
        onRetry: handleResend
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-20 flex items-center justify-center relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-accent-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-accent-100 shadow-card space-y-6"
        >
          {/* Header Brand */}
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Friends Collections"
                className="w-16 h-16 rounded-full mx-auto object-cover shadow-sm mb-2"
              />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
              {status === 'celebrate' ? 'Verified!' : 'Verify Your Account'}
            </h1>
            <p className="text-xs text-neutral-500">
              {status === 'celebrate'
                ? 'Welcome to the Friends Collections royal family!'
                : 'Enter your 6-digit verification code or click the link in your email'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* 1. AUTO-VERIFYING SPINNER STATE */}
            {status === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-10 text-center space-y-4"
              >
                <div className="w-14 h-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-sm font-bold text-neutral-800">
                  Verifying your account security token...
                </p>
                <span className="text-xs text-neutral-400 block">
                  Please hold on for a moment
                </span>
              </motion.div>
            )}

            {/* 2. MANUAL OTP ENTRY FORM */}
            {status === 'input' && (
              <motion.form
                key="manual-form"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onSubmit={handleManualSubmit}
                className="space-y-4"
              >
                {email && (
                  <div className="p-3 rounded-xl bg-accent-50 border border-accent-200 text-center">
                    <span className="text-xs text-accent-900 font-semibold block">
                      Verification code dispatched to:
                    </span>
                    <strong className="text-xs text-primary font-bold">{email}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <HiOutlineMail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={token}
                      onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-accent-300 text-center text-base sm:text-xl font-mono tracking-[0.18em] sm:tracking-[0.25em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50/50"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block text-center">
                    Check your email inbox or spam folder • Code expires in 10 minutes
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineShieldCheck className="w-5 h-5" />
                      <span>Verify & Enter Boutique</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1 text-neutral-500 font-semibold">
                  <Link to="/login" className="hover:text-primary transition-colors">
                    ← Back to Sign In
                  </Link>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResend}
                    className="hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </motion.form>
            )}

            {/* 3. CELEBRATORY TICK ANIMATION + 3,2,1 COUNTDOWN */}
            {status === 'celebrate' && (
              <motion.div
                key="celebrate"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="py-4 text-center space-y-6"
              >
                {/* Royal Animated Checkmark (Tick) */}
                <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                  {/* Outer Pulsing Aura Ring */}
                  <motion.div
                    animate={{
                      scale: [1, 1.25, 1],
                      opacity: [0.6, 0.2, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 rounded-full bg-emerald-400/20 border-2 border-emerald-500/40"
                  />

                  {/* Golden Rotating Ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-1 rounded-full border border-dashed border-[#D4AF37]/60"
                  />

                  {/* Main Green Checkmark Badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.15, 1] }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 border-3 border-white shadow-xl shadow-emerald-600/30 flex items-center justify-center relative z-10"
                  >
                    <svg
                      className="w-11 h-11 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                </div>

                {/* Verified Badge */}
                <div className="space-y-1.5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider shadow-xs"
                  >
                    <HiOutlineSparkles className="w-4 h-4 text-emerald-600" />
                    <span>Account Verified</span>
                  </motion.div>
                  <h3 className="font-serif text-2xl font-bold text-neutral-900 pt-1">
                    Welcome, {verifiedUser?.name || 'Valued Guest'}!
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Your account has been authenticated. Get ready to experience our royal handcrafted collections.
                  </p>
                </div>

                {/* 3, 2, 1 Countdown Display */}
                <div className="p-4 rounded-2xl bg-neutral-50 border border-accent-100 space-y-2">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest block">
                    Entering Boutique In
                  </span>

                  <div className="h-14 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={countdown}
                        initial={{ scale: 2, opacity: 0, y: -10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.6, opacity: 0, y: 10 }}
                        transition={{ duration: 0.35, ease: 'backOut' }}
                        className="text-4xl sm:text-5xl font-black font-numeric text-primary tracking-tight"
                      >
                        {countdown > 0 ? countdown : '✦'}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Visual Progress Dots */}
                  <div className="flex justify-center items-center gap-2 pt-1">
                    {[3, 2, 1].map((stepNum) => (
                      <div
                        key={stepNum}
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          countdown <= stepNum
                            ? 'bg-primary scale-110 shadow-xs'
                            : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const destination =
                      searchParams.get('redirect') ||
                      searchParams.get('redirectTo') ||
                      sessionStorage.getItem('post_auth_redirect') ||
                      (verifiedUser?.role === 'admin' ? '/admin' : '/');
                    sessionStorage.removeItem('post_auth_redirect');
                    navigate(destination);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-light transition-colors"
                >
                  <span>Skip countdown & enter now</span>
                  <HiArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmail;
