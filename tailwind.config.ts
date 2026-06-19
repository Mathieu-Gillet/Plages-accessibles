// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-nunito)', 'sans-serif'],
      },
      colors: {
        ocean: {
          DEFAULT: '#0077b6',
          clair: '#00b4d8',
          // Darker shade for button hover/active states: white text on #005f92
          // reaches ~7.8:1 (vs ~2.2:1 on ocean-clair), passing WCAG AA.
          fonce: '#005f92',
          pale: '#caf0f8',
        },
        sable: {
          DEFAULT: '#fdf6ec',
          fonce: '#f0e3ca',
        },
        ardoise: {
          DEFAULT: '#1a2333',
          clair: '#4a5568',
        },
        vert: {
          accessible: '#2d6a4f',
          pale: '#d8f3dc',
        },
      },
    },
  },
  plugins: [],
}

export default config
