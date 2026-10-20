import { useState, useEffect, useRef } from 'react';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePhotograph,
  HiOutlineX,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
  HiOutlineSparkles,
  HiOutlineCheck,
  HiOutlineLink,
  HiOutlinePlay,
  HiOutlinePause
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useConfirm } from '../context/ConfirmContext';
import { getImageUrl, handleImageError } from '../utils/formatters';

const MAX_BANNERS = 5;

const QUICK_LINKS = [
  { label: '🛍️ All Shop', url: '/shop' },
  { label: '🌸 Women', url: '/shop?gender=women' },
  { label: '👔 Men', url: '/shop?gender=men' },
  { label: '🧒 Kids', url: '/shop?gender=kids' },
  { label: '✨ Festive Offer', url: '/shop?tag=festive' }
];

const BannerManager = () => {
  const { confirm } = useConfirm();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  // Carousel mode settings
  const [heroCarouselEnabled, setHeroCarouselEnabled] = useState(false);
  const [togglingCarousel, setTogglingCarousel] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaText, setCtaText] = useState('Shop Now');
  const [ctaLink, setCtaLink] = useState('/shop');
  const [priority, setPriority] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingBannerId, setTogglingBannerId] = useState(null);
  const [reordering, setReordering] = useState(false);

  // Live preview slider states (auto-rotate every 3s, pause on hover)
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);
  const previewTimerRef = useRef(null);

  const fetchBannersAndSettings = async (silent = false) => {
    if (!silent && banners.length === 0) setLoading(true);
    try {
      const [bannersRes, settingsRes] = await Promise.all([
        API.get('/banners/admin/all'),
        API.get('/settings').catch(() => ({ data: {} }))
      ]);
      setBanners(Array.isArray(bannersRes.data) ? bannersRes.data : []);
      if (settingsRes?.data?.heroCarouselEnabled !== undefined) {
        setHeroCarouselEnabled(Boolean(settingsRes.data.heroCarouselEnabled));
      }
    } catch (err) {
      console.error('Error loading banners or settings:', err);
      toast.error('Failed to load hero banner data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBannersAndSettings();
  }, []);

  // Filter active banners for preview
  const activeBanners = banners.filter((b) => b.isActive !== false);

  // 3-second auto-rotate with pause on hover for the preview
  useEffect(() => {
    if (activeBanners.length <= 1 || previewPaused || !heroCarouselEnabled) return;
    previewTimerRef.current = setInterval(() => {
      setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
    }, 3000);
    return () => clearInterval(previewTimerRef.current);
  }, [activeBanners.length, previewPaused, heroCarouselEnabled]);

  // Adjust preview index if active banners count changes
  useEffect(() => {
    if (previewIdx >= activeBanners.length && activeBanners.length > 0) {
      setPreviewIdx(0);
    }
  }, [activeBanners.length, previewIdx]);

  // Toggle Carousel Mode (Single Image vs 5-Slide Carousel)
  const handleToggleCarouselMode = async () => {
    const nextState = !heroCarouselEnabled;
    setTogglingCarousel(true);
    setHeroCarouselEnabled(nextState);

    try {
      await API.put('/settings/admin/heroCarouselEnabled', { value: nextState });
      toast.success(
        nextState
          ? '🎠 Hero Carousel ENABLED! Storefront will smoothly auto-rotate up to 5 slides every 3s.'
          : '🖼️ Single Banner Mode active. Storefront displays 1 static primary hero banner.',
        { icon: nextState ? '🎠' : '🖼️' }
      );
    } catch (err) {
      console.error('Failed to update carousel mode:', err);
      toast.error('Failed to update carousel mode');
      setHeroCarouselEnabled(!nextState);
    } finally {
      setTogglingCarousel(false);
    }
  };

  // Open Add modal with max 5 guard
  const openAddModal = () => {
    if (banners.length >= MAX_BANNERS) {
      toast.error(`Maximum ${MAX_BANNERS} banners reached (Amazon/Flipkart format). Delete or edit existing banners.`);
      return;
    }
    setEditingBanner(null);
    setTitle('');
    setSubtitle('');
    setCtaText('Shop Collection');
    setCtaLink('/shop');
    setPriority((banners.length + 1).toString());
    setIsActive(true);
    setImageFile(null);
    setImagePreview('');
    setModalOpen(true);
  };

  const openEditModal = (b) => {
    setEditingBanner(b);
    setTitle(b.title || '');
    setSubtitle(b.subtitle || '');
    setCtaText(b.ctaText || 'Shop Now');
    setCtaLink(b.ctaLink || '/shop');
    setPriority(b.priority?.toString() || '1');
    setIsActive(b.isActive !== false);
    setImageFile(null);
    setImagePreview(b.image || '');
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Reorder banners (Move Up / Move Down)
  const handleMoveSlide = async (index, delta) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= banners.length) return;

    const newBanners = [...banners];
    const [moved] = newBanners.splice(index, 1);
    newBanners.splice(targetIdx, 0, moved);

    // Optimistically update
    setBanners(newBanners);
    setReordering(true);

    try {
      const bannerIds = newBanners.map((b) => b._id);
      await API.put('/banners/admin/reorder', { bannerIds });
      toast.success('Slide order updated!', { icon: '↕️' });
    } catch (err) {
      console.error('Reorder error:', err);
      toast.error('Failed to update slide order');
      fetchBannersAndSettings(true);
    } finally {
      setReordering(false);
    }
  };

  // 1-Click Toggle Active Status
  const handleToggleActive = async (banner) => {
    setTogglingBannerId(banner._id);
    const updatedStatus = !banner.isActive;

    // Optimistic
    setBanners((prev) =>
      prev.map((b) => (b._id === banner._id ? { ...b, isActive: updatedStatus } : b))
    );

    try {
      const res = await API.patch(`/banners/admin/${banner._id}/toggle`);
      toast.success(
        res.data?.message || `Slide is now ${updatedStatus ? 'VISIBLE' : 'HIDDEN'}`,
        { icon: updatedStatus ? '👁️' : '🙈' }
      );
      fetchBannersAndSettings(true);
    } catch (err) {
      console.error('Toggle error:', err);
      toast.error('Failed to toggle slide status');
      fetchBannersAndSettings(true);
    } finally {
      setTogglingBannerId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (!editingBanner && !imageFile) {
      toast.error('Please upload a banner image');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('subtitle', subtitle.trim());
      formData.append('ctaText', ctaText.trim());
      formData.append('ctaLink', ctaLink.trim());
      formData.append('priority', priority);
      formData.append('isActive', String(isActive));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const isEditing = Boolean(editingBanner);
      const ok = await confirm({
        title: isEditing ? 'Save Banner Changes?' : 'Publish Homepage Banner?',
        message: isEditing
          ? `Save changes to "${title.trim() || 'this slide'}"?`
          : `Add this slide to the hero carousel? (Redirects to: ${ctaLink.trim()})`,
        type: 'save',
        confirmText: isEditing ? 'Save Banner' : 'Publish Banner',
        cancelText: 'Keep Editing',
        details: `Destination: ${ctaLink.trim()} (Same-site navigation)`
      });
      if (!ok) {
        setSaving(false);
        return;
      }

      if (editingBanner) {
        await API.put(`/banners/admin/${editingBanner._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Slide updated successfully!');
      } else {
        await API.post('/banners/admin', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Slide added to carousel successfully!');
      }

      setModalOpen(false);
      fetchBannersAndSettings(true);
    } catch (err) {
      console.error('Save banner error:', err);
      toast.error(err.response?.data?.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, slideTitle) => {
    const ok = await confirm({
      title: 'Delete Hero Banner Slide?',
      message: `Are you sure you want to remove "${slideTitle || 'this banner slide'}" from the storefront?`,
      type: 'danger',
      confirmText: 'Yes, Delete Slide',
      cancelText: 'Cancel'
    });
    if (!ok) return;

    try {
      await API.delete(`/banners/admin/${id}`);
      toast.success('Slide removed');
      fetchBannersAndSettings(true);
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-accent-100 text-accent-800">
              <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-700" />
              Hero Visuals & Carousel Studio
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              {banners.length} / {MAX_BANNERS} Max Slides
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            Homepage Hero Banners & Carousel
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
            Configure full-width promotional hero banners with 3-second auto-sliding, hover-to-pause interaction, reordering, and same-site destination redirection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Carousel On/Off Switch */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-cream-light border border-accent-200">
            <div className="text-left">
              <p className="text-xs font-bold text-neutral-900 leading-none">
                Carousel Mode
              </p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {heroCarouselEnabled ? 'Auto 3s (Amazon Style)' : 'Single Banner Default'}
              </p>
            </div>
            <button
              type="button"
              disabled={togglingCarousel}
              onClick={handleToggleCarouselMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                heroCarouselEnabled ? 'bg-primary' : 'bg-neutral-300'
              }`}
              title="Toggle between 1-image static banner and multi-image auto-rotating carousel"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  heroCarouselEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Add Banner Button (Max 5 Limit) */}
          <button
            onClick={openAddModal}
            disabled={banners.length >= MAX_BANNERS}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all ${
              banners.length >= MAX_BANNERS
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                : 'bg-primary hover:bg-primary-light text-white active:scale-95 cursor-pointer'
            }`}
            title={banners.length >= MAX_BANNERS ? 'Maximum 5 banners reached' : 'Add another slide to carousel'}
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>
              {banners.length >= MAX_BANNERS ? 'Max 5 Slides Reached' : 'Add Banner Slide'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Interactive Carousel Preview (Amazon / Flipkart format) */}
      {heroCarouselEnabled && activeBanners.length > 0 && (
        <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6 rounded-3xl text-white shadow-xl border border-accent-400/30 overflow-hidden space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold uppercase tracking-wider text-accent-300">
                Live Storefront Carousel Simulation (Auto-sliding every 3s)
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300 text-[11px]">
              <span className="hidden sm:inline">
                {previewPaused ? '⏸️ Paused (Hovering)' : '▶️ Auto-sliding in 3s'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-accent-200">
                Slide {previewIdx + 1} of {activeBanners.length}
              </span>
            </div>
          </div>

          {/* Simulated Carousel Box */}
          <div
            className="relative rounded-2xl overflow-hidden aspect-[16/7] sm:aspect-[21/8] bg-black/40 group cursor-pointer"
            onMouseEnter={() => setPreviewPaused(true)}
            onMouseLeave={() => setPreviewPaused(false)}
            onClick={() => {
              const current = activeBanners[previewIdx];
              if (current?.ctaLink) {
                toast.info(`Redirects to: ${current.ctaLink} (within same site)`, { icon: '🔗' });
              }
            }}
          >
            {/* Slide Image */}
            <img
              src={getImageUrl(activeBanners[previewIdx]?.image, '/fallback-banner.png')}
              alt={activeBanners[previewIdx]?.title || 'Banner'}
              onError={(e) => handleImageError(e, '/fallback-banner.png')}
              className="w-full h-full object-cover transition-all duration-700 ease-out filter brightness-90 group-hover:scale-102"
            />

            {/* Gradient Overlay & Content */}
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/85 via-black/40 to-transparent flex flex-col justify-end sm:justify-center p-6 sm:p-12 text-white">
              <div className="max-w-xl space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accent-500/30 text-accent-200 border border-accent-400/40">
                  Slide #{previewIdx + 1} • {activeBanners[previewIdx]?.priority || 1}
                </span>
                <h3 className="font-serif text-lg sm:text-3xl font-bold leading-tight">
                  {activeBanners[previewIdx]?.title || 'Promotional Headline'}
                </h3>
                {activeBanners[previewIdx]?.subtitle && (
                  <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2 leading-relaxed">
                    {activeBanners[previewIdx].subtitle}
                  </p>
                )}
                <div className="pt-2 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-xs font-bold shadow-lg">
                    <span>{activeBanners[previewIdx]?.ctaText || 'Shop Now'}</span>
                    <HiOutlineChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] text-neutral-300 font-mono">
                    ➔ {activeBanners[previewIdx]?.ctaLink || '/shop'}
                  </span>
                </div>
              </div>
            </div>

            {/* Previous Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIdx((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all opacity-80 group-hover:opacity-100"
              title="Previous Slide"
            >
              <HiOutlineChevronLeft className="w-5 h-5" />
            </button>

            {/* Next Arrow Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all opacity-80 group-hover:opacity-100"
              title="Next Slide"
            >
              <HiOutlineChevronRight className="w-5 h-5" />
            </button>

            {/* Pagination Indicator Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewIdx(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    previewIdx === idx ? 'w-7 bg-accent-400' : 'w-2 bg-white/50 hover:bg-white'
                  }`}
                  title={`Jump to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 text-center">
            💡 Amazon & Flipkart standard: Hovering pauses the 3s timer. Clicking redirects within the same site.
          </p>
        </div>
      )}

      {/* Banners List / Grid with Reordering & Priority */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-neutral-900">
            Configured Carousel Slides ({banners.length} of {MAX_BANNERS})
          </h2>
          <span className="text-xs text-neutral-500">
            Use ▲ / ▼ buttons to adjust presentation sequence
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
            <div className="w-8 h-8 border-4 border-accent-300 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-neutral-500 mt-3 font-medium">Loading hero banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200 shadow-xs space-y-3">
            <HiOutlinePhotograph className="w-12 h-12 text-neutral-300 mx-auto" />
            <p className="text-sm font-semibold text-neutral-700">No Hero Banners Uploaded</p>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Add up to 5 promotional banners to create an Amazon/Flipkart style auto-rotating hero slider.
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md cursor-pointer"
            >
              <HiOutlinePlus className="w-4 h-4" />
              <span>Add First Banner</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {banners.map((b, index) => {
              const isFirst = index === 0;
              const isLast = index === banners.length - 1;
              const isTogglingThis = togglingBannerId === b._id;

              return (
                <div
                  key={b._id}
                  className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${
                    b.isActive === false ? 'opacity-65 border-neutral-200 bg-neutral-50/50' : 'border-neutral-200 hover:border-accent-300'
                  }`}
                >
                  {/* Left: Reorder Controls & Slide Badge */}
                  <div className="flex items-center gap-3">
                    {/* Up / Down Reorder Arrows */}
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={isFirst || reordering}
                        onClick={() => handleMoveSlide(index, -1)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isFirst
                            ? 'text-neutral-300 border-neutral-200 cursor-not-allowed bg-neutral-50'
                            : 'text-neutral-700 hover:text-primary hover:bg-neutral-100 border-neutral-200 cursor-pointer active:scale-95'
                        }`}
                        title="Move Slide Earlier (Higher Priority)"
                      >
                        <HiOutlineArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast || reordering}
                        onClick={() => handleMoveSlide(index, 1)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isLast
                            ? 'text-neutral-300 border-neutral-200 cursor-not-allowed bg-neutral-50'
                            : 'text-neutral-700 hover:text-primary hover:bg-neutral-100 border-neutral-200 cursor-pointer active:scale-95'
                        }`}
                        title="Move Slide Later (Lower Priority)"
                      >
                        <HiOutlineArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sequence Badge */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-neutral-100 text-neutral-800 border border-neutral-200 font-bold shrink-0">
                      <span className="text-[10px] uppercase text-neutral-400 font-semibold">Slide</span>
                      <span className="text-base leading-none">#{index + 1}</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="relative w-28 h-18 sm:w-36 sm:h-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 shrink-0">
                      <img
                        src={getImageUrl(b.image, '/fallback-banner.png')}
                        alt={b.title}
                        onError={(e) => handleImageError(e, '/fallback-banner.png')}
                        className="w-full h-full object-cover"
                      />
                      {b.isActive === false && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                          Hidden
                        </div>
                      )}
                    </div>

                    {/* Slide Information */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-sm sm:text-base font-bold text-neutral-900 truncate">
                          {b.title || 'Untitled Slide'}
                        </h3>
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Primary Cover
                          </span>
                        )}
                        {b.isActive !== false ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Live
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-300">
                            Inactive
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                        {b.subtitle || 'No subtitle description'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                          <span>Button:</span>
                          <strong className="text-primary">{b.ctaText || 'Shop Now'}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-700 bg-accent-50 px-2 py-0.5 rounded-md">
                          <HiOutlineLink className="w-3.5 h-3.5 text-accent-600" />
                          <span>{b.ctaLink || '/shop'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Live / Hidden Toggle Button */}
                    <button
                      type="button"
                      disabled={isTogglingThis}
                      onClick={() => handleToggleActive(b)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isTogglingThis
                          ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-wait'
                          : b.isActive !== false
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border-neutral-300'
                      }`}
                      title={b.isActive !== false ? 'Hide from storefront' : 'Make visible on storefront'}
                    >
                      {isTogglingThis ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : b.isActive !== false ? (
                        <>
                          <HiOutlineEye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Live</span>
                        </>
                      ) : (
                        <>
                          <HiOutlineEyeOff className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(b)}
                      className="p-2 text-neutral-600 hover:text-primary hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors"
                      title="Edit Banner Content"
                    >
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(b._id, b.title)}
                      className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-neutral-200 transition-colors cursor-pointer"
                      title="Delete Slide"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Banner Slide Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200/80">
            {/* Modal Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0">
              <div>
                <span className="text-[11px] uppercase font-bold text-accent-700 tracking-wider">
                  Carousel Slide Studio
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
                  {editingBanner ? 'Edit Hero Banner Slide' : 'Add New Carousel Slide'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all border border-neutral-200/80 shadow-2xs bg-white cursor-pointer active:scale-95 shrink-0"
                title="Close"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-5 flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Headline */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Headline Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Royal Maroon Silk Anarkali Collection"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Slide Description / Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Handcrafted festive silks with bespoke zari borders, now trending in our Jamalia boutique."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary leading-relaxed resize-y"
                  />
                </div>

                {/* Button Text & Redirect Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Shop Collection"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">
                      Target Redirect Link *
                    </label>
                    <input
                      type="text"
                      required
                      value={ctaLink}
                      onChange={(e) => setCtaLink(e.target.value)}
                      placeholder="/shop?category=sarees"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary font-mono text-[11px]"
                    />
                  </div>
                </div>

                {/* Quick Link Chips */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wider">
                    Quick Link Suggestions (Redirects in Same Site):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_LINKS.map((item) => (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setCtaLink(item.url)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          ctaLink === item.url
                            ? 'bg-primary text-white border-primary'
                            : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Tip: Any internal link like <code className="bg-neutral-100 px-1 py-0.5 rounded">/shop</code> or <code className="bg-neutral-100 px-1 py-0.5 rounded">/products/slug</code> will redirect smoothly inside the store without opening a new window.
                  </p>
                </div>

                {/* Banner Image Upload & Live Preview */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Hero Banner Image {!editingBanner && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required={!editingBanner}
                    onChange={handleImageChange}
                    className="block w-full text-xs text-neutral-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-light cursor-pointer"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Recommended: 16:9 or 21:9 landscape photo (e.g. 1920x800 or 1600x900) for edge-to-edge Amazon / Flipkart presentation.
                  </p>

                  {/* Image Preview Box */}
                  {imagePreview && (
                    <div className="mt-3 relative rounded-xl overflow-hidden border border-neutral-200 aspect-[16/8] bg-neutral-900">
                      <img
                        src={getImageUrl(imagePreview, '/fallback-banner.png')}
                        alt="Preview"
                        onError={(e) => handleImageError(e, '/fallback-banner.png')}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white">
                        Selected Visual
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Status Checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveBanner"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-neutral-300"
                  />
                  <label htmlFor="isActiveBanner" className="text-xs font-bold text-neutral-700 cursor-pointer">
                    Enable this slide on the live storefront carousel
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving Slide...</span>
                      </>
                    ) : (
                      <span>{editingBanner ? 'Save Changes' : 'Publish to Carousel'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;
