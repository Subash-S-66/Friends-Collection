/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary, #54142D)',
          light: 'var(--color-primary-light, #762243)',
          dark: 'var(--color-primary-dark, #380B1C)',
          50: 'color-mix(in srgb, var(--color-primary, #54142D) 8%, white)',
          100: 'color-mix(in srgb, var(--color-primary, #54142D) 15%, white)',
          200: 'color-mix(in srgb, var(--color-primary, #54142D) 25%, white)',
          300: 'color-mix(in srgb, var(--color-primary, #54142D) 40%, white)',
          400: 'color-mix(in srgb, var(--color-primary, #54142D) 60%, white)',
          500: 'var(--color-primary, #54142D)',
          600: 'var(--color-primary, #54142D)',
          700: 'var(--color-primary, #54142D)',
          800: 'var(--color-primary-dark, #380B1C)',
          900: 'var(--color-primary-dark, #380B1C)',
          950: '#1A040D',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #C88A65)',
          light: 'var(--color-accent-light, #DFAB8B)',
          dark: 'var(--color-accent-dark, #A46743)',
          50: 'color-mix(in srgb, var(--color-accent, #C88A65) 8%, white)',
          100: 'color-mix(in srgb, var(--color-accent, #C88A65) 15%, white)',
          200: 'color-mix(in srgb, var(--color-accent, #C88A65) 30%, white)',
          300: 'color-mix(in srgb, var(--color-accent, #C88A65) 50%, white)',
          400: 'var(--color-accent-light, #DFAB8B)',
          500: 'var(--color-accent, #C88A65)',
          600: 'var(--color-accent-dark, #A46743)',
          700: 'var(--color-accent-dark, #A46743)',
        },
        cream: {
          DEFAULT: 'var(--color-cream, #FAF7F2)',
          light: '#FFFFFF',
          dark: '#F0EAE1',
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
