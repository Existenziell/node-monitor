/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#ffd700',
          hover: '#ffed4e',
          light: 'rgba(255, 215, 0, 0.3)',
        },
        accent: {
          light: '#0D56FF',
        },
        console: {
          info: '#87CEEB',
          success: '#32CD32',
          warning: '#FFA500',
          error: '#ff6b6b',
        },
      },
      fontFamily: {
        mono: ['"Courier New"', 'monospace'],
      },
    },
  },
  plugins: [],
};
