import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineLockClosed,
  HiOutlineMail,
  HiArrowRight,
  HiOutlineKey,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineSparkles
} from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password, 3: Success Animation
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { forgotPasswordRequest, forgotPasswordVerify } = useAuth();
  const navigate = useNavigate();

  // Step 1: Dispatch OTP to email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forgotPasswordRequest(email);
      toast.success(res.message || 'Password reset OTP dispatched to your email!', { icon: '📬' });
      setStep(2);
      startResendTimer();
    } catch (err) {
      console.error('Forgot password request error:', err);
      const msg = err.response?.data?.message || 'Failed to dispatch reset code. Please check your email address.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Activate New Password -> Automatically login
  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    if (!token || token.length < 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forgotPasswordVerify({
        email,
        token: token.trim(),
        newPassword
      });

      setStep(3); // Show celebratory state
      toast.success(res.message || 'Password reset successful! Logging you in...', { icon: '✨' });

      // Automatically navigate into the site after 2 seconds
      setTimeout(() => {
        if (res.user?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err) {
      console.error('Forgot password verify error:', err);
      const msg = err.response?.data?.message || 'Invalid or expired OTP code. Please request a new code.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forgotPasswordRequest(email);
      toast.success(res.message || 'A fresh reset code has been sent!', { icon: '📬' });
      startResendTimer();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not resend code. Try again later.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
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
  };

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-20 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-3xl p-8 sm:p-10 border border-accent-100 shadow-card space-y-6"
        >
          {/* Header Branding */}
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Friends Collections"
                className="w-16 h-16 rounded-full mx-auto object-cover shadow-sm mb-2"
              />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
              {step === 3 ? 'Password Updated!' : 'Reset Password'}
            </h1>
            <p className="text-xs text-neutral-500">
              {step === 1 && 'Enter your registered email and we will send a 6-digit OTP code'}
              {step === 2 && 'Enter the 6-digit OTP code sent to your email and your new password'}
              {step === 3 && 'Your password has been changed. Authenticating you into your account...'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Email Form */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleRequestOtp}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Your Registered Email Address
                  </label>
                  <div className="relative">
                    <HiOutlineMail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    We will send a 6-digit one-time password (OTP) valid for 10 minutes.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineKey className="w-4 h-4" />
                      <span>Send 6-Digit Reset OTP</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center text-xs text-neutral-500">
                  Remembered your password?{' '}
                  <Link to="/login" className="font-bold text-primary hover:underline">
                    Back to Sign In
                  </Link>
                </div>
              </motion.form>
            )}

            {/* STEP 2: Enter OTP & New Password */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleVerifyAndReset}
                className="space-y-4"
              >
                <div className="p-3 rounded-xl bg-accent-50 border border-accent-200 text-center">
                  <span className="text-xs text-accent-900 font-semibold block">
                    Reset OTP dispatched to:
                  </span>
                  <strong className="text-xs text-primary font-bold">{email}</strong>
                </div>

                {/* 6-Digit OTP */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Enter 6-Digit Reset OTP
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl border-2 border-accent-300 text-center text-2xl font-mono tracking-[0.3em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50/50"
                  />
                  <span className="text-[11px] text-neutral-400 mt-1 block text-center">
                    Check your inbox or spam folder • Valid for 10 minutes
                  </span>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-11 pr-11 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-neutral-700"
                    >
                      {showPassword ? <HiOutlineEyeOff className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <HiOutlineLockClosed className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                    />
                  </div>
                </div>

                {/* Submit & Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineCheck className="w-5 h-5" />
                      <span>Verify OTP & Sign In Directly</span>
                    </>
                  )}
                </button>

                {/* Resend OTP & Change Email options */}
                <div className="flex items-center justify-between text-xs pt-1 text-neutral-500 font-semibold">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setToken(''); }}
                    className="hover:text-primary transition-colors"
                  >
                    ← Change Email
                  </button>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: Celebratory State */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-6 text-center space-y-4"
              >
                <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <svg className="w-10 h-10 text-emerald-600" viewBox="0 0 24 24" fill="none">
                      <motion.path
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-bold text-neutral-900">
                    Password Reset Successfully!
                  </h3>
                  <p className="text-xs text-neutral-500">
                    You have been securely signed into Friends Collections.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 text-primary font-bold text-xs">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Taking you to boutique...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
