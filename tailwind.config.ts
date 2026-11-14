import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#0b7a4b",
          700: "#067647",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        ink: "#10201a",
      },
      maxWidth: {
        phone: "430px",
      },
    },
  },
  plugins: [],
};

export default config;
