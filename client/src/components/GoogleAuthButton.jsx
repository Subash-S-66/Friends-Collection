import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GoogleAuthButton = ({ onSuccess, text = 'signin_with' }) => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1088487771765-demo.apps.googleusercontent.com';

  useEffect(() => {
    const handleCredentialResponse = async (response) => {
      if (!response.credential) {
        toast.error('Google Sign-In failed to retrieve credential');
        return;
      }

      setLoading(true);
      try {
        const data = await loginWithGoogle(response.credential);
        toast.success(`Signed in as ${data.user.name || data.user.email}!`, { icon: '✨' });
        if (onSuccess) onSuccess(data.user);
      } catch (err) {
        console.error('Google Auth backend error:', err);
        toast.error(err.response?.data?.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    };

    if (window.google?.accounts?.id && buttonRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text,
          shape: 'pill',
          logo_alignment: 'left',
          width: 320
        });
      } catch (e) {
        console.warn('Google button render error:', e);
      }
    }
  }, [googleClientId, loginWithGoogle, onSuccess, text]);

  // Fallback branded button if GIS script is not yet loaded or client_id is demo
  const handleFallbackClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast('Google Identity Services initializing...', { icon: '⏳' });
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Official Google GIS Button Container */}
      <div ref={buttonRef} className="w-full flex justify-center min-h-[44px]" />

      {/* Branded Fallback styled button */}
      {(!window.google?.accounts?.id || !buttonRef.current?.hasChildNodes()) && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={loading}
          className="w-full max-w-xs py-3 px-4 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-xs hover:shadow-sm transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{loading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
        </button>
      )}
    </div>
  );
};

export default GoogleAuthButton;
