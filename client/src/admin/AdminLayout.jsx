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
  HiOutlineX
} from 'react-icons/hi';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AdminLayout = () => {
  const { user, isAdmin, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: HiOutlineHome, exact: true },
    { name: 'Orders', path: '/admin/orders', icon: HiOutlineClipboardList },
    { name: 'Products', path: '/admin/products', icon: HiOutlineShoppingBag },
    { name: 'Categories', path: '/admin/categories', icon: HiOutlineTag },
    { name: 'Hero Banners', path: '/admin/banners', icon: HiOutlinePhotograph },
    { name: 'Store Settings', path: '/admin/settings', icon: HiOutlineCog },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary-950 text-neutral-300 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-primary-900 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="FC" className="w-9 h-9 rounded-full bg-cream p-0.5 object-cover" />
            <div>
              <span className="font-serif text-base font-bold text-white block">Friends Collections</span>
              <span className="text-[10px] uppercase tracking-widest text-accent-400 font-semibold block">
                Admin Panel
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-neutral-400 hover:text-white"
          >
            <HiOutlineX className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'text-neutral-300 hover:bg-primary-900 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Storefront Link & Logout */}
        <div className="p-4 border-t border-primary-900 space-y-2">
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-neutral-300 hover:bg-primary-900 hover:text-white transition-colors"
          >
            <span>View Live Storefront</span>
            <HiOutlineExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors"
          >
            <HiOutlineLogout className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-neutral-200 py-3.5 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            >
              <HiOutlineMenu className="w-6 h-6" />
            </button>
            <span className="font-serif text-lg font-bold text-neutral-900">
              {navItems.find((n) =>
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

        {/* Dynamic Nested Page Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
