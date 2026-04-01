import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'mk-navy': '#1B2A4A',
        'mk-navy-dark': '#0F1B2E',
        'mk-gold': '#C5A55A',
        'mk-gold-light': '#D4B96E',
        'mk-white': '#FFFFFF',
      },
      fontFamily: {
        display: ['var(--font-oswald)', 'sans-serif'],
        body: ['var(--font-montserrat)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
