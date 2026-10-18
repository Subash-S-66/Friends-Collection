import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineX,
  HiOutlineLocationMarker,
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineCheck,
  HiOutlinePhone
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';

const LABEL_OPTIONS = [
  { id: 'Home', label: 'Home', icon: HiOutlineHome },
  { id: 'Work', label: 'Work', icon: HiOutlineOfficeBuilding },
  { id: 'Other', label: 'Other', icon: HiOutlineLocationMarker },
];

const AddressModal = ({
  isOpen,
  onClose,
  address = null,
  onSuccess,
  defaultPhone = '',
  defaultSecondaryPhone = ''
}) => {
  const isEditing = Boolean(address && address._id);

  const [formData, setFormData] = useState({
    label: 'Home',
    street: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '',
    phone: '',
    secondaryPhone: '',
    isDefault: false
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Sync form state when modal opens or address prop changes
  useEffect(() => {
    if (isOpen) {
      if (address) {
        setFormData({
          label: address.label || 'Home',
          street: address.street || '',
          city: address.city || 'Chennai',
          state: address.state || 'Tamil Nadu',
          pincode: address.pincode || '',
          phone: address.phone || defaultPhone || '',
          secondaryPhone: address.secondaryPhone || defaultSecondaryPhone || '',
          isDefault: Boolean(address.isDefault)
        });
      } else {
        setFormData({
          label: 'Home',
          street: '',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '',
          phone: defaultPhone || '',
          secondaryPhone: defaultSecondaryPhone || '',
          isDefault: false
        });
      }
      setErrors({});
    }
  }, [isOpen, address, defaultPhone, defaultSecondaryPhone]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.street || !formData.street.trim()) {
      errs.street = 'Street address is required';
    }
    if (!formData.city || !formData.city.trim()) {
      errs.city = 'City is required';
    }
    if (!formData.state || !formData.state.trim()) {
      errs.state = 'State is required';
    }

    const cleanPin = (formData.pincode || '').toString().trim();
    if (!cleanPin) {
      errs.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(cleanPin)) {
      errs.pincode = 'Please enter a valid 6-digit postal pincode';
    }

    const cleanPhone = (formData.phone || '').toString().trim().replace(/\D/g, '');
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Please enter a valid 10-digit Indian mobile number';
    }

    const cleanSecPhone = (formData.secondaryPhone || '').toString().trim().replace(/\D/g, '');
    if (cleanSecPhone) {
      if (!/^[6-9]\d{9}$/.test(cleanSecPhone)) {
        errs.secondaryPhone = 'Secondary phone must be a valid 10-digit mobile number';
      } else if (cleanSecPhone === cleanPhone) {
        errs.secondaryPhone = 'Alternate phone must be different from primary phone';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        label: formData.label,
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        phone: formData.phone.trim(),
        secondaryPhone: formData.secondaryPhone.trim(),
        isDefault: Boolean(formData.isDefault)
      };

      let res;
      if (isEditing) {
        res = await API.put(`/auth/address/${address._id}`, payload);
        toast.success('Address updated successfully!', { icon: '📍' });
      } else {
        res = await API.post('/auth/address', payload);
        toast.success('New address added to your profile!', { icon: '✨' });
      }

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save address:', err);
      toast.error(err.response?.data?.message || 'Could not save address. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && onClose()}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto border border-neutral-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HiOutlineLocationMarker className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-neutral-900">
                  {isEditing ? 'Edit Saved Address' : 'Add New Delivery Address'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isEditing
                    ? 'Update your delivery location details below'
                    : 'Save address for faster checkout on future orders'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Address Type / Label Selection */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Address Type
              </label>
              <div className="flex items-center gap-2">
                {LABEL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = formData.label === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, label: opt.id }))}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                        isActive
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Flat / House No., Building Name & Street <span className="text-red-500">*</span>
              </label>
              <textarea
                name="street"
                rows="2"
                required
                value={formData.street}
                onChange={handleChange}
                placeholder="e.g. Flat 3B, 7/4 Perambur High Road, Jamalia"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-neutral-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all resize-none ${
                  errors.street
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                }`}
              />
              {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
            </div>

            {/* City & State */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  City / Town <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Chennai"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-neutral-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                    errors.city
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                  }`}
                />
                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
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
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-neutral-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                    errors.state
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                  }`}
                />
                {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
              </div>
            </div>

            {/* Postal Pincode */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                6-Digit Postal Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                required
                maxLength="6"
                value={formData.pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData((prev) => ({ ...prev, pincode: val }));
                  if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: null }));
                }}
                placeholder="600012"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-neutral-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-mono ${
                  errors.pincode
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                }`}
              />
              {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
            </div>

            {/* Phone & Secondary Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Contact Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="phone"
                    maxLength="10"
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData((prev) => ({ ...prev, phone: val }));
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                    }}
                    placeholder="9840112345"
                    className={`w-full pl-11 pr-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-neutral-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                      errors.phone
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Alternate Phone <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    name="secondaryPhone"
                    maxLength="10"
                    value={formData.secondaryPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setFormData((prev) => ({ ...prev, secondaryPhone: val }));
                      if (errors.secondaryPhone)
                        setErrors((prev) => ({ ...prev, secondaryPhone: null }));
                    }}
                    placeholder="9840198765"
                    className={`w-full pl-11 pr-3.5 py-2.5 rounded-xl border text-sm text-neutral-900 bg-neutral-50/50 focus:bg-white focus:outline-hidden focus:ring-2 transition-all ${
                      errors.secondaryPhone
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-neutral-200 focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                </div>
                {errors.secondaryPhone && (
                  <p className="text-xs text-red-500 mt-1">{errors.secondaryPhone}</p>
                )}
              </div>
            </div>

            {/* Set as Default Address Checkbox */}
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                className="mt-0.5 rounded-md border-neutral-300 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs text-neutral-700">
                <strong className="text-neutral-900 font-bold">Make this my default address</strong>{' '}
                — use this automatically for future orders and delivery estimates.
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold tracking-wide shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <HiOutlineCheck className="w-4 h-4" />
                    <span>{isEditing ? 'Save Changes' : 'Add Address'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddressModal;
