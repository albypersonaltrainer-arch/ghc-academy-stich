import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00FF41", // Verde Neón Industrial
          dark: "#00CC33",
          light: "#33FF67",
        },
        background: "#121415",
        surface: "#1A1D1E",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "dot-pattern": "radial-gradient(rgba(0, 255, 65, 0.1) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
