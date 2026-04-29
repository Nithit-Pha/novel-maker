/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0f1929',
          800: '#16213e',
          700: '#1a2845',
          600: '#2a3a5e',
          500: '#3a4a6e',
        },
        accent: {
          DEFAULT: '#e94560',
          dialog: '#4a7aff',
          decision: '#ffaa44',
          start: '#44dd88',
        },
      },
    },
  },
  plugins: [],
};
