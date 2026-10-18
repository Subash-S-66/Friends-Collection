import { useState, useEffect } from 'react';
import {
  HiOutlineColorSwatch,
  HiOutlineSpeakerphone,
  HiOutlineTruck,
  HiOutlineOfficeBuilding,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineLocationMarker,
  HiOutlineArrowRight
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useTheme, THEME_PRESETS, adjustColor } from '../context/ThemeContext';

const SettingsManager = () => {
  const { theme, changeTheme, applyPreset, presets } = useTheme();

  // Theme customizer state
  const [selectedPresetId, setSelectedPresetId] = useState(theme.id || 'wine');
  const [customPrimary, setCustomPrimary] = useState(theme.primary || '#54142D');
  const [customAccent, setCustomAccent] = useState(theme.accent || '#C88A65');
  const [customBg, setCustomBg] = useState(theme.bgTint || '#FAF7F2');

  // Homepage Hero Headline & Copy state
  const [heroBadge, setHeroBadge] = useState("Chennai's Trendy Fashion House");
  const [heroTitle, setHeroTitle] = useState('Style That Defines You');
  const [heroDescription, setHeroDescription] = useState(
    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'
  );
  const [storeVisitText, setStoreVisitText] = useState('Visit Store');

  // Announcement Bar state
  const [announcementText, setAnnouncementText] = useState('🎉 Free Shipping on Orders Above ₹999!');
  const [announcementActive, setAnnouncementActive] = useState(true);

  // Shipping state
  const [shippingFee, setShippingFee] = useState('79');
  const [freeAbove, setFreeAbove] = useState('999');

  // Store Info state
  const [storeAddress, setStoreAddress] = useState('7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 12');
  const [storePhone, setStorePhone] = useState('9500757024');
  const [storeEmail, setStoreEmail] = useState('friends.collection06@gmail.com');
  const [storeInstagram, setStoreInstagram] = useState('friends_collection_in');

  const [savingTheme, setSavingTheme] = useState(false);
  const [savingHero, setSavingHero] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        const data = res.data;
        if (data.heroBadge) setHeroBadge(data.heroBadge);
        if (data.heroTitle) setHeroTitle(data.heroTitle);
        if (data.heroDescription) setHeroDescription(data.heroDescription);
        if (data.storeVisitText) setStoreVisitText(data.storeVisitText);
        if (data.announcementBar) {
          setAnnouncementText(data.announcementBar.text || '');
          setAnnouncementActive(Boolean(data.announcementBar.isActive));
        }
        if (data.shippingCharge) {
          setShippingFee(data.shippingCharge.amount?.toString() || '79');
          setFreeAbove(data.shippingCharge.freeAbove?.toString() || '999');
        }
        if (data.contactInfo) {
          setStoreAddress(data.contactInfo.address || '');
          setStorePhone(data.contactInfo.phones?.[0] || '9500757024');
          setStoreEmail(data.contactInfo.email || '');
          setStoreInstagram(data.contactInfo.instagram || '');
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));
  }, []);

  // Handle Preset Selection
  const handleSelectPreset = async (presetId) => {
    setSelectedPresetId(presetId);
    const p = presets[presetId];
    if (p) {
      setCustomPrimary(p.primary);
      setCustomAccent(p.accent);
      setCustomBg(p.bgTint);
      try {
        await applyPreset(presetId);
        toast.success(`Theme updated to ${p.name}!`);
      } catch {
        toast.error('Failed to apply theme');
      }
    }
  };

  // Handle Custom Color Apply
  const handleSaveCustomTheme = async () => {
    if (savingTheme) return;
    setSavingTheme(true);
    try {
      const customConfig = {
        id: 'custom',
        name: 'Custom Brand Theme',
        primary: customPrimary,
        primaryLight: adjustColor(customPrimary, 0.25),
        primaryDark: adjustColor(customPrimary, -0.35),
        accent: customAccent,
        accentLight: adjustColor(customAccent, 0.25),
        accentDark: adjustColor(customAccent, -0.25),
        bgTint: customBg,
      };
      await changeTheme(customConfig);
      toast.success('Custom theme saved & applied across the website!');
    } catch {
      toast.error('Failed to save theme settings');
    } finally {
      setSavingTheme(false);
    }
  };

  // Save Hero Section & Copy
  const handleSaveHero = async (e) => {
    e.preventDefault();
    if (savingHero) return;
    setSavingHero(true);
    try {
      await API.put('/settings/admin/heroSection', {
        value: {
          heroBadge: heroBadge.trim(),
          heroTitle: heroTitle.trim(),
          heroDescription: heroDescription.trim(),
          storeVisitText: storeVisitText.trim(),
        },
      });
      toast.success('Homepage hero copy updated and saved to database!');
    } catch {
      toast.error('Failed to update hero copy');
    } finally {
      setSavingHero(false);
    }
  };

  // Save Announcement Bar
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (savingAnnouncement) return;
    setSavingAnnouncement(true);
    try {
      await API.put('/settings/admin/announcementBar', {
        value: { text: announcementText, isActive: announcementActive },
      });
      toast.success('Announcement bar updated!');
    } catch {
      toast.error('Failed to update announcement bar');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Save Shipping Settings
  const handleSaveShipping = async (e) => {
    e.preventDefault();
    if (savingShipping) return;
    setSavingShipping(true);
    try {
      await API.put('/settings/admin/shippingCharge', {
        value: { amount: Number(shippingFee), freeAbove: Number(freeAbove) },
      });
      toast.success('Shipping settings saved!');
    } catch {
      toast.error('Failed to update shipping rules');
    } finally {
      setSavingShipping(false);
    }
  };

  // Save Contact Info
  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (savingContact) return;
    setSavingContact(true);
    try {
      await API.put('/settings/admin/contactInfo', {
        value: {
          address: storeAddress,
          phones: [storePhone.trim() || '9500757024'],
          email: storeEmail,
          instagram: storeInstagram,
        },
      });
      toast.success('Store details saved!');
    } catch {
      toast.error('Failed to update store information');
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="font-serif text-2xl font-bold text-neutral-900">Store Settings & Dynamic Theming</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Customize website theme colors dynamically, update shipping rates, announcements, and store details
        </p>
      </div>

      {/* 1. Dynamic Theme Studio */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <HiOutlineColorSwatch className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Dynamic Theme Studio</h2>
            <p className="text-xs text-neutral-500">
              Transform the website colors dynamically without editing code. Changes apply immediately!
            </p>
          </div>
        </div>

        {/* Curated Theme Presets */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            Curated Luxury Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Object.values(presets).map((p) => {
              const isSelected = selectedPresetId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-neutral-50/80 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900">{p.name}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: p.primary }} title={`Primary: ${p.primary}`} />
                    <div className="w-7 h-7 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: p.accent }} title={`Accent: ${p.accent}`} />
                    <div className="w-7 h-7 rounded-lg shadow-inner border border-black/10" style={{ backgroundColor: p.bgTint }} title={`Background: ${p.bgTint}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Hex Color Pickers */}
        <div className="pt-4 border-t border-neutral-100 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
            Custom Palette Color Pickers
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Primary Brand Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300"
                />
                <input
                  type="text"
                  value={customPrimary}
                  onChange={(e) => setCustomPrimary(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Accent Highlight Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300"
                />
                <input
                  type="text"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-neutral-700 mb-1">Page Canvas Background Tint</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300"
                />
                <input
                  type="text"
                  value={customBg}
                  onChange={(e) => setCustomBg(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {/* Live Component Preview */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-neutral-500">Live Component Sample:</span>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs"
                style={{ backgroundColor: customPrimary, color: '#FFFFFF' }}
              >
                CTA Button
              </button>
              <span
                className="px-2.5 py-1 rounded-md text-xs font-bold"
                style={{ backgroundColor: customAccent, color: '#FFFFFF' }}
              >
                Badge Tag
              </span>
            </div>

            <button
              onClick={handleSaveCustomTheme}
              disabled={savingTheme}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {savingTheme ? 'Applying Theme...' : 'Save & Apply Custom Theme'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Homepage Hero Showcase & Brand Copy */}
      <form onSubmit={handleSaveHero} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center">
            <HiOutlineSparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Homepage Hero Showcase & Brand Copy</h2>
            <p className="text-xs text-neutral-500">
              Customize the prominent hero banner headlines and brand description dynamically from the database
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Hero Badge Tag</label>
            <input
              type="text"
              required
              value={heroBadge}
              onChange={(e) => setHeroBadge(e.target.value)}
              placeholder="e.g. Chennai's Trendy Fashion House"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Hero Main Headline</label>
            <input
              type="text"
              required
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder="e.g. Style That Defines You"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-serif font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Store Button Label (📍)</label>
            <input
              type="text"
              required
              value={storeVisitText}
              onChange={(e) => setStoreVisitText(e.target.value)}
              placeholder="e.g. Visit Store"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-neutral-700">
              Hero Brand Description & Subtitle *
            </label>
            <button
              type="button"
              onClick={() =>
                setHeroDescription(
                  'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'
                )
              }
              className="text-[11px] text-accent hover:underline font-medium"
            >
              Reset to Original Heritage Text
            </button>
          </div>
          <textarea
            rows={3}
            required
            value={heroDescription}
            onChange={(e) => setHeroDescription(e.target.value)}
            placeholder="Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves."
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary leading-relaxed resize-y"
          />
          <p className="text-[11px] text-neutral-400 mt-1">
            Stored dynamically in MongoDB (`heroDescription`). Displays beneath the headline on the storefront homepage hero section.
          </p>
        </div>

        {/* Live Hero Simulation Box */}
        <div className="rounded-2xl bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 p-5 sm:p-6 text-white space-y-3 border border-accent-300/20 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-accent-300">
              Live Storefront Preview
            </span>
            <span className="text-[10px] text-neutral-300">Homepage Hero Banner</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-[11px] font-semibold tracking-wider uppercase">
            <HiOutlineSparkles className="w-3.5 h-3.5" />
            <span>{heroBadge || "Chennai's Trendy Fashion House"}</span>
          </div>
          <h3 className="font-serif text-2xl font-bold tracking-tight text-white">
            {heroTitle || 'Style That Defines You'}
          </h3>
          <p className="text-xs text-neutral-200 font-light leading-relaxed max-w-2xl">
            {heroDescription ||
              'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
          </p>
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="px-4 py-1.5 rounded-full bg-accent text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm">
              <span>Explore Collection</span>
              <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </div>
            <div className="px-4 py-1.5 rounded-full border border-accent-300/40 text-white font-medium text-xs flex items-center gap-1.5 bg-white/5">
              <HiOutlineLocationMarker className="w-3.5 h-3.5 text-accent-300" />
              <span>{storeVisitText || 'Visit Store'}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={savingHero}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
          >
            {savingHero ? 'Saving Hero Text...' : 'Save Hero Copy to Database'}
          </button>
        </div>
      </form>

      {/* 3. Announcement Bar */}
      <form onSubmit={handleSaveAnnouncement} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <HiOutlineSpeakerphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Top Announcement Banner</h2>
            <p className="text-xs text-neutral-500">Broadcast store promotions, festive discounts, or shipping notices</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="announcementActive"
              checked={announcementActive}
              onChange={(e) => setAnnouncementActive(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary"
            />
            <label htmlFor="announcementActive" className="text-xs font-bold text-neutral-800 cursor-pointer">
              Show Announcement Bar on Storefront
            </label>
          </div>

          <input
            type="text"
            required
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="🎉 Free Shipping on Orders Above ₹999!"
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
          />

          <div className="text-right">
            <button
              type="submit"
              disabled={savingAnnouncement}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-sm"
            >
              {savingAnnouncement ? 'Saving...' : 'Save Announcement'}
            </button>
          </div>
        </div>
      </form>

      {/* 3. Shipping Charge Rules */}
      <form onSubmit={handleSaveShipping} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <HiOutlineTruck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Delivery & Shipping Rules</h2>
            <p className="text-xs text-neutral-500">Configure standard delivery fee and free delivery thresholds</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Standard Delivery Fee (₹)</label>
            <input
              type="number"
              min="0"
              required
              value={shippingFee}
              onChange={(e) => setShippingFee(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Free Delivery on Orders Above (₹)</label>
            <input
              type="number"
              min="0"
              required
              value={freeAbove}
              onChange={(e) => setFreeAbove(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={savingShipping}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-sm"
          >
            {savingShipping ? 'Saving...' : 'Save Shipping Rates'}
          </button>
        </div>
      </form>

      {/* 4. Store Contact Details */}
      <form onSubmit={handleSaveContact} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <HiOutlineOfficeBuilding className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Store Information</h2>
            <p className="text-xs text-neutral-500">Physical address, primary helpline, and social links</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-neutral-700 mb-1">Physical Boutique Address</label>
            <input
              type="text"
              required
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Primary Store Phone / WhatsApp</label>
            <input
              type="text"
              required
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">Store Email</label>
            <input
              type="email"
              required
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            disabled={savingContact}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-sm"
          >
            {savingContact ? 'Saving...' : 'Save Store Info'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsManager;
