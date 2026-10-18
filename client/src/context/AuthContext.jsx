import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fc_token');
    const storedUser = localStorage.getItem('fc_user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      API.get('/auth/me').then(res => {
        setUser(res.data);
        localStorage.setItem('fc_user', JSON.stringify(res.data));
      }).catch(() => {
        logout();
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    localStorage.setItem('fc_token', res.data.token);
    localStorage.setItem('fc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await API.post('/auth/register', data);
    if (res.data?.token) {
      localStorage.setItem('fc_token', res.data.token);
      localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const loginWithGoogle = async (credential) => {
    const res = await API.post('/auth/google', { credential });
    localStorage.setItem('fc_token', res.data.token);
    localStorage.setItem('fc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const requestToken = async (email) => {
    const res = await API.post('/auth/request-token', { email });
    return res.data;
  };

  const verifyToken = async (email, token, name) => {
    const res = await API.post('/auth/verify-token', { email, token, name });
    localStorage.setItem('fc_token', res.data.token);
    localStorage.setItem('fc_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const forgotPasswordRequest = async (email) => {
    const res = await API.post('/auth/forgot-password-request', { email });
    return res.data;
  };

  const forgotPasswordVerify = async ({ email, token, newPassword }) => {
    const res = await API.post('/auth/forgot-password-verify', { email, token, newPassword });
    if (res.data?.token) {
      localStorage.setItem('fc_token', res.data.token);
      localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const verifyEmailToken = async ({ email, token }) => {
    const res = await API.post('/auth/verify-email-token', { email, token });
    if (res.data?.token) {
      localStorage.setItem('fc_token', res.data.token);
      localStorage.setItem('fc_user', JSON.stringify(res.data.user));
      setUser(res.data.user);
    }
    return res.data;
  };

  const resendVerification = async (email) => {
    const res = await API.post('/auth/resend-verification', { email });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('fc_token');
    localStorage.removeItem('fc_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('fc_user', JSON.stringify(updatedUser));
  };

  // Global Auth Modal Controls (Popup for Login & Register)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [authModalRedirect, setAuthModalRedirect] = useState('');

  const openAuthModal = (mode = 'login', redirectTo = '') => {
    setAuthModalMode(mode);
    setAuthModalRedirect(redirectTo);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const switchAuthMode = (mode) => {
    setAuthModalMode(mode);
  };

  return (
    <AuthContext.Provider value={{
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
      updateUser,
      isAdmin: user?.role === 'admin',
      authModalOpen,
      authModalMode,
      authModalRedirect,
      openAuthModal,
      closeAuthModal,
      switchAuthMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};
