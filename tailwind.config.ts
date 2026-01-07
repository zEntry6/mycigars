import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paper-like colors
        paper: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#f5efe6',
          cream: '#f8f5f0',
          border: '#e8e4de',
        },
        // Background colors
        background: {
          DEFAULT: '#f0ebe4',
          dark: '#e5dfd6',
        },
        // Ink colors for text
        ink: {
          DEFAULT: '#2c2c2c',
          light: '#4a4a4a',
          muted: '#6b6b6b',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'paper': '0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)',
        'paper-hover': '0 4px 12px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08)',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
