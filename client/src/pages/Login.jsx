import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  HiOutlineLockClosed,
  HiOutlineMail,
  HiArrowRight,
  HiOutlineKey,
  HiOutlineCheck,
  HiOutlineSparkles
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import GoogleAuthButton from '../components/GoogleAuthButton';

const Login = () => {
  const { showOtpErrorAlert } = useAlert();
  // Method: 'google_or_token' vs 'password'
  const [activeTab, setActiveTab] = useState('token'); // 'token' or 'password'

  // Password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 6-Digit Email Token state
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  const { login, requestToken, verifyToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  const handlePostAuthRedirect = (user) => {
    if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate(redirectPath);
    }
  };

  // 1. Password login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.user.name}!`);
      handlePostAuthRedirect(data.user);
    } catch (err) {
      console.error('Login error:', err);
      const isUnverified = err.response?.data?.requireVerification;
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
      if (isUnverified) {
        navigate(`/verify-email?email=${encodeURIComponent(err.response?.data?.email || email)}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Request 6-digit verification token via Nodemailer
  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!tokenEmail || !/\S+@\S+\.\S+/.test(tokenEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setTokenLoading(true);
    setErrorMsg('');
    try {
      const res = await requestToken(tokenEmail);
      toast.success(res.message || 'Verification token sent via email!', { icon: '📬' });
      setCodeSent(true);
    } catch (err) {
      console.error('Request token error:', err);
      const msg = err.response?.data?.message || 'Failed to dispatch verification code';
      setErrorMsg(msg);
      toast.error(msg);
      showOtpErrorAlert({
        title: 'Unable to Send Sign-In Code',
        message: msg,
        email: tokenEmail,
        retryAfter: err.response?.data?.retryAfter || 30,
        onRetry: () => handleRequestToken(e)
      });
    } finally {
      setTokenLoading(false);
    }
  };

  // 3. Verify token and login
  const handleVerifyToken = async (e) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setTokenLoading(true);
    setErrorMsg('');
    try {
      const data = await verifyToken(tokenEmail, code, tokenName);
      toast.success(`Welcome, ${data.user.name || tokenEmail}!`, { icon: '✨' });
      handlePostAuthRedirect(data.user);
    } catch (err) {
      console.error('Verify token error:', err);
      const msg = err.response?.data?.message || 'Invalid or expired verification code';
      setErrorMsg(msg);
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
          email: tokenEmail,
          isVerification: true,
          retryAfter: 15,
          onRetry: () => handleVerifyToken(e)
        });
      }
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-20 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-accent-100 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Friends Collections"
                className="w-16 h-16 rounded-full mx-auto object-cover shadow-sm mb-2"
              />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
              Welcome Back
            </h1>
            <p className="text-xs text-neutral-500">
              Sign in to track orders, manage addresses, or receive restock alerts
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Google 1-Click Sign-In */}
          <div className="pt-1 pb-2 flex flex-col items-center">
            <GoogleAuthButton onSuccess={handlePostAuthRedirect} text="signin_with" />
          </div>

          {/* Horizontal Divider */}
          <div className="relative text-center my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Or Manual Sign In
            </span>
          </div>

          {/* Tab Switcher: 6-Digit Email Token vs Password */}
          <div className="flex bg-neutral-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setActiveTab('token'); setCodeSent(false); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'token'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <HiOutlineKey className="w-4 h-4" />
              <span>Email Token (OTP)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <HiOutlineLockClosed className="w-4 h-4" />
              <span>Password</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: 6-DIGIT EMAIL TOKEN AUTH (NODEMAILER)             */}
          {/* ======================================================== */}
          {activeTab === 'token' && (
            !codeSent ? (
              <form onSubmit={handleRequestToken} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <HiOutlineMail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={tokenEmail}
                      onChange={(e) => setTokenEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    We will send a 6-digit secure login token to your inbox via Nodemailer.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={tokenLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {tokenLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineKey className="w-4 h-4" />
                      <span>Send 6-Digit Token</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyToken} className="space-y-4">
                <div className="p-3 rounded-xl bg-accent-50 border border-accent-200 text-center">
                  <span className="text-xs text-accent-900 font-semibold block">
                    Verification code dispatched to:
                  </span>
                  <strong className="text-xs text-primary font-bold">{tokenEmail}</strong>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Your Name (If new account)
                  </label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. Ananya Raman"
                    className="w-full px-4 py-2.5 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl border-2 border-accent-300 text-center text-2xl font-mono tracking-[0.3em] font-bold text-primary focus:ring-2 focus:ring-primary focus:outline-none bg-neutral-50/50"
                  />
                  <span className="text-[11px] text-neutral-400 mt-1 block text-center">
                    Valid for the next 10 minutes
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={tokenLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {tokenLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineCheck className="w-5 h-5" />
                      <span>Verify & Sign In</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCodeSent(false)}
                  className="text-xs text-neutral-500 hover:text-primary font-semibold block mx-auto pt-1"
                >
                  ← Resend Code or Change Email
                </button>
              </form>
            )
          )}

          {/* ======================================================== */}
          {/* TAB 2: STANDARD PASSWORD LOGIN                           */}
          {/* ======================================================== */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Email Address or Admin Username
                </label>
                <div className="relative">
                  <HiOutlineMail className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin or name@example.com"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-neutral-700">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-primary hover:text-primary-light transition-colors hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <HiOutlineLockClosed className="w-5 h-5 text-neutral-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In with Password</span>
                    <HiArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="pt-2 text-center text-xs text-neutral-500 border-t border-neutral-100">
            Don&apos;t have an account yet?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
