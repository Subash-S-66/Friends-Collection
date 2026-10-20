import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePhotograph,
  HiOutlineX,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiChevronLeft,
  HiChevronRight,
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
  HiOutlineArrowRight,
  HiOutlineLocationMarker
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

const defaultHeroBanner = {
  title: 'Style That Defines You',
  subtitle:
    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.',
  image: '/fallback-banner.jpg',
  ctaText: 'Explore Collection',
  ctaLink: '/shop'
};

// 1:1 Exact Storefront Hero Section Replica copied from Home.jsx
const HeroExactPreview = ({
  activeBanners = [],
  activeBannerIdx = 0,
  setActiveBannerIdx = () => {},
  carouselType = 'image_box', // 'image_box' (Small Carousel) or 'full' (Big Carousel)
  isCarouselEnabled = true,
  carouselTransition = 'fade',
  isHovered = false,
  setIsHovered = () => {},
  storeSettings = {},
  onPrevBanner = () => {},
  onNextBanner = () => {},
  onBannerClick = () => {}
}) => {
  const bannersList = activeBanners && activeBanners.length > 0 ? activeBanners : [defaultHeroBanner];
  const safeIdx = activeBannerIdx < bannersList.length ? activeBannerIdx : 0;
  const currentBanner = (isCarouselEnabled ? bannersList[safeIdx] : bannersList[0]) || bannersList[0] || defaultHeroBanner;

  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white min-h-[460px] sm:min-h-[520px] flex items-center group select-none rounded-3xl shadow-2xl border border-white/10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle royal pattern/accents overlay */}
      <div
        className="absolute inset-0 opacity-10 [background-size:24px_24px] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(var(--color-accent, #C88A65) 1px, transparent 1px)' }}
      />

      {/* Ambient Royal Showroom Background (Silky Layered Crossfade with zero flicker) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {bannersList.map((b, idx) => (
          <img
            key={b._id || idx}
            src={getImageUrl(b?.image, '/fallback-banner.jpg')}
            alt=""
            aria-hidden="true"
            onError={(e) => handleImageError(e, '/fallback-banner.jpg')}
            className={`absolute inset-0 w-full h-full object-cover filter blur-xs transition-opacity duration-1000 ease-in-out ${
              idx === safeIdx ? 'opacity-25' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/90 to-primary-900/60" />
      </div>

      {/* Global Slide Arrows (Only shown in 'full' carousel mode when >1 slides) */}
      {isCarouselEnabled && carouselType === 'full' && bannersList.length > 1 && (
        <>
          <button
            type="button"
            onClick={onPrevBanner}
            aria-label="Previous Banner Slide"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
            title="Previous Banner Slide"
          >
            <HiChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            type="button"
            onClick={onNextBanner}
            aria-label="Next Banner Slide"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
            title="Next Banner Slide"
          >
            <HiChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column:
              MODE A ('image_box', DEFAULT / SMALL CAROUSEL): Stable boutique introduction & primary CTAs. Text stays calm and elegant.
              MODE B ('full' / BIG CAROUSEL): Fluid editorial crossfade per slide with Framer Motion.
          */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
            {carouselType === 'full' && isCarouselEnabled ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={safeIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                  className="space-y-5 sm:space-y-6"
                >
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-xs font-semibold tracking-wider uppercase">
                      <HiOutlineSparkles className="w-4 h-4" />
                      <span>{storeSettings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                    </div>
                  </div>

                  <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                    {currentBanner?.title || storeSettings.heroTitle || 'Style That Defines You'}
                  </h1>

                  <p className="text-sm sm:text-lg text-neutral-300 font-light max-w-xl leading-relaxed">
                    {currentBanner?.subtitle ||
                      storeSettings.heroDescription ||
                      'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => onBannerClick(currentBanner)}
                      className="inline-flex items-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                      title={`Redirects to ${currentBanner?.ctaLink || '/shop'}`}
                    >
                      <span>{currentBanner?.ctaText || 'Explore Collection'}</span>
                      <HiOutlineArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBannerClick({ ctaLink: '/contact' })}
                      className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <HiOutlineLocationMarker className="w-4 h-4 text-accent-300 shrink-0" />
                      <span>{storeSettings.storeVisitText || 'Visit Store'}</span>
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              /* DEFAULT MODE: Image Box Carousel - Stable, Premium Boutique Presentation */
              <div className="space-y-5 sm:space-y-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-xs font-semibold tracking-wider uppercase">
                    <HiOutlineSparkles className="w-4 h-4" />
                    <span>{storeSettings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                  </div>
                </div>

                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                  {storeSettings.heroTitle || 'Style That Defines You'}
                </h1>

                <p className="text-sm sm:text-lg text-neutral-300 font-light max-w-xl leading-relaxed">
                  {storeSettings.heroDescription ||
                    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => onBannerClick(currentBanner)}
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    title="Explore boutique collection"
                  >
                    <span>Explore Collections</span>
                    <HiOutlineArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onBannerClick({ ctaLink: '/contact' })}
                    className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <HiOutlineLocationMarker className="w-4 h-4 text-accent-300 shrink-0" />
                    <span>{storeSettings.storeVisitText || 'Visit Store'}</span>
                  </button>
                </div>

                {/* Spotlight Indicator Chip for the currently active rotating image box */}
                {isCarouselEnabled && bannersList.length > 1 && (
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-[11px] text-accent-300 font-medium">Spotlight Look:</span>
                    <button
                      type="button"
                      onClick={() => onBannerClick(currentBanner)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white font-semibold transition-all cursor-pointer shadow-xs truncate max-w-xs sm:max-w-md group/look"
                    >
                      <span className="truncate">{currentBanner?.title || 'Promotional Collection'}</span>
                      <HiOutlineArrowRight className="w-3.5 h-3.5 text-accent-300 group-hover/look:translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Slide Navigation Dots (Below left content in 'full' mode) */}
            {isCarouselEnabled && carouselType === 'full' && bannersList.length > 1 && (
              <div className="flex items-center gap-2 pt-2">
                {bannersList.map((b, idx) => (
                  <button
                    key={b._id || idx}
                    type="button"
                    onClick={() => setActiveBannerIdx(idx)}
                    aria-label={`Show slide ${idx + 1}`}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      safeIdx === idx
                        ? 'w-9 bg-accent-400 shadow-md ring-2 ring-accent-300/40'
                        : 'w-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Slide ${idx + 1}: ${b.title || 'Promotional Banner'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column:
              THE BUTTERY-SMOOTH IMAGE BOX CAROUSEL
              Layered stacked visuals with GPU acceleration, zero unmounting flicker, and smooth crossfades!
          */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              onClick={() => onBannerClick(currentBanner)}
              title={`Click to view: ${currentBanner?.title || 'Collection'} (Redirects within store)`}
              className="relative w-full max-w-lg aspect-[16/10] rounded-3xl p-2.5 sm:p-3 bg-gradient-to-tr from-accent-400/40 via-primary-700/60 to-accent-300/40 shadow-2xl backdrop-blur-sm border border-accent-300/40 overflow-hidden flex items-center justify-center group/card hover:border-accent-300/80 transition-all duration-500 cursor-pointer transform hover:-translate-y-1"
            >
              {/* The Layered Image Container */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-primary-950">
                {bannersList.map((banner, idx) => {
                  const isActive = idx === safeIdx;
                  let transitionStyle = '';
                  if (carouselTransition === 'slide') {
                    transitionStyle = isActive
                      ? 'opacity-100 translate-x-0 scale-100 z-10'
                      : idx < safeIdx
                      ? 'opacity-0 -translate-x-full scale-95 z-0 pointer-events-none'
                      : 'opacity-0 translate-x-full scale-95 z-0 pointer-events-none';
                  } else if (carouselTransition === 'zoom') {
                    transitionStyle = isActive
                      ? 'opacity-100 scale-100 z-10'
                      : 'opacity-0 scale-110 z-0 pointer-events-none';
                  } else {
                    // 'fade' (Luxury Crossfade - Default)
                    transitionStyle = isActive
                      ? 'opacity-100 scale-100 z-10'
                      : 'opacity-0 scale-104 z-0 pointer-events-none';
                  }

                  return (
                    <div
                      key={banner._id || idx}
                      className={`absolute inset-0 transition-all duration-700 ease-out will-change-transform ${transitionStyle}`}
                    >
                      <img
                        src={getImageUrl(banner?.image, '/fallback-banner.jpg')}
                        alt={banner?.title || 'Friends Collections'}
                        onError={(e) => handleImageError(e, '/fallback-banner.jpg')}
                        fetchPriority={idx === 0 ? 'high' : 'auto'}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-cover rounded-2xl shadow-inner group-hover/card:scale-103 transition-transform duration-700 ease-out"
                      />
                      {/* Subtle luxury inner glow */}
                      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20 pointer-events-none" />
                    </div>
                  );
                })}
              </div>

              {/* Floating Bottom Look Caption Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
                <div className="px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 shadow-lg truncate max-w-[68%]">
                  {currentBanner?.title || 'Boutique Collection'}
                </div>
                <div className="px-3 py-1.5 rounded-full bg-accent hover:bg-accent-light text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg border border-accent-300/40 pointer-events-auto transition-transform active:scale-95">
                  <span>{currentBanner?.ctaText || 'Shop'}</span>
                  <HiOutlineArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Direct Image Box Carousel Controls (Previous, Next, and Dots on the box) */}
              {isCarouselEnabled && bannersList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={onPrevBanner}
                    aria-label="Previous Slide"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100"
                    title="Previous Image Slide"
                  >
                    <HiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={onNextBanner}
                    aria-label="Next Slide"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100"
                    title="Next Image Slide"
                  >
                    <HiChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Integrated Dot Indicators on top-right of the Image Box */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
                    {bannersList.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBannerIdx(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          safeIdx === idx ? 'w-5 bg-accent-400' : 'w-1.5 bg-white/50 hover:bg-white'
                        }`}
                        title={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

const BannerManager = () => {
  const { confirm } = useConfirm();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState({});

  // 1. Live Settings (what is currently active in the database)
  const [liveSettings, setLiveSettings] = useState({
    enabled: true,
    type: 'image_box', // 'image_box' (Small Carousel) | 'full' (Big Carousel)
    transition: 'fade', // 'fade' | 'slide' | 'zoom'
    interval: 4000 // 3000 | 4000 | 6000
  });

  // 2. Draft Settings (what the admin is testing and previewing before saving live)
  const [draftSettings, setDraftSettings] = useState({
    enabled: true,
    type: 'image_box',
    transition: 'fade',
    interval: 4000
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // Check if draft settings differ from live settings
  const hasUnsavedChanges = useMemo(() => {
    return (
      draftSettings.enabled !== liveSettings.enabled ||
      draftSettings.type !== liveSettings.type ||
      draftSettings.transition !== liveSettings.transition ||
      draftSettings.interval !== liveSettings.interval
    );
  }, [draftSettings, liveSettings]);

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
        setStoreSettings(settingsRes.data);
        const enabled = settingsRes.data.heroCarouselEnabled !== undefined ? Boolean(settingsRes.data.heroCarouselEnabled) : true;
        const type = settingsRes.data.heroCarouselType || 'image_box';
        const transition = settingsRes.data.heroCarouselTransition || 'fade';
        const interval = Number(settingsRes.data.heroCarouselInterval) || 4000;

        const loaded = { enabled, type, transition, interval };
        setLiveSettings(loaded);
        setDraftSettings(loaded);
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
        const imgSrc = getImageUrl(b?.image, '/fallback-banner.jpg');
        if (imgSrc) {
          const img = new Image();
          img.src = imgSrc;
        }
      });
    }
  }, [activeBanners]);

  // Auto-rotate with pause on hover for the preview (Driven by DRAFT settings so admin can test changes)
  useEffect(() => {
    if (activeBanners.length <= 1 || previewPaused || !draftSettings.enabled) return;
    previewTimerRef.current = setInterval(() => {
      setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
    }, draftSettings.interval || 4000);
    return () => clearInterval(previewTimerRef.current);
  }, [activeBanners.length, previewPaused, draftSettings.enabled, draftSettings.interval]);

  // Adjust preview index if active banners count changes
  useEffect(() => {
    if (previewIdx >= activeBanners.length && activeBanners.length > 0) {
      setPreviewIdx(0);
    }
  }, [activeBanners.length, previewIdx]);

  // Handle ESC key to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewModalOpen) {
          setPreviewModalOpen(false);
        } else if (modalOpen) {
          closeModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalOpen, modalOpen]);

  // Handlers for Testing / Draft Mode (Does NOT touch live database)
  const handleDraftMode = (mode) => {
    if (mode === 'disabled') {
      setDraftSettings((prev) => ({ ...prev, enabled: false }));
      toast('Testing Single Static Banner mode in preview.', { icon: '🖼️' });
    } else {
      setDraftSettings((prev) => ({ ...prev, enabled: true, type: mode }));
      toast(
        mode === 'image_box'
          ? 'Testing Small Carousel (Image Box Only) in preview.'
          : 'Testing Big Carousel (Full Hero Banner) in preview.',
        { icon: '👁️' }
      );
    }
  };

  const handleDraftTransition = (transition) => {
    setDraftSettings((prev) => ({ ...prev, transition }));
    toast(`Testing transition motion: ${transition}`, { icon: '✨' });
  };

  const handleDraftInterval = (interval) => {
    setDraftSettings((prev) => ({ ...prev, interval }));
    toast(`Testing rotation interval: ${interval / 1000}s`, { icon: '⏱️' });
  };

  const handleDraftMakeDefault = () => {
    setDraftSettings((prev) => ({
      ...prev,
      enabled: true,
      type: 'image_box',
      transition: 'fade'
    }));
    toast.success('Configured Image Box Carousel as default in draft mode. Click "Save & Go Live" to publish.', { icon: '✏️' });
  };

  const handleDiscardChanges = () => {
    setDraftSettings({ ...liveSettings });
    toast.info('Discarded draft testing changes. Reverted to currently live storefront settings.', { icon: '↩️' });
  };

  // Explicit Save & Go Live action (Only then are changes written to database and live storefront)
  const handleSaveAndGoLive = async () => {
    if (savingSettings) return;
    setSavingSettings(true);
    clearHomeClientCache();

    try {
      await Promise.all([
        API.put('/settings/admin/heroCarouselEnabled', { value: draftSettings.enabled }),
        API.put('/settings/admin/heroCarouselType', { value: draftSettings.type }),
        API.put('/settings/admin/heroCarouselTransition', { value: draftSettings.transition }),
        API.put('/settings/admin/heroCarouselInterval', { value: draftSettings.interval })
      ]);

      setLiveSettings({ ...draftSettings });
      toast.success(
        `🎉 Carousel changes are now LIVE on the storefront! (${
          draftSettings.type === 'image_box'
            ? 'Small Carousel (Image Box Only)'
            : draftSettings.enabled
            ? 'Big Carousel (Full Hero)'
            : 'Single Static Banner'
        })`,
        { icon: '🚀', duration: 4500 }
      );
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to publish settings to live storefront');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePrevPreviewSlide = (e) => {
    e?.stopPropagation();
    if (activeBanners.length <= 1) return;
    setPreviewIdx((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNextPreviewSlide = (e) => {
    e?.stopPropagation();
    if (activeBanners.length <= 1) return;
    setPreviewIdx((prev) => (prev + 1) % activeBanners.length);
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
      const isCloudErr =
        err.response?.data?.isStorageError ||
        err.response?.status === 503 ||
        err.response?.data?.code === 'CLOUDINARY_UNREACHABLE';
      const msg = isCloudErr
        ? (err.response?.data?.message || 'Cloud storage (Cloudinary) is currently unreachable. Please try again later.')
        : (err.response?.data?.message || 'Failed to save banner');
      toast.error(msg, { duration: 5000 });
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
      {/* Header & Main Actions */}
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
            Configure dual-mode carousels (Small Image-Box-Only or Big Full Hero), silky transitions, and test them live in draft mode before publishing to your customers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Pop-up Preview Button */}
          <button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border-2 border-accent-300 hover:border-accent-400 font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            title="Open full interactive pop-up preview to test carousel behavior"
          >
            <HiOutlineEye className="w-4 h-4 text-accent-700" />
            <span>Preview Storefront Hero (Pop-up)</span>
          </button>

          {/* Add Banner Button (Max 5 Limit) */}
          <button
            onClick={openAddModal}
            disabled={banners.length >= MAX_BANNERS}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-semibold shadow-md transition-all ${
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

      {/* Testing Mode Save & Go Live Bar (Sticky when changes are made) */}
      {hasUnsavedChanges ? (
        <div className="sticky top-4 z-40 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-amber-300 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <HiOutlineAdjustments className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-wide">
                  Testing Mode Active: You Have Unsaved Carousel Changes
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-amber-900 uppercase">
                  Draft Testing
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                The live storefront is <strong>NOT</strong> updated yet. Test your changes in the preview below or pop-up modal, then click <strong>Save & Go Live</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/25 cursor-pointer active:scale-95"
            >
              Discard Changes
            </button>

            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveAndGoLive}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-900 border-t-transparent rounded-full animate-spin" />
                  <span>Publishing Live...</span>
                </>
              ) : (
                <>
                  <HiOutlineCheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                  <span>Save & Go Live</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Storefront is synced and live with your current settings ({liveSettings.enabled ? (liveSettings.type === 'image_box' ? 'Small Carousel - Image Box Only' : 'Big Carousel - Full Hero') : 'Single Static Banner'}).</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider">Live & Active</span>
        </div>
      )}

      {/* Hero Carousel Mode Studio (2 Carousel Kinds + 1 Static Mode) */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent-700">
              Carousel Style Configuration
            </span>
            <h2 className="font-serif text-lg font-bold text-neutral-900">
              Select Carousel Style (Testing Mode)
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select a style to test in the live preview. Click "Save & Go Live" when ready.
            </p>
          </div>

          {/* Quick Default Button */}
          <button
            type="button"
            onClick={handleDraftMakeDefault}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
              draftSettings.enabled && draftSettings.type === 'image_box' && draftSettings.transition === 'fade'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-cream hover:bg-amber-100 text-primary border-accent-300 hover:border-accent-400 active:scale-95'
            }`}
            title="Configure Image Box Carousel as default in testing draft"
          >
            <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {draftSettings.enabled && draftSettings.type === 'image_box' && draftSettings.transition === 'fade'
                ? 'Image Box Carousel Selected (Default)'
                : 'Set Image Box as Default (Recommended)'}
            </span>
          </button>
        </div>

        {/* 3 Interactive Mode Selection Cards (Modifies Draft) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1: Small Carousel (Image Box Only - Default • Recommended) */}
          <div
            onClick={() => handleDraftMode('image_box')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              draftSettings.enabled && draftSettings.type === 'image_box'
                ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <HiOutlineCheck className="w-3 h-3 text-emerald-700" />
                  Small Carousel • Default
                </span>
                {draftSettings.enabled && draftSettings.type === 'image_box' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-2">
                  <HiOutlinePhotograph className="w-4 h-4 text-accent-700" />
                  <span>Small Carousel (Image Box Only)</span>
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  <strong>Only the promotional image box rotates smoothly.</strong> Store headlines, boutique introduction, and CTA buttons stay calm and stable (modern boutique lookbook style).
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100 mt-4">
              <span className="text-[11px] font-semibold text-neutral-500">
                Smooth Lookbook Box
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                  draftSettings.enabled && draftSettings.type === 'image_box'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white'
                }`}
              >
                {draftSettings.enabled && draftSettings.type === 'image_box' ? 'Active in Preview' : 'Select to Test'}
              </span>
            </div>
          </div>

          {/* Mode 2: Big Carousel (Full Hero Banner Carousel) */}
          <div
            onClick={() => handleDraftMode('full')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              draftSettings.enabled && draftSettings.type === 'full'
                ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-100 text-accent-800 border border-accent-200">
                  <HiOutlineSparkles className="w-3 h-3 text-accent-700" />
                  Big Carousel • Full Slides
                </span>
                {draftSettings.enabled && draftSettings.type === 'full' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900 group-hover:text-primary transition-colors flex items-center gap-2">
                  <HiOutlineSparkles className="w-4 h-4 text-accent-700" />
                  <span>Big Carousel (Full Hero Banner)</span>
                </h3>
                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  <strong>The entire hero banner transitions together.</strong> Headline, subtitle description, CTA button, and visual slide simultaneously as full-width promotional slides.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-neutral-100 mt-4">
              <span className="text-[11px] font-semibold text-neutral-500">
                Synchronized Full Slide
              </span>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                  draftSettings.enabled && draftSettings.type === 'full'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white'
                }`}
              >
                {draftSettings.enabled && draftSettings.type === 'full' ? 'Active in Preview' : 'Select to Test'}
              </span>
            </div>
          </div>

          {/* Mode 3: Single Static Banner */}
          <div
            onClick={() => handleDraftMode('disabled')}
            className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
              !draftSettings.enabled
                ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700 border border-neutral-200">
                  Static Cover
                </span>
                {!draftSettings.enabled && (
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
                  !draftSettings.enabled
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white'
                }`}
              >
                {!draftSettings.enabled ? 'Active in Preview' : 'Select to Test'}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Changing Controls (Transition Animation Style & Auto-Slide Speed) */}
        {draftSettings.enabled && (
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
                    onClick={() => handleDraftTransition(item.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      draftSettings.transition === item.id
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
                    onClick={() => handleDraftInterval(item.ms)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      draftSettings.interval === item.ms
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

      {/* On-Page Exact Storefront Hero Preview (Exact 1:1 Replica Copied from Home.jsx) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900 text-white p-4.5 rounded-2xl border border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Exact Homepage Hero Preview</span>
                <span className="text-[10px] uppercase font-sans font-bold px-2 py-0.5 rounded-full bg-accent text-white">
                  1:1 Exact Match
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Direct copy from homepage. Test switches between Small and Big Carousel below.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Switcher between Small Carousel and Big Carousel */}
            <div className="inline-flex rounded-xl bg-white/10 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => handleDraftMode('image_box')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  draftSettings.enabled && draftSettings.type === 'image_box'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white'
                }`}
                title="Preview Small Carousel (Image Box Only)"
              >
                Small Carousel
              </button>
              <button
                type="button"
                onClick={() => handleDraftMode('full')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  draftSettings.enabled && draftSettings.type === 'full'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-neutral-300 hover:text-white'
                }`}
                title="Preview Big Carousel (Full Hero Banner)"
              >
                Big Carousel
              </button>
            </div>

            {/* Pop-up modal button */}
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all cursor-pointer active:scale-95"
            >
              <HiOutlineEye className="w-4 h-4 text-accent-300" />
              <span>Pop-up View</span>
            </button>
          </div>
        </div>

        {/* The Exact Component Replica from Home.jsx */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-neutral-200">
          <HeroExactPreview
            activeBanners={activeBanners}
            activeBannerIdx={previewIdx}
            setActiveBannerIdx={setPreviewIdx}
            carouselType={draftSettings.type}
            isCarouselEnabled={draftSettings.enabled}
            carouselTransition={draftSettings.transition}
            isHovered={previewPaused}
            setIsHovered={setPreviewPaused}
            storeSettings={storeSettings}
            onPrevBanner={handlePrevPreviewSlide}
            onNextBanner={handleNextPreviewSlide}
            onBannerClick={(b) => {
              toast.info(`Clicked banner destination: ${b?.ctaLink || '/shop'} (Simulated same-site link)`, { icon: '🔗' });
            }}
          />
        </div>

        <p className="text-[11px] text-neutral-500 text-center">
          💡 Interactive Preview: Hover over the hero to pause the {draftSettings.interval / 1000}s timer. Click left/right arrows to change slides.
        </p>
      </div>

      {/* Pop-up Preview Modal */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="bg-neutral-950 rounded-3xl max-w-6xl w-full border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[96vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 bg-neutral-900/90 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <span>Storefront Hero Preview (1:1 Replica)</span>
                    <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-400/30">
                      Exact Homepage Style
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Test live auto-sliding, hover pauses, and switch between Small and Big Carousel in real-time.
                  </p>
                </div>
              </div>

              {/* Quick Carousel Type Switcher Buttons inside the Pop-up Preview */}
              <div className="flex items-center gap-2 bg-neutral-800/80 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleDraftMode('image_box')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    draftSettings.enabled && draftSettings.type === 'image_box'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Small Carousel (Image Box)
                </button>

                <button
                  type="button"
                  onClick={() => handleDraftMode('full')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    draftSettings.enabled && draftSettings.type === 'full'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Big Carousel (Full Hero)
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 cursor-pointer self-end sm:self-auto"
                title="Close Preview"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Exact Hero Component */}
            <div className="overflow-y-auto p-4 sm:p-6 flex-1 bg-neutral-900/40">
              <HeroExactPreview
                activeBanners={activeBanners}
                activeBannerIdx={previewIdx}
                setActiveBannerIdx={setPreviewIdx}
                carouselType={draftSettings.type}
                isCarouselEnabled={draftSettings.enabled}
                carouselTransition={draftSettings.transition}
                isHovered={previewPaused}
                setIsHovered={setPreviewPaused}
                storeSettings={storeSettings}
                onPrevBanner={handlePrevPreviewSlide}
                onNextBanner={handleNextPreviewSlide}
                onBannerClick={(b) => {
                  toast.info(`Redirect test: ${b?.ctaLink || '/shop'} (Simulated same-site navigation)`, { icon: '🔗' });
                }}
              />
            </div>

            {/* Modal Footer Bar with Save & Go Live Button */}
            <div className="px-6 py-4 bg-neutral-900 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-neutral-300 flex-wrap">
                <span className="font-mono text-accent-300 text-[11px]">
                  Mode: {draftSettings.enabled ? (draftSettings.type === 'image_box' ? 'Small Carousel (Image Box Only)' : 'Big Carousel (Full Hero)') : 'Single Static Banner'}
                </span>
                <span>•</span>
                <span className="font-mono text-neutral-400 text-[11px]">
                  {draftSettings.transition} ({draftSettings.interval / 1000}s)
                </span>
                {hasUnsavedChanges ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Draft Changes (Not Live Yet)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Current Live Settings
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  disabled={savingSettings || !hasUnsavedChanges}
                  onClick={handleSaveAndGoLive}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                    hasUnsavedChanges
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer shadow-emerald-900/50'
                      : 'bg-neutral-800 text-neutral-500 border border-white/10 cursor-not-allowed'
                  }`}
                  title={hasUnsavedChanges ? 'Publish your draft changes to the live storefront' : 'No changes to publish'}
                >
                  {savingSettings ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publishing Live...</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <HiOutlineCheckCircle className="w-4 h-4 text-white" />
                      <span>Save & Go Live</span>
                    </>
                  ) : (
                    <>
                      <HiOutlineCheck className="w-4 h-4 text-emerald-400" />
                      <span>Live on Storefront</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
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
                        src={getImageUrl(b.image, '/fallback-banner.jpg')}
                        alt={b.title}
                        onError={(e) => handleImageError(e, '/fallback-banner.jpg')}
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
                          src={getImageUrl(imagePreview, '/fallback-banner.jpg')}
                          alt="Banner Preview"
                          onError={(e) => handleImageError(e, '/fallback-banner.jpg')}
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
                          Exact banner size: <strong className="text-primary font-bold">1920 × 1080 px</strong> (16:9 ratio) or <strong className="text-primary font-bold">1920 × 1200 px</strong> (16:10 ratio) for crisp luxury clarity on all devices.
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
