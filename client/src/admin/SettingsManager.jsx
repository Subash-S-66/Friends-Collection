import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineColorSwatch,
  HiOutlineSpeakerphone,
  HiOutlineTruck,
  HiOutlineOfficeBuilding,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineLocationMarker,
  HiOutlineArrowRight,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineViewGrid
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useTheme, THEME_PRESETS, adjustColor } from '../context/ThemeContext';
import { useConfirm } from '../context/ConfirmContext';

const SettingsManager = () => {
  const { theme, changeTheme, applyPreset, presets } = useTheme();
  const { confirm } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect legacy /admin/settings?tab=invoice to the dedicated /admin/invoice page
  useEffect(() => {
    if (searchParams.get('tab') === 'invoice') {
      navigate('/admin/invoice', { replace: true });
    }
  }, [searchParams, navigate]);

  // Tab control from URL (?tab=theming, departments, announcement, shipping, contact)
  const rawTab = searchParams.get('tab') || 'theming';
  const currentTab = rawTab === 'hero' ? 'announcement' : rawTab;
  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // 1. Theme customizer state
  const [selectedPresetId, setSelectedPresetId] = useState(theme.id || 'wine');
  const [customPrimary, setCustomPrimary] = useState(theme.primary || '#54142D');
  const [customAccent, setCustomAccent] = useState(theme.accent || '#C88A65');
  const [customBg, setCustomBg] = useState(theme.bgTint || '#FAF7F2');

  // 2. Announcement Bar state
  const [announcementText, setAnnouncementText] = useState('🎉 Free Shipping on Orders Above ₹999!');
  const [announcementActive, setAnnouncementActive] = useState(true);

  // 3. Shipping state
  const [shippingFee, setShippingFee] = useState('79');
  const [freeAbove, setFreeAbove] = useState('999');

  // 4. Store Info state
  const [storeAddress, setStoreAddress] = useState('7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 12');
  const [storePhone, setStorePhone] = useState('9500757024');
  const [storeEmail, setStoreEmail] = useState('friends.collection06@gmail.com');
  const [storeInstagram, setStoreInstagram] = useState('friends_collection_in');

  // 5. Department Visibility state
  const [hiddenDepartments, setHiddenDepartments] = useState([]);
  const [savingDepartmentKey, setSavingDepartmentKey] = useState(null);
  const [savingDepartmentAction, setSavingDepartmentAction] = useState(null);

  const [savingTheme, setSavingTheme] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingShipping, setSavingShipping] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        const data = res.data;
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
        if (Array.isArray(data.hiddenDepartments)) {
          setHiddenDepartments(
            data.hiddenDepartments
              .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
              .filter(Boolean)
          );
        }
      })
      .catch((err) => console.error('Error fetching settings:', err));
  }, []);

  // Handle department visibility toggle with confirmation & loading
  const handleToggleDepartment = async (deptKey) => {
    const isCurrentlyHidden = hiddenDepartments.includes(deptKey);
    const newIsActive = isCurrentlyHidden;
    const deptNames = { women: "Women's Studio", men: "Men's Studio", kids: "Kids' Studio" };
    const deptName = deptNames[deptKey] || deptKey;

    if (!newIsActive) {
      const allDepts = ['women', 'men', 'kids'];
      const activeDepts = allDepts.filter((k) => !hiddenDepartments.includes(k));
      if (activeDepts.length <= 1 && activeDepts.includes(deptKey)) {
        toast.error('At least one department must remain visible on the store.');
        return;
      }
    }

    const ok = await confirm({
      title: newIsActive ? `Turn ON Entire ${deptName}?` : `Turn OFF Entire ${deptName}?`,
      message: newIsActive
        ? `This will restore ${deptName} across the storefront navigation bar, shop catalog, filters, search, and homepage, and reactivate all categories and products.`
        : `This will immediately hide ${deptName} everywhere (navigation bar, mega-menu, shop catalog, filters, homepage, search) from customers, and turn off all categories. Are you sure?`,
      type: newIsActive ? 'primary' : 'danger',
      confirmText: newIsActive ? `Yes, Turn ON ${deptName}` : `Yes, Turn OFF ${deptName}`,
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setSavingDepartmentKey(deptKey);
    setSavingDepartmentAction(newIsActive ? 'on' : 'off');
    const toastId = toast.loading(
      newIsActive ? `Turning ON entire ${deptName}...` : `Turning OFF entire ${deptName}...`
    );

    // Optimistically update hiddenDepartments
    if (newIsActive) {
      setHiddenDepartments((prev) => prev.filter((k) => k !== deptKey));
    } else {
      setHiddenDepartments((prev) => (prev.includes(deptKey) ? prev : [...prev, deptKey]));
    }

    try {
      const res = await API.patch(`/categories/admin/department/${deptKey}/toggle`, {
        isActive: newIsActive
      });
      toast.success(res.data?.message || `✨ ${deptName} updated successfully!`, { id: toastId });
    } catch (err) {
      console.error('Error updating department visibility:', err);
      toast.error(err.response?.data?.message || 'Failed to update department visibility', { id: toastId });
      API.get('/settings').then((res) => {
        if (Array.isArray(res.data?.hiddenDepartments)) {
          setHiddenDepartments(res.data.hiddenDepartments);
        }
      });
    } finally {
      setSavingDepartmentKey(null);
      setSavingDepartmentAction(null);
    }
  };

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
    const ok = await confirm({
      title: 'Apply Custom Brand Theme?',
      message: 'Save and apply these custom brand colors across the entire boutique website?',
      type: 'save',
      confirmText: 'Apply Theme',
      cancelText: 'Cancel',
      details: `Primary: ${customPrimary} • Accent: ${customAccent} • Background: ${customBg}`
    });
    if (!ok) return;

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

  // Save Announcement Bar
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (savingAnnouncement) return;
    const ok = await confirm({
      title: 'Update Top Announcement Bar?',
      message: `Save and update the store-wide announcement strip (${announcementActive ? 'ACTIVE' : 'HIDDEN'})?`,
      type: 'save',
      confirmText: 'Save Announcement',
      cancelText: 'Cancel'
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: 'Save Shipping & Delivery Rates?',
      message: `Update standard shipping fee to ₹${shippingFee} with free delivery above ₹${freeAbove}?`,
      type: 'save',
      confirmText: 'Save Shipping Rules',
      cancelText: 'Cancel'
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: 'Save Store Contact Details?',
      message: 'Update showroom address, contact phones, and social media handles in the database?',
      type: 'save',
      confirmText: 'Save Contact Details',
      cancelText: 'Cancel'
    });
    if (!ok) return;

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

  const tabs = [
    { id: 'theming', name: 'Theme & Brand Colors', icon: HiOutlineColorSwatch },
    {
      id: 'departments',
      name: 'Department Visibility',
      icon: HiOutlineEyeOff,
      badge: hiddenDepartments.length > 0 ? `${hiddenDepartments.length} Hidden` : null
    },
    { id: 'announcement', name: 'Announcement Bar', icon: HiOutlineSpeakerphone },
    { id: 'shipping', name: 'Shipping Rules', icon: HiOutlineTruck },
    { id: 'contact', name: 'Store Contact & Info', icon: HiOutlineOfficeBuilding },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            Store & Theme Settings
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Configure brand theme colors, top announcement bar, shipping delivery rules, and showroom contact info
          </p>
        </div>
      </div>

      {/* Navigation Tab Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-accent-300' : 'text-neutral-400'}`} />
              <span>{tab.name}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-extrabold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-accent-100 text-accent-800 border border-accent-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>



      {/* ============================================================== */}
      {/* TAB: DEPARTMENT VISIBILITY                                     */}
      {/* ============================================================== */}
      {currentTab === 'departments' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <HiOutlineEyeOff className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900">Department & Section Visibility</h2>
                <p className="text-xs text-neutral-500">
                  Instantly show or hide entire sections (Women, Men, Kids) from the customer storefront
                </p>
              </div>
            </div>

            {hiddenDepartments.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
                🔒 {hiddenDepartments.length} {hiddenDepartments.length === 1 ? 'Section' : 'Sections'} Hidden
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 self-start sm:self-auto">
                ✨ All Departments Live
              </span>
            )}
          </div>

          {/* Department Visibility Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                key: 'women',
                name: "Women's Studio",
                emoji: '🌸',
                tagline: 'Sarees, Salwar Suits, Kurtis, Lehengas & Western Wear',
                color: 'from-rose-500/10 to-pink-500/5',
                border: 'border-rose-200'
              },
              {
                key: 'men',
                name: "Men's Studio",
                emoji: '👔',
                tagline: 'Shirts, Kurtas, Formal Trousers, Polos & Blazers',
                color: 'from-blue-500/10 to-indigo-500/5',
                border: 'border-blue-200'
              },
              {
                key: 'kids',
                name: "Kids' Studio",
                emoji: '🧒',
                tagline: "Boys' Ethnic Wear, Girls' Lehengas, Pattu Pavadai & Sets",
                color: 'from-amber-500/10 to-yellow-500/5',
                border: 'border-amber-200'
              }
            ].map((dept) => {
              const isHidden = hiddenDepartments.includes(dept.key);
              return (
                <div
                  key={dept.key}
                  className={`relative rounded-2xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                    isHidden
                      ? 'bg-neutral-50/80 border-neutral-300 opacity-90'
                      : `bg-gradient-to-br ${dept.color} ${dept.border} hover:shadow-md`
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{dept.emoji}</span>
                      {isHidden ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-neutral-200 text-neutral-700 border border-neutral-300">
                          <HiOutlineEyeOff className="w-3.5 h-3.5" />
                          Hidden
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <HiOutlineEye className="w-3.5 h-3.5" />
                          Live on Store
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-serif text-base font-bold text-neutral-900">{dept.name}</h3>
                      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{dept.tagline}</p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-neutral-200/60 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-medium text-neutral-600">
                      {isHidden ? 'Section hidden everywhere' : 'Visible to all customers'}
                    </div>

                    <button
                      type="button"
                      disabled={Boolean(savingDepartmentKey)}
                      onClick={() => handleToggleDepartment(dept.key)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
                        savingDepartmentKey === dept.key
                          ? 'bg-neutral-200 text-neutral-800 cursor-wait'
                          : isHidden
                          ? 'bg-primary text-white hover:bg-primary-light'
                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300'
                      }`}
                    >
                      {savingDepartmentKey === dept.key ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>{savingDepartmentAction === 'on' ? 'Turning ON...' : 'Turning OFF...'}</span>
                        </>
                      ) : isHidden ? (
                        <>
                          <HiOutlineEye className="w-4 h-4" />
                          <span>Show on Store</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineEyeOff className="w-4 h-4" />
                          <span>Hide Section</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Educational Explainer Banner */}
          <div className="p-4 rounded-2xl bg-cream border border-accent-200/80 space-y-2 text-xs text-neutral-700">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <HiOutlineSparkles className="w-4 h-4 text-accent-700" />
              <span>How does Section Visibility work?</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              When a department (e.g. <strong>Kids' Studio</strong> or <strong>Men's Studio</strong>) is hidden:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li><strong>Navigation Header & Mobile Drawer:</strong> The tab and its mega-menu categories disappear automatically.</li>
              <li><strong>Shop Catalog & Filters:</strong> Removed from the Department filter bar, desktop sidebar, and mobile drawer.</li>
              <li><strong>Homepage:</strong> Filter tabs, department collections, trending highlights, and new arrival cards for this section are hidden.</li>
              <li><strong>Search Autocomplete:</strong> Product recommendations and search keywords for this department will not be suggested.</li>
              <li><strong>Admin Dashboard:</strong> You can always view, add, and manage products and categories for hidden departments right here without restriction.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: THEME STUDIO                                            */}
      {/* ============================================================== */}
      {currentTab === 'theming' && (
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
          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
              Custom Hex Color Palette
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Primary Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customPrimary}
                    onChange={(e) => setCustomPrimary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Accent Bronze / Gold</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customAccent}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Background Cream Tint</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-neutral-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={customBg}
                    onChange={(e) => setCustomBg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="text-right pt-4">
              <button
                type="button"
                onClick={handleSaveCustomTheme}
                disabled={savingTheme}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingTheme ? 'Applying & Saving...' : 'Save & Apply Custom Theme'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ANNOUNCEMENT BAR                                        */}
      {/* ============================================================== */}
      {currentTab === 'announcement' && (
        <div className="space-y-6">
          {/* Announcement Bar */}
          <form onSubmit={handleSaveAnnouncement} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
              <div className="w-10 h-10 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center">
                <HiOutlineSpeakerphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-neutral-900">Announcement Bar</h2>
                <p className="text-xs text-neutral-500">Top strip message displayed above the navigation bar</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Announcement Text</label>
                <input
                  type="text"
                  required
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="annActive"
                  checked={announcementActive}
                  onChange={(e) => setAnnouncementActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="annActive" className="text-xs font-medium text-neutral-700 cursor-pointer">
                  Enable Announcement Bar on Storefront
                </label>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                type="submit"
                disabled={savingAnnouncement}
                className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingAnnouncement ? 'Saving...' : 'Save Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SHIPPING RULES                                          */}
      {/* ============================================================== */}
      {currentTab === 'shipping' && (
        <form onSubmit={handleSaveShipping} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HiOutlineTruck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-900">Shipping Rules & Free Delivery</h2>
              <p className="text-xs text-neutral-500">Configure delivery charges and free shipping threshold</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">Standard Shipping Fee (₹)</label>
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
              <label className="block text-xs font-bold text-neutral-700 mb-1">Free Delivery Above Cart Total (₹)</label>
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

          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={savingShipping}
              className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingShipping ? 'Saving...' : 'Save Shipping Rates'}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 5: STORE INFORMATION                                       */}
      {/* ============================================================== */}
      {currentTab === 'contact' && (
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

          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={savingContact}
              className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingContact ? 'Saving...' : 'Save Store Info'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsManager;
