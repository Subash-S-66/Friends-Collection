import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineShoppingBag,
  HiOutlineUser,
  HiOutlineSearch,
  HiOutlineMenu,
  HiOutlineX,
  HiChevronDown,
  HiChevronUp,
  HiOutlineArrowNarrowRight,
  HiOutlineSparkles,
  HiOutlineChevronRight
} from 'react-icons/hi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const defaultWomenTree = [
  {
    name: 'Sarees',
    slug: 'sarees',
    gender: 'women',
    subcategories: [
      { name: 'Banarasi Silk Sarees', slug: 'banarasi-silk' },
      { name: 'Kanchipuram Silk Sarees', slug: 'kanchipuram-silk' },
      { name: 'Pure Cotton Sarees', slug: 'cotton-sarees' },
      { name: 'Party Wear Sarees', slug: 'party-wear-sarees' }
    ]
  },
  {
    name: 'Salwar Suits',
    slug: 'salwar-suits',
    gender: 'women',
    subcategories: [
      { name: 'Anarkali Suits', slug: 'anarkali-suits' },
      { name: 'Straight Cut Suits', slug: 'straight-cut-suits' },
      { name: 'Sharara & Gharara Sets', slug: 'sharara-sets' }
    ]
  },
  {
    name: 'Kurtis & Tunics',
    slug: 'kurtis',
    gender: 'women',
    subcategories: [
      { name: 'A-Line Kurtis', slug: 'a-line-kurtis' },
      { name: 'Short Kurtis', slug: 'short-kurtis' },
      { name: 'Festive Wear Kurtis', slug: 'festive-kurtis' }
    ]
  },
  {
    name: 'Lehengas',
    slug: 'lehengas',
    gender: 'women',
    subcategories: [
      { name: 'Bridal Lehengas', slug: 'bridal-lehengas' },
      { name: 'Party Wear Lehengas', slug: 'party-wear-lehengas' }
    ]
  },
  {
    name: 'Western & Co-ords',
    slug: 'western-wear',
    gender: 'women',
    subcategories: [
      { name: 'Co-ord Sets', slug: 'co-ord-sets' },
      { name: 'Maxi Dresses', slug: 'maxi-dresses' }
    ]
  }
];

const defaultMenTree = [
  {
    name: 'Shirts',
    slug: 'men-shirts',
    gender: 'men',
    subcategories: [
      { name: 'Pure Linen Shirts', slug: 'men-linen-shirts' },
      { name: 'Casual Printed Shirts', slug: 'men-printed-shirts' },
      { name: 'Formal Oxford Shirts', slug: 'men-formal-shirts' }
    ]
  },
  {
    name: 'Kurtas & Ethnic',
    slug: 'men-kurtas',
    gender: 'men',
    subcategories: [
      { name: 'Short Festive Kurtas', slug: 'men-short-kurtas' },
      { name: 'Kurta Pajama Sets', slug: 'men-kurta-sets' },
      { name: 'Nehru & Modi Jackets', slug: 'men-nehru-jackets' }
    ]
  },
  {
    name: 'Trousers & Pants',
    slug: 'men-trousers',
    gender: 'men',
    subcategories: [
      { name: 'Stretch Chinos', slug: 'men-chinos' },
      { name: 'Tailored Formal Trousers', slug: 'men-formal-pants' },
      { name: 'Casual Cargos', slug: 'men-cargos' }
    ]
  },
  {
    name: 'T-Shirts & Polos',
    slug: 'men-tshirts',
    gender: 'men',
    subcategories: [
      { name: 'Oversized Tees', slug: 'men-oversized-tees' },
      { name: 'Classic Pique Polos', slug: 'men-classic-polos' }
    ]
  },
  {
    name: 'Suits & Blazers',
    slug: 'men-suits',
    gender: 'men',
    subcategories: [
      { name: 'Wedding & Festive Blazers', slug: 'men-wedding-blazers' },
      { name: 'Slim Fit Formal Suits', slug: 'men-slim-suits' }
    ]
  }
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTree, setCategoryTree] = useState([]);
  
  // Flipkart Mega Menu state: 'women' | 'men' | null
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const leaveTimeoutRef = useRef(null);

  // Mobile drawer states
  const [mobileGenderTab, setMobileGenderTab] = useState('women');
  const [mobileExpandedCat, setMobileExpandedCat] = useState(null);

  const { totalItems, setIsCartOpen } = useCart();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setActiveMegaMenu(null);
  }, [location]);

  // Fetch category tree from backend
  useEffect(() => {
    API.get('/categories/tree')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCategoryTree(res.data);
        } else {
          setCategoryTree([...defaultWomenTree, ...defaultMenTree]);
        }
      })
      .catch(() => {
        setCategoryTree([...defaultWomenTree, ...defaultMenTree]);
      });
  }, []);

  // Filter categories by gender
  const allCategories = categoryTree.length > 0 ? categoryTree : [...defaultWomenTree, ...defaultMenTree];
  const womenCategories = allCategories.filter((c) => c.gender === 'women' || !c.gender);
  const menCategories = allCategories.filter((c) => c.gender === 'men');

  // Handle smooth mouse enter/leave for mega menu
  const handleMouseEnter = (gender) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setActiveMegaMenu(gender);
  };

  const handleMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 180);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  // Check active gender in current URL
  const currentGender = new URLSearchParams(location.search).get('gender');

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${
          scrolled || activeMegaMenu
            ? 'bg-white shadow-md py-2.5 border-accent-200'
            : 'bg-cream shadow-xs py-3.5 border-accent-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-primary hover:bg-primary-50 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Friends Collections"
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-full shadow-sm group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-serif text-lg sm:text-2xl font-bold tracking-tight text-primary leading-tight">
                  Friends
                </span>
                <span className="text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-accent-700 -mt-0.5">
                  Collections
                </span>
              </div>
            </Link>

            {/* Desktop Navigation - Clean, Non-overwhelming Flipkart-style Men & Women Hub */}
            <nav className="hidden lg:flex items-center gap-7 xl:gap-9">
              {/* Home */}
              <Link
                to="/"
                className={`text-sm font-semibold tracking-wide transition-all relative py-2 ${
                  location.pathname === '/' && !location.search ? 'text-primary' : 'text-neutral-700 hover:text-primary'
                }`}
              >
                Home
                {location.pathname === '/' && !location.search && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500 rounded-full animate-fade-in" />
                )}
              </Link>

              {/* WOMEN - Mega Menu Trigger */}
              <div
                className="relative py-2"
                onMouseEnter={() => handleMouseEnter('women')}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/shop?gender=women"
                  className={`inline-flex items-center gap-1.5 text-sm font-bold tracking-wider transition-all uppercase ${
                    activeMegaMenu === 'women' || (location.pathname === '/shop' && currentGender === 'women')
                      ? 'text-primary'
                      : 'text-neutral-800 hover:text-primary'
                  }`}
                >
                  <span>Women</span>
                  <HiChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeMegaMenu === 'women' ? 'rotate-180 text-primary' : 'text-neutral-400'
                    }`}
                  />
                  {(activeMegaMenu === 'women' || (location.pathname === '/shop' && currentGender === 'women')) && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500 rounded-full animate-fade-in" />
                  )}
                </Link>
              </div>

              {/* MEN - Mega Menu Trigger */}
              <div
                className="relative py-2"
                onMouseEnter={() => handleMouseEnter('men')}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/shop?gender=men"
                  className={`inline-flex items-center gap-1.5 text-sm font-bold tracking-wider transition-all uppercase ${
                    activeMegaMenu === 'men' || (location.pathname === '/shop' && currentGender === 'men')
                      ? 'text-primary'
                      : 'text-neutral-800 hover:text-primary'
                  }`}
                >
                  <span>Men</span>
                  <HiChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      activeMegaMenu === 'men' ? 'rotate-180 text-primary' : 'text-neutral-400'
                    }`}
                  />
                  {(activeMegaMenu === 'men' || (location.pathname === '/shop' && currentGender === 'men')) && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500 rounded-full animate-fade-in" />
                  )}
                </Link>
              </div>

              {/* Shop All */}
              <Link
                to="/shop"
                className={`text-sm font-semibold tracking-wide transition-all relative py-2 ${
                  location.pathname === '/shop' && !currentGender ? 'text-primary' : 'text-neutral-700 hover:text-primary'
                }`}
              >
                Shop All
                {location.pathname === '/shop' && !currentGender && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500 rounded-full animate-fade-in" />
                )}
              </Link>

              {/* About */}
              <Link
                to="/about"
                className={`text-sm font-medium transition-all relative py-2 ${
                  location.pathname === '/about' ? 'text-primary font-semibold' : 'text-neutral-700 hover:text-primary'
                }`}
              >
                About
              </Link>

              {/* Contact */}
              <Link
                to="/contact"
                className={`text-sm font-medium transition-all relative py-2 ${
                  location.pathname === '/contact' ? 'text-primary font-semibold' : 'text-neutral-700 hover:text-primary'
                }`}
              >
                Contact
              </Link>
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Search Toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 sm:p-2.5 rounded-full text-neutral-700 hover:text-primary hover:bg-accent-100/60 transition-colors"
                aria-label="Search products"
                title="Search dresses"
              >
                <HiOutlineSearch className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* User Account */}
              <Link
                to={user ? (isAdmin ? '/admin' : '/account') : '/login'}
                className="p-2 sm:p-2.5 rounded-full text-neutral-700 hover:text-primary hover:bg-accent-100/60 transition-colors relative"
                aria-label="User Account"
                title={user ? `Logged in as ${user.name}` : 'Login'}
              >
                <HiOutlineUser className="w-5 h-5 sm:w-6 sm:h-6" />
                {user && (
                  <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                )}
              </Link>

              {/* Cart Drawer Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 sm:p-2.5 rounded-full text-neutral-700 hover:text-primary hover:bg-accent-100/60 transition-colors relative"
                aria-label="Open Shopping Bag"
              >
                <HiOutlineShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale-up">
                    {totalItems}
                  </span>
                )}
              </button>

              {/* Admin Button */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-light shadow-sm transition-all"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* FLIPKART-STYLE MEGA-MENU DROPDOWN ON HOVER */}
        {activeMegaMenu && (
          <div
            className="hidden lg:block absolute top-full left-0 right-0 z-50 animate-fade-in"
            onMouseEnter={() => handleMouseEnter(activeMegaMenu)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="bg-white border-b-2 border-accent-200 shadow-2xl transition-all">
              <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Mega Menu Top Strip */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-700">
                      {activeMegaMenu === 'women' ? "Women's Fashion & Ethnic Studio" : "Men's Sartorial & Traditional Studio"}
                    </span>
                  </div>
                  <Link
                    to={`/shop?gender=${activeMegaMenu}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent-700 transition-colors group"
                  >
                    <span>View All {activeMegaMenu === 'women' ? "Women's" : "Men's"} Collection</span>
                    <HiOutlineArrowNarrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Columns Grid: Categories & Their Varieties/Types */}
                <div className="grid grid-cols-5 xl:grid-cols-6 gap-6 items-start">
                  {(activeMegaMenu === 'women' ? womenCategories : menCategories).map((cat) => (
                    <div key={cat._id || cat.slug} className="space-y-3">
                      {/* Column Header: Category */}
                      <Link
                        to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}`}
                        className="group flex items-center justify-between text-sm font-bold text-neutral-900 hover:text-primary transition-colors pb-1 border-b-2 border-transparent hover:border-accent-400"
                      >
                        <span className="font-serif tracking-tight">{cat.name}</span>
                        <HiOutlineChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </Link>

                      {/* Subcategory Types List */}
                      <ul className="space-y-1.5">
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                          cat.subcategories.map((sub) => (
                            <li key={sub._id || sub.slug}>
                              <Link
                                to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}&subcategory=${sub.slug}`}
                                className="group flex items-center text-xs font-medium text-neutral-600 hover:text-primary hover:translate-x-1 transition-all py-1"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-300 opacity-0 group-hover:opacity-100 mr-1.5 transition-opacity" />
                                <span>{sub.name}</span>
                              </Link>
                            </li>
                          ))
                        ) : (
                          <li>
                            <Link
                              to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}`}
                              className="text-xs font-medium text-neutral-400 hover:text-primary py-1 block"
                            >
                              Explore {cat.name}
                            </Link>
                          </li>
                        )}
                      </ul>
                    </div>
                  ))}

                  {/* Mega Menu Spotlight Card (Like Flipkart Fashion Promotions) */}
                  <div className="col-span-1 hidden xl:block">
                    <div className="bg-gradient-to-br from-cream to-accent-100/70 p-4 rounded-2xl border border-accent-200 shadow-xs relative overflow-hidden">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                        <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-600" />
                        <span>Curated Spotlight</span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-neutral-900 leading-snug mb-1">
                        {activeMegaMenu === 'women'
                          ? 'Pure Kanchipuram & Banarasi Silks'
                          : 'Handwoven Linens & Festive Raw Silks'}
                      </h4>
                      <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                        {activeMegaMenu === 'women'
                          ? 'Authentic zari craftsmanship from royal weavers of Tamil Nadu.'
                          : 'Structured breathable comfort tailored for weddings & celebrations.'}
                      </p>
                      <Link
                        to={`/shop?gender=${activeMegaMenu}&tag=trending`}
                        className="inline-flex items-center justify-center w-full py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-all shadow-xs"
                      >
                        Explore Trending
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Search Bar */}
        {searchOpen && (
          <div className="border-t border-b border-accent-200 bg-white shadow-md px-4 py-3 animate-slide-down">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="relative flex items-center">
                <HiOutlineSearch className="absolute left-3.5 w-5 h-5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search silk sarees, anarkalis, linen shirts, festive kurtas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 bg-white border border-accent-200 rounded-full text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-3 p-1 rounded-full text-neutral-400 hover:text-neutral-700"
                >
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Drawer (Organized with Segmented Women/Men Tabs - Left-to-Right Animation) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />

            {/* Drawer Content - Slides in from Left to Right */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 max-w-xs w-full bg-cream-light shadow-2xl flex flex-col z-10"
            >
            <div className="p-4 flex items-center justify-between border-b border-accent-100">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="FC" className="w-9 h-9 object-contain rounded-full" />
                <span className="font-serif text-lg font-bold text-primary">Friends Collections</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-accent-100/60"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Home & Shop All Links */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2 px-3 rounded-xl bg-white border border-accent-200/80 text-xs font-semibold text-neutral-800 hover:text-primary hover:border-primary shadow-xs"
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setMobileOpen(false)}
                  className="text-center py-2 px-3 rounded-xl bg-white border border-accent-200/80 text-xs font-semibold text-neutral-800 hover:text-primary hover:border-primary shadow-xs"
                >
                  Shop All
                </Link>
              </div>

              {/* Segmented Women & Men Switcher for Mobile */}
              <div className="bg-neutral-100 p-1 rounded-xl flex items-center">
                <button
                  type="button"
                  onClick={() => setMobileGenderTab('women')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    mobileGenderTab === 'women'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  🌸 Women
                </button>
                <button
                  type="button"
                  onClick={() => setMobileGenderTab('men')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    mobileGenderTab === 'men'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  👔 Men
                </button>
              </div>

              {/* View Entire Gender Section Link */}
              <Link
                to={`/shop?gender=${mobileGenderTab}`}
                onClick={() => setMobileOpen(false)}
                className="block text-center py-2 px-3 rounded-xl bg-accent-100/70 border border-accent-200 text-xs font-bold text-primary hover:bg-accent-200 transition-colors"
              >
                Explore All {mobileGenderTab === 'women' ? "Women's" : "Men's"} Collection →
              </Link>

              {/* Categories & Accordion Types */}
              <div className="space-y-1.5 pt-1">
                {(mobileGenderTab === 'women' ? womenCategories : menCategories).map((cat) => {
                  const hasSubs = cat.subcategories && cat.subcategories.length > 0;
                  const isExpanded = mobileExpandedCat === cat.slug;

                  return (
                    <div key={cat._id || cat.slug} className="rounded-xl border border-accent-100/80 bg-white overflow-hidden shadow-xs">
                      {/* Category Header Row: Tapping text navigates, tapping blank space toggles dropdown */}
                      <div
                        onClick={() => {
                          if (hasSubs) {
                            setMobileExpandedCat(isExpanded ? null : cat.slug);
                          }
                        }}
                        className={`flex items-center justify-between p-3 select-none ${
                          hasSubs ? 'cursor-pointer hover:bg-neutral-50 active:bg-neutral-100' : ''
                        }`}
                      >
                        {/* Direct Category Name Text: Tapping text navigates to that category and scrolls to top */}
                        <Link
                          to={`/shop?gender=${mobileGenderTab}&category=${cat.slug}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents toggling dropdown when text is tapped
                            setMobileOpen(false);
                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                          }}
                          className="text-xs font-bold text-neutral-900 hover:text-primary active:text-primary py-0.5 px-1 -ml-1 rounded transition-colors inline-block"
                        >
                          {cat.name}
                        </Link>

                        {/* Blank Space + Chevron: Tapping here toggles the accordion dropdown */}
                        {hasSubs && (
                          <div className="flex-1 flex items-center justify-end py-1 pl-4">
                            <span className="p-1 rounded text-neutral-400 hover:text-primary">
                              {isExpanded ? <HiChevronUp className="w-4 h-4 text-primary" /> : <HiChevronDown className="w-4 h-4 text-neutral-500" />}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Subcategories Accordion */}
                      {hasSubs && isExpanded && (
                        <div className="bg-cream/60 px-3 py-2 border-t border-neutral-100 space-y-1">
                          {cat.subcategories.map((sub) => (
                            <Link
                              key={sub._id || sub.slug}
                              to={`/shop?gender=${mobileGenderTab}&category=${cat.slug}&subcategory=${sub.slug}`}
                              onClick={() => {
                                setMobileOpen(false);
                                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                              }}
                              className="block py-1.5 px-2 rounded-lg text-xs font-medium text-neutral-600 hover:text-primary hover:bg-white transition-colors"
                            >
                              • {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer Links & Account */}
              <div className="pt-3 border-t border-accent-200/60 space-y-2">
                <Link
                  to="/about"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-accent-100/60"
                >
                  About Us
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-accent-100/60"
                >
                  Contact & Store Location
                </Link>

                {user ? (
                  <>
                    <div className="px-3 pt-2 text-[11px] font-bold text-accent-700 uppercase tracking-wider">
                      Signed in as {user.name}
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-xs text-neutral-700 hover:bg-accent-100/60"
                    >
                      My Profile & Saved Address
                    </Link>
                    <Link
                      to="/account/orders"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-xs text-neutral-700 hover:bg-accent-100/60"
                    >
                      My Orders
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-xs font-bold text-primary bg-accent-100/70 hover:bg-accent-100 text-center shadow-xs"
                  >
                    Login / Sign Up
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="block px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-light text-center shadow-xs"
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-accent-100 bg-cream text-[11px] text-neutral-500 text-center font-medium">
              📞 95007 57024 | 7/4 Perambur High Road, Jamalia, Chennai
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Header spacer to prevent content overlap */}
      <div className="h-16 sm:h-20" />
    </>
  );
};

export default Navbar;
