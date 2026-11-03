/** @type {import('tailwindcss').Config} */
// Every color points at a CSS variable defined in src/index.css, so the whole
// app switches theme by changing <html data-theme="light|dark">.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy palette names used across the codebase, re-pointed at tokens
        ink: {
          900: v('sunken'),
          800: v('surface'),
          700: v('surface-2'),
          600: v('border'),
          500: v('border-strong'),
        },
        accent: {
          DEFAULT: v('accent'),
          start: v('n-start'),
          dialog: v('n-dialog'),
          decision: v('n-decision'),
          scene: v('n-scene'),
          loop: v('n-loop'),
          portal: v('n-portal'),
          condition: v('n-condition'),
          chance: v('n-chance'),
          end: v('n-end'),
        },
        gray: {
          100: v('fg'),
          200: v('fg'),
          300: v('fg-soft'),
          400: v('muted'),
          500: v('muted'),
          600: v('faint'),
        },
        white: v('fg'),
        black: v('shade'),
        // Semantic tokens
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        sunken: v('sunken'),
        border: v('border'),
        'border-strong': v('border-strong'),
        fg: v('fg'),
        'fg-soft': v('fg-soft'),
        muted: v('muted'),
        faint: v('faint'),
        'on-accent': v('on-accent'),
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        node: v('node'),
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', '"Segoe UI"', 'sans-serif'],
        story: ['Lora', 'Georgia', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
