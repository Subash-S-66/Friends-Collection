import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { AlertProvider } from './context/AlertContext';

// Storefront Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';
import DynamicAlertModal from './components/DynamicAlertModal';
import ScrollToTop from './components/ScrollToTop';

// Storefront Pages
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import Account from './pages/Account';
import About from './pages/About';
import Contact from './pages/Contact';
import InvoicePage from './pages/InvoicePage';

// Admin Dashboard Components
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import ProductManager from './admin/ProductManager';
import CategoryManager from './admin/CategoryManager';
import OrderManager from './admin/OrderManager';
import BannerManager from './admin/BannerManager';
import SettingsManager from './admin/SettingsManager';
import CampaignManager from './admin/CampaignManager';

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

  return (
    <div className={`flex flex-col ${isAdminRoute ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {!isAdminRoute && <Navbar />}
      <CartDrawer />
      <AuthModal />
      <DynamicAlertModal />

      <div className={`flex-1 ${isAdminRoute ? 'h-full overflow-hidden' : ''}`}>
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
          <Route path="/track" element={<TrackRedirect />} />
          <Route path="/track-order" element={<TrackRedirect />} />
          <Route path="/track/:orderId" element={<TrackRedirect />} />
          <Route path="/invoice/:orderId" element={<InvoicePage />} />
          <Route path="/order/invoice/:orderId" element={<InvoicePage />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Admin Dashboard Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrderManager />} />
            <Route path="products" element={<ProductManager />} />
            <Route path="categories" element={<CategoryManager />} />
            <Route path="campaigns" element={<CampaignManager />} />
            <Route path="banners" element={<BannerManager />} />
            <Route path="settings" element={<SettingsManager />} />
          </Route>

          {/* 404 Fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>

      {!isAdminRoute && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
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
      </AlertProvider>
    </ThemeProvider>
  );
}

export default App;
