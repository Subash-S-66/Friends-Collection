import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineX,
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineUser,
  HiOutlinePhone,
  HiOutlineKey,
  HiOutlineSparkles,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineShieldCheck,
  HiOutlineClock,
  HiOutlineRefresh,
  HiArrowRight
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import GoogleAuthButton from './GoogleAuthButton';

const AuthModal = () => {
  const {
    authModalOpen,
    authModalMode,
    authModalRedirect,
    closeAuthModal,
    switchAuthMode,
    login,
    register,
    requestToken,
    verifyToken,
    forgotPasswordRequest,
    forgotPasswordVerify,
    verifyEmailToken,
    resendVerification,
    user
  } = useAuth();

  const { showMailErrorAlert, showRateLimitAlert, showOtpErrorAlert } = useAlert();
  const navigate = useNavigate();

  // Mode: 'login' | 'register' | 'forgot' | 'verify-email'
  const mode = authModalMode || 'login';

  // Login form states
  const [loginTab, setLoginTab] = useState('password'); // 'password' | 'token'
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Escalating cooldown based on retry count
  const getRetryCooldown = (retries) => {
    if (retries <= 0) return 30; // 30s initial cooldown
    if (retries === 1) return 60; // 60s (1m) on 1st retry
    if (retries === 2) return 120; // 120s (2m) on 2nd retry
    return 300; // 300s (5m) on 3rd+ retry
  };

  const formatTimer = (seconds) => {
    if (seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // Email Token login states
  const [tokenStep, setTokenStep] = useState('request'); // 'request' | 'verify'
  const [tokenCode, setTokenCode] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenRetries, setTokenRetries] = useState(0);
  const [tokenCooldown, setTokenCooldown] = useState(0);
  const [tokenResending, setTokenResending] = useState(false);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Verification state (after registration)
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('input'); // 'input' | 'celebrate'
  const [countdown, setCountdown] = useState(3);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyRetries, setVerifyRetries] = useState(0);

  // Forgot Password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotRetries, setForgotRetries] = useState(0);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotResending, setForgotResending] = useState(false);

  // Cooldown countdown timers
  useEffect(() => {
    if (tokenCooldown <= 0) return;
    const interval = setInterval(() => {
      setTokenCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [tokenCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setForgotCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [forgotCooldown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Reset or clear fields on modal mode changes
  useEffect(() => {
    if (!authModalOpen) {
      setLoginLoading(false);
      setRegLoading(false);
      setVerifyLoading(false);
      setVerifyStatus('input');
      setTokenStep('request');
      setForgotStep('request');
      setVerifyCode('');
      setTokenRetries(0);
      setTokenCooldown(0);
      setTokenResending(false);
      setForgotRetries(0);
      setForgotCooldown(0);
      setForgotResending(false);
      setVerifyRetries(0);
      setResendCooldown(0);
    }
  }, [authModalOpen]);

  // Handle successful authentication
  const handleAuthSuccess = (authenticatedUser) => {
    closeAuthModal();
    const destination =
      authModalRedirect ||
      sessionStorage.getItem('post_auth_redirect') ||
      (authenticatedUser?.role === 'admin' ? '/admin' : '/');
    sessionStorage.removeItem('post_auth_redirect');
    navigate(destination);
  };

  // Password / Username Login Submission
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (loginLoading) return; // Prevent double click
    if (!loginEmail.trim()) {
      toast.error('Please enter your email or admin username');
      return;
    }
    if (!loginPassword) {
      toast.error('Please enter your password');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await login(loginEmail.trim(), loginPassword);
      toast.success(`Welcome back, ${res.user?.name || 'Guest'}!`, { icon: '👋' });
      handleAuthSuccess(res.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // Request 6-digit email token for passwordless sign in
  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (loginLoading) return; // Prevent double click
    if (!loginEmail.trim() || !/\S+@\S+\.\S+/.test(loginEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await requestToken(loginEmail.trim().toLowerCase());
      toast.success(res.message || '6-digit code sent to your email!', { icon: '📬' });
      setTokenStep('verify');
      setTokenRetries(0);
      setTokenCooldown(getRetryCooldown(0)); // Start initial 30s countdown
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to dispatch code';
      toast.error(msg);
      showOtpErrorAlert({
        title: 'Unable to Send Sign-In Code',
        message: msg,
        email: loginEmail.trim().toLowerCase(),
        retryAfter: err.response?.data?.retryAfter || 30,
        onRetry: () => handleRequestToken(e)
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // Resend 6-digit email token with retry escalation
  const handleResendTokenCode = async () => {
    if (tokenCooldown > 0 || tokenResending) return;
    if (!loginEmail.trim() || !/\S+@\S+\.\S+/.test(loginEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setTokenResending(true);
    try {
      const res = await requestToken(loginEmail.trim().toLowerCase());
      const nextRetries = tokenRetries + 1;
      setTokenRetries(nextRetries);
      const cooldownSecs = getRetryCooldown(nextRetries);
      setTokenCooldown(cooldownSecs);
      toast.success(res.message || 'New 6-digit code sent to your email!', { icon: '📬' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      toast.error(msg);
      const serverRetry = err.response?.data?.retryAfter;
      if (serverRetry) {
        setTokenCooldown(serverRetry);
      }
    } finally {
      setTokenResending(false);
    }
  };

  // Verify 6-digit email token
  const handleVerifyToken = async (e) => {
    e.preventDefault();
    if (loginLoading) return; // Prevent double click
    if (!tokenCode || tokenCode.length < 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await verifyToken(loginEmail.trim().toLowerCase(), tokenCode.trim(), tokenName.trim());
      toast.success('Signed in successfully!', { icon: '✨' });
      handleAuthSuccess(res.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired code';
      toast.error(msg);

      if (
        err.response?.status === 502 ||
        err.response?.data?.isMailError ||
        err.response?.data?.isOtpError ||
        err.code === 'ECONNABORTED'
      ) {
        showOtpErrorAlert({
          title: 'Sign-In Verification Issue',
          message: msg,
          email: loginEmail.trim().toLowerCase(),
          isVerification: true,
          retryAfter: 15,
          onRetry: () => handleVerifyToken(e)
        });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Register Form Submission
  const handleRegister = async (e) => {
    e.preventDefault();
    if (regLoading) return; // Prevent double click
    if (!regName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!regEmail.trim() || !/\S+@\S+\.\S+/.test(regEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!regPhone || !/^[6-9]\d{9}$/.test(regPhone.replace(/\D/g, ''))) {
      toast.error('Please enter a valid 10-digit Indian phone number (starts with 6-9)');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setRegLoading(true);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.replace(/\D/g, ''),
        password: regPassword,
        redirect: authModalRedirect
      });

      setVerifyEmail(regEmail.trim().toLowerCase());
      setVerifyRetries(0);
      setResendCooldown(getRetryCooldown(0)); // Start initial 30s countdown
      switchAuthMode('verify-email');
      if (res?.mailDeliveryWarning) {
        showMailErrorAlert(res.message, regEmail.trim().toLowerCase());
      } else {
        toast.success('Account created! Verification token sent to your email.', { icon: '📬' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      if (err.response?.data?.isMailError || err.response?.data?.isOtpError || err.response?.status === 502) {
        showOtpErrorAlert({
          title: 'Verification Code Delayed',
          message: msg,
          email: regEmail.trim().toLowerCase(),
          retryAfter: 30
        });
      }
    } finally {
      setRegLoading(false);
    }
  };

  // Verify account token inside modal
  const handleVerifyEmail = async (e) => {
    if (e) e.preventDefault();
    if (verifyLoading) return; // Prevent double click
    if (!verifyCode || verifyCode.length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await verifyEmailToken({
        email: verifyEmail,
        token: verifyCode.trim()
      });

      setVerifyStatus('celebrate');
      toast.success('Account verified successfully!', { icon: '🎉' });
      startCountdown(res.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired verification code';
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
          email: verifyEmail,
          isVerification: true,
          retryAfter: 15,
          onRetry: () => handleVerifyEmail(e)
        });
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // 3, 2, 1 Countdown Animation before redirecting
  const startCountdown = (authenticatedUser) => {
    setCountdown(3);
    let count = 3;
    const destination =
      authModalRedirect ||
      sessionStorage.getItem('post_auth_redirect') ||
      (authenticatedUser?.role === 'admin' ? '/admin' : '/');

    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        sessionStorage.removeItem('post_auth_redirect');
        closeAuthModal();
        navigate(destination);
      }
    }, 1000);
  };

  // Resend verification code with retry escalation
  const handleResend = async () => {
    if (resendCooldown > 0 || verifyLoading) return;
    setVerifyLoading(true);
    try {
      const res = await resendVerification(verifyEmail);
      const nextRetries = verifyRetries + 1;
      setVerifyRetries(nextRetries);
      const cooldownSecs = getRetryCooldown(nextRetries);
      setResendCooldown(cooldownSecs);
      toast.success(res.message || 'Verification code resent!', { icon: '📬' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend verification code';
      toast.error(msg);
      showOtpErrorAlert({
        title: 'Unable to Resend Verification Code',
        message: msg,
        email: verifyEmail,
        retryAfter: err.response?.data?.retryAfter || 30,
        onRetry: handleResend
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  // Forgot password request OTP
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (forgotLoading) return; // Prevent double click
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await forgotPasswordRequest(forgotEmail.trim().toLowerCase());
      toast.success(res.message || 'Password reset OTP dispatched!', { icon: '📬' });
      setForgotStep('verify');
      setForgotRetries(0);
      setForgotCooldown(getRetryCooldown(0)); // Start initial 30s countdown
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send reset code';
      toast.error(msg);
      showOtpErrorAlert({
        title: 'Unable to Send Password Reset Code',
        message: msg,
        email: forgotEmail.trim().toLowerCase(),
        retryAfter: err.response?.data?.retryAfter || 30,
        onRetry: () => handleForgotRequest(e)
      });
    } finally {
      setForgotLoading(false);
    }
  };

  // Resend forgot password OTP with retry escalation
  const handleResendForgotCode = async () => {
    if (forgotCooldown > 0 || forgotResending) return;
    if (!forgotEmail.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setForgotResending(true);
    try {
      const res = await forgotPasswordRequest(forgotEmail.trim().toLowerCase());
      const nextRetries = forgotRetries + 1;
      setForgotRetries(nextRetries);
      const cooldownSecs = getRetryCooldown(nextRetries);
      setForgotCooldown(cooldownSecs);
      toast.success(res.message || 'New reset code sent to your email!', { icon: '📬' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend reset code';
      toast.error(msg);
      const serverRetry = err.response?.data?.retryAfter;
      if (serverRetry) {
        setForgotCooldown(serverRetry);
      }
    } finally {
      setForgotResending(false);
    }
  };

  // Forgot password verify OTP and save new password
  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (forgotLoading) return; // Prevent double click
    if (!forgotCode || forgotCode.length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await forgotPasswordVerify({
        email: forgotEmail.trim().toLowerCase(),
        token: forgotCode.trim(),
        newPassword: forgotNewPassword
      });
      toast.success('Password updated! You are now signed in.', { icon: '🔐' });
      handleAuthSuccess(res.user);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update password';
      toast.error(msg);
      if (
        err.response?.status === 502 ||
        err.response?.data?.isMailError ||
        err.response?.data?.isOtpError ||
        err.code === 'ECONNABORTED'
      ) {
        showOtpErrorAlert({
          title: 'Password Reset Verification Issue',
          message: msg,
          email: forgotEmail.trim().toLowerCase(),
          isVerification: true,
          retryAfter: 15,
          onRetry: () => handleForgotVerify(e)
        });
      }
    } finally {
      setForgotLoading(false);
    }
  };

  if (!authModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-md w-full bg-white rounded-3xl border border-accent-100 shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Sticky Pinned Close Button Header */}
          <div className="sticky top-0 z-30 flex items-center justify-end px-5 pt-4 pb-1 bg-white/95 backdrop-blur-md shrink-0">
            <button
              type="button"
              onClick={closeAuthModal}
              className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-all border border-neutral-200/80 shadow-2xs bg-white cursor-pointer active:scale-95"
              aria-label="Close popup"
              title="Close (Esc)"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 flex-1">
            {/* Header Brand */}
            <div className="text-center space-y-1.5 mb-5">
            <img
              src="/logo.png"
              alt="Friends Collections"
              className="w-12 h-12 rounded-full mx-auto object-cover shadow-xs border border-accent-200"
            />
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900 leading-tight">
              {mode === 'verify-email'
                ? verifyStatus === 'celebrate'
                  ? 'Account Verified!'
                  : 'Verify Your Email'
                : mode === 'register'
                ? 'Join Friends Collections'
                : mode === 'forgot'
                ? 'Reset Your Password'
                : 'Welcome Back'}
            </h2>
            <p className="text-xs text-neutral-500">
              {mode === 'verify-email'
                ? verifyStatus === 'celebrate'
                  ? 'Welcome to the Friends Collections family!'
                  : 'Enter the 6-digit code or tap the link in your email'
                : mode === 'register'
                ? 'Create an account to track orders & enjoy bespoke couture'
                : mode === 'forgot'
                ? 'Recover your account securely via 6-digit OTP'
                : 'Sign in to access your orders, wishlist, and fast checkout'}
            </p>
          </div>

          {/* Mode Switcher Tabs (Only visible for Login / Register) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl mb-5 text-xs font-bold">
              <button
                type="button"
                onClick={() => switchAuthMode('login')}
                className={`py-2 rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-white text-primary shadow-xs font-extrabold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchAuthMode('register')}
                className={`py-2 rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-white text-primary shadow-xs font-extrabold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: SIGN IN POPUP                                     */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <div className="space-y-4">
              {/* Google 1-Click Sign In */}
              <div className="flex justify-center pb-1">
                <GoogleAuthButton onSuccess={handleAuthSuccess} text="signin_with" />
              </div>

              {/* Divider */}
              <div className="relative text-center my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <span className="relative px-3 bg-white text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Or Sign In With
                </span>
              </div>

              {/* Sub-Tabs: Password vs Instant Email Code */}
              <div className="flex bg-neutral-50 border border-neutral-200 p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setLoginTab('password')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    loginTab === 'password'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginTab('token')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    loginTab === 'token'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  6-Digit Email Code
                </button>
              </div>

              {loginTab === 'password' ? (
                /* Password Form */
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-neutral-700">Password</label>
                      <button
                        type="button"
                        onClick={() => switchAuthMode('forgot')}
                        className="text-[11px] font-bold text-accent hover:text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <HiOutlineLockClosed className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600"
                      >
                        {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loginLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Sign In to Account</span>
                    )}
                  </button>
                </form>
              ) : (
                /* Email Code OTP Flow */
                <div className="space-y-3">
                  {tokenStep === 'request' ? (
                    <form onSubmit={handleRequestToken} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                          <input
                            type="email"
                            required
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loginLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Send 6-Digit Login Code</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyToken} className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-accent-50 border border-accent-200 text-center">
                        <span className="text-[11px] text-accent-900 font-semibold block">Code sent to:</span>
                        <strong className="text-xs text-primary font-bold">{loginEmail}</strong>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-700 mb-1">
                          Enter 6-Digit Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={tokenCode}
                          onChange={(e) => setTokenCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full py-2 sm:py-2.5 rounded-xl border-2 border-accent-300 text-center text-base sm:text-xl font-mono tracking-[0.18em] sm:tracking-[0.25em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loginLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span>Verify & Sign In</span>
                        )}
                      </button>
                      {/* Resend button with timer & retry escalation */}
                      <div className="pt-2 border-t border-accent-100/80 flex flex-col items-center gap-1.5">
                        <div className="flex items-center justify-between w-full text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setTokenStep('request');
                              setTokenCode('');
                            }}
                            className="text-neutral-500 hover:text-primary font-medium transition-colors"
                          >
                            ← Change Email
                          </button>

                          <button
                            type="button"
                            disabled={tokenCooldown > 0 || tokenResending}
                            onClick={handleResendTokenCode}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              tokenCooldown > 0
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                                : 'bg-accent-50 text-accent hover:bg-accent hover:text-white border border-accent-200 active:scale-95 cursor-pointer shadow-2xs'
                            }`}
                          >
                            {tokenResending ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Sending...</span>
                              </>
                            ) : tokenCooldown > 0 ? (
                              <>
                                <HiOutlineClock className="w-3.5 h-3.5 text-neutral-400 animate-pulse" />
                                <span>Resend in <strong className="font-mono text-neutral-700">{formatTimer(tokenCooldown)}</strong></span>
                              </>
                            ) : (
                              <>
                                <HiOutlineRefresh className="w-3.5 h-3.5" />
                                <span>Resend Code</span>
                              </>
                            )}
                          </button>
                        </div>

                        {tokenRetries > 0 && (
                          <div className="text-[10px] text-neutral-400 text-center flex items-center gap-1 justify-center">
                            <span>Attempt {tokenRetries + 1}</span>
                            <span>•</span>
                            <span>Cooldown increased to prevent spam</span>
                          </div>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CREATE ACCOUNT POPUP                              */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Full Name</label>
                <div className="relative">
                  <HiOutlineUser className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Ananya Raman"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
                <div className="relative">
                  <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ananya@example.com"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <HiOutlinePhone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9840123456 (10 Digits)"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Create Password</label>
                <div className="relative">
                  <HiOutlineLockClosed className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 rounded-xl bg-accent hover:bg-accent-light text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {regLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Create Account & Send Verification Code</span>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-neutral-400 text-center pt-1">
                By creating an account, you agree to Friends Collections Terms & Privacy Policy.
              </p>
            </form>
          )}

          {/* ======================================================== */}
          {/* TAB 3: VERIFICATION CODE FLOW (After Registration)       */}
          {/* ======================================================== */}
          {mode === 'verify-email' && (
            <div className="space-y-4">
              {verifyStatus === 'celebrate' ? (
                /* Celebratory Tick Animation + 3,2,1 Countdown */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-2 space-y-4"
                >
                  {/* Royal Animated Checkmark (Tick) */}
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full bg-emerald-400/20 border-2 border-emerald-500/40"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-1 rounded-full border border-dashed border-[#D4AF37]/60"
                    />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.15, 1] }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 border-2 border-white shadow-xl shadow-emerald-600/30 flex items-center justify-center relative z-10"
                    >
                      <svg
                        className="w-9 h-9 text-white"
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
                          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  </div>

                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                      <HiOutlineSparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Account Verified</span>
                    </span>
                    <h3 className="font-serif text-lg font-bold text-neutral-900">
                      Welcome, {regName || 'Valued Guest'}!
                    </h3>
                  </div>

                  {/* 3, 2, 1 Countdown Display */}
                  <div className="p-3.5 rounded-2xl bg-neutral-50 border border-accent-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                      Redirecting To Your Destination In
                    </span>
                    <div className="h-10 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={countdown}
                          initial={{ scale: 2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.6, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-3xl font-black font-serif text-primary"
                        >
                          {countdown > 0 ? countdown : '✦'}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      closeAuthModal();
                      navigate(authModalRedirect || '/');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <span>Skip countdown & enter now</span>
                    <HiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                /* Manual Code Entry inside popup */
                <form onSubmit={handleVerifyEmail} className="space-y-3.5">
                  <div className="p-3 rounded-2xl bg-accent-50/70 border border-accent-200 text-center space-y-1">
                    <span className="text-xs text-accent-900 font-semibold block">
                      Verification link & 6-digit code sent to:
                    </span>
                    <strong className="text-xs text-primary font-bold block">{verifyEmail}</strong>
                    <p className="text-[11px] text-neutral-500 pt-1 leading-snug">
                      Tap the link in your email, or enter the 6-digit code below:
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full py-2.5 sm:py-3 rounded-xl border-2 border-accent-300 text-center text-base sm:text-xl font-mono tracking-[0.18em] sm:tracking-[0.25em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {verifyLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <HiOutlineShieldCheck className="w-4 h-4" />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </button>

                  {/* Resend button with timer & retry escalation */}
                  <div className="pt-2 border-t border-accent-100/80 flex flex-col items-center gap-1.5">
                    <div className="flex items-center justify-between w-full text-xs">
                      <button
                        type="button"
                        onClick={() => switchAuthMode('login')}
                        className="text-neutral-500 hover:text-primary font-medium transition-colors"
                      >
                        ← Back to Sign In
                      </button>

                      <button
                        type="button"
                        disabled={resendCooldown > 0 || verifyLoading}
                        onClick={handleResend}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          resendCooldown > 0
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                            : 'bg-accent-50 text-accent hover:bg-accent hover:text-white border border-accent-200 active:scale-95 cursor-pointer shadow-2xs'
                        }`}
                      >
                        {verifyLoading ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : resendCooldown > 0 ? (
                          <>
                            <HiOutlineClock className="w-3.5 h-3.5 text-neutral-400 animate-pulse" />
                            <span>Resend in <strong className="font-mono text-neutral-700">{formatTimer(resendCooldown)}</strong></span>
                          </>
                        ) : (
                          <>
                            <HiOutlineRefresh className="w-3.5 h-3.5" />
                            <span>Resend Code</span>
                          </>
                        )}
                      </button>
                    </div>

                    {verifyRetries > 0 && (
                      <div className="text-[10px] text-neutral-400 text-center flex items-center gap-1 justify-center">
                        <span>Attempt {verifyRetries + 1}</span>
                        <span>•</span>
                        <span>Cooldown increased to prevent spam</span>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: FORGOT PASSWORD FLOW                              */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <div className="space-y-3.5">
              {forgotStep === 'request' ? (
                <form onSubmit={handleForgotRequest} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <HiOutlineMail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Send Password Reset OTP</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchAuthMode('login')}
                    className="text-xs text-neutral-500 hover:text-primary font-semibold block mx-auto pt-1"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotVerify} className="space-y-3">
                  <div className="p-2.5 rounded-xl bg-accent-50 border border-accent-200 text-center">
                    <span className="text-[11px] text-accent-900 font-semibold block">Reset OTP sent to:</span>
                    <strong className="text-xs text-primary font-bold">{forgotEmail}</strong>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full py-2 sm:py-2.5 rounded-xl border-2 border-accent-300 text-center text-base sm:text-xl font-mono tracking-[0.18em] sm:tracking-[0.25em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-accent-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Reset Password & Sign In</span>
                    )}
                  </button>

                  {/* Resend button with timer & retry escalation */}
                  <div className="pt-2 border-t border-accent-100/80 flex flex-col items-center gap-1.5">
                    <div className="flex items-center justify-between w-full text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep('request');
                          setForgotCode('');
                        }}
                        className="text-neutral-500 hover:text-primary font-medium transition-colors"
                      >
                        ← Change Email
                      </button>

                      <button
                        type="button"
                        disabled={forgotCooldown > 0 || forgotResending}
                        onClick={handleResendForgotCode}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          forgotCooldown > 0
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                            : 'bg-accent-50 text-accent hover:bg-accent hover:text-white border border-accent-200 active:scale-95 cursor-pointer shadow-2xs'
                        }`}
                      >
                        {forgotResending ? (
                          <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : forgotCooldown > 0 ? (
                          <>
                            <HiOutlineClock className="w-3.5 h-3.5 text-neutral-400 animate-pulse" />
                            <span>Resend in <strong className="font-mono text-neutral-700">{formatTimer(forgotCooldown)}</strong></span>
                          </>
                        ) : (
                          <>
                            <HiOutlineRefresh className="w-3.5 h-3.5" />
                            <span>Resend OTP</span>
                          </>
                        )}
                      </button>
                    </div>

                    {forgotRetries > 0 && (
                      <div className="text-[10px] text-neutral-400 text-center flex items-center gap-1 justify-center">
                        <span>Attempt {forgotRetries + 1}</span>
                        <span>•</span>
                        <span>Cooldown increased to prevent spam</span>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
