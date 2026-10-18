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

// Helper: Convert hex color to { r, g, b, rgbStr }
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b, rgbStr: `${r}, ${g}, ${b}` };
}

// Helper: Adjust brightness (factor > 0 lightens toward white, factor < 0 darkens toward black)
export function adjustColor(hex, factor) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const target = factor > 0 ? 255 : 0;
  const p = Math.min(Math.abs(factor), 1);
  const r = Math.round(rgb.r + (target - rgb.r) * p);
  const g = Math.round(rgb.g + (target - rgb.g) * p);
  const b = Math.round(rgb.b + (target - rgb.b) * p);
  const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Derive full 50-950 color scale and variables for any preset or custom brand theme
export function deriveThemePalette(themeData) {
  if (!themeData) return null;
  const primary = themeData.primary || '#54142D';
  const primaryDark = themeData.primaryDark && themeData.primaryDark !== primary
    ? themeData.primaryDark
    : adjustColor(primary, -0.4);
  const primaryLight = themeData.primaryLight && themeData.primaryLight !== primary
    ? themeData.primaryLight
    : adjustColor(primary, 0.25);

  const accent = themeData.accent || '#C88A65';
  const accentDark = themeData.accentDark && themeData.accentDark !== accent
    ? themeData.accentDark
    : adjustColor(accent, -0.25);
  const accentLight = themeData.accentLight && themeData.accentLight !== accent
    ? themeData.accentLight
    : adjustColor(accent, 0.25);

  const bgTint = themeData.bgTint || '#FAF7F2';

  // Deep midnight stops for hero banners & dark showcase sections
  const primary950 = adjustColor(primaryDark, -0.65);
  const primary900 = primaryDark;
  const primary800 = adjustColor(primaryDark, 0.2);
  const primary700 = adjustColor(primary, -0.15);
  const primary600 = adjustColor(primary, -0.06);
  const primary500 = primary;
  const primary400 = primaryLight;
  const primary300 = adjustColor(primary, 0.4);
  const primary200 = adjustColor(primary, 0.6);
  const primary100 = adjustColor(primary, 0.8);
  const primary50 = adjustColor(primary, 0.92);

  // Accent scale
  const accent700 = accentDark;
  const accent600 = adjustColor(accent, -0.12);
  const accent500 = accent;
  const accent400 = accentLight;
  const accent300 = adjustColor(accent, 0.35);
  const accent200 = adjustColor(accent, 0.55);
  const accent100 = adjustColor(accent, 0.75);
  const accent50 = adjustColor(accent, 0.92);

  // Background cream scale
  const cream = bgTint;
  const creamDark = adjustColor(bgTint, -0.06);

  return {
    'primary': primary,
    'primary-light': primaryLight,
    'primary-dark': primaryDark,
    'primary-950': primary950,
    'primary-900': primary900,
    'primary-800': primary800,
    'primary-700': primary700,
    'primary-600': primary600,
    'primary-500': primary500,
    'primary-400': primary400,
    'primary-300': primary300,
    'primary-200': primary200,
    'primary-100': primary100,
    'primary-50': primary50,
    'accent': accent,
    'accent-light': accentLight,
    'accent-dark': accentDark,
    'accent-700': accent700,
    'accent-600': accent600,
    'accent-500': accent500,
    'accent-400': accent400,
    'accent-300': accent300,
    'accent-200': accent200,
    'accent-100': accent100,
    'accent-50': accent50,
    'cream': cream,
    'cream-dark': creamDark,
  };
}

// Apply theme colors directly to document root CSS variables
export const applyThemeToDOM = (themeData) => {
  if (!themeData) return;
  const root = document.documentElement;
  const palette = deriveThemePalette(themeData);
  if (!palette) return;

  // Set every HEX and RGB channel variable for Tailwind and native CSS
  Object.entries(palette).forEach(([varKey, hexVal]) => {
    root.style.setProperty(`--color-${varKey}`, hexVal);
    const rgb = hexToRgb(hexVal);
    if (rgb) {
      root.style.setProperty(`--color-${varKey}-rgb`, rgb.rgbStr);
    }
  });

  // Base alias properties for convenience & scrollbar styling
  root.style.setProperty('--color-primary', palette['primary']);
  root.style.setProperty('--color-accent', palette['accent']);
  root.style.setProperty('--color-cream', palette['cream']);
  root.style.setProperty('--color-cream-dark', palette['cream-dark']);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEME_PRESETS.wine);
  const [loading, setLoading] = useState(true);

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
