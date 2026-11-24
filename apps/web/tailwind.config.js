/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#0D0F12',
          subtle: '#11141A',
        },
        surface: {
          DEFAULT: '#14181F',
          elevated: '#1C222B',
          hover: '#222A36',
          active: '#283240',
        },
        border: {
          subtle: '#262E3B',
          strong: '#374151',
          focus: '#38BDF8',
        },
        brand: {
          gold: '#E5C158',
          'gold-hover': '#F3D275',
          'gold-subtle': 'rgba(229, 193, 88, 0.1)',
          stellar: '#00E5FF',
          'stellar-muted': '#38BDF8',
          'stellar-subtle': 'rgba(0, 229, 255, 0.1)',
        },
        status: {
          success: '#10B981',
          'success-subtle': 'rgba(16, 185, 129, 0.1)',
          warning: '#F59E0B',
          'warning-subtle': 'rgba(245, 158, 11, 0.1)',
          danger: '#EF4444',
          'danger-subtle': 'rgba(239, 68, 68, 0.1)',
          info: '#3B82F6',
          'info-subtle': 'rgba(59, 130, 246, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
        dialog: '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
};
