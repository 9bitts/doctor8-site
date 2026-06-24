// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f2f6",
          100: "#c5dde8",
          200: "#9fc4d4",
          400: "#3d8aa8",
          500: "#216a86",
          600: "#1a5569",
          700: "#154558",
          900: "#0c2a35",
        },
        accent: {
          50: "#fef3ef",
          100: "#fde4db",
          400: "#e97a55",
          500: "#e05930",
          600: "#c44a26",
          700: "#a33d1f",
        },
      },
    },
  },
  plugins: [],
};
