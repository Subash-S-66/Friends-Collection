import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineViewGrid,
  HiOutlineShoppingBag,
  HiOutlineTag,
  HiOutlineClipboardList,
  HiOutlinePhotograph,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineExternalLink,
  HiOutlineMenu,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineMail,
  HiOutlineDocumentText,
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('adminSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('adminSidebarCollapsed', String(next));
      } catch (e) {
        console.warn('Could not save sidebar state to localStorage', e);
      }
      return next;
    });
  };

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
        { name: 'Dashboard', path: '/admin', icon: HiOutlineViewGrid, exact: true },
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
    <div className="fixed inset-0 z-0 bg-neutral-50 flex overflow-hidden w-screen h-screen">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Fixed full-height column pinned to left edge */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:static lg:z-auto h-full shrink-0 bg-primary-950 text-neutral-300 flex flex-col transition-all duration-300 ease-in-out select-none ${
          sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Brand Header - Pinned at top of sidebar */}
        <div className={`shrink-0 border-b border-primary-900 flex items-center transition-all duration-300 ${
          isCollapsed ? 'lg:p-3 lg:justify-center' : 'p-4 justify-between'
        }`}>
          <Link
            to="/"
            className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:justify-center' : ''}`}
            title="Friends Collections Management Console"
          >
            <img
              src="/logo.png"
              alt="FC"
              className="w-10 h-10 rounded-full bg-cream p-0.5 object-cover shadow-sm shrink-0"
            />
            <div className={`min-w-0 transition-opacity duration-200 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <span className="font-serif text-sm font-bold text-white block truncate">Friends Collections</span>
              <span className="text-[10px] uppercase tracking-widest text-accent-400 font-semibold block truncate">
                Management Console
              </span>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-primary-900 cursor-pointer"
            title="Close Sidebar"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>

          {/* Desktop Collapse Toggle in Sidebar Header (visible when expanded) */}
          <button
            onClick={toggleSidebarCollapse}
            className={`hidden lg:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-primary-900 transition-colors cursor-pointer ${
              isCollapsed ? 'lg:hidden' : ''
            }`}
            title="Minimize Sidebar"
          >
            <HiOutlineChevronDoubleLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Sectioned Navigation Links - Scrolls independently if links exceed vertical viewport */}
        <nav className={`flex-1 overflow-y-auto overscroll-contain transition-all duration-300 ${
          isCollapsed ? 'p-2 space-y-4' : 'p-4 space-y-6'
        }`}>
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1.5">
              {isCollapsed ? (
                <div
                  className="hidden lg:block h-px bg-primary-900/60 my-2 mx-1"
                  title={section.title}
                />
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 block truncate">
                  {section.title}
                </span>
              )}
              {/* Also ensure on mobile it always displays the title */}
              {isCollapsed && (
                <span className="lg:hidden text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 block">
                  {section.title}
                </span>
              )}
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
                      title={`${item.name}${item.desc ? ` — ${item.desc}` : ''}`}
                      className={`group relative flex items-center ${
                        isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3.5'
                      } py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-accent-500 text-white shadow-md'
                          : 'text-neutral-300 hover:bg-primary-900/80 hover:text-white'
                      }`}
                    >
                      <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'} min-w-0`}>
                        <Icon
                          className={`w-5 h-5 shrink-0 transition-transform ${
                            isActive ? 'text-white' : 'text-accent-300 group-hover:scale-110'
                          }`}
                        />
                        <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                          {item.name}
                        </span>
                      </div>
                      {/* Badge in expanded mode */}
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-400/20 text-accent-200 border border-accent-300/30 ${
                            isCollapsed ? 'lg:hidden' : 'inline-block'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {/* Compact dot badge in collapsed mode on desktop */}
                      {isCollapsed && item.badge && (
                        <span
                          className="hidden lg:block absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-400 ring-2 ring-primary-950"
                          title={item.badge}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Storefront Link & Logout - Pinned at bottom of sidebar */}
        <div className={`shrink-0 border-t border-primary-900 space-y-1.5 transition-all duration-300 ${
          isCollapsed ? 'p-2' : 'p-4 space-y-2'
        }`}>
          <Link
            to="/"
            title="Go to Customer Home Page"
            className={`flex items-center ${
              isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3.5'
            } py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:bg-primary-900 hover:text-white transition-colors group`}
          >
            <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'} min-w-0`}>
              <HiOutlineHome className="w-5 h-5 shrink-0 text-accent-400 group-hover:scale-110 transition-transform" />
              <span className={isCollapsed ? 'lg:hidden' : 'block'}>Go to Home Page</span>
            </div>
            {!isCollapsed && <HiOutlineExternalLink className="w-4 h-4 text-neutral-400" />}
          </Link>
          <button
            onClick={handleAdminLogout}
            title="Sign Out of Admin"
            className={`w-full flex items-center ${
              isCollapsed ? 'lg:justify-center lg:px-2' : 'gap-3 px-3.5'
            } py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors cursor-pointer`}
          >
            <HiOutlineLogout className="w-5 h-5 shrink-0" />
            <span className={isCollapsed ? 'lg:hidden' : 'block'}>Sign Out</span>
          </button>
        </div>

        {/* Desktop Expand / Minimize Toggle Bar at bottom of sidebar */}
        <div className="hidden lg:flex items-center justify-center p-2.5 border-t border-primary-900/60 bg-primary-950/80">
          <button
            onClick={toggleSidebarCollapse}
            className="w-full flex items-center justify-center gap-2 py-2 px-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-primary-900/80 transition-all cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
          >
            {isCollapsed ? (
              <HiOutlineChevronDoubleRight className="w-5 h-5 text-accent-400" />
            ) : (
              <>
                <HiOutlineChevronDoubleLeft className="w-4 h-4 text-accent-400" />
                <span className="text-[11px] font-semibold text-neutral-300">Minimize Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area - Full height column with independent scrolling content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar - Pinned at top, never scrolls */}
        <header className="shrink-0 bg-white border-b border-neutral-200 py-3.5 px-4 sm:px-8 flex items-center justify-between shadow-xs z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Drawer Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 cursor-pointer"
              title="Open Navigation"
            >
              <HiOutlineMenu className="w-6 h-6" />
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex p-2 rounded-xl text-neutral-600 hover:text-primary hover:bg-neutral-100 transition-colors cursor-pointer border border-neutral-200/80"
              title={isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}
            >
              {isCollapsed ? (
                <HiOutlineChevronDoubleRight className="w-5 h-5 text-primary" />
              ) : (
                <HiOutlineMenuAlt2 className="w-5 h-5" />
              )}
            </button>

            <span className="font-serif text-lg font-bold text-neutral-900">
              {allNavItems.find((n) =>
                n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path)
              )?.name || 'Control Panel'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Go to Home Page Button */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-accent-50 text-neutral-700 hover:text-primary font-bold text-xs transition-colors shadow-2xs group"
              title="Return to Customer Storefront / Home Page"
            >
              <HiOutlineHome className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              <span>Go to Home Page</span>
            </Link>

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
