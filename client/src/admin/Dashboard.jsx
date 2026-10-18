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
  HiOutlineSparkles
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { formatPrice } from '../utils/formatters';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes] = await Promise.all([
        API.get('/orders/admin/stats'),
        API.get('/orders/admin/all?limit=6')
      ]);
      setStats(statsRes?.data || null);
      setRecentOrders(Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : (Array.isArray(ordersRes.data) ? ordersRes.data : []));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
                    <td className="py-4 px-6">
                      <select
                        value={order.status}
                        onChange={(e) => handleQuickStatusChange(order._id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                          order.status === 'pending'
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
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
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
