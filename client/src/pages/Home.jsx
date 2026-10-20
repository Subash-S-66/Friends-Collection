import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineArrowRight,
  HiOutlineTruck,
  HiOutlineShieldCheck,
  HiOutlineCurrencyRupee,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiChevronLeft,
  HiChevronRight,
  HiOutlinePhotograph
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';
import { getImageUrl, handleImageError } from '../utils/formatters';

// Lightweight on-scroll section loader: only mounts child DOM tree when user scrolls within 300px of it
const LazySection = ({ children, minHeight = '320px', rootMargin = '300px' }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (shouldRender) return;
    const el = sectionRef.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, rootMargin]);

  return (
    <div ref={sectionRef} style={{ minHeight: shouldRender ? 'auto' : minHeight }}>
      {shouldRender ? children : null}
    </div>
  );
};

// In-memory module cache for instant SWR (Stale-While-Revalidate)
let homeMemoryCache = null;
const CACHE_KEY = 'fc_homepage_bundle_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes client cache

const getInitialHomeCache = () => {
  if (homeMemoryCache) return homeMemoryCache;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.timestamp || 0) < CACHE_TTL_MS && parsed.data) {
        homeMemoryCache = parsed.data;
        return parsed.data;
      }
    }
  } catch {
    // sessionStorage unavailable or restricted
  }
  return null;
};

const saveHomeCache = (data) => {
  homeMemoryCache = data;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch {
    // quota exceeded or disabled
  }
};

const defaultHeroBanner = {
  title: 'Style That Defines You',
  subtitle:
    'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.',
  image: '/fallback-banner.png',
  ctaText: 'Explore Collection',
  ctaLink: '/shop'
};

const Home = () => {
  const navigate = useNavigate();
  const initialCache = getInitialHomeCache();
  const [categories, setCategories] = useState(() => initialCache?.categories || []);
  const [featured, setFeatured] = useState(() => initialCache?.featured || []);
  const [newArrivals, setNewArrivals] = useState(() => initialCache?.newArrivals || []);
  const [banners, setBanners] = useState(() => (initialCache?.banners?.length ? initialCache.banners : [defaultHeroBanner]));
  const [settings, setSettings] = useState(() => initialCache?.settings || {});
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [loading, setLoading] = useState(() => !initialCache);
  const [selectedGender, setSelectedGender] = useState('all');

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fast aggregated endpoint (server cache HIT ~7ms)
        let bundleData = null;
        try {
          const res = await API.get('/products/homepage-bundle');
          if (res?.data && typeof res.data === 'object') {
            bundleData = res.data;
          }
        } catch (bundleErr) {
          console.warn('Aggregated bundle fetch failed, falling back:', bundleErr);
        }

        let safeCats = [];
        let safeFeatured = [];
        let safeNew = [];
        let safeSettings = {};
        let safeBanners = [];

        if (bundleData) {
          safeCats = Array.isArray(bundleData.categories) ? bundleData.categories : [];
          safeFeatured = Array.isArray(bundleData.featured) ? bundleData.featured : [];
          safeNew = Array.isArray(bundleData.newArrivals) ? bundleData.newArrivals : [];
          safeSettings = bundleData.settings && typeof bundleData.settings === 'object' ? bundleData.settings : {};
          safeBanners = Array.isArray(bundleData.banners) ? bundleData.banners.filter((b) => b.isActive !== false) : [];
        } else {
          // Graceful fallback to separate REST queries
          const [catsRes, featuredRes, newRes, settingsRes, bannersRes] = await Promise.all([
            API.get('/categories').catch(() => ({ data: [] })),
            API.get('/products/featured/list').catch(() => ({ data: [] })),
            API.get('/products?sort=newest&limit=24').catch(() => ({ data: { products: [] } })),
            API.get('/settings').catch(() => ({ data: {} })),
            API.get('/banners').catch(() => ({ data: [] }))
          ]);

          safeCats = Array.isArray(catsRes?.data) ? catsRes.data : [];
          safeFeatured = Array.isArray(featuredRes?.data) ? featuredRes.data : [];
          safeNew = Array.isArray(newRes?.data?.products)
            ? newRes.data.products
            : Array.isArray(newRes?.data)
            ? newRes.data
            : [];
          safeSettings = settingsRes?.data && typeof settingsRes.data === 'object' ? settingsRes.data : {};
          safeBanners = Array.isArray(bannersRes?.data) ? bannersRes.data.filter((b) => b.isActive !== false) : [];
        }

        if (isMounted) {
          setCategories(safeCats);
          setFeatured(safeFeatured);
          setNewArrivals(safeNew);
          setSettings(safeSettings);
          setBanners(safeBanners);

          // Save to instant SWR cache
          saveHomeCache({
            categories: safeCats,
            featured: safeFeatured,
            newArrivals: safeNew,
            settings: safeSettings,
            banners: safeBanners
          });
        }
      } catch (error) {
        console.error('Error fetching dynamic home data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Extract hidden departments configured by store admin
  const hiddenDepartments = useMemo(() => {
    if (Array.isArray(settings?.hiddenDepartments)) {
      return settings.hiddenDepartments
        .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
        .filter(Boolean);
    }
    return [];
  }, [settings?.hiddenDepartments]);

  // If active filter matches a hidden department, fallback to 'all'
  useEffect(() => {
    if (selectedGender !== 'all' && hiddenDepartments.includes(selectedGender.toLowerCase())) {
      setSelectedGender('all');
    }
  }, [hiddenDepartments, selectedGender]);

  // Interleave items fairly across departments (women, men, kids, unisex)
  // excluding any department hidden by admin
  const interleaveByDepartment = (items = [], maxLimit = 8) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const women = [];
    const men = [];
    const kids = [];
    const others = [];

    for (const item of items) {
      if (!item) continue;
      const g = (item.gender || item.category?.gender || '').toLowerCase();
      if (hiddenDepartments.includes(g)) continue; // Never show items from hidden departments

      if (g === 'women') women.push(item);
      else if (g === 'men') men.push(item);
      else if (g === 'kids') kids.push(item);
      else others.push(item);
    }

    // Active buckets in balanced round-robin order: Women, Men, Kids, and Others
    const buckets = [women, men, kids, others].filter((b) => b.length > 0);
    if (buckets.length === 0) return items.slice(0, maxLimit);

    const interleaved = [];
    let round = 0;
    let hasMore = true;

    while (hasMore && interleaved.length < maxLimit) {
      hasMore = false;
      for (const b of buckets) {
        if (round < b.length) {
          interleaved.push(b[round]);
          hasMore = true;
          if (interleaved.length >= maxLimit) break;
        }
      }
      round++;
    }

    return interleaved;
  };

  // Filter and interleave categories: strictly max 2 rows on desktop (10 items on 5-col grid)
  const rootCategories = useMemo(
    () =>
      (Array.isArray(categories) ? categories : []).filter(
        (c) =>
          c &&
          !c.parent &&
          c.isActive !== false &&
          (!c.gender || !hiddenDepartments.includes(c.gender.toLowerCase()))
      ),
    [categories, hiddenDepartments]
  );

  const displayedCategories = useMemo(() => {
    return selectedGender === 'all'
      ? interleaveByDepartment(rootCategories, 10)
      : rootCategories
          .filter((c) => c.gender === selectedGender || c.gender === 'all' || !c.gender)
          .slice(0, 10);
  }, [rootCategories, selectedGender]);

  // Interleave featured/trending products: strictly max 2 rows on desktop (8 items on 4-col grid)
  const displayedFeatured = useMemo(
    () => interleaveByDepartment(featured, 8),
    [featured]
  );

  // Interleave new arrivals products: strictly max 2 rows on desktop (8 items on 4-col grid)
  const displayedNewArrivals = useMemo(
    () => interleaveByDepartment(newArrivals, 8),
    [newArrivals]
  );

  // Check if admin enabled Carousel Mode in Settings (Image Box Carousel is Default)
  const isCarouselEnabled = settings?.heroCarouselEnabled !== undefined ? Boolean(settings.heroCarouselEnabled) : true;
  const carouselType = settings?.heroCarouselType || 'image_box'; // 'image_box' (Default: only image box carousels) | 'full' (entire banner)
  const carouselTransition = settings?.heroCarouselTransition || 'fade'; // 'fade' | 'slide' | 'zoom'
  const carouselInterval = Number(settings?.heroCarouselInterval) || 4000;

  const activeBanners = useMemo(() => {
    const list = Array.isArray(banners)
      ? banners.filter((b) => b && b.isActive !== false)
      : [];
    return list.length > 0 ? list : [defaultHeroBanner];
  }, [banners]);

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

  // Auto-rotate interval with pause on hover
  useEffect(() => {
    if (!isCarouselEnabled || activeBanners.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % activeBanners.length);
    }, carouselInterval);
    return () => clearInterval(interval);
  }, [isCarouselEnabled, activeBanners.length, isHovered, carouselInterval]);

  // Safe index clamp
  useEffect(() => {
    if (activeBannerIdx >= activeBanners.length && activeBanners.length > 0) {
      setActiveBannerIdx(0);
    }
  }, [activeBanners.length, activeBannerIdx]);

  const currentBanner = (isCarouselEnabled ? activeBanners[activeBannerIdx] : activeBanners[0]) || activeBanners[0] || defaultHeroBanner;

  const handlePrevBanner = (e) => {
    e?.stopPropagation();
    if (activeBanners.length <= 1) return;
    setActiveBannerIdx((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNextBanner = (e) => {
    e?.stopPropagation();
    if (activeBanners.length <= 1) return;
    setActiveBannerIdx((prev) => (prev + 1) % activeBanners.length);
  };

  const handleBannerClick = (banner) => {
    const targetLink = banner?.ctaLink || '/shop';
    if (targetLink.startsWith('http://') || targetLink.startsWith('https://')) {
      // Redirect in the same window (not opening a new tab/site)
      window.location.href = targetLink;
    } else {
      // Seamless React Router SPA client navigation within the store
      navigate(targetLink);
    }
  };

  const storePhone = settings.storePhone || '+91 95007 57024';
  const whatsappNum = settings.whatsappNumber || '919500757024';
  const storeAddress = settings.storeAddress || '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012';
  const freeShipping = settings.freeShippingThreshold || settings.shippingCharge?.freeAbove || 999;

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      {/* Dynamic DB Hero Banner Section (Two Modes: Image-Box-Only Carousel [Default] or Full Banner Carousel) */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white min-h-[460px] sm:min-h-[520px] flex items-center group select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (!isCarouselEnabled || activeBanners.length <= 1) return;
          const diff = touchStartX - e.changedTouches[0].clientX;
          if (diff > 45) handleNextBanner();
          else if (diff < -45) handlePrevBanner();
        }}
      >
        {/* Subtle royal pattern/accents overlay */}
        <div
          className="absolute inset-0 opacity-10 [background-size:24px_24px] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(var(--color-accent, #C88A65) 1px, transparent 1px)' }}
        />

        {/* Ambient Royal Showroom Background (Silky Layered Crossfade with zero flicker) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {activeBanners.map((b, idx) => (
            <img
              key={b._id || idx}
              src={getImageUrl(b.image, '/fallback-banner.png')}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover filter blur-xs transition-opacity duration-1000 ease-in-out ${
                idx === activeBannerIdx ? 'opacity-25' : 'opacity-0'
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/90 to-primary-900/60" />
        </div>

        {/* Global Slide Arrows (Only shown in 'full' carousel mode when >1 slides) */}
        {isCarouselEnabled && carouselType === 'full' && activeBanners.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevBanner}
              aria-label="Previous Banner Slide"
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
              title="Previous Banner Slide"
            >
              <HiChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <button
              type="button"
              onClick={handleNextBanner}
              aria-label="Next Banner Slide"
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all duration-200 active:scale-95 cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
              title="Next Banner Slide"
            >
              <HiChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column:
                MODE A ('image_box', DEFAULT): Stable boutique introduction & primary CTAs. Text stays calm and elegant.
                MODE B ('full'): Fluid editorial crossfade per slide with Framer Motion.
            */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
              {carouselType === 'full' && isCarouselEnabled ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeBannerIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                    className="space-y-5 sm:space-y-6"
                  >
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-xs font-semibold tracking-wider uppercase">
                        <HiOutlineSparkles className="w-4 h-4" />
                        <span>{settings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-neutral-300 border border-white/10 font-numeric">
                        Slide {activeBannerIdx + 1} of {activeBanners.length}
                      </span>
                    </div>

                    <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                      {currentBanner?.title || settings.heroTitle || 'Style That Defines You'}
                    </h1>

                    <p className="text-sm sm:text-lg text-neutral-300 font-light max-w-xl leading-relaxed">
                      {currentBanner?.subtitle ||
                        settings.heroDescription ||
                        'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => handleBannerClick(currentBanner)}
                        className="inline-flex items-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                        title={`Redirects to ${currentBanner?.ctaLink || '/shop'}`}
                      >
                        <span>{currentBanner?.ctaText || 'Explore Collection'}</span>
                        <HiOutlineArrowRight className="w-4 h-4" />
                      </button>
                      <Link
                        to="/contact"
                        title="Visit our physical boutique store in Jamalia, Chennai"
                        className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-sm transition-all transform hover:-translate-y-0.5"
                      >
                        <HiOutlineLocationMarker className="w-4 h-4 text-accent-300 shrink-0" />
                        <span>{settings.storeVisitText || 'Visit Store'}</span>
                      </Link>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                /* DEFAULT MODE: Image Box Carousel - Stable, Premium Boutique Presentation */
                <div className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-xs font-semibold tracking-wider uppercase">
                      <HiOutlineSparkles className="w-4 h-4" />
                      <span>{settings.heroBadge || "Chennai's Trendy Fashion House"}</span>
                    </div>

                    {isCarouselEnabled && activeBanners.length > 1 && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 text-accent-200 border border-white/15 font-numeric">
                        Featured Slide {activeBannerIdx + 1} of {activeBanners.length}
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                    {settings.heroTitle || 'Style That Defines You'}
                  </h1>

                  <p className="text-sm sm:text-lg text-neutral-300 font-light max-w-xl leading-relaxed">
                    {settings.heroDescription ||
                      'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
                    <button
                      type="button"
                      onClick={() => handleBannerClick(currentBanner)}
                      className="inline-flex items-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
                      title="Explore boutique collection"
                    >
                      <span>Explore Collections</span>
                      <HiOutlineArrowRight className="w-4 h-4" />
                    </button>
                    <Link
                      to="/contact"
                      title="Visit our physical boutique store in Jamalia, Chennai"
                      className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-accent-300/40 hover:bg-white/10 hover:border-accent-300/70 text-white font-medium text-sm transition-all transform hover:-translate-y-0.5"
                    >
                      <HiOutlineLocationMarker className="w-4 h-4 text-accent-300 shrink-0" />
                      <span>{settings.storeVisitText || 'Visit Store'}</span>
                    </Link>
                  </div>

                  {/* Spotlight Indicator Chip for the currently active rotating image box */}
                  {isCarouselEnabled && activeBanners.length > 1 && (
                    <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[11px] text-accent-300 font-medium">Spotlight Look:</span>
                      <button
                        type="button"
                        onClick={() => handleBannerClick(currentBanner)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white font-semibold transition-all cursor-pointer shadow-xs truncate max-w-xs sm:max-w-md group/look"
                      >
                        <span className="truncate">{currentBanner?.title || 'Promotional Collection'}</span>
                        <HiOutlineArrowRight className="w-3.5 h-3.5 text-accent-300 group-hover/look:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                      {isHovered && (
                        <span className="text-[10px] text-accent-300/80 font-mono ml-1">
                          (Paused on hover)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Slide Navigation Dots (Below left content in 'full' mode) */}
              {isCarouselEnabled && carouselType === 'full' && activeBanners.length > 1 && (
                <div className="flex items-center gap-2 pt-2">
                  {activeBanners.map((b, idx) => (
                    <button
                      key={b._id || idx}
                      onClick={() => setActiveBannerIdx(idx)}
                      aria-label={`Show slide ${idx + 1}`}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        activeBannerIdx === idx
                          ? 'w-9 bg-accent-400 shadow-md ring-2 ring-accent-300/40'
                          : 'w-2.5 bg-white/40 hover:bg-white/70'
                      }`}
                      title={`Slide ${idx + 1}: ${b.title || 'Promotional Banner'}`}
                    />
                  ))}
                  {isHovered && (
                    <span className="text-[10px] text-accent-300 font-medium ml-2 animate-pulse">
                      (Paused on hover)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right Column:
                THE BUTTERY-SMOOTH IMAGE BOX CAROUSEL
                Layered stacked visuals with GPU acceleration, zero unmounting flicker, and smooth crossfades!
            */}
            <div className="lg:col-span-5 flex justify-center">
              <div
                onClick={() => handleBannerClick(currentBanner)}
                title={`Click to view: ${currentBanner?.title || 'Collection'} (Redirects within store)`}
                className="relative w-full max-w-lg aspect-[16/10] rounded-3xl p-2.5 sm:p-3 bg-gradient-to-tr from-accent-400/40 via-primary-700/60 to-accent-300/40 shadow-2xl backdrop-blur-sm border border-accent-300/40 overflow-hidden flex items-center justify-center group/card hover:border-accent-300/80 transition-all duration-500 cursor-pointer transform hover:-translate-y-1"
              >
                {/* The Layered Image Container */}
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-primary-950">
                  {activeBanners.map((banner, idx) => {
                    const isActive = idx === activeBannerIdx;
                    let transitionStyle = '';
                    if (carouselTransition === 'slide') {
                      transitionStyle = isActive
                        ? 'opacity-100 translate-x-0 scale-100 z-10'
                        : idx < activeBannerIdx
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
                          src={getImageUrl(banner.image, '/fallback-banner.png')}
                          alt={banner.title || 'Friends Collections'}
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
                {isCarouselEnabled && activeBanners.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevBanner}
                      aria-label="Previous Slide"
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100"
                      title="Previous Image Slide"
                    >
                      <HiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextBanner}
                      aria-label="Next Slide"
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/55 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 shadow-xl transition-all active:scale-95 cursor-pointer opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100"
                      title="Next Image Slide"
                    >
                      <HiChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Integrated Dot Indicators on top-right of the Image Box */}
                    <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15">
                      {activeBanners.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBannerIdx(idx);
                          }}
                          className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                            activeBannerIdx === idx ? 'w-5 bg-accent-400' : 'w-1.5 bg-white/50 hover:bg-white'
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

      {/* Dynamic Trust Badges Bar */}
      <section className="relative -mt-6 sm:-mt-8 z-30 max-w-6xl mx-auto px-4 w-full">
        <div className="bg-white rounded-2xl shadow-card border border-accent-100 p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 lg:divide-x divide-neutral-100">
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
            <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
              <HiOutlineTruck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 leading-tight">Free Shipping</h4>
              <p className="text-xs text-neutral-500 mt-0.5">On orders above ₹{freeShipping}</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 lg:pl-6">
            <div className="w-11 h-11 rounded-xl bg-accent-50 text-accent-700 flex items-center justify-center shrink-0">
              <HiOutlineShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 leading-tight">100% Quality</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Premium fabrics guaranteed</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 lg:pl-6">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <HiOutlineCurrencyRupee className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 leading-tight">Best Prices</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Honest & direct pricing</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 pt-2 sm:pt-0 lg:pl-6">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <HiOutlineRefresh className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 leading-tight">Easy Exchange</h4>
              <p className="text-xs text-neutral-500 mt-0.5">Quick support on WhatsApp</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories from DB (loaded only when user scrolls near) */}
      {(loading || categories.length > 0) && (
        <LazySection minHeight="420px">
          <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-accent-700 font-semibold">
                Explore Collections
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-neutral-900">
                Shop by Department & Category
              </h2>
              <div className="w-16 h-0.5 bg-accent-400 mx-auto rounded-full mt-2" />
            </div>

            {/* Department Filter Tabs */}
            <div className="w-full overflow-x-auto pb-1 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
              <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max mx-auto">
                <button
                  disabled={loading}
                  onClick={() => setSelectedGender('all')}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                    selectedGender === 'all'
                      ? 'bg-neutral-900 text-white shadow-md'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                  }`}
                >
                  ✨ All Collections
                </button>
                {!hiddenDepartments.includes('women') && (
                  <button
                    disabled={loading}
                    onClick={() => setSelectedGender('women')}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      selectedGender === 'women'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
                    }`}
                  >
                    🌸 Women's Studio
                  </button>
                )}
                {!hiddenDepartments.includes('men') && (
                  <button
                    disabled={loading}
                    onClick={() => setSelectedGender('men')}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      selectedGender === 'men'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
                    }`}
                  >
                    👔 Men's Studio
                  </button>
                )}
                {!hiddenDepartments.includes('kids') && (
                  <button
                    disabled={loading}
                    onClick={() => setSelectedGender('kids')}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                      selectedGender === 'kids'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
                    }`}
                  >
                    🧒 Kids' Studio
                  </button>
                )}
              </div>
            </div>

            {/* Categories Grid (strictly max 2 rows: 4 mobile, 6 tablet, 10 desktop) */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {[...Array(10)].map((_, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl sm:rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-200/80 animate-pulse border border-accent-100/40 ${
                      idx >= 6 ? 'hidden lg:block' : idx >= 4 ? 'hidden sm:block' : ''
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {displayedCategories.map((cat, idx) => (
                  <Link
                    to={cat.gender ? `/shop?gender=${cat.gender}&category=${cat.slug}` : `/shop?category=${cat.slug}`}
                    key={cat._id}
                    className={`group relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-100 shadow-xs hover:shadow-card-hover border border-accent-100 transition-all duration-300 transform hover:-translate-y-1 ${
                      idx >= 6 ? 'hidden lg:block' : idx >= 4 ? 'hidden sm:block' : ''
                    }`}
                  >
                    <img
                      src={getImageUrl(cat.image, '/fallback-product.png')}
                      alt={cat.name}
                      onError={(e) => handleImageError(e, '/fallback-product.png')}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-950/85 via-primary-900/30 to-transparent flex flex-col justify-end p-3 sm:p-5">
                      <span className={`self-start mb-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${
                        cat.gender === 'men'
                          ? 'bg-blue-600/80 text-white'
                          : cat.gender === 'kids'
                          ? 'bg-amber-600/80 text-white'
                          : 'bg-rose-600/80 text-white'
                      }`}>
                        {cat.gender === 'men' ? 'Men' : cat.gender === 'kids' ? 'Kids' : 'Women'}
                      </span>
                      <h3 className="font-serif text-sm sm:text-lg font-bold text-white leading-tight line-clamp-1">
                        {cat.name}
                      </h3>
                      <span className="text-[10px] sm:text-xs font-medium text-accent-300 flex items-center gap-1 mt-0.5 sm:mt-1 opacity-90 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        Shop Now <HiOutlineArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!loading && rootCategories.length > displayedCategories.length && (
              <div className="text-center mt-8 sm:mt-10">
                <Link
                  to={selectedGender === 'all' ? '/shop' : `/shop?gender=${selectedGender}`}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-semibold border border-neutral-200 shadow-xs hover:shadow-md transition-all transform hover:-translate-y-0.5"
                >
                  <span>Explore All Categories in Boutique</span>
                  <HiOutlineArrowRight className="w-4 h-4 text-accent" />
                </Link>
              </div>
            )}
          </section>
        </LazySection>
      )}

      {/* Trending Products from DB (loaded only when user scrolls near) */}
      {(loading || featured.length > 0) && (
        <LazySection minHeight="420px">
          <section className="py-14 sm:py-16 bg-cream-dark/50 border-y border-accent-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6 sm:mb-10 gap-4">
                <div>
                  <span className="text-xs uppercase tracking-[0.25em] text-accent-700 font-semibold block">
                    Handpicked Favorites
                  </span>
                  <h2 className="font-serif text-2xl sm:text-4xl font-bold text-neutral-900">
                    Trending This Season
                  </h2>
                </div>
                <Link
                  to="/shop?tag=trending"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-accent-700 transition-colors"
                >
                  <span>View All Trending</span>
                  <HiOutlineArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {[...Array(8)].map((_, idx) => (
                    <div
                      key={idx}
                      className={`bg-white rounded-2xl p-3 sm:p-4 space-y-3 animate-pulse border border-accent-100/60 ${
                        idx >= 6 ? 'hidden lg:block' : idx >= 4 ? 'hidden md:block' : ''
                      }`}
                    >
                      <div className="aspect-[3/4] bg-neutral-200 rounded-xl w-full" />
                      <div className="h-4 bg-neutral-200 rounded w-3/4 mt-2" />
                      <div className="h-4 bg-neutral-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {displayedFeatured.map((product, idx) => (
                    <div
                      key={product._id}
                      className={`${idx >= 6 ? 'hidden lg:block' : idx >= 4 ? 'hidden md:block' : ''}`}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </LazySection>
      )}

      {/* New Arrivals from DB (loaded only when user scrolls near) */}
      {(loading || newArrivals.length > 0) && (
        <LazySection minHeight="420px">
          <section className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between mb-6 sm:mb-10 gap-4">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-accent-700 font-semibold block">
                  Fresh Drops
                </span>
                <h2 className="font-serif text-2xl sm:text-4xl font-bold text-neutral-900">
                  New Arrivals
                </h2>
              </div>
              <Link
                to="/shop?sort=newest"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-accent-700 transition-colors"
              >
                <span>Explore All Fresh In</span>
                <HiOutlineArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {[...Array(8)].map((_, idx) => (
                  <div
                    key={idx}
                    className={`bg-white rounded-2xl p-3 sm:p-4 space-y-3 animate-pulse border border-accent-100/60 ${
                      idx >= 6 ? 'hidden lg:block' : idx >= 4 ? 'hidden md:block' : ''
                    }`}
                  >
                    <div className="aspect-[3/4] bg-neutral-200 rounded-xl w-full" />
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mt-2" />
                    <div className="h-4 bg-neutral-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {displayedNewArrivals.map((product, idx) => (
                  <div
                    key={product._id}
                    className={`${idx >= 6 ? 'hidden lg:block' : idx >= 4 ? 'hidden md:block' : ''}`}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </LazySection>
      )}

      {/* Dynamic Store & Jamalia Showroom Section from DB Settings (loaded only when user scrolls near) */}
      <LazySection minHeight="300px">
        <section className="py-16 bg-gradient-to-br from-primary-900 via-primary-950 to-primary-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-accent-400/20 p-8 sm:p-12 bg-white/5 backdrop-blur-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="text-xs uppercase tracking-[0.25em] text-accent-300 font-semibold">
                  Experience Friends Collections In Person
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                  Visit Our Jamalia, Chennai Boutique
                </h2>
                <p className="text-sm sm:text-base text-neutral-300 font-light max-w-2xl leading-relaxed">
                  Step into our showroom to touch the premium fabrics, try out exquisite drape styles, and consult with our friendly fashion specialists.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-2 text-xs sm:text-sm text-neutral-200">
                  <div className="flex items-center gap-2.5">
                    <HiOutlineLocationMarker className="w-5 h-5 text-accent-400 shrink-0" />
                    <span>{storeAddress}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <HiOutlinePhone className="w-5 h-5 text-accent-400 shrink-0" />
                    <span>Call/WhatsApp: {storePhone}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
                <Link
                  to="/contact"
                  className="w-full text-center px-6 py-3.5 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm shadow-lg transition-all"
                >
                  Store Location & Hours
                </Link>
                <a
                  href={`https://wa.me/${whatsappNum}?text=Hi%20Friends%20Collections%2C%20I%20would%20like%20to%20visit%20your%20store`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] active:scale-98 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                >
                  <FaWhatsapp className="w-5 h-5 text-white" />
                  <span>Chat with Us on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </LazySection>

      {/* Floating WhatsApp Button (Dynamic from DB Settings) */}
      <a
        href={`https://wa.me/${whatsappNum}?text=Hi%20Friends%20Collections%2C%20I%20am%20browsing%20your%20store%20and%20would%20like%20to%20inquire%20about%20your%20collections!`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-2 border-white/90 animate-fade-in"
      >
        <FaWhatsapp className="w-6 h-6 sm:w-7 sm:h-7 text-white shrink-0 drop-shadow-xs" />
        <span className="font-semibold text-xs sm:text-sm tracking-wide text-white drop-shadow-xs whitespace-nowrap">
          Chat with us
        </span>
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-300 border-2 border-white"></span>
        </span>
      </a>
    </div>
  );
};

export default Home;
