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
import ErrorBoundary from './components/ErrorBoundary';

// Critical Landing Page (Eagerly Loaded for instant FCP & LCP)
import Home from './pages/Home';

// Resilient lazy-loader that auto-reloads the page when a stale chunk is requested after a deployment
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const errorMsg = error?.message || '';
      const isChunkError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        errorMsg.includes('error loading dynamically imported module');

      if (isChunkError) {
        const hasReloaded = window.sessionStorage.getItem('chunk_load_reloaded');
        if (!hasReloaded) {
          window.sessionStorage.setItem('chunk_load_reloaded', 'true');
          window.location.reload();
          return new Promise(() => {}); // Hold in suspense until window refreshes
        }
      }
      throw error;
    }
  });

// Lazy-Loaded Storefront Secondary Pages
const Shop = lazyWithRetry(() => import('./pages/Shop'));
const ProductDetail = lazyWithRetry(() => import('./pages/ProductDetail'));
const Cart = lazyWithRetry(() => import('./pages/Cart'));
const Checkout = lazyWithRetry(() => import('./pages/Checkout'));
const OrderConfirmation = lazyWithRetry(() => import('./pages/OrderConfirmation'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'));
const VerifyEmail = lazyWithRetry(() => import('./pages/VerifyEmail'));
const Account = lazyWithRetry(() => import('./pages/Account'));
const About = lazyWithRetry(() => import('./pages/About'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const InvoicePage = lazyWithRetry(() => import('./pages/InvoicePage'));
const Privacy = lazyWithRetry(() => import('./pages/Privacy'));
const Terms = lazyWithRetry(() => import('./pages/Terms'));
const ReturnPolicy = lazyWithRetry(() => import('./pages/ReturnPolicy'));

// Lazy-Loaded Admin Dashboard Modules (Heavy bundles isolated from storefront visitors)
const AdminLayout = lazyWithRetry(() => import('./admin/AdminLayout'));
const Dashboard = lazyWithRetry(() => import('./admin/Dashboard'));
const ProductManager = lazyWithRetry(() => import('./admin/ProductManager'));
const CategoryManager = lazyWithRetry(() => import('./admin/CategoryManager'));
const OrderManager = lazyWithRetry(() => import('./admin/OrderManager'));
const BannerManager = lazyWithRetry(() => import('./admin/BannerManager'));
const SettingsManager = lazyWithRetry(() => import('./admin/SettingsManager'));
const InvoiceSettingsManager = lazyWithRetry(() => import('./admin/InvoiceSettingsManager'));
const CampaignManager = lazyWithRetry(() => import('./admin/CampaignManager'));

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
        <ErrorBoundary>
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
            <Route path="/returns" element={<ReturnPolicy />} />
            <Route path="/return-policy" element={<ReturnPolicy />} />
            <Route path="/refund-policy" element={<ReturnPolicy />} />
            <Route path="/cancellation-refund" element={<ReturnPolicy />} />
            <Route path="/refund" element={<ReturnPolicy />} />

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
      </ErrorBoundary>
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
