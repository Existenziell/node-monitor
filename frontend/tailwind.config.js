/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        level: {
          1: 'var(--level-1)',
          2: 'var(--level-2)',
          3: 'var(--level-3)',
          4: 'var(--level-4)',
          5: 'var(--level-5)',
        },
        accent: {
          DEFAULT: '#5a7a9a',
          hover: '#6b8baa',
          muted: 'rgba(90, 122, 154, 0.25)',
          foreground: '#ffffff',
        },
        console: {
          info: '#87CEEB',
          success: '#32CD32',
          warning: '#FFA500',
          error: '#ff6b6b',
        },
        semantic: {
          error: 'var(--color-error)',
          warning: 'var(--color-warning)',
          success: 'var(--color-success)',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
