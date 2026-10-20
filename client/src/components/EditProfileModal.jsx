import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineX,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';

const EditProfileModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [pendingNewPhone, setPendingNewPhone] = useState('');
  
  const [oldOtp, setOldOtp] = useState('');
  const [newOtp, setNewOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync state when opened
  useEffect(() => {
    if (isOpen && user) {
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPendingNewEmail('');
      setPendingNewPhone('');
      setOldOtp('');
      setNewOtp('');
      setError('');
      setStep('form');
      setLoading(false);
    }
  }, [isOpen, user]);

  // Resend cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Cancel handler - strictly clears state, notifies backend, and closes modal without saving
  const handleCancel = async () => {
    if (step === 'otp') {
      try {
        await API.post('/auth/cancel-email-change');
      } catch {
        // Silently catch cancellation cleanup errors
      }
    }
    setError('');
    setStep('form');
    setOldOtp('');
    setNewOtp('');
    onClose();
  };

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, step]);

  if (!isOpen) return null;

  const currentEmail = (user?.email || '').trim().toLowerCase();
  const currentPhone = (user?.phone || '').trim();

  // Validate and submit Step 1 form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim().replace(/\D/g, '').slice(-10);

    if (!cleanEmail || !/\S+@\S+\.\S+/.test(cleanEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (phone.trim() && cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const isEmailChanged = cleanEmail !== currentEmail;
    const isPhoneChanged = cleanPhone !== currentPhone;

    if (!isEmailChanged && !isPhoneChanged) {
      toast('No changes were made to your profile.', { icon: 'ℹ️' });
      onClose();
      return;
    }

    // CASE 1: Only phone changed (email kept same) -> Update directly without dual email OTP
    if (!isEmailChanged && isPhoneChanged) {
      setLoading(true);
      try {
        const res = await API.put('/auth/profile', { phone: cleanPhone });
        toast.success('Mobile number updated successfully!', { icon: '📱' });
        if (onSuccess) onSuccess(res.data);
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to update phone number.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // CASE 2: Email changed -> Trigger Dual OTP flow
    setLoading(true);
    try {
      const res = await API.post('/auth/request-email-change', {
        newEmail: cleanEmail,
        newPhone: cleanPhone
      });

      setPendingNewEmail(cleanEmail);
      setPendingNewPhone(cleanPhone);
      setOldOtp('');
      setNewOtp('');
      setStep('otp');
      setResendCooldown(30);
      toast.success(res.data?.message || 'Verification codes sent to both emails!', { icon: '📩' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request email change. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend codes handler
  const handleResendCodes = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/auth/request-email-change', {
        newEmail: pendingNewEmail,
        newPhone: pendingNewPhone
      });
      setResendCooldown(45);
      toast.success(res.data?.message || 'New verification codes have been sent!', { icon: '🔄' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend codes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit and verify both OTPs
  const handleVerifyDualOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOld = oldOtp.trim();
    const cleanNew = newOtp.trim();

    if (cleanOld.length !== 6 || cleanNew.length !== 6) {
      setError('Please enter both 6-digit verification codes completely.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/verify-email-change', {
        oldOtp: cleanOld,
        newOtp: cleanNew
      });

      // Save token if renewed
      if (res.data?.token) {
        localStorage.setItem('fc_token', res.data.token);
      }
      if (res.data?.user) {
        localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      }

      toast.success(res.data?.message || 'Email & contact details updated successfully!', {
        icon: '🎉',
        duration: 4000
      });

      if (onSuccess) {
        onSuccess(res.data.user, res.data.token);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please check both codes and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : handleCancel}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        />

        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-accent-200"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-[#681824] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  {step === 'form' ? (
                    <HiOutlineMail className="w-5 h-5 text-accent-300" />
                  ) : (
                    <HiOutlineShieldCheck className="w-5 h-5 text-accent-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold tracking-wide">
                    {step === 'form' ? 'Edit Contact Details' : 'Verify Email Change'}
                  </h3>
                  <p className="text-xs text-white/80">
                    {step === 'form'
                      ? 'Update your account email address & mobile number'
                      : 'Dual OTP authorization for security verification'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="rounded-full p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                title="Cancel and close"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-shake">
                <span className="font-bold text-red-600 mt-0.5">⚠️</span>
                <span className="flex-1 leading-relaxed font-medium">{error}</span>
              </div>
            )}

            {/* Content Body */}
            {step === 'form' ? (
              <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
                {/* Current User Card */}
                <div className="p-3.5 bg-cream rounded-xl border border-accent-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-serif font-bold text-lg">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-xs text-neutral-600 truncate">
                    <p className="font-semibold text-neutral-900">{user?.name}</p>
                    <p className="truncate text-neutral-500">
                      Current: {currentEmail} {currentPhone ? `• +91 ${currentPhone}` : ''}
                    </p>
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <HiOutlineMail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@example.com"
                      className="block w-full pl-11 pr-4 py-3 text-sm bg-neutral-50/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all text-neutral-900"
                    />
                  </div>
                  {email.trim().toLowerCase() !== currentEmail && email.trim() && (
                    <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                      <span>🔒</span>
                      <span>
                        Changing email sends verification codes to both <strong>{currentEmail}</strong> and your new address.
                      </span>
                    </p>
                  )}
                </div>

                {/* Phone Input */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Mobile Number <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <HiOutlinePhone className="w-5 h-5" />
                    </div>
                    <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none text-neutral-500 text-xs font-semibold">
                      +91
                    </div>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9840759206"
                      className="block w-full pl-18 pr-4 py-3 text-sm bg-neutral-50/50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all text-neutral-900 font-mono tracking-wider"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Used for live order tracking, dispatch SMS, and WhatsApp shipping updates.
                  </p>
                </div>

                {/* Form Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiOutlineCheckCircle className="w-4 h-4" />
                    )}
                    <span>
                      {email.trim().toLowerCase() !== currentEmail ? 'Continue & Send OTPs' : 'Save Changes'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyDualOtp} className="p-6 space-y-5">
                {/* Notice Card */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <span>🛡️</span> Dual Email Verification Required
                  </p>
                  <p className="text-amber-800 leading-relaxed">
                    To complete your email change, please enter the two 6-digit codes sent to your current and new addresses. Your account will only update if <strong>both OTPs are correct</strong>.
                  </p>
                </div>

                {/* Addresses Indicator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-left">
                    <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
                      <HiOutlineLockClosed className="w-3 h-3 text-neutral-400" /> Current Email
                    </span>
                    <p className="text-xs font-semibold text-neutral-800 truncate mt-0.5" title={currentEmail}>
                      {currentEmail}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-left">
                    <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1">
                      <HiOutlineSparkles className="w-3 h-3 text-primary" /> New Email
                    </span>
                    <p className="text-xs font-semibold text-primary truncate mt-0.5" title={pendingNewEmail}>
                      {pendingNewEmail}
                    </p>
                  </div>
                </div>

                {/* OTP Field 1: Current Email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-[10px] font-bold">1</span>
                      Code sent to current email
                    </label>
                    <span className="text-[11px] text-neutral-400 font-mono">6 digits</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={oldOtp}
                    onChange={(e) => setOldOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="block w-full py-3 px-4 text-center font-mono text-xl tracking-[0.35em] font-bold bg-neutral-50/60 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-neutral-900 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-neutral-400"
                  />
                </div>

                {/* OTP Field 2: New Email */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                      Code sent to new email
                    </label>
                    <span className="text-[11px] text-neutral-400 font-mono">6 digits</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    value={newOtp}
                    onChange={(e) => setNewOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="block w-full py-3 px-4 text-center font-mono text-xl tracking-[0.35em] font-bold bg-primary/5 border border-primary/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white text-neutral-900 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-neutral-400"
                  />
                </div>

                {/* Resend Helper */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-neutral-500">Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleResendCodes}
                    disabled={resendCooldown > 0 || loading}
                    className="font-bold text-primary hover:underline cursor-pointer disabled:text-neutral-400 disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend codes in ${resendCooldown}s` : 'Resend OTP Codes'}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-between gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                    title="Cancel change and discard"
                  >
                    <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel Change</span>
                  </button>

                  <button
                    type="submit"
                    disabled={loading || oldOtp.length !== 6 || newOtp.length !== 6}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <HiOutlineCheckCircle className="w-4 h-4" />
                    )}
                    <span>Verify & Commit Change</span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default EditProfileModal;
