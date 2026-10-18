const withOpacity = (varName, fallbackRgb) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${varName}, ${fallbackRgb}), ${opacityValue})`;
    }
    return `rgb(var(${varName}, ${fallbackRgb}))`;
  };
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: withOpacity('--color-primary-rgb', '84, 20, 45'),
          light: withOpacity('--color-primary-light-rgb', '118, 34, 67'),
          dark: withOpacity('--color-primary-dark-rgb', '56, 11, 28'),
          50: withOpacity('--color-primary-50-rgb', '248, 238, 241'),
          100: withOpacity('--color-primary-100-rgb', '232, 200, 211'),
          200: withOpacity('--color-primary-200-rgb', '201, 137, 159'),
          300: withOpacity('--color-primary-300-rgb', '160, 68, 100'),
          400: withOpacity('--color-primary-400-rgb', '118, 34, 67'),
          500: withOpacity('--color-primary-500-rgb', '84, 20, 45'),
          600: withOpacity('--color-primary-600-rgb', '75, 18, 40'),
          700: withOpacity('--color-primary-700-rgb', '67, 16, 36'),
          800: withOpacity('--color-primary-800-rgb', '56, 11, 28'),
          900: withOpacity('--color-primary-900-rgb', '43, 6, 22'),
          950: withOpacity('--color-primary-950-rgb', '26, 4, 13'),
        },
        accent: {
          DEFAULT: withOpacity('--color-accent-rgb', '200, 138, 101'),
          light: withOpacity('--color-accent-light-rgb', '226, 184, 157'),
          dark: withOpacity('--color-accent-dark-rgb', '156, 98, 62'),
          50: withOpacity('--color-accent-50-rgb', '252, 247, 243'),
          100: withOpacity('--color-accent-100-rgb', '247, 233, 224'),
          200: withOpacity('--color-accent-200-rgb', '238, 208, 189'),
          300: withOpacity('--color-accent-300-rgb', '226, 184, 157'),
          400: withOpacity('--color-accent-400-rgb', '215, 160, 128'),
          500: withOpacity('--color-accent-500-rgb', '200, 138, 101'),
          600: withOpacity('--color-accent-600-rgb', '170, 110, 75'),
          700: withOpacity('--color-accent-700-rgb', '140, 85, 50'),
        },
        cream: {
          DEFAULT: withOpacity('--color-cream-rgb', '250, 247, 242'),
          light: '#FFFFFF',
          dark: withOpacity('--color-cream-dark-rgb', '240, 234, 225'),
        },
      },
      fontFamily: {
        logo: ['Cinzel', '"Playfair Display"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-right': 'slideInLeft 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-up': 'scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.12)',
        'drawer': '-8px 0 30px rgba(0, 0, 0, 0.18)',
        'dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
}
