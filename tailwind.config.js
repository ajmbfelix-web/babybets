/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f7f4',
          100: '#e6ede6',
          200: '#cddccd',
          300: '#a8c2a8',
          400: '#7da17d',
          500: '#5a835a',
          600: '#456845',
          700: '#375437',
          800: '#2d432d',
          900: '#253825',
        },
        cream: {
          50:  '#fdfcf8',
          100: '#faf7f0',
          200: '#f4ede0',
          300: '#ecdfc9',
          400: '#e0cab0',
          500: '#d4b494',
        },
        blush: {
          100: '#fdeef0',
          200: '#fad5da',
          300: '#f5adb6',
          400: '#ed7f8e',
          500: '#e05065',
        },
        gold: {
          100: '#fef9e7',
          200: '#fef0b5',
          300: '#fde272',
          400: '#fbc62d',
          500: '#f0a500',
        }
      },
      fontFamily: {
        serif:  ['Playfair Display', 'Georgia', 'serif'],
        sans:   ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':   '0 2px 20px rgba(0,0,0,0.06)',
        'card':   '0 4px 32px rgba(45,67,45,0.08)',
        'lift':   '0 8px 40px rgba(45,67,45,0.12)',
        'glow':   '0 0 0 3px rgba(90,131,90,0.18)',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-in':   'slideIn 0.35s ease forwards',
        'pop':        'pop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'shimmer':    'shimmer 2s infinite',
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn:  { from: { opacity: 0, transform: 'translateX(-12px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        pop:      { from: { opacity: 0, transform: 'scale(0.92)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer:  { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      }
    },
  },
  plugins: [],
}
