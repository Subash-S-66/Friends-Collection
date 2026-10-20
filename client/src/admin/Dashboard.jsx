import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCurrencyRupee,
  HiOutlineShoppingBag,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlinePlus,
  HiOutlineArrowRight,
  HiOutlinePhone,
  HiOutlineRefresh,
  HiOutlineSparkles,
  HiOutlineEye,
  HiOutlineEyeOff
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { formatPrice } from '../utils/formatters';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenDepartments, setHiddenDepartments] = useState([]);
  const [togglingDept, setTogglingDept] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, settingsRes] = await Promise.all([
        API.get('/orders/admin/stats'),
        API.get('/orders/admin/all?limit=6'),
        API.get('/settings').catch(() => ({ data: {} }))
      ]);
      setStats(statsRes?.data || null);
      setRecentOrders(Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : (Array.isArray(ordersRes.data) ? ordersRes.data : []));
      if (Array.isArray(settingsRes?.data?.hiddenDepartments)) {
        setHiddenDepartments(
          settingsRes.data.hiddenDepartments
            .map((g) => (typeof g === 'string' ? g.trim().toLowerCase() : ''))
            .filter(Boolean)
        );
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleDepartment = async (deptKey) => {
    const isCurrentlyHidden = hiddenDepartments.includes(deptKey);
    let updated;
    if (isCurrentlyHidden) {
      updated = hiddenDepartments.filter((k) => k !== deptKey);
    } else {
      const allDepts = ['women', 'men', 'kids'];
      const activeDepts = allDepts.filter((k) => !hiddenDepartments.includes(k));
      if (activeDepts.length <= 1 && activeDepts.includes(deptKey)) {
        toast.error('At least one department must remain visible on the store.');
        return;
      }
      updated = [...hiddenDepartments, deptKey];
    }

    setTogglingDept(true);
    try {
      await API.put('/settings/admin/hiddenDepartments', { value: updated });
      setHiddenDepartments(updated);
      const names = { women: "Women's Studio", men: "Men's Studio", kids: "Kids' Studio" };
      toast.success(
        isCurrentlyHidden
          ? `✨ ${names[deptKey] || deptKey} is now LIVE on store everywhere!`
          : `🔒 ${names[deptKey] || deptKey} is now HIDDEN from storefront.`
      );
    } catch {
      toast.error('Failed to update department visibility');
    } finally {
      setTogglingDept(false);
    }
  };

  const handleQuickStatusChange = async (orderId, newStatus) => {
    try {
      await API.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      fetchDashboardData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-accent-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            Store Performance Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time sales, order management, and customer activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:text-primary transition-colors shadow-xs"
            title="Refresh statistics"
          >
            <HiOutlineRefresh className="w-5 h-5" />
          </button>
          <Link
            to="/admin/campaigns"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-accent-300 bg-white hover:bg-accent-50 text-accent-800 text-xs font-semibold shadow-xs transition-all"
          >
            <HiOutlineSparkles className="w-4 h-4 text-accent-600" />
            <span>Festival Campaign</span>
          </Link>
          <Link
            to="/admin/products?new=true"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-semibold shadow-md transition-all"
          >
            <HiOutlinePlus className="w-4 h-4" />
            <span>Add New Dress</span>
          </Link>
        </div>
      </div>

      {/* Quick Department / Section Storefront Visibility Master Control */}
      <div className="bg-gradient-to-r from-primary-950 via-primary-900 to-primary-950 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-accent-400/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                Storefront Department Visibility Control
              </h2>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Toggle any entire department (Kids, Men, Women) on/off. When hidden, it instantly disappears from customer navigation, catalog, filters, and search.
            </p>
          </div>
          <Link
            to="/admin/settings?tab=departments"
            className="text-xs text-accent-300 hover:text-white font-bold flex items-center gap-1 self-start md:self-auto hover:underline"
          >
            <span>Full Settings</span>
            <HiOutlineArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { key: 'women', name: "Women's Studio", emoji: '🌸', subtitle: 'Sarees, Kurtis, Lehengas' },
            { key: 'men', name: "Men's Studio", emoji: '👔', subtitle: 'Shirts, Kurtas, Trousers' },
            { key: 'kids', name: "Kids' Studio", emoji: '🧒', subtitle: 'Boys Ethnic, Girls Pavadai' }
          ].map((dept) => {
            const isHidden = hiddenDepartments.includes(dept.key);
            return (
              <div
                key={dept.key}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isHidden
                    ? 'bg-white/5 border-white/10 opacity-75'
                    : 'bg-white/10 border-accent-300/30 shadow-inner'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{dept.emoji}</span>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{dept.name}</span>
                      <span
                        className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-extrabold ${
                          isHidden ? 'bg-neutral-800 text-neutral-300 border border-white/10' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isHidden ? 'Hidden' : 'Live'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 block truncate">{dept.subtitle}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={togglingDept}
                  onClick={() => handleToggleDepartment(dept.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isHidden
                      ? 'bg-accent-500 hover:bg-accent-400 text-primary-950 shadow-sm'
                      : 'bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-neutral-300 border border-white/20'
                  }`}
                  title={isHidden ? 'Click to Show on Customer Storefront' : 'Click to Hide from Customer Storefront'}
                >
                  {isHidden ? 'Show on Store' : 'Hide Section'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <HiOutlineCurrencyRupee className="w-6 h-6" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            {formatPrice(stats?.totalRevenue || 0)}
          </p>
          <span className="text-[11px] text-neutral-400 block">Excluding cancelled orders</span>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-primary-50 text-primary flex items-center justify-center">
              <HiOutlineShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            {stats?.totalOrders || 0}
          </p>
          <span className="text-[11px] text-neutral-400 block">{stats?.todayOrders || 0} placed today</span>
        </div>

        {/* Pending Orders Action */}
        <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-xs space-y-2 bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Pending Action</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <HiOutlineClock className="w-6 h-6" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-amber-900">
            {stats?.pendingOrders || 0}
          </p>
          <span className="text-[11px] text-amber-700 font-medium block">Awaiting confirmation/dispatch</span>
        </div>

        {/* Delivered / Completed */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Completed Orders</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <HiOutlineCheckCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
            {stats?.statusBreakdown?.delivered || 0}
          </p>
          <span className="text-[11px] text-neutral-400 block">Successfully delivered</span>
        </div>
      </div>

      {/* Quick Operations Hub - Clean Modular Navigation */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Store Management Console</h2>
            <p className="text-xs text-neutral-500">Separated individual control hubs for easy and rapid access</p>
          </div>
          <span className="text-xs font-bold text-accent bg-accent-50 px-3 py-1 rounded-full border border-accent-200">
            6 Core Hubs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hub 1: Categories */}
          <Link
            to="/admin/categories"
            className="group bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                🏷️
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 group-hover:text-primary transition-colors">
                  Categories & Hierarchy
                </h3>
                <span className="text-[11px] text-neutral-400">Women, Men & Kids departments</span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">
              Organize categories, toggle storefront visibility, and view nested dress items inside each category.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs font-bold text-primary">
              <span>Browse Categories & Items</span>
              <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Hub 2: Items & Products */}
          <Link
            to="/admin/products"
            className="group bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                👗
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 group-hover:text-primary transition-colors">
                  Dress Items & Catalog
                </h3>
                <span className="text-[11px] text-neutral-400">{stats?.totalProducts || 'All'} items in stock</span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">
              Explore inventory sorted by category, manage color & size variants, photo slots, and restock alerts.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs font-bold text-primary">
              <span>Manage Dress Catalog</span>
              <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Hub 3: Festival Campaigns */}
          <Link
            to="/admin/campaigns"
            className="group bg-white p-5 rounded-3xl border border-accent-200 shadow-xs hover:border-accent-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 bg-gradient-to-br from-accent-50/20 to-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                🪔
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-accent-800 transition-colors">
                    Festival Campaigns
                  </h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-accent text-white uppercase">
                    Offers
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400">Diwali, Pongal & Flash Sales</span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">
              Send mass email promotional blasts with pre-made festival templates, custom fonts, banners & highlight styling.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-accent-100 text-xs font-bold text-accent-800">
              <span>Launch Festival Campaign</span>
              <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Hub 4: Orders */}
          <Link
            to="/admin/orders"
            className="group bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                📦
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 group-hover:text-primary transition-colors">
                  Customer Orders
                </h3>
                <span className="text-[11px] text-emerald-700 font-semibold">{stats?.pendingOrders || 0} awaiting dispatch</span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">
              Track customer orders, verify delivery addresses across Chennai, update fulfillment status & view invoices.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs font-bold text-primary">
              <span>View Order Fulfillment</span>
              <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Hub 5: Hero Slideshow */}
          <Link
            to="/admin/banners"
            className="group bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                🖼️
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 group-hover:text-primary transition-colors">
                  Homepage Slideshow
                </h3>
                <span className="text-[11px] text-neutral-400">Hero banners & headlines</span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">
              Upload storefront promotional slides, customize headlines, promo descriptions, and configure CTA buttons.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs font-bold text-primary">
              <span>Manage Hero Banners</span>
              <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Hub 6: Store Settings */}
          <Link
            to="/admin/settings"
            className="group bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs hover:border-primary hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-neutral-100 text-neutral-700 flex items-center justify-center text-lg shadow-2xs group-hover:scale-110 transition-transform">
                🎨
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900 group-hover:text-primary transition-colors">
                  Theme & Store Settings
                </h3>
                <span className="text-[11px] text-neutral-400">Dynamic theming & shipping</span>
              </div>
            </div>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">
              Change luxury theme colors dynamically, update free shipping rules, announcement notices, and store copy.
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs font-bold text-primary">
              <span>Configure Store Settings</span>
              <HiOutlineArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden space-y-4">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-neutral-900">Recent Customer Orders</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Updated automatically as customers place orders</p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent-700 transition-colors"
          >
            <span>View All Orders</span>
            <HiOutlineArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-600 uppercase font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-3 px-6">Order ID</th>
                <th className="py-3 px-6">Customer & Phone</th>
                <th className="py-3 px-6">Items</th>
                <th className="py-3 px-6">Amount</th>
                <th className="py-3 px-6">Status Action</th>
                <th className="py-3 px-6">Placed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-neutral-400">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-neutral-900">{order.orderId}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-neutral-900">{order.customer?.name}</p>
                      <a
                        href={`tel:+91${order.customer?.phone}`}
                        className="text-neutral-500 hover:text-primary flex items-center gap-1 mt-0.5"
                      >
                        <HiOutlinePhone className="w-3.5 h-3.5" />
                        +91 {order.customer?.phone}
                      </a>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-neutral-800">
                        {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'}
                      </span>
                      <p className="text-neutral-400 truncate max-w-xs mt-0.5">
                        {order.items?.map((i) => i.title).join(', ')}
                      </p>
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-900">
                      {formatPrice(order.totalAmount + (order.shippingCharge || 0))}
                    </td>
                    <td className="py-4 px-6 space-y-1.5">
                      <select
                        value={order.status === 'pending' ? 'yet_to_move' : (order.status || 'yet_to_move')}
                        onChange={(e) => handleQuickStatusChange(order._id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer block ${
                          order.status === 'pending' || order.status === 'yet_to_move'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : order.status === 'confirmed'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : order.status === 'shipped'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}
                      >
                        <option value="yet_to_move">Yet to Move</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {order.paymentStatus === 'paid' ? 'Paid' : 'Payment Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-neutral-500 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
