import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineMail, HiArrowRight } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const data = await login(email, password);
      toast.success(`Welcome back, ${data.user.name}!`);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate(redirectPath);
      }
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-20 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-accent-100 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block">
              <img src="/logo.png" alt="Friends Collections" className="w-16 h-16 rounded-full mx-auto object-cover shadow-sm mb-2" />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">Welcome Back</h1>
            <p className="text-xs text-neutral-500">Sign in to track orders & manage your saved delivery addresses</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Email Address</label>
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
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-neutral-700">Password</label>
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
                  <span>Sign In</span>
                  <HiArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

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
