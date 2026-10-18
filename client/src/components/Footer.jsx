import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineLocationMarker, HiOutlinePhone, HiOutlineMail } from 'react-icons/hi';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa';
import API from '../utils/api';

const Footer = () => {
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    Promise.all([
      API.get('/settings').catch(() => ({ data: {} })),
      API.get('/categories').catch(() => ({ data: [] }))
    ]).then(([settingsRes, catsRes]) => {
      setSettings(settingsRes.data && typeof settingsRes.data === 'object' ? settingsRes.data : {});
      const safeCats = Array.isArray(catsRes.data) ? catsRes.data.filter(c => !c.parent && c.isActive !== false) : [];
      setCategories(safeCats.slice(0, 6));
    }).catch(err => {
      console.error('Footer load error:', err);
    });
  }, []);

  const storePhone = settings.storePhone || '+91 95007 57024';
  const whatsappNum = settings.whatsappNumber || '919500757024';
  const storeAddress = settings.storeAddress || '7/4 Perambur High Road, 1st Cross St, Jamalia, Chennai – 600012';
  const storeEmail = settings.storeEmail || 'friends.collection06@gmail.com';
  const storeName = settings.storeName || 'Friends Collections';
  const tagline = settings.tagline || 'Style That Defines You';

  return (
    <footer className="bg-primary-900 text-cream/90 pt-16 pb-8 border-t-4 border-accent-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pb-12 border-b border-primary-800">
          {/* Brand Info */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt={storeName}
                className="w-12 h-12 object-contain rounded-full bg-cream-light p-0.5 shadow-md"
              />
              <div className="flex flex-col">
                <span className="font-logo text-xl sm:text-2xl font-bold tracking-[0.25em] uppercase text-white leading-tight block">
                  FRIENDS
                </span>
                <span className="text-[10px] sm:text-xs font-medium tracking-[0.28em] uppercase text-accent-300 leading-tight mt-0.5 block">
                  COLLECTIONS
                </span>
              </div>
            </Link>
            <p className="text-sm text-neutral-300 font-light leading-relaxed">
              &ldquo;{tagline}&rdquo;. Chennai&apos;s premier destination for trending ethnic dresses, sarees, kurtis, and designer wear at honest prices.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com/friends_collection_in"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-800 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-500 flex items-center justify-center text-white transition-all transform hover:-translate-y-1 shadow-sm"
                aria-label="Instagram"
              >
                <FaInstagram className="w-5 h-5" />
              </a>
              <a
                href={`https://wa.me/${whatsappNum}?text=Hi%20Friends%20Collections%2C%20I%20want%20to%20inquire%20about%20your%20products`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-primary-800 hover:bg-emerald-600 flex items-center justify-center text-white transition-all transform hover:-translate-y-1 shadow-sm"
                aria-label="WhatsApp"
              >
                <FaWhatsapp className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-accent-200 mb-4 pb-1 border-b border-primary-800 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-300">
              <li>
                <Link to="/" className="hover:text-accent-300 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-accent-300 transition-colors">Shop All Dresses</Link>
              </li>
              <li>
                <Link to="/shop?tag=new-arrival" className="hover:text-accent-300 transition-colors">New Arrivals</Link>
              </li>
              <li>
                <Link to="/shop?tag=trending" className="hover:text-accent-300 transition-colors">Trending Today</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-accent-300 transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-accent-300 transition-colors">Contact & Location</Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-accent-300 transition-colors font-semibold text-accent-300">📦 Track Your Order</Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-accent-300 transition-colors">My Account & Orders</Link>
              </li>
            </ul>
          </div>

          {/* Popular Categories from DB */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-accent-200 mb-4 pb-1 border-b border-primary-800 inline-block">
              Featured Categories
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-300">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat._id || cat.slug}>
                    <Link
                      to={cat.gender ? `/shop?gender=${cat.gender}&category=${cat.slug}` : `/shop?category=${cat.slug}`}
                      className="hover:text-accent-300 transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/shop?category=sarees" className="hover:text-accent-300 transition-colors">Designer Sarees</Link></li>
                  <li><Link to="/shop?category=salwar-suits" className="hover:text-accent-300 transition-colors">Salwar Suits</Link></li>
                  <li><Link to="/shop?category=kurtis" className="hover:text-accent-300 transition-colors">Anarkalis & Kurtis</Link></li>
                  <li><Link to="/shop?category=lehengas" className="hover:text-accent-300 transition-colors">Bridal & Party Lehengas</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Store Info & Support from DB */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-accent-200 mb-4 pb-1 border-b border-primary-800 inline-block">
              Store & Support
            </h4>
            <ul className="space-y-3 text-sm text-neutral-300">
              <li className="flex items-start gap-3">
                <HiOutlineLocationMarker className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
                <span>{storeAddress}</span>
              </li>
              <li className="flex items-start gap-3">
                <HiOutlinePhone className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <a href={`tel:${storePhone.replace(/\s/g, '')}`} className="hover:text-white font-medium">
                    {storePhone}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <HiOutlineMail className="w-5 h-5 text-accent-400 shrink-0" />
                <a href={`mailto:${storeEmail}`} className="hover:text-white break-all text-xs">
                  {storeEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <p>© {new Date().getFullYear()} {storeName}. All Rights Reserved.</p>
          <p className="flex items-center gap-1.5">
            Designed with <span className="text-red-400">♥</span> in Chennai for effortless shopping
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
