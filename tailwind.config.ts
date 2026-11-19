import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        tdk: {
          cosmic: '#130924',
          surface: '#1E1035',
          card: '#241442',
          purple: '#7C3AED',
          pikachu: '#FACC15',
          crown: '#F59E0B',
          pokeball: '#EF4444',
        },
      },
    },
  },
  plugins: [],
};

export default config;
