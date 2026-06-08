// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Ensure core layout/color utilities are always generated even if the
    // content scan misses some files (e.g. route-group folders on Linux).
    { pattern: /(bg|text|border|ring|from|via|to)-(slate|emerald|blue|violet|rose|amber|red|green)-(50|100|200|300|400|500|600|700|800|900)/ },
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf9",
          100: "#ccfbef",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          900: "#064e3b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
