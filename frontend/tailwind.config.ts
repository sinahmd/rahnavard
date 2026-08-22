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
        bg: '#fefcf5',
        white: '#ffffff',
        dark: '#1c1c1c',
        gray: {
          DEFAULT: '#6b6b68',
          light: '#e9e6db',
        },
        accent: {
          DEFAULT: '#FFCC04',
          dark: '#e0b400',
        },
      },
      fontFamily: {
        vazir: ['Vazirmatn', 'sans-serif'],
        poppins: ['Poppins', 'Vazirmatn', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '14px',
      },
      boxShadow: {
        'card': '0 4px 14px rgba(28, 28, 28, 0.095)',
        'card-hover': '0 12px 32px rgba(28, 28, 28, 0.151)',
      },
      maxWidth: {
        container: '1180px',
      },
      keyframes: {
        'hero-zoom': {
          '0%': { transform: 'scale(1.037)' },
          '100%': { transform: 'scale(1)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-right': {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'hero-zoom': 'hero-zoom 6000ms ease-in-out forwards',
        'fade-in-up': 'fade-in-up 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'fade-in-left': 'fade-in-left 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'fade-in-right': 'fade-in-right 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'fade-in-scale': 'fade-in-scale 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
      },
    },
  },
  plugins: [],
}

export default config
