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
  HiOutlineChevronRight,
  HiOutlineLogout
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import API from '../utils/api';
import SearchAutocomplete from './SearchAutocomplete';
import AnnouncementBar from './AnnouncementBar';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTree, setCategoryTree] = useState([]);
  const [hiddenDepartments, setHiddenDepartments] = useState([]);
  
  const [announcement, setAnnouncement] = useState({
    text: '🎉 Free Shipping on Orders Above ₹999!',
    isActive: true,
  });

  // Flipkart Mega Menu state: 'women' | 'men' | 'kids' | null
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const leaveTimeoutRef = useRef(null);

  // Mobile drawer states
  const [mobileGenderTab, setMobileGenderTab] = useState('women');
  const [mobileExpandedCat, setMobileExpandedCat] = useState(null);

  const { totalItems, setIsCartOpen } = useCart();
  const { user, isAdmin, openAuthModal, logout } = useAuth();
  const { confirm } = useConfirm();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close user dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    const ok = await confirm({
      title: 'Sign Out of Account?',
      message: 'Are you sure you want to sign out of Friends Collections?',
      type: 'logout',
      confirmText: 'Yes, Sign Out',
      cancelText: 'Stay Signed In',
      details: user ? `Logged in as: ${user.name} (${user.email || user.phone})` : null
    });
    if (!ok) return;

    logout();
    toast.success('Signed out successfully.');
    navigate('/');
  };

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

  // Fetch settings & category tree dynamically from database
  useEffect(() => {
    API.get('/settings')
      .then((res) => {
        if (res.data?.announcementBar) {
          setAnnouncement(res.data.announcementBar);
        }
        if (Array.isArray(res.data?.hiddenDepartments)) {
          setHiddenDepartments(
            res.data.hiddenDepartments
              .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
              .filter(Boolean)
          );
        }
      })
      .catch(() => {});

    API.get('/categories/tree')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCategoryTree(res.data);
        }
      })
      .catch((err) => {
        console.error('Error fetching dynamic category tree:', err);
      });
  }, []);

  // Dynamic categories filtered directly from DB category tree
  const womenCategories = (categoryTree || []).filter((c) => c && (c.gender === 'women' || !c.gender));
  const menCategories = (categoryTree || []).filter((c) => c && c.gender === 'men');
  const kidsCategories = (categoryTree || []).filter((c) => c && c.gender === 'kids');

  // A department is only visible if it is NOT in hiddenDepartments AND has at least 1 active category
  const isWomenVisible = !hiddenDepartments.includes('women') && womenCategories.length > 0;
  const isMenVisible = !hiddenDepartments.includes('men') && menCategories.length > 0;
  const isKidsVisible = !hiddenDepartments.includes('kids') && kidsCategories.length > 0;

  // Ensure active mobile gender tab is visible
  useEffect(() => {
    const isTabHidden =
      (mobileGenderTab === 'women' && !isWomenVisible) ||
      (mobileGenderTab === 'men' && !isMenVisible) ||
      (mobileGenderTab === 'kids' && !isKidsVisible);

    if (isTabHidden) {
      if (isWomenVisible) setMobileGenderTab('women');
      else if (isMenVisible) setMobileGenderTab('men');
      else if (isKidsVisible) setMobileGenderTab('kids');
    }
  }, [isWomenVisible, isMenVisible, isKidsVisible, mobileGenderTab]);

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
            ? 'bg-white shadow-md border-accent-200'
            : 'bg-cream shadow-xs border-accent-100'
        }`}
      >
        {/* Dynamic Top Announcement Strip from DB Settings */}
        <AnnouncementBar announcement={announcement} />

        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          scrolled || activeMegaMenu ? 'py-2 sm:py-2.5' : 'py-3 sm:py-3.5'
        }`}>
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
                <span className="font-logo text-base sm:text-xl font-bold tracking-[0.25em] uppercase text-primary leading-tight group-hover:text-primary-light transition-colors">
                  FRIENDS
                </span>
                <span className="pl-1 text-[9px] sm:text-[11px] font-medium tracking-[0.28em] uppercase text-accent-700 leading-tight mt-0.5">
                  COLLECTIONS
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
              {isWomenVisible && (
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
              )}

              {/* MEN - Mega Menu Trigger */}
              {isMenVisible && (
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
              )}

              {/* KIDS - Mega Menu Trigger */}
              {isKidsVisible && (
                <div
                  className="relative py-2"
                  onMouseEnter={() => handleMouseEnter('kids')}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    to="/shop?gender=kids"
                    className={`inline-flex items-center gap-1.5 text-sm font-bold tracking-wider transition-all uppercase ${
                      activeMegaMenu === 'kids' || (location.pathname === '/shop' && currentGender === 'kids')
                        ? 'text-primary'
                        : 'text-neutral-800 hover:text-primary'
                    }`}
                  >
                    <span>Kids</span>
                    <HiChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        activeMegaMenu === 'kids' ? 'rotate-180 text-primary' : 'text-neutral-400'
                      }`}
                    />
                    {(activeMegaMenu === 'kids' || (location.pathname === '/shop' && currentGender === 'kids')) && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500 rounded-full animate-fade-in" />
                    )}
                  </Link>
                </div>
              )}

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

              {/* User Account / Sign In Popup */}
              {user ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="p-2 sm:p-2.5 rounded-full text-neutral-700 hover:text-primary hover:bg-accent-100/60 transition-colors relative cursor-pointer flex items-center justify-center"
                      aria-label="User Account Menu"
                      title={`Logged in as ${user.name}`}
                    >
                      <HiOutlineUser className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white" />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-accent-100 py-2 z-50 overflow-hidden text-left"
                        >
                          <div className="px-4 py-3 border-b border-neutral-100 bg-cream/40">
                            <p className="text-xs font-bold text-neutral-900 truncate">{user.name}</p>
                            <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                            {user.phone && (
                              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">+91 {user.phone}</p>
                            )}
                          </div>

                          <div className="py-1">
                            <Link
                              to="/account"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-accent-50 hover:text-primary transition-colors"
                            >
                              <span>🛍️</span>
                              <span>My Orders & Live Tracking</span>
                            </Link>

                            <Link
                              to="/account?tab=address"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-accent-50 hover:text-primary transition-colors"
                            >
                              <span>📍</span>
                              <span>Saved Addresses</span>
                            </Link>

                            {isAdmin && (
                              <Link
                                to="/admin"
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-primary hover:bg-primary-50 transition-colors"
                              >
                                <span>⚙️</span>
                                <span>Admin Dashboard</span>
                              </Link>
                            )}
                          </div>

                          <div className="pt-1 border-t border-neutral-100">
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                            >
                              <HiOutlineLogout className="w-4 h-4 text-red-500" />
                              <span>Sign Out / Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/account"
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-neutral-700 hover:text-primary hover:bg-accent-100/60 transition-all border border-neutral-200/80"
                    title="View orders with mobile number"
                  >
                    <span>My Orders</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-bold text-primary hover:bg-accent-100/70 border border-accent-200/80 hover:border-accent-300 transition-all shadow-2xs cursor-pointer"
                    aria-label="Sign In or Register"
                    title="Click to sign in or create an account"
                  >
                    <HiOutlineUser className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-accent-700" />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                </div>
              )}

              {/* Cart Drawer Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 sm:p-2.5 rounded-full text-neutral-700 hover:text-primary hover:bg-accent-100/60 transition-colors relative"
                aria-label="Open Shopping Bag"
              >
                <HiOutlineShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-scale-up font-numeric">
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
                {/* Mega Menu Content */}
                {(() => {
                  const currentGenderCats =
                    activeMegaMenu === 'women'
                      ? womenCategories
                      : activeMegaMenu === 'men'
                      ? menCategories
                      : kidsCategories;

                  // Adaptive Responsive:
                  // On lg (1024px-1279px): show max 4 category columns
                  // On xl (1280px+): show max 5 category columns + 1 spotlight card
                  const displayedCats = currentGenderCats.slice(0, 5);

                  return (
                    <>
                      {/* Mega Menu Top Strip */}
                      <div className="flex items-center justify-between pb-4 mb-6 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-accent-700">
                            {activeMegaMenu === 'women'
                              ? "Women's Fashion & Ethnic Studio"
                              : activeMegaMenu === 'men'
                              ? "Men's Sartorial & Traditional Studio"
                              : "Kids' Festive & Playful Studio"}
                          </span>
                        </div>
                        <Link
                          to={`/shop?gender=${activeMegaMenu}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent-700 transition-colors group"
                        >
                          <span>
                            View Entire {activeMegaMenu === 'women' ? "Women's" : activeMegaMenu === 'men' ? "Men's" : "Kids'"} Collection
                            {currentGenderCats.length > 0 && ` (${currentGenderCats.length} Categories)`}
                          </span>
                          <HiOutlineArrowNarrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>

                      {/* Columns Grid: Categories & Their Varieties/Types */}
                      <div className="grid grid-cols-4 xl:grid-cols-6 gap-6 items-start">
                        {displayedCats.map((cat, idx) => {
                          const visibleSubs = (cat.subcategories || []).slice(0, 4);
                          const remainingSubs = (cat.subcategories || []).length - visibleSubs.length;

                          return (
                            <div
                              key={cat._id || cat.slug}
                              className={`space-y-3 ${idx === 4 ? 'hidden xl:block' : ''}`}
                            >
                              {/* Column Header: Category */}
                              <Link
                                to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}`}
                                className="group flex items-center justify-between text-sm font-bold text-neutral-900 hover:text-primary transition-colors pb-1 border-b-2 border-transparent hover:border-accent-400"
                              >
                                <span className="font-serif tracking-tight truncate">{cat.name}</span>
                                <HiOutlineChevronRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                              </Link>

                              {/* Subcategory Types List (Capped at 4 for a clean, non-cluttered layout) */}
                              <ul className="space-y-1.5">
                                {visibleSubs.length > 0 ? (
                                  <>
                                    {visibleSubs.map((sub) => (
                                      <li key={sub._id || sub.slug}>
                                        <Link
                                          to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}&subcategory=${sub.slug}`}
                                          className="group flex items-center text-xs font-medium text-neutral-600 hover:text-primary hover:translate-x-1 transition-all py-1 truncate"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-accent-300 opacity-0 group-hover:opacity-100 mr-1.5 transition-opacity shrink-0" />
                                          <span className="truncate">{sub.name}</span>
                                        </Link>
                                      </li>
                                    ))}
                                    {remainingSubs > 0 ? (
                                      <li>
                                        <Link
                                          to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}`}
                                          className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-700 hover:text-primary pt-0.5 hover:underline"
                                        >
                                          <span>+ {remainingSubs} more types</span>
                                          <HiOutlineArrowNarrowRight className="w-3 h-3" />
                                        </Link>
                                      </li>
                                    ) : (
                                      <li>
                                        <Link
                                          to={`/shop?gender=${activeMegaMenu}&category=${cat.slug}`}
                                          className="text-[11px] font-semibold text-neutral-400 hover:text-primary pt-0.5 block hover:underline"
                                        >
                                          View all {cat.name} →
                                        </Link>
                                      </li>
                                    )}
                                  </>
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
                          );
                        })}

                        {/* Mega Menu Spotlight Card (Promotional highlight on xl) */}
                        <div className="col-span-1 hidden xl:block">
                          <div className="bg-gradient-to-br from-cream to-accent-100/70 p-4 rounded-2xl border border-accent-200 shadow-xs relative overflow-hidden">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                              <HiOutlineSparkles className="w-3.5 h-3.5 text-accent-600" />
                              <span>Curated Spotlight</span>
                            </div>
                            <h4 className="font-serif font-bold text-sm text-neutral-900 leading-snug mb-1">
                              {activeMegaMenu === 'women'
                                ? 'Pure Kanchipuram & Banarasi Silks'
                                : activeMegaMenu === 'men'
                                ? 'Handwoven Linens & Festive Raw Silks'
                                : 'Adorable Ethnic Pattu & Festive Sets'}
                            </h4>
                            <p className="text-[11px] text-neutral-600 leading-relaxed mb-3">
                              {activeMegaMenu === 'women'
                                ? 'Authentic zari craftsmanship from royal weavers of Tamil Nadu.'
                                : activeMegaMenu === 'men'
                                ? 'Structured breathable comfort tailored for weddings & celebrations.'
                                : 'Skin-friendly fabrics tailored for tender comfort and vibrant celebrations.'}
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

                      {/* Bottom Banner */}
                      <div className="mt-6 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                        <span className="hidden sm:inline">
                          ✨ Discover 100% authentic designer handlooms & ready-to-wear collections
                        </span>
                        <Link
                          to={`/shop?gender=${activeMegaMenu}`}
                          className="font-bold text-primary hover:text-accent-700 ml-auto flex items-center gap-1 hover:underline"
                        >
                          <span>Explore Full {activeMegaMenu === 'women' ? "Women's" : activeMegaMenu === 'men' ? "Men's" : "Kids'"} Catalog</span>
                          <HiOutlineArrowNarrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Search Bar (Amazon & Flipkart Style with Product Images & Live Dropdown) */}
        {searchOpen && (
          <div className="border-t border-b border-accent-200 bg-white shadow-xl px-4 py-3 animate-slide-down relative z-40">
            <div className="max-w-2xl mx-auto">
              <SearchAutocomplete
                autoFocus={true}
                onClose={() => setSearchOpen(false)}
                placeholder="Search silk sarees, anarkalis, linen shirts, festive kurtas..."
              />
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
                <div className="flex flex-col">
                  <span className="font-logo text-sm font-bold tracking-[0.22em] uppercase text-primary leading-tight">
                    FRIENDS
                  </span>
                  <span className="text-[8px] font-medium tracking-[0.26em] uppercase text-accent-700 leading-tight">
                    COLLECTIONS
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-accent-100/60"
              >
                <HiOutlineX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Quick Search Autocomplete in Mobile Drawer */}
              <div className="relative">
                <SearchAutocomplete
                  autoFocus={false}
                  onClose={() => setMobileOpen(false)}
                  placeholder="Search dresses, sarees, kurtis..."
                />
              </div>

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

              {/* Segmented Women, Men & Kids Switcher for Mobile */}
              <div className="bg-neutral-100 p-1 rounded-xl flex items-center gap-1">
                {isWomenVisible && (
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
                )}
                {isMenVisible && (
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
                )}
                {isKidsVisible && (
                  <button
                    type="button"
                    onClick={() => setMobileGenderTab('kids')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      mobileGenderTab === 'kids'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    🧒 Kids
                  </button>
                )}
              </div>

              {/* View Entire Gender Section Link */}
              <Link
                to={`/shop?gender=${mobileGenderTab}`}
                onClick={() => setMobileOpen(false)}
                className="block text-center py-2 px-3 rounded-xl bg-accent-100/70 border border-accent-200 text-xs font-bold text-primary hover:bg-accent-200 transition-colors"
              >
                Explore All {mobileGenderTab === 'women' ? "Women's" : mobileGenderTab === 'men' ? "Men's" : "Kids'"} Collection →
              </Link>

              {/* Categories & Accordion Types */}
              <div className="space-y-1.5 pt-1">
                {(mobileGenderTab === 'women' ? womenCategories : mobileGenderTab === 'men' ? menCategories : kidsCategories).map((cat) => {
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
                        {/* Direct Category Name Text: Tapping text navigates to that category and scrolls to applied filters on mobile */}
                        <Link
                          to={`/shop?gender=${mobileGenderTab}&category=${cat.slug}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents toggling dropdown when text is tapped
                            setMobileOpen(false);
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
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-primary bg-primary-50 hover:bg-primary-100 flex items-center justify-between shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <span>🛍️ My Orders & Live Tracking</span>
                  </span>
                  <HiOutlineChevronRight className="w-4 h-4 text-primary" />
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-semibold text-neutral-700 hover:bg-accent-100/60"
                >
                  Contact & Store Location
                </Link>

                {user ? (
                  <div className="space-y-1.5 pt-2">
                    <div className="px-3 text-[11px] font-bold text-accent-700 uppercase tracking-wider">
                      Signed in as {user.name}
                    </div>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-accent-100/60"
                    >
                      My Profile & Saved Address
                    </Link>
                    <Link
                      to="/account/orders"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-lg text-xs font-medium text-neutral-700 hover:bg-accent-100/60"
                    >
                      My Orders
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer mt-1"
                    >
                      <HiOutlineLogout className="w-4 h-4 text-red-500" />
                      <span>Sign Out / Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-bold text-neutral-800 bg-neutral-100/80 hover:bg-accent-100/60 text-center"
                    >
                      📦 View Orders (Lookup by Mobile)
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        openAuthModal('login');
                      }}
                      className="w-full block px-3 py-2.5 rounded-xl text-xs font-bold text-primary bg-accent-100/70 hover:bg-accent-100 text-center shadow-xs cursor-pointer"
                    >
                      Sign In / Register
                    </button>
                  </div>
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
      <div className={announcement?.isActive && Boolean(announcement?.text) ? 'h-24 sm:h-28' : 'h-16 sm:h-20'} />
    </>
  );
};

export default Navbar;
