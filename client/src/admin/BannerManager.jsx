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
  HiOutlineCheckCircle,
  HiOutlineLink,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineClock,
  HiOutlineAdjustments,
  HiOutlineArrowRight
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

  // Carousel mode & advanced presentation settings
  const [heroCarouselEnabled, setHeroCarouselEnabled] = useState(true);
  const [heroCarouselType, setHeroCarouselType] = useState('image_box'); // 'image_box' (Default) | 'full'
  const [heroCarouselTransition, setHeroCarouselTransition] = useState('fade'); // 'fade' | 'slide' | 'zoom'
  const [heroCarouselInterval, setHeroCarouselInterval] = useState(4000); // 3000 | 4000 | 6000
  const [updatingSetting, setUpdatingSetting] = useState(false);

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

  // Live preview slider states (auto-rotate with pause on hover)
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);
  const previewTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const clearHomeClientCache = () => {
    try {
      sessionStorage.removeItem('fc_homepage_bundle_v1');
    } catch {
      // ignore
    }
  };

  const fetchBannersAndSettings = async (silent = false) => {
    if (!silent && banners.length === 0) setLoading(true);
    try {
      const [bannersRes, settingsRes] = await Promise.all([
        API.get('/banners/admin/all'),
        API.get('/settings').catch(() => ({ data: {} }))
      ]);
      setBanners(Array.isArray(bannersRes.data) ? bannersRes.data : []);
      if (settingsRes?.data) {
        if (settingsRes.data.heroCarouselEnabled !== undefined) {
          setHeroCarouselEnabled(Boolean(settingsRes.data.heroCarouselEnabled));
        } else {
          setHeroCarouselEnabled(true);
        }
        if (settingsRes.data.heroCarouselType) {
          setHeroCarouselType(settingsRes.data.heroCarouselType);
        } else {
          setHeroCarouselType('image_box');
        }
        if (settingsRes.data.heroCarouselTransition) {
          setHeroCarouselTransition(settingsRes.data.heroCarouselTransition);
        } else {
          setHeroCarouselTransition('fade');
        }
        if (settingsRes.data.heroCarouselInterval) {
          setHeroCarouselInterval(Number(settingsRes.data.heroCarouselInterval) || 4000);
        }
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

  // Preload all active banner images for buttery smooth swap with zero flickering
  useEffect(() => {
    if (Array.isArray(activeBanners) && activeBanners.length > 0) {
      activeBanners.forEach((b) => {
        if (b?.image) {
          const img = new Image();
          img.src = getImageUrl(b.image, '/fallback-banner.png');
        }
      });
    }
  }, [activeBanners]);

  // Auto-rotate with pause on hover for the preview
  useEffect(() => {
    if (activeBanners.length <= 1 || previewPaused || !heroCarouselEnabled) return;
    previewTimerRef.current = setInterval(() => {
      setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
    }, heroCarouselInterval || 4000);
    return () => clearInterval(previewTimerRef.current);
  }, [activeBanners.length, previewPaused, heroCarouselEnabled, heroCarouselInterval]);

  // Adjust preview index if active banners count changes
  useEffect(() => {
    if (previewIdx >= activeBanners.length && activeBanners.length > 0) {
      setPreviewIdx(0);
    }
  }, [activeBanners.length, previewIdx]);

  // Change Carousel Mode (Image Box Carousel [Default], Full Hero Carousel, or Single Banner)
  const handleSetCarouselMode = async (mode) => {
    if (updatingSetting) return;
    setUpdatingSetting(true);
    clearHomeClientCache();

    if (mode === 'disabled') {
      setHeroCarouselEnabled(false);
      try {
        await API.put('/settings/admin/heroCarouselEnabled', { value: false });
        toast.success('Single Static Banner mode activated. Storefront displays 1 cover banner.', { icon: '🖼️' });
      } catch (err) {
        console.error('Failed to update carousel mode:', err);
        toast.error('Failed to update carousel mode');
        setHeroCarouselEnabled(true);
      } finally {
        setUpdatingSetting(false);
      }
      return;
    }

    const prevEnabled = heroCarouselEnabled;
    const prevType = heroCarouselType;
    setHeroCarouselEnabled(true);
    setHeroCarouselType(mode);

    try {
      await Promise.all([
        API.put('/settings/admin/heroCarouselEnabled', { value: true }),
        API.put('/settings/admin/heroCarouselType', { value: mode })
      ]);
      toast.success(
        mode === 'image_box'
          ? '🎠 Image Box Carousel ACTIVATED! (Default: Only promotional visual rotates smoothly, boutique headline stays stable)'
          : '🌟 Full Hero Carousel ACTIVATED! (Entire banner slides together including headline and CTA button)',
        { icon: mode === 'image_box' ? '🖼️' : '🌟' }
      );
    } catch (err) {
      console.error('Failed to update carousel mode:', err);
      toast.error('Failed to update carousel mode');
      setHeroCarouselEnabled(prevEnabled);
      setHeroCarouselType(prevType);
    } finally {
      setUpdatingSetting(false);
    }
  };

  // One-click "Make Image Box Carousel Default" button
  const handleMakeImageBoxDefault = async () => {
    if (updatingSetting) return;
    setUpdatingSetting(true);
    clearHomeClientCache();
    setHeroCarouselEnabled(true);
    setHeroCarouselType('image_box');
    setHeroCarouselTransition('fade');

    try {
      await Promise.all([
        API.put('/settings/admin/heroCarouselEnabled', { value: true }),
        API.put('/settings/admin/heroCarouselType', { value: 'image_box' }),
        API.put('/settings/admin/heroCarouselTransition', { value: 'fade' })
      ]);
      toast.success(
        '✨ Image Box Carousel set as DEFAULT! (Stable boutique headline + silky 0.7s crossfade on image box)',
        { icon: '✨', duration: 4000 }
      );
    } catch (err) {
      console.error('Failed to set default carousel mode:', err);
      toast.error('Failed to set default carousel mode');
    } finally {
      setUpdatingSetting(false);
    }
  };

  // Change Transition Animation Motion
  const handleSetTransition = async (transition) => {
    if (updatingSetting) return;
    setUpdatingSetting(true);
    clearHomeClientCache();
    const prev = heroCarouselTransition;
    setHeroCarouselTransition(transition);

    const labels = {
      fade: 'Luxury Crossfade (Silky Smooth)',
      slide: 'Cinematic Horizontal Slide',
      zoom: 'Ken Burns Soft Zoom & Fade'
    };

    try {
      await API.put('/settings/admin/heroCarouselTransition', { value: transition });
      toast.success(`Transition motion updated: ${labels[transition] || transition}`, { icon: '✨' });
    } catch (err) {
      console.error('Failed to update transition:', err);
      toast.error('Failed to update transition');
      setHeroCarouselTransition(prev);
    } finally {
      setUpdatingSetting(false);
    }
  };

  // Change Auto-Rotation Interval
  const handleSetInterval = async (ms) => {
    if (updatingSetting) return;
    setUpdatingSetting(true);
    clearHomeClientCache();
    const prev = heroCarouselInterval;
    setHeroCarouselInterval(ms);

    try {
      await API.put('/settings/admin/heroCarouselInterval', { value: ms });
      toast.success(`Rotation speed updated to ${ms / 1000} seconds`, { icon: '⏱️' });
    } catch (err) {
      console.error('Failed to update interval:', err);
      toast.error('Failed to update interval');
      setHeroCarouselInterval(prev);
    } finally {
      setUpdatingSetting(false);
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file (JPG, PNG, WEBP)');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      toast.success('Image selected!');
    }
  };

  const handleDeleteImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Banner image removed. You can now choose or upload a new image.', { icon: '🗑️' });
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
      clearHomeClientCache();
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
      clearHomeClientCache();
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

    if (!imagePreview && !imageFile) {
      toast.error('Please choose or upload a banner image before saving');
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

      clearHomeClientCache();
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
      clearHomeClientCache();
      await API.delete(`/banners/admin/${id}`);
      toast.success('Slide removed');
      fetchBannersAndSettings(true);
    } catch {
      toast.error('Failed to delete banner');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs">
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
            Configure dual-mode promotional carousels (Image-Box-Only or Full Banner), silky transitions, auto-rotation speeds, and same-site destination redirection.
          </p>
        </div>

        {/* Add Banner Button (Max 5 Limit) */}
        <button
          onClick={openAddModal}
          disabled={banners.length >= MAX_BANNERS}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold shadow-md transition-all self-start sm:self-auto ${
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

      {/* Hero Carousel Mode Studio (2 Carousel Kinds + 1 Static Mode) */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-700">
              Storefront Display Mode
            </span>
            <h2 className="font-serif text-lg font-bold text-neutral-900">
              Select Carousel Style
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Choose how your promotional banners appear on the homepage.
            </p>
          </div>

          {/* Quick Default Button */}
          <button
            type="button"
            disabled={updatingSetting || (heroCarouselEnabled && heroCarouselType === 'image_box' && heroCarouselTransition === 'fade')}
            onClick={handleMakeImageBoxDefault}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
              heroCarouselEnabled && heroCarouselType === 'image_box' && heroCarouselTransition === 'fade'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 cursor-default'
                : 'bg-cream hover:bg-amber-100 text-primary border-accent-300 hover:border-accent-400 active:scale-95'
            }`}
            title="Make Image Box Carousel the default option"
          >
            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {heroCarouselEnabled && heroCarouselType === 'image_box' && heroCarouselTransition === 'fade'
                ? 'Image Box Carousel is Default'
                : 'Set Image Box as Default (Recommended)'}
            </span>
          </button>
        </div>

        {/* 3 Interactive Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1: Image Box Carousel (Default • Recommended) */}
          <div
            onClick={() => handleSetCarouselMode('image_box')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              heroCarouselEnabled && heroCarouselType === 'image_box'
                ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <HiOutlineCheck className="w-3 h-3 text-emerald-700" />
                  Default • Recommended
                </span>
                {heroCarouselEnabled && heroCarouselType === 'image_box' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-2">
                  <HiOutlinePhotograph className="w-4 h-4 text-accent-700" />
                  <span>Image Box Carousel</span>
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  <strong>Only the promotional image box rotates smoothly.</strong> Store headlines, boutique introduction, and CTA buttons stay calm and stable (modern boutique lookbook style).
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100 mt-4">
              <span className="text-[11px] font-semibold text-neutral-500">
                Smooth Image Crossfade
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                  heroCarouselEnabled && heroCarouselType === 'image_box'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white'
                }`}
              >
                {heroCarouselEnabled && heroCarouselType === 'image_box' ? 'Active Mode' : 'Select'}
              </span>
            </div>
          </div>

          {/* Mode 2: Full Hero Banner Carousel */}
          <div
            onClick={() => handleSetCarouselMode('full')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              heroCarouselEnabled && heroCarouselType === 'full'
                ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-100 text-accent-800 border border-accent-200">
                  <HiOutlineSparkles className="w-3 h-3 text-accent-700" />
                  Editorial Full Slides
                </span>
                {heroCarouselEnabled && heroCarouselType === 'full' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-2">
                  <HiOutlineSparkles className="w-4 h-4 text-accent-700" />
                  <span>Full Hero Carousel</span>
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  <strong>The entire hero banner transitions together.</strong> Headline, subtitle description, CTA button, and visual slide simultaneously as full-width promotional slides.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100 mt-4">
              <span className="text-[11px] font-semibold text-neutral-500">
                Synchronized Text + Image
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                  heroCarouselEnabled && heroCarouselType === 'full'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white'
                }`}
              >
                {heroCarouselEnabled && heroCarouselType === 'full' ? 'Active Mode' : 'Select'}
              </span>
            </div>
          </div>

          {/* Mode 3: Single Static Banner */}
          <div
            onClick={() => handleSetCarouselMode('disabled')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              !heroCarouselEnabled
                ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                  Static Cover
                </span>
                {!heroCarouselEnabled && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-2">
                  <HiOutlineEye className="w-4 h-4 text-accent-700" />
                  <span>Single Static Banner</span>
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  <strong>Slide rotation disabled.</strong> Storefront displays only 1 static primary cover banner (Slide #1) without automatic or manual carousel controls.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100 mt-4">
              <span className="text-[11px] font-semibold text-neutral-500">
                1 Hero Visual Only
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                  !heroCarouselEnabled
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white'
                }`}
              >
                {!heroCarouselEnabled ? 'Active Mode' : 'Select'}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Changing Controls (Transition Animation Style & Auto-Slide Speed) */}
        {heroCarouselEnabled && (
          <div className="pt-4 border-t border-neutral-100 flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-neutral-50/70 p-4.5 rounded-2xl">
            {/* Transition Motion Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <HiOutlineAdjustments className="w-4 h-4 text-accent-700" />
                <span>Advanced Transition Motion</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'fade', label: 'Luxury Crossfade', desc: '0.7s silky smooth' },
                  { id: 'slide', label: 'Cinematic Slide', desc: 'Horizontal motion' },
                  { id: 'zoom', label: 'Ken Burns Zoom', desc: 'Soft scale & fade' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={updatingSetting}
                    onClick={() => handleSetTransition(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      heroCarouselTransition === item.id
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                    }`}
                    title={item.desc}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation Speed Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <HiOutlineClock className="w-4 h-4 text-accent-700" />
                <span>Auto-Rotation Speed</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { ms: 3000, label: '3 Seconds (Fast)' },
                  { ms: 4000, label: '4 Seconds (Recommended)' },
                  { ms: 6000, label: '6 Seconds (Relaxed)' }
                ].map((item) => (
                  <button
                    key={item.ms}
                    type="button"
                    disabled={updatingSetting}
                    onClick={() => handleSetInterval(item.ms)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      heroCarouselInterval === item.ms
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Interactive Carousel Simulation Preview */}
      {activeBanners.length > 0 && (
        <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-accent-400/30 overflow-hidden space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${heroCarouselEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-bold uppercase tracking-wider text-accent-300">
                {heroCarouselEnabled
                  ? `Live Simulation: ${heroCarouselType === 'image_box' ? 'Image Box Only Carousel (Default)' : 'Full Hero Banner Carousel'} (${heroCarouselInterval / 1000}s Auto-Slide)`
                  : 'Live Simulation: Single Static Banner (Carousel Disabled)'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300 text-[11px]">
              {heroCarouselEnabled && (
                <span className="hidden sm:inline">
                  {previewPaused ? '⏸️ Paused (Hovering)' : `▶️ Auto-sliding every ${heroCarouselInterval / 1000}s`}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-md bg-white/10 font-mono text-accent-200 border border-white/10">
                Slide {previewIdx + 1} of {activeBanners.length}
              </span>
            </div>
          </div>

          {/* Mode 1 Preview: Image Box Carousel (Split Layout) */}
          {heroCarouselEnabled && heroCarouselType === 'image_box' ? (
            <div
              className="relative rounded-2xl overflow-hidden bg-primary-950/80 p-5 sm:p-8 border border-accent-300/20 group"
              onMouseEnter={() => setPreviewPaused(true)}
              onMouseLeave={() => setPreviewPaused(false)}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left: Stable boutique content */}
                <div className="lg:col-span-7 space-y-3.5 text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-[11px] font-semibold tracking-wider uppercase">
                    <HiOutlineSparkles className="w-3.5 h-3.5" />
                    <span>Chennai's Trendy Fashion House</span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                    Style That Defines You
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 font-light max-w-lg leading-relaxed">
                    Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white font-semibold text-xs shadow-md">
                      <span>Explore Collection</span>
                      <HiOutlineArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-accent-300/40 text-white font-medium text-xs">
                      <span>Visit Boutique</span>
                    </span>
                  </div>
                  {/* Spotlight indicator for current slide */}
                  <div className="pt-1 flex items-center gap-2 text-xs">
                    <span className="text-[11px] text-accent-300 font-medium">Spotlight Look:</span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-white font-semibold truncate max-w-xs">
                      <span className="truncate">{activeBanners[previewIdx]?.title || 'Promotional Collection'}</span>
                      <HiOutlineArrowRight className="w-3 h-3 text-accent-300 shrink-0" />
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      (➔ {activeBanners[previewIdx]?.ctaLink || '/shop'})
                    </span>
                  </div>
                </div>

                {/* Right: The Buttery-Smooth Image Box Carousel */}
                <div className="lg:col-span-5 flex justify-center">
                  <div
                    onClick={() => {
                      const current = activeBanners[previewIdx];
                      if (current?.ctaLink) toast.info(`Redirects to: ${current.ctaLink} (within same site)`, { icon: '🔗' });
                    }}
                    className="relative w-full max-w-md aspect-[16/10] rounded-2xl p-2 bg-gradient-to-tr from-accent-400/40 via-primary-700/60 to-accent-300/40 shadow-xl border border-accent-300/40 overflow-hidden cursor-pointer group/box hover:border-accent-300 transition-all"
                  >
                    {/* Layered images for buttery smooth crossfade/slide/zoom */}
                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-primary-950">
                      {activeBanners.map((banner, idx) => {
                        const isActive = idx === previewIdx;
                        let style = '';
                        if (heroCarouselTransition === 'slide') {
                          style = isActive
                            ? 'opacity-100 translate-x-0 scale-100 z-10'
                            : idx < previewIdx
                            ? 'opacity-0 -translate-x-full scale-95 z-0 pointer-events-none'
                            : 'opacity-0 translate-x-full scale-95 z-0 pointer-events-none';
                        } else if (heroCarouselTransition === 'zoom') {
                          style = isActive
                            ? 'opacity-100 scale-100 z-10'
                            : 'opacity-0 scale-110 z-0 pointer-events-none';
                        } else {
                          // 'fade'
                          style = isActive
                            ? 'opacity-100 scale-100 z-10'
                            : 'opacity-0 scale-104 z-0 pointer-events-none';
                        }

                        return (
                          <div
                            key={banner._id || idx}
                            className={`absolute inset-0 transition-all duration-700 ease-out will-change-transform ${style}`}
                          >
                            <img
                              src={getImageUrl(banner.image, '/fallback-banner.png')}
                              alt={banner.title || 'Banner'}
                              onError={(e) => handleImageError(e, '/fallback-banner.png')}
                              className="w-full h-full object-cover rounded-xl"
                            />
                            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Look Caption Bar */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
                      <div className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 shadow-md truncate max-w-[70%]">
                        {activeBanners[previewIdx]?.title || 'Promotional Collection'}
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                        <span>{activeBanners[previewIdx]?.ctaText || 'Shop'}</span>
                        <HiOutlineArrowRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Prev / Next Buttons */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIdx((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-all active:scale-95 cursor-pointer opacity-90 group-hover/box:opacity-100"
                      title="Previous Slide"
                    >
                      <HiOutlineChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-xs transition-all active:scale-95 cursor-pointer opacity-90 group-hover/box:opacity-100"
                      title="Next Slide"
                    >
                      <HiOutlineChevronRight className="w-4 h-4" />
                    </button>

                    {/* Top right dots */}
                    <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1 bg-black/55 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                      {activeBanners.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewIdx(idx);
                          }}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            previewIdx === idx ? 'w-4 bg-accent-400' : 'w-1.5 bg-white/50 hover:bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Mode 2 Preview: Full Hero Banner Carousel or Single Banner */
            <div
              className="relative rounded-2xl overflow-hidden aspect-[16/7] sm:aspect-[21/8] bg-black/40 group cursor-pointer"
              onMouseEnter={() => setPreviewPaused(true)}
              onMouseLeave={() => setPreviewPaused(false)}
              onClick={() => {
                const current = activeBanners[previewIdx];
                if (current?.ctaLink) toast.info(`Redirects to: ${current.ctaLink} (within same site)`, { icon: '🔗' });
              }}
            >
              {/* Stacked Images for Buttery-Smooth Crossfade */}
              {activeBanners.map((banner, idx) => {
                const isActive = idx === previewIdx;
                let style = '';
                if (heroCarouselTransition === 'slide') {
                  style = isActive
                    ? 'opacity-100 translate-x-0 scale-100 z-10'
                    : idx < previewIdx
                    ? 'opacity-0 -translate-x-full scale-95 z-0 pointer-events-none'
                    : 'opacity-0 translate-x-full scale-95 z-0 pointer-events-none';
                } else if (heroCarouselTransition === 'zoom') {
                  style = isActive
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-110 z-0 pointer-events-none';
                } else {
                  // 'fade'
                  style = isActive
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-104 z-0 pointer-events-none';
                }

                return (
                  <div
                    key={banner._id || idx}
                    className={`absolute inset-0 transition-all duration-700 ease-out will-change-transform ${style}`}
                  >
                    <img
                      src={getImageUrl(banner.image, '/fallback-banner.png')}
                      alt={banner.title || 'Banner'}
                      onError={(e) => handleImageError(e, '/fallback-banner.png')}
                      className="w-full h-full object-cover filter brightness-90 group-hover:scale-102 transition-transform duration-700 ease-out"
                    />
                  </div>
                );
              })}

              {/* Gradient Overlay & Content */}
              <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/85 via-black/40 to-transparent flex flex-col justify-end sm:justify-center p-6 sm:p-12 text-white z-20">
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

              {/* Prev/Next arrows if enabled */}
              {heroCarouselEnabled && activeBanners.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIdx((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                    title="Previous Slide"
                  >
                    <HiOutlineChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-xs transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                    title="Next Slide"
                  >
                    <HiOutlineChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
                    {activeBanners.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewIdx(idx);
                        }}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          previewIdx === idx ? 'w-7 bg-accent-400' : 'w-2 bg-white/50 hover:bg-white'
                        }`}
                        title={`Jump to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-[11px] text-neutral-400 text-center">
            💡 Real-time simulation reflects your chosen mode ({heroCarouselType === 'image_box' ? 'Image Box Only' : heroCarouselEnabled ? 'Full Hero Banner' : 'Single Static'}), {heroCarouselInterval / 1000}s timing, and {heroCarouselTransition} transition. Hover pauses the timer.
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      Hero Banner Image <span className="text-red-500">*</span>
                    </label>
                    {imagePreview && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <HiOutlineCheck className="w-3.5 h-3.5" />
                        Image Attached
                      </span>
                    )}
                  </div>

                  {/* Hidden File Input for triggering via click */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {/* When imagePreview exists: SHOW ONLY the image and the Delete/Replace buttons, NO file chooser */}
                  {imagePreview ? (
                    <div className="space-y-3 animate-fade-in">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-accent-200 aspect-[16/8] bg-neutral-900 group shadow-sm">
                        <img
                          src={getImageUrl(imagePreview, '/fallback-banner.png')}
                          alt="Banner Preview"
                          onError={(e) => handleImageError(e, '/fallback-banner.png')}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                        />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-xs text-white border border-white/20 shadow-sm flex items-center gap-1">
                            <HiOutlinePhotograph className="w-3.5 h-3.5 text-accent-300" />
                            {imageFile ? 'New Selected Photo' : 'Current Active Visual'}
                          </span>
                        </div>

                        {/* Bottom Overlay Action Bar with Delete Button */}
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex items-center justify-between gap-2 z-10">
                          <span className="text-[11px] text-white/90 font-medium truncate hidden sm:inline">
                            {imageFile ? imageFile.name : (editingBanner?.title || 'Promotional Banner')}
                          </span>

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-neutral-900 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 border border-neutral-200"
                              title="Replace with another image"
                            >
                              <HiOutlinePhotograph className="w-3.5 h-3.5 text-primary" />
                              <span>Replace</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleDeleteImage}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
                              title="Delete this banner image"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                              <span>Delete Image</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* When there is NO image or when its deleted: SHOW the Choose Image / Upload Dropzone */
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-accent-300 hover:border-primary rounded-2xl p-6 sm:p-8 bg-neutral-50/70 hover:bg-cream/60 transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer group shadow-2xs animate-fade-in"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-accent-100/70 group-hover:bg-primary/10 text-primary flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                        <HiOutlinePhotograph className="w-7 h-7 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-bold text-neutral-800 group-hover:text-primary transition-colors">
                          Click to Choose or Upload Banner Image
                        </p>
                        <p className="text-[11px] text-neutral-500 font-medium">
                          Supports JPG, PNG, WEBP (Landscape recommended)
                        </p>
                        <p className="text-[10px] text-accent-800 font-semibold pt-0.5">
                          Recommended ratio: 16:9 or 21:9 (e.g. 1920×800 or 1600×900) for edge-to-edge desktop & mobile banner
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <HiOutlinePhotograph className="w-4 h-4" />
                        <span>Choose Image</span>
                      </button>
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
                <div className="pt-4 flex items-center justify-between gap-3 border-t border-neutral-100">
                  {editingBanner ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleDelete(editingBanner._id, editingBanner.title);
                        setModalOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all cursor-pointer"
                      title="Delete this entire banner slide from carousel"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                      <span>Delete Slide</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-3">
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
