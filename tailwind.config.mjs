/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        accent: {
          DEFAULT: '#10b981', // emerald-500
          dark: '#059669',
          light: '#34d399',
        },
      },
    },
  },
  plugins: [],
};
