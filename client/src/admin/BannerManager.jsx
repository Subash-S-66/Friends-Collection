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
  image: '/fallback-banner.png',
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
      className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white min-h-[320px] sm:min-h-[360px] flex items-center group select-none rounded-2xl shadow-xl border border-white/10"
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
            src={getImageUrl(b?.image, '/fallback-banner.png')}
            alt=""
            aria-hidden="true"
            onError={(e) => handleImageError(e, '/fallback-banner.png')}
            className={`absolute inset-0 w-full h-full object-cover filter blur-xs transition-opacity duration-1000 ease-in-out ${
              (carouselType === 'full' && isCarouselEnabled ? idx === safeIdx : idx === 0)
                ? 'opacity-25'
                : 'opacity-0'
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
            className="hidden sm:inline-flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer opacity-0 group-hover:opacity-100"
            title="Previous Banner Slide"
          >
            <HiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={onNextBanner}
            aria-label="Next Banner Slide"
            className="hidden sm:inline-flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer opacity-0 group-hover:opacity-100"
            title="Next Banner Slide"
          >
            <HiChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
          
          {/* Left Column:
              MODE A ('image_box', DEFAULT / SMALL CAROUSEL): Stable boutique introduction & primary CTAs. Text stays calm and elegant.
              MODE B ('full' / BIG CAROUSEL): Fluid editorial crossfade per slide with Framer Motion.
              MODE C ('none' / !isCarouselEnabled): Single static banner displaying Slide #1's content.
          */}
          <div className="lg:col-span-7 space-y-3 sm:space-y-4 text-left">
            {carouselType === 'full' && isCarouselEnabled ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={safeIdx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-[11px] font-semibold tracking-wider uppercase">
                      <HiOutlineSparkles className="w-3.5 h-3.5" />
                      <span>{currentBanner?.badge || storeSettings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                    </div>
                  </div>

                  <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                    {currentBanner?.title || storeSettings.heroTitle || 'Style That Defines You'}
                  </h1>

                  <p className="text-xs sm:text-sm text-neutral-300 font-light max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-3">
                    {currentBanner?.subtitle ||
                      storeSettings.heroDescription ||
                      'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => onBannerClick(currentBanner)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-xs tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                      title={`Redirects to ${currentBanner?.ctaLink || '/shop'}`}
                    >
                      <span>{currentBanner?.ctaText || 'Explore Collection'}</span>
                      <HiOutlineArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBannerClick({ ctaLink: '/contact' })}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    >
                      <HiOutlineLocationMarker className="w-3.5 h-3.5 text-accent-300 shrink-0" />
                      <span>{storeSettings.storeVisitText || 'Visit Store'}</span>
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : !isCarouselEnabled ? (
              /* MODE C: SINGLE STATIC BANNER (NOT CAROUSEL) - Displays primary cover banner (Slide #1) content */
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-[11px] font-semibold tracking-wider uppercase">
                    <HiOutlineSparkles className="w-3.5 h-3.5" />
                    <span>{bannersList[0]?.badge || storeSettings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                  </div>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                  {bannersList[0]?.title || storeSettings.heroTitle || 'Style That Defines You'}
                </h1>

                <p className="text-xs sm:text-sm text-neutral-300 font-light max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {bannersList[0]?.subtitle ||
                    storeSettings.heroDescription ||
                    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onBannerClick(bannersList[0])}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-xs tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    title={`Redirects to ${bannersList[0]?.ctaLink || '/shop'}`}
                  >
                    <span>{bannersList[0]?.ctaText || 'Explore Collection'}</span>
                    <HiOutlineArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onBannerClick({ ctaLink: '/contact' })}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <HiOutlineLocationMarker className="w-3.5 h-3.5 text-accent-300 shrink-0" />
                    <span>{storeSettings.storeVisitText || 'Visit Store'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* MODE A: SMALL CAROUSEL (IMAGE BOX ONLY) - Store headlines, boutique introduction, and CTA buttons stay calm, stable, and elegant! */
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-[11px] font-semibold tracking-wider uppercase">
                    <HiOutlineSparkles className="w-3.5 h-3.5" />
                    <span>{storeSettings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                  </div>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
                  {storeSettings.heroTitle || 'Style That Defines You'}
                </h1>

                <p className="text-xs sm:text-sm text-neutral-300 font-light max-w-lg leading-relaxed line-clamp-2 sm:line-clamp-3">
                  {storeSettings.heroDescription ||
                    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onBannerClick({ ctaLink: storeSettings.heroCtaLink || '/shop' })}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-xs tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                    title={`Redirects to ${storeSettings.heroCtaLink || '/shop'}`}
                  >
                    <span>{storeSettings.heroCtaText || 'Explore Collection'}</span>
                    <HiOutlineArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onBannerClick({ ctaLink: '/contact' })}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <HiOutlineLocationMarker className="w-3.5 h-3.5 text-accent-300 shrink-0" />
                    <span>{storeSettings.storeVisitText || 'Visit Store'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Slide Navigation Dots (Below left content in 'full' mode) */}
            {isCarouselEnabled && carouselType === 'full' && bannersList.length > 1 && (
              <div className="flex items-center gap-2 pt-1">                {bannersList.map((b, idx) => (
                  <button
                    key={b._id || idx}
                    type="button"
                    onClick={() => setActiveBannerIdx(idx)}
                    aria-label={`Show slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      safeIdx === idx
                        ? 'w-7 bg-accent-400 shadow-md ring-2 ring-accent-300/40'
                        : 'w-2 bg-white/40 hover:bg-white/70'
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
              className="relative w-full max-w-sm sm:max-w-md aspect-[16/10] rounded-2xl p-2 bg-gradient-to-tr from-accent-400/40 via-primary-700/60 to-accent-300/40 shadow-xl backdrop-blur-sm border border-accent-300/40 overflow-hidden flex items-center justify-center group/card hover:border-accent-300/80 transition-all duration-500 cursor-pointer transform hover:-translate-y-0.5"
            >
              {/* The Layered Image Container */}
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-primary-950">
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
                        src={getImageUrl(banner?.image, '/fallback-banner.png')}
                        alt={banner?.title || 'Friends Collections'}
                        onError={(e) => handleImageError(e, '/fallback-banner.png')}
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

              {/* Direct Image Box Carousel Controls (Previous, Next, and Dots on the box) */}
              {isCarouselEnabled && bannersList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={onPrevBanner}
                    aria-label="Previous Slide"
                    className="hidden sm:inline-flex absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer opacity-0 group-hover/card:opacity-100"
                    title="Previous Image Slide"
                  >
                    <HiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={onNextBanner}
                    aria-label="Next Slide"
                    className="hidden sm:inline-flex absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer opacity-0 group-hover/card:opacity-100"
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

  // Pop-up modal state for Homepage Hero Headline & Copy (and single static cover image)
  const [heroModalOpen, setHeroModalOpen] = useState(false);
  const [savingHeroSection, setSavingHeroSection] = useState(false);
  const [modalHeroBadge, setModalHeroBadge] = useState('');
  const [modalHeroTitle, setModalHeroTitle] = useState('');
  const [modalHeroDescription, setModalHeroDescription] = useState('');
  const [modalHeroCtaText, setModalHeroCtaText] = useState('Explore Collection');
  const [modalHeroCtaLink, setModalHeroCtaLink] = useState('/shop');
  const [modalStoreVisitText, setModalStoreVisitText] = useState('Visit Store');

  // Single static banner cover image in the modal
  const [staticCoverFile, setStaticCoverFile] = useState(null);
  const [staticCoverPreview, setStaticCoverPreview] = useState('');
  const staticFileInputRef = useRef(null);

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
        const imgSrc = getImageUrl(b?.image, '/fallback-banner.png');
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
        } else if (heroModalOpen) {
          setHeroModalOpen(false);
        } else if (modalOpen) {
          setModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalOpen, heroModalOpen, modalOpen]);

  // Open Pop-up Modal for Homepage Hero Headline & Copy (and single static banner image)
  const openHeroContentModal = () => {
    setModalHeroBadge(storeSettings.heroBadge || "Chennai's Trendy Fashion House");
    setModalHeroTitle(storeSettings.heroTitle || 'Style That Defines You');
    setModalHeroDescription(
      storeSettings.heroDescription ||
        'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'
    );
    setModalHeroCtaText(storeSettings.heroCtaText || 'Explore Collection');
    setModalHeroCtaLink(storeSettings.heroCtaLink || '/shop');
    setModalStoreVisitText(storeSettings.storeVisitText || 'Visit Store');

    // If single static mode, populate current cover image from slide #1
    if (!draftSettings.enabled) {
      setStaticCoverFile(null);
      setStaticCoverPreview(banners[0]?.image || '');
      if (staticFileInputRef.current) staticFileInputRef.current.value = '';
    }

    setHeroModalOpen(true);
  };

  const handleDeleteStaticCover = () => {
    setStaticCoverFile(null);
    setStaticCoverPreview('');
    if (staticFileInputRef.current) {
      staticFileInputRef.current.value = '';
    }
    toast.success('Cover image removed. You can now choose or upload a new image.', { icon: '🗑️' });
  };

  const handleSaveHeroContent = async (e) => {
    e.preventDefault();
    if (savingHeroSection) return;

    if (!modalHeroTitle.trim()) {
      toast.error('Please enter a headline title');
      return;
    }

    // In Single Static Banner mode: cover image is strictly required!
    if (!draftSettings.enabled && !staticCoverPreview && !staticCoverFile) {
      toast.error('A cover banner image is required. Please upload an image before saving.');
      return;
    }

    setSavingHeroSection(true);
    clearHomeClientCache();

    try {
      // 1. Save Hero section settings to DB
      await API.put('/settings/admin/heroSection', {
        value: {
          heroBadge: modalHeroBadge.trim(),
          heroTitle: modalHeroTitle.trim(),
          heroDescription: modalHeroDescription.trim(),
          heroCtaText: modalHeroCtaText.trim(),
          heroCtaLink: modalHeroCtaLink.trim(),
          storeVisitText: modalStoreVisitText.trim(),
        }
      });

      // 2. If Single Static Banner mode, also update/save Slide #1
      if (!draftSettings.enabled) {
        const formData = new FormData();
        formData.append('title', modalHeroTitle.trim());
        formData.append('subtitle', modalHeroDescription.trim());
        formData.append('ctaText', modalHeroCtaText.trim());
        formData.append('ctaLink', modalHeroCtaLink.trim());
        formData.append('priority', '1');
        formData.append('isActive', 'true');
        if (staticCoverFile) {
          formData.append('image', staticCoverFile);
        }

        if (banners.length > 0 && banners[0]?._id) {
          await API.put(`/banners/admin/${banners[0]._id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await API.post('/banners/admin', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
      }

      setStoreSettings((prev) => ({
        ...prev,
        heroBadge: modalHeroBadge.trim(),
        heroTitle: modalHeroTitle.trim(),
        heroDescription: modalHeroDescription.trim(),
        heroCtaText: modalHeroCtaText.trim(),
        heroCtaLink: modalHeroCtaLink.trim(),
        storeVisitText: modalStoreVisitText.trim(),
      }));

      setHeroModalOpen(false);
      await fetchBannersAndSettings(true);
      toast.success(
        !draftSettings.enabled
          ? '🎉 Single Static Cover Banner & Content updated live!'
          : '🎉 Homepage Hero Headline & Copy updated live!',
        { icon: '🚀', duration: 4000 }
      );
    } catch (err) {
      console.error('Failed to save hero content:', err);
      toast.error('Failed to save homepage content');
    } finally {
      setSavingHeroSection(false);
    }
  };

  // Save carousel settings directly to DB and activate live on storefront
  const updateCarouselSettings = async (nextSettings) => {
    setSavingSettings(true);
    setDraftSettings(nextSettings);
    setLiveSettings(nextSettings);
    clearHomeClientCache();

    try {
      await Promise.all([
        API.put('/settings/admin/heroCarouselEnabled', { value: nextSettings.enabled }),
        API.put('/settings/admin/heroCarouselType', { value: nextSettings.type }),
        API.put('/settings/admin/heroCarouselTransition', { value: nextSettings.transition }),
        API.put('/settings/admin/heroCarouselInterval', { value: nextSettings.interval })
      ]);
      toast.success(
        `🎉 Carousel updated: ${
          !nextSettings.enabled
            ? 'Single Static Banner'
            : nextSettings.type === 'image_box'
            ? 'Small Carousel (Image Box Only)'
            : 'Big Carousel (Full Hero)'
        }!`,
        { icon: '🚀', duration: 3000 }
      );
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to update carousel settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDraftMode = (mode) => {
    const nextSettings =
      mode === 'disabled'
        ? { ...draftSettings, enabled: false }
        : { ...draftSettings, enabled: true, type: mode };
    setDraftSettings(nextSettings);
  };

  const handleDraftTransition = (transition) => {
    setDraftSettings((prev) => ({ ...prev, transition }));
  };

  const handleDraftInterval = (interval) => {
    setDraftSettings((prev) => ({ ...prev, interval }));
  };

  const handleDraftMakeDefault = () => {
    setDraftSettings({
      ...draftSettings,
      enabled: true,
      type: 'image_box',
      transition: 'fade'
    });
  };

  const hasUnsavedChanges =
    Boolean(draftSettings.enabled) !== Boolean(liveSettings.enabled) ||
    draftSettings.type !== liveSettings.type ||
    draftSettings.transition !== liveSettings.transition ||
    Number(draftSettings.interval) !== Number(liveSettings.interval);

  const handleDiscardChanges = () => {
    setDraftSettings({ ...liveSettings });
    toast.info('Draft changes discarded. Reset to current live settings.');
  };

  const handleSaveAndGoLive = async () => {
    await updateCarouselSettings(draftSettings);
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
    setTitle(draftSettings.type === 'image_box' ? `Lookbook Slide ${banners.length + 1}` : '');
    setSubtitle(draftSettings.type === 'image_box' ? (storeSettings.heroDescription || '') : '');
    setCtaText(draftSettings.type === 'image_box' ? (storeSettings.heroCtaText || 'Explore Collection') : 'Shop Collection');
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
    setTitle(b.title || (draftSettings.type === 'image_box' ? `Lookbook Slide ${b.priority || '1'}` : ''));
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
      toast.error('A banner image is required. Please choose or upload an image before saving.');
      return;
    }

    setSaving(true);
    try {
      const finalTitle = draftSettings.type === 'image_box'
        ? (title.trim() || `Lookbook Slide ${priority}`)
        : title.trim();
      const finalSubtitle = draftSettings.type === 'image_box'
        ? (subtitle.trim() || storeSettings.heroDescription || '')
        : subtitle.trim();
      const finalCtaText = draftSettings.type === 'image_box'
        ? (ctaText.trim() || storeSettings.heroCtaText || 'Explore Collection')
        : ctaText.trim();

      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('subtitle', finalSubtitle);
      formData.append('ctaText', finalCtaText);
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
          ? `Save changes to "${finalTitle || 'this slide'}"?`
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
            className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border-2 border-accent-300 hover:border-accent-400 font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            title="Open full interactive pop-up preview to test carousel behavior"
          >
            <HiOutlineEye className="w-4 h-4 text-accent-700" />
            <span>Preview Storefront Hero (Pop-up)</span>
          </button>

          {/* Edit Hero Copy Pop-up Button (for Small Carousel or Single Static Banner) */}
          {(draftSettings.type === 'image_box' || !draftSettings.enabled) && (
            <button
              type="button"
              onClick={openHeroContentModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-300 hover:border-amber-400 font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
              title="Edit headline title, boutique description, and buttons in a pop-up"
            >
              <HiOutlinePencil className="w-4 h-4 text-amber-800" />
              <span>
                {!draftSettings.enabled ? 'Edit Static Cover & Copy' : 'Edit Hero Headline & Copy'}
              </span>
            </button>
          )}

          {/* Add Banner Button (Only shown in carousel modes; single static cover is edited via pop-up) */}
          {draftSettings.enabled && (
            <button
              onClick={openAddModal}
              disabled={banners.length >= MAX_BANNERS}
              className={`inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-xs font-semibold shadow-md transition-all ${
                banners.length >= MAX_BANNERS
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary-light text-white active:scale-95 cursor-pointer'
              }`}
              title={banners.length >= MAX_BANNERS ? 'Maximum 5 banners reached' : 'Add another slide to carousel'}
            >
              <HiOutlinePlus className="w-4 h-4" />
              <span>
                {banners.length >= MAX_BANNERS
                  ? 'Max 5 Slides Reached'
                  : draftSettings.type === 'image_box'
                  ? 'Add Lookbook Photo'
                  : 'Add Full Banner Slide'}
              </span>
            </button>
          )}
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
                The live storefront is <strong>NOT</strong> updated yet. Click <strong>Preview Pop-up</strong> to test your changes in the 95% full-screen modal, then click <strong>Save & Go Live</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30 cursor-pointer active:scale-95"
              title="Open 95% full-screen preview"
            >
              <HiOutlineEye className="w-4 h-4 text-white" />
              <span>Preview Pop-up</span>
            </button>

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
              Select Carousel Style
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Click a style to activate it live on your storefront. You can also preview it at 95% scale.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pop-up Preview Button */}
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 border-2 border-accent-300 hover:border-accent-400 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Open interactive storefront carousel preview"
            >
              <HiOutlineEye className="w-4 h-4 text-accent-700" />
              <span>Preview Carousel</span>
            </button>

            {/* Quick Default Button */}
            <button
              type="button"
              onClick={handleDraftMakeDefault}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
                draftSettings.enabled && draftSettings.type === 'image_box' && draftSettings.transition === 'fade'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-cream hover:bg-amber-100 text-primary border-accent-300 hover:border-accent-400 active:scale-95'
              }`}
              title="Configure Image Box Carousel as default and activate live"
            >
              <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {draftSettings.enabled && draftSettings.type === 'image_box' && draftSettings.transition === 'fade'
                  ? 'Image Box Active (Default)'
                  : 'Set Image Box as Default'}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Interactive Mode Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode 1: Small Carousel (Image Box Only - Default • Recommended) */}
          {(() => {
            const isDraft = draftSettings.enabled && draftSettings.type === 'image_box';
            const isLive = liveSettings.enabled && liveSettings.type === 'image_box';

            return (
              <div
                onClick={() => handleDraftMode('image_box')}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                  isDraft && !isLive
                    ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-400/30'
                    : isDraft && isLive
                    ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                    : isLive
                    ? 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-400'
                    : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDraft && !isLive
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isLive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {isDraft && !isLive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          Selected (Draft)
                        </>
                      ) : isLive ? (
                        <>
                          <HiOutlineCheck className="w-3 h-3 text-emerald-700" />
                          Live on Storefront
                        </>
                      ) : (
                        'Small Carousel • Default'
                      )}
                    </span>
                    {isLive && !isDraft && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Currently Live
                      </span>
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

                {/* Card Action Area */}
                <div className="pt-4 flex flex-col gap-2.5 border-t border-neutral-100 mt-4">
                  {isDraft && !isLive ? (
                    /* Selected in Draft: Show Preview button & Go Live button */
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModalOpen(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Open 95% full-screen preview"
                        >
                          <HiOutlineEye className="w-4 h-4 text-accent-700" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          disabled={savingSettings}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveAndGoLive();
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-900/20 active:scale-95 disabled:opacity-60"
                          title="Publish this style live to your storefront"
                        >
                          {savingSettings ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <HiOutlineCheckCircle className="w-4 h-4 text-white" />
                          )}
                          <span>{savingSettings ? 'Publishing...' : 'Go Live'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openHeroContentModal();
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5 text-amber-800" />
                        <span>Edit Hero Headline & Copy</span>
                      </button>
                    </div>
                  ) : isDraft && isLive ? (
                    /* Currently Live and Selected */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                          Active & Live
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Preview live carousel"
                        >
                          <HiOutlineEye className="w-3.5 h-3.5 text-accent-700" />
                          <span>Preview</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openHeroContentModal();
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-amber-100 text-neutral-800 hover:text-amber-950 text-xs font-semibold border border-neutral-200 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5 text-neutral-600" />
                        <span>Edit Hero Headline & Copy</span>
                      </button>
                    </div>
                  ) : (
                    /* Not Selected */
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {isLive ? 'Currently Live' : 'Smooth Lookbook Box'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDraftMode('image_box')}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white transition-colors cursor-pointer"
                      >
                        Select Style
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Mode 2: Big Carousel (Full Hero Banner Carousel) */}
          {(() => {
            const isDraft = draftSettings.enabled && draftSettings.type === 'full';
            const isLive = liveSettings.enabled && liveSettings.type === 'full';

            return (
              <div
                onClick={() => handleDraftMode('full')}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                  isDraft && !isLive
                    ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-400/30'
                    : isDraft && isLive
                    ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                    : isLive
                    ? 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-400'
                    : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDraft && !isLive
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isLive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-accent-100 text-accent-800 border border-accent-200'
                      }`}
                    >
                      {isDraft && !isLive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          Selected (Draft)
                        </>
                      ) : isLive ? (
                        <>
                          <HiOutlineCheck className="w-3 h-3 text-emerald-700" />
                          Live on Storefront
                        </>
                      ) : (
                        <>
                          <HiOutlineSparkles className="w-3 h-3 text-accent-700" />
                          Big Carousel • Full Slides
                        </>
                      )}
                    </span>
                    {isLive && !isDraft && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Currently Live
                      </span>
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

                {/* Card Action Area */}
                <div className="pt-4 flex flex-col gap-2.5 border-t border-neutral-100 mt-4">
                  {isDraft && !isLive ? (
                    /* Selected in Draft: Show Preview button & Go Live button */
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalOpen(true);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Open 95% full-screen preview"
                      >
                        <HiOutlineEye className="w-4 h-4 text-accent-700" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        disabled={savingSettings}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveAndGoLive();
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-900/20 active:scale-95 disabled:opacity-60"
                        title="Publish this style live to your storefront"
                      >
                        {savingSettings ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <HiOutlineCheckCircle className="w-4 h-4 text-white" />
                        )}
                        <span>{savingSettings ? 'Publishing...' : 'Go Live'}</span>
                      </button>
                    </div>
                  ) : isDraft && isLive ? (
                    /* Currently Live and Selected */
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                        Active & Live
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Preview live carousel"
                      >
                        <HiOutlineEye className="w-3.5 h-3.5 text-accent-700" />
                        <span>Preview</span>
                      </button>
                    </div>
                  ) : (
                    /* Not Selected */
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {isLive ? 'Currently Live' : 'Synchronized Full Slide'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDraftMode('full')}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white transition-colors cursor-pointer"
                      >
                        Select Style
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Mode 3: Single Static Banner */}
          {(() => {
            const isDraft = !draftSettings.enabled;
            const isLive = !liveSettings.enabled;

            return (
              <div
                onClick={() => handleDraftMode('disabled')}
                className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between group ${
                  isDraft && !isLive
                    ? 'border-amber-500 bg-amber-50/40 shadow-md ring-2 ring-amber-400/30'
                    : isDraft && isLive
                    ? 'border-primary bg-primary-950/5 shadow-md ring-2 ring-primary/20'
                    : isLive
                    ? 'border-emerald-300 bg-emerald-50/20 hover:border-emerald-400'
                    : 'border-neutral-200 hover:border-accent-300 bg-white hover:bg-cream-light/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDraft && !isLive
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isLive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                      }`}
                    >
                      {isDraft && !isLive ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          Selected (Draft)
                        </>
                      ) : isLive ? (
                        <>
                          <HiOutlineCheck className="w-3 h-3 text-emerald-700" />
                          Live on Storefront
                        </>
                      ) : (
                        'Static Cover • 1 Visual'
                      )}
                    </span>
                    {isLive && !isDraft && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        Currently Live
                      </span>
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

                {/* Card Action Area */}
                <div className="pt-4 flex flex-col gap-2.5 border-t border-neutral-100 mt-4">
                  {isDraft && !isLive ? (
                    /* Selected in Draft: Show Preview button & Go Live button */
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModalOpen(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Open 95% full-screen preview"
                        >
                          <HiOutlineEye className="w-4 h-4 text-accent-700" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          disabled={savingSettings}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveAndGoLive();
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-900/20 active:scale-95 disabled:opacity-60"
                          title="Publish this style live to your storefront"
                        >
                          {savingSettings ? (
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <HiOutlineCheckCircle className="w-4 h-4 text-white" />
                          )}
                          <span>{savingSettings ? 'Publishing...' : 'Go Live'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openHeroContentModal();
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5 text-amber-800" />
                        <span>Edit Cover Banner & Content</span>
                      </button>
                    </div>
                  ) : isDraft && isLive ? (
                    /* Currently Live and Selected */
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />
                          Active & Live
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold border border-neutral-300 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Preview live static banner"
                        >
                          <HiOutlineEye className="w-3.5 h-3.5 text-accent-700" />
                          <span>Preview</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openHeroContentModal();
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <HiOutlinePencil className="w-3.5 h-3.5 text-white" />
                        <span>Edit Cover Banner & Content</span>
                      </button>
                    </div>
                  ) : (
                    /* Not Selected */
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-neutral-500">
                        {isLive ? 'Currently Live' : '1 Hero Visual Only'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDraftMode('disabled')}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-accent group-hover:text-white transition-colors cursor-pointer"
                      >
                        Select Style
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
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

      {/* Pop-up Preview Modal (Compact Height, Responsive View) */}
      {previewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            className="bg-neutral-950 rounded-3xl w-full max-w-5xl max-h-[85vh] my-auto border border-white/15 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-3 bg-neutral-900/95 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                    <span>Storefront Carousel Live Preview</span>
                    <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-400/30">
                      1:1 Preview
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Switch styles in real-time or pause on hover.
                  </p>
                </div>
              </div>

              {/* Quick Carousel Type Switcher Buttons inside the Pop-up Preview */}
              <div className="flex items-center gap-2 bg-neutral-800/80 p-1 rounded-xl border border-white/10 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDraftMode('image_box')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    draftSettings.enabled && draftSettings.type === 'image_box'
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Switch to Small Carousel (Image Box Only)"
                >
                  Small Carousel (Image Box)
                </button>

                <button
                  type="button"
                  onClick={() => handleDraftMode('full')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    draftSettings.enabled && draftSettings.type === 'full'
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Switch to Big Carousel (Full Hero Banner)"
                >
                  Big Carousel (Full Hero)
                </button>

                <button
                  type="button"
                  onClick={() => handleDraftMode('disabled')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !draftSettings.enabled
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Switch to Single Static Banner"
                >
                  Single Static Banner
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 cursor-pointer self-end sm:self-auto"
                title="Close Preview (ESC or click outside)"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Exact Hero Component */}
            <div className="overflow-y-auto p-3 sm:p-5 bg-neutral-900/60 flex items-center justify-center">
              <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
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
            </div>

            {/* Modal Footer Bar with Save & Go Live Button */}
            <div className="px-5 py-3 bg-neutral-900 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
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

              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  disabled={savingSettings || !hasUnsavedChanges}
                  onClick={handleSaveAndGoLive}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
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

      {/* Banners List / Grid / Single Static Banner View */}
      {!draftSettings.enabled ? (
        /* Single Static Banner Dedicated View */
        <div className="bg-white rounded-3xl border-2 border-primary/20 p-6 sm:p-8 shadow-xs space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 border border-neutral-200">
                Single Static Banner Mode (Active)
              </span>
              <h3 className="font-serif text-xl font-bold text-neutral-900 mt-1">
                Primary Storefront Cover Banner & Copy
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Carousel slide rotation is disabled. The storefront displays 1 static primary cover visual with headline, description, and CTA.
              </p>
            </div>
            <button
              type="button"
              onClick={openHeroContentModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <HiOutlinePencil className="w-4 h-4" />
              <span>Edit Cover Banner & Content</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Cover Image Preview */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-neutral-950 border border-neutral-200 shadow-sm">
                <img
                  src={getImageUrl(banners[0]?.image, '/fallback-banner.png')}
                  alt="Single Cover Banner"
                  onError={(e) => handleImageError(e, '/fallback-banner.png')}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                  Primary Cover Visual
                </div>
              </div>
            </div>

            {/* Copy Details */}
            <div className="lg:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-50 text-accent-800 border border-accent-200 text-xs font-bold tracking-wider uppercase">
                <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-700" />
                <span>{storeSettings.heroBadge || "Chennai's Trendy Fashion House"}</span>
              </div>

              <h4 className="font-serif text-2xl font-bold text-neutral-900">
                {banners[0]?.title || storeSettings.heroTitle || 'Style That Defines You'}
              </h4>

              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-xl">
                {banners[0]?.subtitle || storeSettings.heroDescription || 'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold shadow-xs">
                  <span>{banners[0]?.ctaText || storeSettings.heroCtaText || 'Explore Collection'}</span>
                  <span className="text-[10px] opacity-75 font-mono">({banners[0]?.ctaLink || storeSettings.heroCtaLink || '/shop'})</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 text-neutral-700 text-xs font-medium">
                  <HiOutlineLocationMarker className="w-3.5 h-3.5 text-accent-700" />
                  <span>{storeSettings.storeVisitText || 'Visit Store'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Carousel Slides List (When mode is image_box or full) */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-neutral-900">
                {draftSettings.type === 'image_box'
                  ? `Small Carousel Lookbook Photos (${banners.length} of ${MAX_BANNERS})`
                  : `Big Carousel Full Slides (${banners.length} of ${MAX_BANNERS})`}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {draftSettings.type === 'image_box'
                  ? 'Only these promotional photos rotate in the lookbook box. Store headlines stay calm and stable.'
                  : 'The entire hero banner transitions together. Each slide has its own full-width headline, description, and image.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {draftSettings.type === 'image_box' && (
                <button
                  type="button"
                  onClick={openHeroContentModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                >
                  <HiOutlinePencil className="w-3.5 h-3.5 text-amber-800" />
                  <span>Edit Hero Headline & Copy</span>
                </button>
              )}
              <button
                onClick={openAddModal}
                disabled={banners.length >= MAX_BANNERS}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
              >
                <HiOutlinePlus className="w-4 h-4" />
                <span>{draftSettings.type === 'image_box' ? 'Add Lookbook Photo' : 'Add Banner Slide'}</span>
              </button>
            </div>
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

                // In static mode: find the very first active banner — only THAT slide is shown live
                const isStaticMode = !draftSettings.enabled;
                const firstActiveIndex = banners.findIndex((x) => x.isActive !== false);
                const isStaticCoverSlide = isStaticMode && index === firstActiveIndex && b.isActive !== false;

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif text-sm sm:text-base font-bold text-neutral-900 truncate">
                            {draftSettings.type === 'image_box'
                              ? `Lookbook Photo #${index + 1}`
                              : (b.title || 'Untitled Slide')}
                          </h3>
                          {/* Primary Cover badge: only on the first ACTIVE banner */}
                          {firstActiveIndex === index && b.isActive !== false && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Primary Cover
                            </span>
                          )}
                          {/* Live / Not Shown / Inactive — context-aware badge per mode */}
                          {isStaticMode ? (
                            isStaticCoverSlide ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Live on Screen
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-300">
                                {b.isActive !== false ? 'Not Shown (Static)' : 'Inactive'}
                              </span>
                            )
                          ) : b.isActive !== false ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Live
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-500 border border-neutral-300">
                              Inactive
                            </span>
                          )}
                        </div>

                        {draftSettings.type !== 'image_box' && (
                          <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                            {b.subtitle || 'No subtitle description'}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                          {draftSettings.type !== 'image_box' && (
                            <span className="inline-flex items-center gap-1 font-semibold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md">
                              <span>Button:</span>
                              <strong className="text-primary">{b.ctaText || 'Shop Now'}</strong>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-700 bg-accent-50 px-2 py-0.5 rounded-md">
                            <HiOutlineLink className="w-3.5 h-3.5 text-accent-600" />
                            <span>Redirects to: {b.ctaLink || '/shop'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {/* Live / Hidden Toggle Button
                          In Static mode: non-cover active slides get a disabled pill with info tooltip */}
                      {isStaticMode && !isStaticCoverSlide && b.isActive !== false ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border bg-neutral-50 text-neutral-400 border-neutral-200 cursor-help select-none"
                          title="In Static mode only the Primary Cover slide is shown. Hide the current cover or switch to Carousel mode to use this slide."
                        >
                          <HiOutlineEyeOff className="w-3.5 h-3.5 text-neutral-300" />
                          <span>Not Active</span>
                        </span>
                      ) : (
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
                              <span>{isStaticCoverSlide ? 'Live on Screen' : 'Live'}</span>
                            </>
                          ) : (
                            <>
                              <HiOutlineEyeOff className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        className="p-2 text-neutral-600 hover:text-primary hover:bg-neutral-100 rounded-xl border border-neutral-200 transition-colors cursor-pointer"
                        title={draftSettings.type === 'image_box' ? 'Edit Lookbook Photo' : 'Edit Slide Content'}
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
      )}

      {/* Add / Edit Banner Slide Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200/80">
            {/* Modal Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 sm:px-8 sm:py-5 border-b border-neutral-100 bg-white/95 backdrop-blur-md shrink-0">
              <div>
                <span className="text-[11px] uppercase font-bold text-accent-700 tracking-wider">
                  {draftSettings.type === 'image_box'
                    ? 'Lookbook Photo Studio (Small Carousel)'
                    : 'Carousel Slide Studio (Big Carousel)'}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-neutral-900">
                  {draftSettings.type === 'image_box'
                    ? (editingBanner ? 'Edit Lookbook Photo' : 'Add Lookbook Photo')
                    : (editingBanner ? 'Edit Hero Banner Slide' : 'Add New Carousel Slide')}
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
                {/* In Small Carousel mode: Store headlines are static, only the photo rotates in the image box */}
                {draftSettings.type === 'image_box' ? (
                  <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
                    <HiOutlinePhotograph className="w-5 h-5 text-accent-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-neutral-900">Small Carousel (Image Box Only)</h4>
                      <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                        In this mode, store headlines and introduction remain calm and static on the storefront.
                        Only this promotional photo will rotate smoothly in the right-hand lookbook box.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
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

                    {/* Button Text */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Slide Button Text
                      </label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Shop Collection"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {/* Target Redirect Link */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Target Redirect Link (When customer clicks photo/button) *
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

                {/* Banner Image Upload & Live Preview (Strict Delete-First & Required-Image Rules) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700">
                      {draftSettings.type === 'image_box' ? 'Lookbook Image' : 'Hero Banner Image'} <span className="text-red-500">*</span>
                    </label>
                    {imagePreview && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <HiOutlineCheck className="w-3.5 h-3.5" />
                        Image Attached
                      </span>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {/* When imagePreview exists: SHOW ONLY the preview and the Delete button. NO upload/replace allowed without deleting first! */}
                  {imagePreview ? (
                    <div className="space-y-2 animate-fade-in">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-accent-200 aspect-[16/8] bg-neutral-900 group shadow-sm">
                        <img
                          src={getImageUrl(imagePreview, '/fallback-banner.png')}
                          alt="Banner Preview"
                          onError={(e) => handleImageError(e, '/fallback-banner.png')}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                        />

                        {/* Top Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-xs text-white border border-white/20 shadow-sm flex items-center gap-1">
                            <HiOutlinePhotograph className="w-3.5 h-3.5 text-accent-300" />
                            {imageFile ? 'New Selected Photo' : 'Current Active Visual'}
                          </span>
                        </div>

                        {/* Bottom Overlay Action Bar with Delete Button */}
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex items-center justify-between gap-2 z-10">
                          <span className="text-[11px] text-white/90 font-medium truncate">
                            {imageFile ? imageFile.name : (editingBanner?.title || 'Promotional Banner')}
                          </span>

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
                      <p className="text-[11px] text-neutral-500 font-medium">
                        🔒 Image is attached. Click <strong>Delete Image</strong> to remove it before selecting or uploading a new file.
                      </p>
                    </div>
                  ) : (
                    /* When image is NOT attached or DELETED: SHOW the upload dropzone */
                    <div className="space-y-2">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-accent-300 hover:border-primary rounded-2xl p-6 sm:p-8 bg-neutral-50/70 hover:bg-cream/60 transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer group shadow-2xs animate-fade-in"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-accent-100/70 group-hover:bg-primary/10 text-primary flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                          <HiOutlinePhotograph className="w-7 h-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-bold text-neutral-800 group-hover:text-primary transition-colors">
                            Click to Choose or Upload Banner Image *
                          </p>
                          <p className="text-[11px] text-neutral-500 font-medium">
                            Supports JPG, PNG, WEBP (Landscape recommended)
                          </p>
                          <p className="text-[10px] text-accent-800 font-semibold pt-0.5">
                            Exact banner size: <strong className="text-primary font-bold">1920 × 1080 px</strong> (16:9 ratio) or <strong className="text-primary font-bold">1920 × 1200 px</strong> (16:10 ratio)
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

                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <span>⚠️ A banner image is required. Please upload an image before saving.</span>
                      </p>
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
                      disabled={saving || (!imagePreview && !imageFile)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* POP-UP MODAL: Homepage Hero Headline & Copy (and Cover Image for Single Static Banner) */}
      {heroModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fade-in"
          onClick={() => setHeroModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] border border-neutral-200 shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent-100/70 text-accent-700 flex items-center justify-center shadow-xs">
                  <HiOutlineSparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-neutral-900">
                    {!draftSettings.enabled
                      ? 'Single Static Hero Banner & Content'
                      : 'Homepage Hero Headline & Copy'}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {!draftSettings.enabled
                      ? 'Configure the headline, copy, and cover photo for your static storefront banner'
                      : 'Configure the boutique headline, badge, and CTA buttons that stay calm & stable'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHeroModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                title="Close (ESC)"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveHeroContent} className="overflow-y-auto p-6 space-y-4 flex-1">
              {/* Hero Badge */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Top Boutique Badge / Accent Tag
                </label>
                <input
                  type="text"
                  value={modalHeroBadge}
                  onChange={(e) => setModalHeroBadge(e.target.value)}
                  placeholder="e.g. Chennai's Trendy Fashion House"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Hero Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Main Headline Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalHeroTitle}
                  onChange={(e) => setModalHeroTitle(e.target.value)}
                  placeholder="e.g. Style That Defines You"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-serif font-bold text-neutral-900 focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Hero Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Boutique Introduction / Subtitle
                </label>
                <textarea
                  rows={3}
                  value={modalHeroDescription}
                  onChange={(e) => setModalHeroDescription(e.target.value)}
                  placeholder="e.g. Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary leading-relaxed resize-y"
                />
              </div>

              {/* Buttons & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Primary Button Text
                  </label>
                  <input
                    type="text"
                    value={modalHeroCtaText}
                    onChange={(e) => setModalHeroCtaText(e.target.value)}
                    placeholder="Explore Collection"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Primary Button Redirect Link <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalHeroCtaLink}
                    onChange={(e) => setModalHeroCtaLink(e.target.value)}
                    placeholder="/shop"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono text-[11px] focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Quick Link Chips for Modal */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 mb-1 uppercase tracking-wider">
                  Quick Link Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_LINKS.map((item) => (
                    <button
                      key={item.url}
                      type="button"
                      onClick={() => setModalHeroCtaLink(item.url)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                        modalHeroCtaLink === item.url
                          ? 'bg-primary text-white border-primary'
                          : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border-neutral-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Store Visit Secondary Button */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Secondary Button Text (Boutique Visit)
                </label>
                <input
                  type="text"
                  value={modalStoreVisitText}
                  onChange={(e) => setModalStoreVisitText(e.target.value)}
                  placeholder="Visit Store"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Single Static Cover Banner Image (Shown strictly when !draftSettings.enabled) */}
              {!draftSettings.enabled && (
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-900">
                      Single Cover Banner Image <span className="text-red-500">*</span>
                    </label>
                    {staticCoverPreview && (
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <HiOutlineCheck className="w-3.5 h-3.5" />
                        Cover Image Attached
                      </span>
                    )}
                  </div>

                  <input
                    ref={staticFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (!f.type.startsWith('image/')) {
                          toast.error('Please select an image file (JPG, PNG, WEBP)');
                          return;
                        }
                        setStaticCoverFile(f);
                        setStaticCoverPreview(URL.createObjectURL(f));
                        toast.success('Cover image selected!');
                      }
                    }}
                    className="hidden"
                  />

                  {staticCoverPreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-accent-200 aspect-[16/8] bg-neutral-900 group shadow-sm">
                        <img
                          src={getImageUrl(staticCoverPreview, '/fallback-banner.png')}
                          alt="Static Banner Preview"
                          onError={(e) => handleImageError(e, '/fallback-banner.png')}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex items-center justify-between gap-2 z-10">
                          <span className="text-[11px] text-white/90 font-medium truncate">
                            {staticCoverFile ? staticCoverFile.name : 'Current Cover Banner'}
                          </span>
                          <button
                            type="button"
                            onClick={handleDeleteStaticCover}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer active:scale-95"
                            title="Delete current cover image"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                            <span>Delete Image</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        🔒 Cover image is attached. Click <strong>Delete Image</strong> above to remove it before selecting a new one.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        onClick={() => staticFileInputRef.current?.click()}
                        className="border-2 border-dashed border-accent-300 hover:border-primary rounded-2xl p-6 bg-neutral-50/70 hover:bg-cream/60 transition-all text-center flex flex-col items-center justify-center gap-2 cursor-pointer group shadow-2xs"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-accent-100/70 text-primary flex items-center justify-center shadow-xs">
                          <HiOutlinePhotograph className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-xs font-bold text-neutral-800 group-hover:text-primary transition-colors">
                          Click to Upload Single Static Cover Image *
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Recommended size: 1920 × 1080 px or 1920 × 1200 px (JPG, PNG, WEBP)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            staticFileInputRef.current?.click();
                          }}
                          className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          <HiOutlinePhotograph className="w-4 h-4" />
                          <span>Choose Cover Image</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <span>⚠️ A cover image is required for Single Static Banner mode. Please upload an image before saving.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setHeroModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHeroSection || (!draftSettings.enabled && !staticCoverPreview && !staticCoverFile)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {savingHeroSection ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Content...</span>
                    </>
                  ) : (
                    <span>Save & Publish Content</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManager;
