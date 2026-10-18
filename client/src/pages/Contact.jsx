import { useState, useEffect } from 'react';
import { HiOutlineLocationMarker, HiOutlinePhone, HiOutlineMail, HiOutlineClock, HiCheck } from 'react-icons/hi';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';
import toast from 'react-hot-toast';
import API from '../utils/api';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        if (res.data && typeof res.data === 'object') {
          setSettings(res.data);
        }
      })
      .catch((err) => console.error('Error loading settings in contact:', err));
  }, []);

  const storePhone = settings.storePhone || '+91 95007 57024';
  const whatsappNum = settings.whatsappNumber || '919500757024';
  const storeAddress = settings.storeAddress || '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012, Tamil Nadu';
  const storeHours = settings.storeHours || 'Monday to Sunday: 10:00 AM – 9:30 PM';
  const storeEmail = settings.storeEmail || 'friends.collection06@gmail.com';

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success('Thank you! Your message has been sent to our store team.');
    setFormData({ name: '', phone: '', message: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-cream py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent-700 bg-accent-100/60 px-4 py-1.5 rounded-full border border-accent-200">
            Get in Touch
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-neutral-900">
            Contact & Store Location
          </h1>
          <p className="text-sm text-neutral-600">
            We love hearing from you! Visit our boutique or reach out via phone, WhatsApp, or email.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Store Info Cards from DB Settings */}
          <div className="lg:col-span-6 space-y-6">
            {/* Address */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                <HiOutlineLocationMarker className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg font-bold text-neutral-900">Boutique Address</h3>
                <p className="text-sm text-neutral-700 font-medium leading-relaxed">
                  {storeAddress}
                </p>
                <p className="text-xs text-neutral-500 pt-1">Landmark: Near Jamalia main junction</p>
              </div>
            </div>

            {/* Direct Phone Numbers */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center shrink-0">
                  <HiOutlinePhone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Store Helplines</h3>
                  <p className="text-xs text-neutral-500">Call for dress availability, sizes, or custom orders</p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`tel:${storePhone.replace(/\s/g, '')}`}
                  className="inline-block px-5 py-2.5 rounded-xl text-center text-xs font-bold bg-primary text-white border border-primary shadow-xs hover:bg-primary-light transition-all"
                >
                  {storePhone}
                </a>
              </div>
            </div>

            {/* Timings & WhatsApp Action */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-accent-100 shadow-sm space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <HiOutlineClock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-neutral-900">Opening Hours</h3>
                  <p className="text-sm text-neutral-700 font-medium">{storeHours}</p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">Open All 7 Days</p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href={`https://wa.me/${whatsappNum}?text=Hi%20Friends%20Collections%2C%20I%20have%20an%20inquiry`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FaWhatsapp className="w-5 h-5" />
                  <span>Chat on WhatsApp</span>
                </a>
                <a
                  href="https://instagram.com/friends_collection_in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FaInstagram className="w-5 h-5" />
                  <span>@friends_collection_in</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Contact Form */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-10 border border-accent-100 shadow-sm space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-neutral-900">Send Us a Message</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Have a styling query or looking for a specific design? Send us a note!
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Deepika"
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="95007 57024"
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Your Message or Inquiry</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us what style, saree, or dress collection you are looking for..."
                  className="w-full px-4 py-3 rounded-xl border border-accent-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-neutral-50/50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-primary-light text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {submitted ? (
                  <>
                    <HiCheck className="w-5 h-5 text-emerald-300" />
                    <span>Message Sent!</span>
                  </>
                ) : (
                  <span>Submit Inquiry</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
