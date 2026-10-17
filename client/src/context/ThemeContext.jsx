import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

// Pre-curated luxury theme presets
export const THEME_PRESETS = {
  wine: {
    id: 'wine',
    name: 'Royal Wine & Rose Gold (Brand Signature)',
    primary: '#54142D',
    primaryLight: '#762243',
    primaryDark: '#380B1C',
    accent: '#C88A65',
    accentLight: '#E2B89D',
    accentDark: '#9C623E',
    bgTint: '#FAF7F2'
  },
  emerald: {
    id: 'emerald',
    name: 'Imperial Emerald & Warm Gold',
    primary: '#0B4635',
    primaryLight: '#146C53',
    primaryDark: '#062B20',
    accent: '#D99B26',
    accentLight: '#F3C56E',
    accentDark: '#A67112',
    bgTint: '#F7FAF8'
  },
  sapphire: {
    id: 'sapphire',
    name: 'Midnight Sapphire & Champagne',
    primary: '#132247',
    primaryLight: '#203975',
    primaryDark: '#0A132B',
    accent: '#CCA86E',
    accentLight: '#E5CCA2',
    accentDark: '#99763D',
    bgTint: '#F8F9FC'
  },
  plum: {
    id: 'plum',
    name: 'Sunset Plum & Coral Blossom',
    primary: '#4A1238',
    primaryLight: '#6B1B52',
    primaryDark: '#2E0721',
    accent: '#E06D53',
    accentLight: '#F29F8D',
    accentDark: '#B34A32',
    bgTint: '#FDF8FA'
  },
  charcoal: {
    id: 'charcoal',
    name: 'Obsidian Velvet & Antique Gold',
    primary: '#1F1E24',
    primaryLight: '#32313B',
    primaryDark: '#121115',
    accent: '#C5A059',
    accentLight: '#E0C792',
    accentDark: '#8F7132',
    bgTint: '#FAF9F7'
  }
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEME_PRESETS.wine);
  const [loading, setLoading] = useState(true);

  // Apply theme colors directly to document root CSS variables
  const applyThemeToDOM = (themeData) => {
    if (!themeData) return;
    const root = document.documentElement;
    root.style.setProperty('--color-primary', themeData.primary);
    root.style.setProperty('--color-primary-light', themeData.primaryLight || themeData.primary);
    root.style.setProperty('--color-primary-dark', themeData.primaryDark || themeData.primary);
    root.style.setProperty('--color-accent', themeData.accent);
    root.style.setProperty('--color-accent-light', themeData.accentLight || themeData.accent);
    root.style.setProperty('--color-accent-dark', themeData.accentDark || themeData.accent);
    root.style.setProperty('--color-cream', themeData.bgTint || '#FAF7F2');
  };

  useEffect(() => {
    // Initial fetch from backend settings
    API.get('/settings')
      .then((res) => {
        const savedTheme = res.data?.themeConfig;
        if (savedTheme) {
          setTheme(savedTheme);
          applyThemeToDOM(savedTheme);
        } else {
          applyThemeToDOM(THEME_PRESETS.wine);
        }
      })
      .catch((err) => {
        console.error('Error fetching theme:', err);
        applyThemeToDOM(THEME_PRESETS.wine);
      })
      .finally(() => setLoading(false));
  }, []);

  const changeTheme = async (newThemeConfig) => {
    setTheme(newThemeConfig);
    applyThemeToDOM(newThemeConfig);

    try {
      await API.put('/settings/admin/themeConfig', { value: newThemeConfig });
      return true;
    } catch (err) {
      console.error('Failed to save theme in settings:', err);
      throw err;
    }
  };

  const applyPreset = async (presetId) => {
    const preset = THEME_PRESETS[presetId];
    if (preset) {
      return await changeTheme(preset);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, changeTheme, applyPreset, presets: THEME_PRESETS, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};
