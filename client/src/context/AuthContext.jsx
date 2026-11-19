import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem('fc_token');
      const storedUser = localStorage.getItem('fc_user');
      return token && storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await API.post('/auth/logout');
    } catch {
      // Ignore network/server errors during logout
    }
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    localStorage.removeItem('fc_cart_guest');
    localStorage.removeItem('fc_cart');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('fc_token');
    const storedUser = localStorage.getItem('fc_user');
    if (token && storedUser) {
      // Verify token is still valid with backend
      API.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('fc_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('fc_token', res.data.token);
    localStorage.setItem('fc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const register = useCallback(async (data) => {
    const res = await API.post('/auth/register', data);
    if (res.data?.token) {
      localStorage.setItem('fc_token', res.data.token);
      localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const loginWithGoogle = useCallback(async (credentialOrPayload) => {
    const payload =
      typeof credentialOrPayload === 'string'
        ? { credential: credentialOrPayload }
        : credentialOrPayload;
    const res = await API.post('/auth/google', payload);
    localStorage.setItem('fc_token', res.data.token);
    localStorage.setItem('fc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const requestToken = useCallback(async (email) => {
    const res = await API.post('/auth/request-token', { email });
    return res.data;
  }, []);

  const verifyToken = useCallback(async (email, token, name) => {
    const res = await API.post('/auth/verify-token', { email, token, name });
    localStorage.setItem('fc_token', res.data.token);
    localStorage.setItem('fc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  }, []);

  const forgotPasswordRequest = useCallback(async (email) => {
    const res = await API.post('/auth/forgot-password-request', { email });
    return res.data;
  }, []);

  const forgotPasswordVerify = useCallback(async ({ email, token, newPassword }) => {
    const res = await API.post('/auth/forgot-password-verify', { email, token, newPassword });
    if (res.data?.token) {
      localStorage.setItem('fc_token', res.data.token);
      localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const verifyEmailToken = useCallback(async ({ email, token }) => {
    const res = await API.post('/auth/verify-email-token', { email, token });
    if (res.data?.token) {
      localStorage.setItem('fc_token', res.data.token);
      localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  }, []);

  const resendVerification = useCallback(async (email) => {
    const res = await API.post('/auth/resend-verification', { email });
    return res.data;
  }, []);

  const logoutAllDevices = useCallback(async () => {
    try {
      await API.post('/auth/logout-all');
    } catch {
      // Ignore errors
    }
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    localStorage.removeItem('fc_cart_guest');
    localStorage.removeItem('fc_cart');
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('fc_user', JSON.stringify(updatedUser));
  }, []);

  // Global Auth Modal Controls (Popup for Login & Register)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [authModalRedirect, setAuthModalRedirect] = useState('');

  const openAuthModal = useCallback((mode = 'login', redirectTo = '') => {
    setAuthModalMode(mode);
    setAuthModalRedirect(redirectTo);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const switchAuthMode = useCallback((mode) => {
    setAuthModalMode(mode);
  }, []);

  const isAdmin = user?.role === 'admin';

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      requestToken,
      verifyToken,
      forgotPasswordRequest,
      forgotPasswordVerify,
      verifyEmailToken,
      resendVerification,
      logout,
      logoutAllDevices,
      updateUser,
      isAdmin,
      authModalOpen,
      authModalMode,
      authModalRedirect,
      openAuthModal,
      closeAuthModal,
      switchAuthMode
    }),
    [
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      requestToken,
      verifyToken,
      forgotPasswordRequest,
      forgotPasswordVerify,
      verifyEmailToken,
      resendVerification,
      logout,
      logoutAllDevices,
      updateUser,
      isAdmin,
      authModalOpen,
      authModalMode,
      authModalRedirect,
      openAuthModal,
      closeAuthModal,
      switchAuthMode
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
