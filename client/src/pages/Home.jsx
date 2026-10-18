import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  HiChevronRight
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';
import { getImageUrl, handleImageError } from '../utils/formatters';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({});
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedGender, setSelectedGender] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, featuredRes, newRes, settingsRes, bannersRes] = await Promise.all([
          API.get('/categories').catch(() => ({ data: [] })),
          API.get('/products/featured/list').catch(() => ({ data: [] })),
          API.get('/products?sort=newest&limit=8').catch(() => ({ data: { products: [] } })),
          API.get('/settings').catch(() => ({ data: {} })),
          API.get('/banners').catch(() => ({ data: [] }))
        ]);

        const safeCats = Array.isArray(catsRes?.data) ? catsRes.data : [];
        const safeFeatured = Array.isArray(featuredRes?.data) ? featuredRes.data : [];
        const safeNew = Array.isArray(newRes?.data?.products)
          ? newRes.data.products
          : (Array.isArray(newRes?.data) ? newRes.data : []);
        const safeSettings = settingsRes?.data && typeof settingsRes.data === 'object' ? settingsRes.data : {};
        const safeBanners = Array.isArray(bannersRes?.data) ? bannersRes.data.filter(b => b.isActive !== false) : [];

        setCategories(safeCats);
        setFeatured(safeFeatured);
        setNewArrivals(safeNew);
        setSettings(safeSettings);
        setBanners(safeBanners);
      } catch (error) {
        console.error('Error fetching dynamic home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Auto-rotate hero banners if multiple exist in DB
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[activeBannerIdx] || null;
  const storePhone = settings.storePhone || '+91 95007 57024';
  const whatsappNum = settings.whatsappNumber || '919500757024';
  const storeAddress = settings.storeAddress || '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012';
  const freeShipping = settings.freeShippingThreshold || settings.shippingCharge?.freeAbove || 999;

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      {/* Dynamic DB Hero Banner Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white min-h-[440px] sm:min-h-[500px] flex items-center">
        {/* Subtle royal pattern/accents overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C88A65_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Dynamic Background Image if Banner specifies an image */}
        {currentBanner?.image && (
          <div className="absolute inset-0 z-0">
            <img
              src={getImageUrl(currentBanner.image, '/fallback-banner.png')}
              alt={currentBanner.title || 'Friends Collections'}
              onError={(e) => handleImageError(e, '/fallback-banner.png')}
              className="w-full h-full object-cover opacity-25 filter blur-xs"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-950 via-primary-950/90 to-primary-900/60" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Dynamic Headlines & Call to Actions */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-xs font-semibold tracking-wider uppercase">
                <HiOutlineSparkles className="w-4 h-4" />
                <span>{settings.heroBadge || "Chennai's Trendy Fashion House"}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
                {currentBanner ? (
                  currentBanner.title
                ) : (
                  <>
                    {settings.heroTitle || 'Style That Defines You'}
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-lg text-neutral-300 font-light max-w-xl leading-relaxed">
                {currentBanner?.subtitle ||
                  settings.heroDescription ||
                  'Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <Link
                  to={currentBanner?.ctaLink || '/shop'}
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
                >
                  <span>{currentBanner?.ctaText || 'Explore Collection'}</span>
                  <HiOutlineArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-accent-300/40 hover:bg-white/10 text-white font-medium text-sm transition-colors"
                >
                  Visit Jamalia Store
                </Link>
              </div>

              {/* Multi-banner navigation dots if DB has > 1 active banner */}
              {banners.length > 1 && (
                <div className="flex items-center gap-2 pt-4">
                  {banners.map((b, idx) => (
                    <button
                      key={b._id || idx}
                      onClick={() => setActiveBannerIdx(idx)}
                      aria-label={`Show banner ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeBannerIdx === idx ? 'w-8 bg-accent-400' : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Branded Visual Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-3xl p-3 bg-gradient-to-tr from-accent-400/40 via-primary-700/60 to-accent-300/40 shadow-2xl backdrop-blur-sm border border-accent-300/30 overflow-hidden flex items-center justify-center">
                {currentBanner?.image ? (
                  <img
                    src={getImageUrl(currentBanner.image, '/fallback-banner.png')}
                    alt={currentBanner.title || 'Friends Collections'}
                    onError={(e) => handleImageError(e, '/fallback-banner.png')}
                    className="w-full h-full object-cover rounded-2xl shadow-inner"
                  />
                ) : (
                  <img
                    src="/logo.png"
                    alt="Friends Collections"
                    className="w-full h-full object-contain bg-white rounded-2xl p-6 shadow-inner"
                  />
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

      {/* Featured Categories from DB */}
      {categories.length > 0 && (
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
                onClick={() => setSelectedGender('all')}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedGender === 'all'
                    ? 'bg-neutral-900 text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200'
                }`}
              >
                ✨ All Collections
              </button>
              <button
                onClick={() => setSelectedGender('women')}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedGender === 'women'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
                }`}
              >
                🌸 Women's Studio
              </button>
              <button
                onClick={() => setSelectedGender('men')}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedGender === 'men'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
                }`}
              >
                👔 Men's Studio
              </button>
              <button
                onClick={() => setSelectedGender('kids')}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all ${
                  selectedGender === 'kids'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-neutral-700 hover:bg-accent-100/60 border border-accent-200/60'
                }`}
              >
                🧒 Kids' Studio
              </button>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
            {(Array.isArray(categories) ? categories : [])
              .filter((c) => c && !c.parent)
              .filter((c) => selectedGender === 'all' || c.gender === selectedGender || c.gender === 'all' || !c.gender)
              .map((cat) => (
                <Link
                  to={cat.gender ? `/shop?gender=${cat.gender}&category=${cat.slug}` : `/shop?category=${cat.slug}`}
                  key={cat._id}
                  className="group relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-100 shadow-xs hover:shadow-card-hover border border-accent-100 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <img
                    src={getImageUrl(cat.image, '/fallback-product.png')}
                    alt={cat.name}
                    onError={(e) => handleImageError(e, '/fallback-product.png')}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
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
        </section>
      )}

      {/* Trending Products from DB */}
      {featured.length > 0 && (
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

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {featured.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals from DB */}
      {newArrivals.length > 0 && (
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {newArrivals.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Dynamic Store & Jamalia Showroom Section from DB Settings */}
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
