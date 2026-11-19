import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Auto-recover when a user's browser requests an older, replaced JS chunk after a new Vercel deployment
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite Preload Error] Outdated deployment bundle detected. Refreshing to load latest version...');
  const lastReload = parseInt(window.sessionStorage.getItem('last_chunk_reload') || '0', 10);
  const now = Date.now();
  // Prevent fast reload loops (max 1 reload per 10 seconds)
  if (now - lastReload > 10000) {
    window.sessionStorage.setItem('last_chunk_reload', now.toString());
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
