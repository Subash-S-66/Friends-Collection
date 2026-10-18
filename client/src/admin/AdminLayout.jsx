import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlineTag,
  HiOutlineClipboardList,
  HiOutlinePhotograph,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineExternalLink,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineMail,
  HiOutlineDocumentText
} from 'react-icons/hi';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';

const AdminLayout = () => {
  const { user, isAdmin, loading, logout } = useAuth();
  const { confirm } = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleAdminLogout = async () => {
    const ok = await confirm({
      title: 'Sign Out of Admin Control Panel?',
      message: 'Are you sure you want to sign out of the Friends Collections management dashboard?',
      type: 'logout',
      confirmText: 'Yes, Sign Out',
      cancelText: 'Stay in Admin',
      details: user ? `Administrator: ${user.name} (${user.email})` : null
    });
    if (ok) {
      logout();
      navigate('/login');
    }
  };

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-accent-300 border-t-accent-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/admin', icon: HiOutlineHome, exact: true },
      ],
    },
    {
      title: 'CATALOG & INVENTORY',
      items: [
        { name: 'Categories & Hierarchy', path: '/admin/categories', icon: HiOutlineTag, desc: 'Women, Men, Kids departments' },
        { name: 'Items & Products', path: '/admin/products', icon: HiOutlineShoppingBag, desc: 'All dresses organized by category' },
      ],
    },
    {
      title: 'ORDERS & CUSTOMERS',
      items: [
        { name: 'Customer Orders', path: '/admin/orders', icon: HiOutlineClipboardList, desc: 'Fulfillment & deliveries' },
      ],
    },
    {
      title: 'MARKETING & PROMOTIONS',
      items: [
        { name: 'Festival Campaigns', path: '/admin/campaigns', icon: HiOutlineMail, badge: 'Festive', desc: 'Email blasts & festive offers' },
        { name: 'Hero Slideshow', path: '/admin/banners', icon: HiOutlinePhotograph, desc: 'Homepage banners & headlines' },
      ],
    },
    {
      title: 'STORE CONFIGURATION',
      items: [
        { name: 'Store & Theme Settings', path: '/admin/settings', icon: HiOutlineCog, desc: 'Theme colors, shipping & copy' },
        { name: 'Universal Tax Invoice', path: '/admin/settings?tab=invoice', icon: HiOutlineDocumentText, badge: 'Unified', desc: 'Customize invoice layout & details' },
      ],
    },
  ];

  const allNavItems = navSections.flatMap((s) => s.items);

  return (
    <div className="h-screen w-full bg-neutral-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Rigid pinned column on desktop, sliding drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-primary-950 text-neutral-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:shrink-0 h-full ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header - Pinned at top of sidebar */}
        <div className="shrink-0 p-5 border-b border-primary-900 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="FC" className="w-10 h-10 rounded-full bg-cream p-0.5 object-cover shadow-sm" />
            <div>
              <span className="font-serif text-sm font-bold text-white block">Friends Collections</span>
              <span className="text-[10px] uppercase tracking-widest text-accent-400 font-semibold block">
                Management Console
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-primary-900 cursor-pointer"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Sectioned Navigation Links - Scrolls independently if links exceed vertical viewport */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto overscroll-contain">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 block">
                {section.title}
              </span>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const [itemPath, itemQuery] = item.path.split('?');
                  const currentQuery = location.search.replace(/^\?/, '');
                  const isActive = itemQuery
                    ? location.pathname === itemPath && currentQuery === itemQuery
                    : item.exact
                    ? location.pathname === itemPath && !currentQuery
                    : location.pathname.startsWith(itemPath) && (!currentQuery || itemPath !== '/admin/settings');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-accent-500 text-white shadow-md'
                          : 'text-neutral-300 hover:bg-primary-900/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white' : 'text-accent-300 group-hover:scale-110'}`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-400/20 text-accent-200 border border-accent-300/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Storefront Link & Logout - Pinned at bottom of sidebar */}
        <div className="shrink-0 p-4 border-t border-primary-900 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-300 hover:bg-primary-900 hover:text-white transition-colors"
          >
            <span>View Live Storefront</span>
            <HiOutlineExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer"
          >
            <HiOutlineLogout className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Full height column with independent scrolling content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar - Pinned at top, never scrolls */}
        <header className="shrink-0 bg-white border-b border-neutral-200 py-3.5 px-4 sm:px-8 flex items-center justify-between shadow-xs z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            >
              <HiOutlineMenu className="w-6 h-6" />
            </button>
            <span className="font-serif text-lg font-bold text-neutral-900">
              {allNavItems.find((n) =>
                n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
              )?.name || 'Control Panel'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Database Connected</span>
            </div>
            <span className="font-semibold text-neutral-700 bg-neutral-100 px-3 py-1.5 rounded-full">
              {user?.name} (Admin)
            </span>
          </div>
        </header>

        {/* Dynamic Nested Page Content - ONLY this area scrolls smoothly */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto overscroll-contain">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
