/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Remap gray → slate tones for cooler, more professional neutrals
        gray: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Blue → refined corporate blue (closer to Stripe / Linear)
        blue: {
          50:  '#eff6ff',
          100: '#dbeafe',
          300: '#93c5fd',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
        // Green stays clean
        green: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
        },
        // Red stays functional
        red: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },
        // Yellow → softer, warmer amber tone
        yellow: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          800: '#92400e',
        },
        // Emerald accent stays
        emerald: {
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Purple → remapped to teal for premium/professional feel
        purple: {
          600: '#0891b2',
          700: '#0e7490',
        },
        // Amber
        amber: {
          50:  '#fffbeb',
          200: '#fde68a',
          700: '#b45309',
        },
      },
      boxShadow: {
        sm:      '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)',
        DEFAULT: '0 1px 6px 0 rgb(15 23 42 / 0.08), 0 2px 4px -1px rgb(15 23 42 / 0.06)',
        md:      '0 4px 12px -2px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
        lg:      '0 10px 24px -4px rgb(15 23 42 / 0.12), 0 4px 8px -2px rgb(15 23 42 / 0.06)',
        xl:      '0 20px 40px -8px rgb(15 23 42 / 0.14), 0 8px 16px -4px rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};
