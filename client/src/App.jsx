import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AlertProvider } from './context/AlertContext';
import { ConfirmProvider } from './context/ConfirmContext';

// Core Storefront Components (Critical Path)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import DynamicAlertModal from './components/DynamicAlertModal';
import DynamicConfirmModal from './components/DynamicConfirmModal';
import ScrollToTop from './components/ScrollToTop';

// Critical Landing Page (Eagerly Loaded for instant FCP & LCP)
import Home from './pages/Home';

// Lazy-Loaded Storefront Secondary Pages
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Account = lazy(() => import('./pages/Account'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const InvoicePage = lazy(() => import('./pages/InvoicePage'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));

// Lazy-Loaded Admin Dashboard Modules (Heavy bundles isolated from storefront visitors)
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const ProductManager = lazy(() => import('./admin/ProductManager'));
const CategoryManager = lazy(() => import('./admin/CategoryManager'));
const OrderManager = lazy(() => import('./admin/OrderManager'));
const BannerManager = lazy(() => import('./admin/BannerManager'));
const SettingsManager = lazy(() => import('./admin/SettingsManager'));
const InvoiceSettingsManager = lazy(() => import('./admin/InvoiceSettingsManager'));
const CampaignManager = lazy(() => import('./admin/CampaignManager'));

// Accessible, lightweight loading spinner for route transitions
const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8" role="status" aria-label="Loading page">
    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
  </div>
);

// Redirect legacy /track links into My Orders portal
const TrackRedirect = () => {
  const { orderId } = useParams();
  if (orderId) {
    return <Navigate to={`/account?orderId=${encodeURIComponent(orderId)}`} replace />;
  }
  return <Navigate to="/account?tab=track" replace />;
};

// Shell layout that conditionally hides storefront header/footer on admin routes
const AppLayout = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Prevent window/body scroll on admin pages so the sidebar never scrolls away
  useEffect(() => {
    if (isAdminRoute) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isAdminRoute]);

  return (
    <div className={`flex flex-col ${isAdminRoute ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {!isAdminRoute && <Navbar />}
      <CartDrawer />
      <AuthModal />
      <DynamicAlertModal />
      <DynamicConfirmModal />

      <main id="main-content" className={`flex-1 ${isAdminRoute ? 'h-full overflow-hidden' : ''}`} tabIndex={-1}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Storefront Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:orderId" element={<OrderConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/orders" element={<Account />} />
            <Route path="/account/address" element={<Navigate to="/account?tab=address" replace />} />
            <Route path="/account/addresses" element={<Navigate to="/account?tab=address" replace />} />
            <Route path="/saved-addresses" element={<Navigate to="/account?tab=address" replace />} />
            <Route path="/saved-address" element={<Navigate to="/account?tab=address" replace />} />
            <Route path="/profile" element={<Navigate to="/account" replace />} />
            <Route path="/track" element={<TrackRedirect />} />
            <Route path="/track-order" element={<TrackRedirect />} />
            <Route path="/track/:orderId" element={<TrackRedirect />} />
            <Route path="/invoice/:orderId" element={<InvoicePage />} />
            <Route path="/order/invoice/:orderId" element={<InvoicePage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Admin Dashboard Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<OrderManager />} />
              <Route path="products" element={<ProductManager />} />
              <Route path="categories" element={<CategoryManager />} />
              <Route path="campaigns" element={<CampaignManager />} />
              <Route path="banners" element={<BannerManager />} />
              <Route path="settings" element={<SettingsManager />} />
              <Route path="invoice" element={<InvoiceSettingsManager />} />
              <Route path="tax-invoice" element={<Navigate to="/admin/invoice" replace />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <ConfirmProvider>
          <AuthProvider>
            <CartProvider>
              <Router>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 3500,
                    style: {
                      background: '#FFFFFF',
                      color: '#1A1A1A',
                      fontSize: '13px',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                      border: '1px solid #F0EAE1',
                      padding: '12px 18px',
                    },
                  }}
                />
                <ScrollToTop />
                <AppLayout />
              </Router>
            </CartProvider>
          </AuthProvider>
        </ConfirmProvider>
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
