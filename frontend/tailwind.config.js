/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Figma Emerald Green
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#004D40', // Deep Teal / Navy
          950: '#022c22'
        },
        santim: {
          50: '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#d97706', // Santim Gold
          600: '#b45309'
        },
        chapa: {
          500: '#16a34a'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
