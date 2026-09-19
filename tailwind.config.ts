import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f6ff",
          100: "#e6ecff",
          200: "#c2d1ff",
          300: "#9db5ff",
          400: "#5f82ff",
          500: "#2c54f5",
          600: "#1f3fd1",
          700: "#1a34a8",
          800: "#182c85",
          900: "#16276a",
        },
        ink: {
          900: "#0b0e14",
          800: "#12161f",
          700: "#1a1f2b",
          600: "#252b3a",
          500: "#39415a",
          400: "#5a6480",
          300: "#8890a8",
          200: "#c4c9d8",
          100: "#e7e9f0",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
