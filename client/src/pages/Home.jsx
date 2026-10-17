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
  HiOutlinePhone
} from 'react-icons/hi';
import API from '../utils/api';
import ProductCard from '../components/ProductCard';
import { getImageUrl } from '../utils/formatters';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGender, setSelectedGender] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, featuredRes, newRes, settingsRes] = await Promise.all([
          API.get('/categories').catch(() => ({ data: [] })),
          API.get('/products/featured/list').catch(() => ({ data: [] })),
          API.get('/products?sort=newest&limit=8').catch(() => ({ data: { products: [] } })),
          API.get('/settings').catch(() => ({ data: {} }))
        ]);
        setCategories(catsRes.data || []);
        setFeatured(featuredRes.data || []);
        setNewArrivals(newRes.data?.products || []);
        setSettings(settingsRes.data || {});
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-cream">
      {/* Signature Static Hero: "Style That Defines You" */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800 text-white py-16 sm:py-24 lg:py-32 flex items-center">
        {/* Subtle royal pattern/accents overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C88A65_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Headlines & Call to Actions */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-500/20 border border-accent-300/30 text-accent-200 text-xs font-semibold tracking-wider uppercase">
                <HiOutlineSparkles className="w-4 h-4" /> Chennai&apos;s Trendy Fashion House
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight">
                Style That <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-300 via-accent-200 to-amber-100">
                  Defines You.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-neutral-300 font-light max-w-lg leading-relaxed">
                Elevate your wardrobe with bespoke sarees, graceful lehengas, vibrant kurtis, tailored shirts, and festive apparel crafted with authentic heritage weaves.
              </p>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-full bg-accent hover:bg-accent-light text-white font-semibold text-sm tracking-wide shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
                >
                  <span>Explore Collection</span>
                  <HiOutlineArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-accent-300/40 hover:bg-white/10 text-white font-medium text-sm transition-colors"
                >
                  Visit Jamalia Store
                </Link>
              </div>
            </div>

            {/* Right Column: Branded Circular Seal with Royal Glow */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full p-2.5 bg-gradient-to-tr from-accent-400 via-primary-700 to-accent-300 shadow-2xl animate-fade-in flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Friends Collections"
                  className="w-full h-full object-contain bg-white rounded-full p-5 shadow-inner"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Bar */}
      <section className="relative -mt-6 sm:-mt-8 z-30 max-w-6xl mx-auto px-4 w-full">
        <div className="bg-white rounded-2xl shadow-card border border-accent-100 p-4 sm:p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 lg:divide-x divide-neutral-100">
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
            <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
              <HiOutlineTruck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 leading-tight">Free Shipping</h4>
              <p className="text-xs text-neutral-500 mt-0.5">On orders above ₹999</p>
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

      {/* Featured Categories (Horizontal Scroll on Mobile, Grid on Tablet/Desktop) */}
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

          {/* Department Filter Tabs (Smooth Horizontal Scroll on Mobile, Centered on Desktop) */}
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
            </div>
          </div>

          {/* Categories: Clean 2-column on Mobile, 3-col on Tablet, 5-col on Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
            {categories
              .filter((c) => !c.parent)
              .filter((c) => selectedGender === 'all' || c.gender === selectedGender || c.gender === 'all' || !c.gender)
              .map((cat) => (
                <Link
                  to={cat.gender ? `/shop?gender=${cat.gender}&category=${cat.slug}` : `/shop?category=${cat.slug}`}
                  key={cat._id}
                  className="group relative rounded-xl sm:rounded-2xl overflow-hidden aspect-[4/5] bg-neutral-100 shadow-xs hover:shadow-card-hover border border-accent-100 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <img
                    src={getImageUrl(cat.image)}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-950/85 via-primary-900/30 to-transparent flex flex-col justify-end p-3 sm:p-5">
                    <span className={`self-start mb-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${
                      cat.gender === 'men' ? 'bg-blue-600/80 text-white' : 'bg-rose-600/80 text-white'
                    }`}>
                      {cat.gender === 'men' ? 'Men' : 'Women'}
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

      {/* Trending Products (2-column on Mobile, Multi-column on Desktop) */}
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

            {/* Clean 2-column Grid on Mobile, 3 on Tablet, 4 on Desktop (Flipkart & Zantum Style) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {featured.slice(0, 8).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals (2-column on Mobile, Multi-column on Desktop) */}
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

          {/* Clean 2-column Grid on Mobile, 3 on Tablet, 4 on Desktop (Flipkart & Zantum Style) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {newArrivals.slice(0, 8).map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Physical Store & Jamalia Showroom Invitation */}
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
                  <span>7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 12</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <HiOutlinePhone className="w-5 h-5 text-accent-400 shrink-0" />
                  <span>Call/WhatsApp: +91 95007 57024</span>
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
                href="https://wa.me/919500757024?text=Hi%20Friends%20Collections%2C%20I%20would%20like%20to%20visit%20your%20store"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center px-6 py-3.5 rounded-full border border-accent-300/40 hover:bg-white/10 text-white font-medium text-sm transition-colors"
              >
                Chat with Us on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
