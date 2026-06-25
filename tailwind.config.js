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
        d8: {
          dark: "#0c1a27",
          dark2: "#142333",
          text: "#1a2f3f",
          muted: "#5a7a8a",
          off: "#f5f9fc",
          border: "#dde8ee",
        },
      },
      backgroundImage: {
        "d8-hero": "linear-gradient(135deg, #0c1a27 0%, #0d2d42 60%, #0f4d66 100%)",
        "d8-club": "linear-gradient(135deg, #0c1a27 0%, #142333 100%)",
        "d8-cannabis": "linear-gradient(135deg, #0f2718 0%, #1a3d20 100%)",
      },
    },
  },
  plugins: [],
};
