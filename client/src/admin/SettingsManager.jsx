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
  HiOutlineViewGrid,
  HiOutlineShieldCheck,
  HiOutlineShieldExclamation,
  HiOutlineLockClosed,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineKey,
  HiOutlineX
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useTheme, THEME_PRESETS, adjustColor } from '../context/ThemeContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../context/AuthContext';
import HomepageCurationManager from './HomepageCurationManager';

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

  // 3. Shipping & Taxes state
  const [shippingFee, setShippingFee] = useState('79');
  const [freeAbove, setFreeAbove] = useState('999');
  const [storeGstRate, setStoreGstRate] = useState('5');

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

  // 6. Security & Session Revocation state
  const { user, logoutAllDevices } = useAuth();
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeStep, setRevokeStep] = useState('first_confirm'); // 'first_confirm' | 'countdown' | 'final_confirm'
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    let timer;
    if (revokeModalOpen && revokeStep === 'countdown') {
      if (countdownSeconds > 0) {
        timer = setTimeout(() => {
          setCountdownSeconds((prev) => prev - 1);
        }, 1000);
      } else {
        setRevokeStep('final_confirm');
      }
    }
    return () => clearTimeout(timer);
  }, [revokeModalOpen, revokeStep, countdownSeconds]);

  const openRevokeModal = () => {
    setRevokeStep('first_confirm');
    setCountdownSeconds(3);
    setRevokeModalOpen(true);
  };

  const handleStartCountdown = () => {
    setCountdownSeconds(3);
    setRevokeStep('countdown');
  };

  const handleExecuteRevokeAll = async () => {
    try {
      setIsRevoking(true);
      await logoutAllDevices();
      toast.success('All active logins and sessions have been revoked.');
      setRevokeModalOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Failed to revoke sessions: ' + (err.message || 'Unknown error'));
      setIsRevoking(false);
    }
  };

  const handleCloseRevokeModal = () => {
    if (isRevoking) return;
    setRevokeModalOpen(false);
    setRevokeStep('first_confirm');
    setCountdownSeconds(3);
  };

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
        if (data.invoiceSettings?.gstPercentage !== undefined) {
          setStoreGstRate(data.invoiceSettings.gstPercentage.toString());
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

  // Save Shipping & GST Settings
  const handleSaveShipping = async (e) => {
    e.preventDefault();
    if (savingShipping) return;
    const ok = await confirm({
      title: 'Save Shipping & GST Tax Settings?',
      message: `Update standard shipping fee to ₹${shippingFee}, free delivery above ₹${freeAbove}, and store GST rate to ${storeGstRate}%?`,
      type: 'save',
      confirmText: 'Save Rates & Tax',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    setSavingShipping(true);
    try {
      await API.put('/settings/admin/shippingCharge', {
        value: { amount: Number(shippingFee), freeAbove: Number(freeAbove) },
      });
      // Also update invoiceSettings gstPercentage
      try {
        const curRes = await API.get('/settings');
        const invSettings = curRes.data?.invoiceSettings || {};
        await API.put('/settings/admin/invoiceSettings', {
          value: {
            ...invSettings,
            gstPercentage: Number(storeGstRate) || 0
          }
        });
      } catch (invErr) {
        console.warn('Could not sync gstPercentage to invoiceSettings:', invErr);
      }
      toast.success('Shipping & GST tax settings saved!');
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
      id: 'homepage_curation',
      name: 'Homepage Sections & Display',
      icon: HiOutlineSparkles,
      badge: 'Curated'
    },
    {
      id: 'departments',
      name: 'Department Visibility',
      icon: HiOutlineEyeOff,
      badge: hiddenDepartments.length > 0 ? `${hiddenDepartments.length} Hidden` : null
    },
    { id: 'announcement', name: 'Announcement Bar', icon: HiOutlineSpeakerphone },
    { id: 'shipping', name: 'Shipping & Taxes', icon: HiOutlineTruck },
    { id: 'contact', name: 'Store Contact & Info', icon: HiOutlineOfficeBuilding },
    { id: 'security', name: 'Security & Sessions', icon: HiOutlineShieldCheck, badge: 'Kill Switch' },
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

        <button
          type="button"
          onClick={openRevokeModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-800 text-xs font-bold transition-all shadow-2xs cursor-pointer group"
          title="Emergency Global Session Revocation"
        >
          <HiOutlineShieldExclamation className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
          <span>Revoke All Sessions</span>
        </button>
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
      {/* TAB: HOMEPAGE SECTIONS & CURATION                             */}
      {/* ============================================================== */}
      {currentTab === 'homepage_curation' && <HomepageCurationManager />}

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
      {/* TAB 4: SHIPPING & TAX RULES                                    */}
      {/* ============================================================== */}
      {currentTab === 'shipping' && (
        <form onSubmit={handleSaveShipping} className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HiOutlineTruck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-900">Shipping Rules & GST Taxation</h2>
              <p className="text-xs text-neutral-500">Configure delivery charges, free shipping threshold, and store GST percentage</p>
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
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-bold font-numeric"
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
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-bold font-numeric"
              />
            </div>
          </div>

          {/* GST % Configuration */}
          <div className="p-4 rounded-2xl bg-cream-light/70 border border-accent-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-neutral-800">
                Store GST Rate (%)
              </label>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Applied to Bills & Invoices
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-36">
                <input
                  type="number"
                  min="0"
                  max="28"
                  step="0.5"
                  value={storeGstRate}
                  onChange={(e) => setStoreGstRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-primary font-bold font-numeric pr-8 bg-white"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-neutral-500">%</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: '0% (Exempt)', val: '0' },
                  { label: '5% (Standard Apparel)', val: '5' },
                  { label: '12%', val: '12' },
                  { label: '18%', val: '18' }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setStoreGstRate(preset.val)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      storeGstRate === preset.val
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-neutral-500">
              This GST % is synced with Tax Invoice Settings and automatically reflected in checkout summaries, bill breakdowns, and generated PDF invoices.
            </p>
          </div>

          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={savingShipping}
              className="px-6 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingShipping ? 'Saving...' : 'Save Shipping & GST Settings'}
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

      {/* ============================================================== */}
      {/* TAB 7: SECURITY & ACTIVE SESSIONS                              */}
      {/* ============================================================== */}
      {currentTab === 'security' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                  <HiOutlineShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-neutral-900">
                    Security & Active Session Governance
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Dual-layer HttpOnly cookie protection, 24-hour token expiration, and database-backed session invalidation
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold self-start sm:self-auto border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Security Hardened
              </span>
            </div>

            {/* Architecture Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 mb-1">
                  <HiOutlineLockClosed className="w-4 h-4 text-emerald-600" />
                  Dual-Layer Auth (HttpOnly)
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Tokens are protected via HttpOnly, Secure, SameSite cookies to mitigate token theft via XSS or browser extensions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 mb-1">
                  <HiOutlineClock className="w-4 h-4 text-amber-600" />
                  Admin 24-Hour Expiration
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Admin session tokens automatically expire every 24 hours (1 day) to dramatically minimize exposure windows.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-800 mb-1">
                  <HiOutlineKey className="w-4 h-4 text-primary" />
                  Stateless Token Versioning
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Every JWT embeds a token version. Invalidation updates the database version and instantly terminates all active devices.
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Kill Switch Card */}
          <div className="bg-gradient-to-br from-red-50/80 via-white to-amber-50/50 rounded-3xl p-6 sm:p-8 border border-red-200 shadow-xs relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Emergency Kill Switch
                  </span>
                  <span className="text-xs font-semibold text-neutral-500">Global Device Disconnect</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-red-950">
                  Revoke All Active Logins & Sessions
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Lost a device, shared your screen, or suspect unauthorized access? Tapping this button triggers a double-confirmed security protocol that bumps your <code className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-mono text-[10px]">tokenVersion</code> in MongoDB. All active logins, mobile devices, and browser sessions will be invalidated immediately.
                </p>
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={openRevokeModal}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-98 text-white text-xs font-bold shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <HiOutlineShieldExclamation className="w-5 h-5 text-red-200 group-hover:scale-110 transition-transform" />
                  <span>Revoke All Active Logins</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-red-200/60 flex items-center gap-2 text-[11px] text-neutral-500">
              <HiOutlineExclamation className="w-4 h-4 text-red-500 shrink-0" />
              <span>Includes a mandatory 3-second animated safety countdown and secondary confirmation before any session is terminated.</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REVOKE ALL SESSIONS MODAL: STEP 1 -> 3s COUNTDOWN -> STEP 2   */}
      {/* ============================================================== */}
      {revokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 relative overflow-hidden">
            {/* Close X button */}
            <button
              type="button"
              disabled={isRevoking}
              onClick={handleCloseRevokeModal}
              className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-30"
              title="Close"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>

            {/* STEP 1: INITIAL CONFIRMATION */}
            {revokeStep === 'first_confirm' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                    <HiOutlineShieldExclamation className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-neutral-900">
                      Revoke All Active Sessions?
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Stage 1 of 2: Preliminary Authorization
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    <HiOutlineExclamation className="w-4 h-4 text-amber-600 shrink-0" />
                    Please review what will take place:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-amber-900/90 pl-1 leading-relaxed">
                    <li>
                      All active login tokens across <strong>every laptop, smartphone, and browser</strong> will be immediately revoked.
                    </li>
                    <li>
                      Your current browser session will be invalidated and you will be returned to the sign-in screen.
                    </li>
                    <li>
                      Clicking proceed will trigger a <strong>3-second safety countdown</strong> before the final authorization prompt.
                    </li>
                  </ul>
                </div>

                {user && (
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-center justify-between">
                    <span>Admin Account:</span>
                    <span className="font-bold text-neutral-800">{user.name} ({user.email})</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseRevokeModal}
                    className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStartCountdown}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <HiOutlineClock className="w-4 h-4" />
                    Proceed to 3s Countdown
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: 3-SECOND COUNTDOWN ANIMATION */}
            {revokeStep === 'countdown' && (
              <div className="text-center py-6 space-y-6">
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  {/* Outer pulsing halo */}
                  <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-40" />

                  {/* SVG Radial Countdown Ring */}
                  <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-neutral-100"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-red-600 transition-all duration-1000 ease-linear"
                      fill="transparent"
                      strokeDasharray={263.89}
                      strokeDashoffset={263.89 * (1 - countdownSeconds / 3)}
                      strokeLinecap="round"
                    />
                  </svg>

                  {/* Center animated counter */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                    <span
                      key={countdownSeconds}
                      className="font-serif text-5xl font-black text-red-600 animate-pulse transform transition-transform"
                    >
                      {countdownSeconds}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-1">
                      {countdownSeconds === 1 ? 'second' : 'seconds'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-neutral-900">
                    Security Verification Countdown
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                    Please stand by for 3 seconds while security credentials verify. Final authorization unlocks when the timer expires.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCloseRevokeModal}
                    className="px-6 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Abort / Cancel
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL CONFIRMATION */}
            {revokeStep === 'final_confirm' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-300 animate-pulse">
                    <HiOutlineExclamation className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-red-700">
                      Final Confirmation Required
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Stage 2 of 2: 3-Second countdown concluded
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-950 space-y-2">
                  <p className="font-bold text-red-900">
                    Are you absolutely sure you want to disconnect all devices now?
                  </p>
                  <p className="text-red-800/90 leading-relaxed">
                    This is your final confirmation. All active JWT sessions will be invalidated immediately in MongoDB. Every device logged into this account will be forcefully signed out.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={handleCloseRevokeModal}
                    className="px-5 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel & Keep Logged In
                  </button>
                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={handleExecuteRevokeAll}
                    className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isRevoking ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Revoking All Sessions...
                      </>
                    ) : (
                      <>
                        <HiOutlineShieldExclamation className="w-4 h-4" />
                        Yes, Disconnect All Devices Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsManager;
