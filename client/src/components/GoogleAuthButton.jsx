import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GoogleAuthButton = ({ onSuccess, text = 'continue_with' }) => {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const loginWithGoogleRef = useRef(loginWithGoogle);
  loginWithGoogleRef.current = loginWithGoogle;

  const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1088487771765-demo.apps.googleusercontent.com';

  const label =
    text === 'signup_with'
      ? 'Sign up with Google'
      : 'Continue with Google';

  useEffect(() => {
    if (!window.google?.accounts?.id) return;

    // Guard against multiple initializations which Google logs warnings for
    if (window.__gsiInitializedClientId === googleClientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) return;

          setLoading(true);
          try {
            const data = await loginWithGoogleRef.current(response.credential);
            toast.success(`Welcome, ${data.user.name || data.user.email}!`, { icon: '✨' });
            if (onSuccessRef.current) onSuccessRef.current(data.user);
          } catch (err) {
            console.error('Google Auth backend error:', err);
            toast.error(err.response?.data?.message || 'Google sign-in failed');
          } finally {
            setLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      window.__gsiInitializedClientId = googleClientId;
    } catch (e) {
      console.warn('Google Identity initialize warning:', e);
    }
  }, [googleClientId]);

  const handleGoogleSignIn = () => {
    if (loading) return;

    if (!window.google?.accounts) {
      toast('Google Sign-In is initializing. Please try again or use email code.', { icon: '⏳' });
      return;
    }

    // 1. Preferred modern flow: Google OAuth2 token client popup
    if (window.google.accounts.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              if (tokenResponse.error !== 'popup_closed_by_user') {
                console.warn('Google Token response error:', tokenResponse);
                toast.error('Google sign-in was not completed');
              }
              return;
            }

            if (tokenResponse.access_token) {
              setLoading(true);
              try {
                // Fetch profile directly from Google
                const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const profile = await profileRes.json();

                const data = await loginWithGoogleRef.current({
                  accessToken: tokenResponse.access_token,
                  userInfo: {
                    email: profile.email,
                    name: profile.name || profile.given_name,
                    picture: profile.picture,
                    sub: profile.sub
                  }
                });

                toast.success(`Welcome, ${data.user.name || data.user.email}!`, { icon: '✨' });
                if (onSuccessRef.current) onSuccessRef.current(data.user);
              } catch (err) {
                console.error('Google Auth backend error:', err);
                toast.error(err.response?.data?.message || 'Google sign-in failed');
              } finally {
                setLoading(false);
              }
            }
          }
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (oauthErr) {
        console.warn('Google oauth2 error, falling back to One Tap prompt:', oauthErr);
      }
    }

    // 2. Fallback to One Tap prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  return (
    <div className="w-full flex justify-center">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full max-w-xs py-3 px-4 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 active:scale-98 text-neutral-700 text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 shadow-xs hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        )}
        <span>{loading ? 'Authenticating with Google...' : label}</span>
      </button>
    </div>
  );
};

export default GoogleAuthButton;
