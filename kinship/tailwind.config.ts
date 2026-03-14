import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4F72", // Dark Navy
          light: "#2E86C1",
          dark: "#154360",
        },
        accent: {
          DEFAULT: "#00B4A6", // Teal
          light: "#1ABC9C",
          dark: "#0E6655",
        },
        background: "#FAF8F4", // Warm off-white
        success: {
          DEFAULT: "#27AE60",
        },
        danger: {
          DEFAULT: "#E74C3C", // Red
        },
        warning: {
          DEFAULT: "#F39C12", // Amber
        },
        mentalHealth: {
          DEFAULT: "#7C3AED", // Purple
        },
        textDark: "#1A1A2E", // Dark text
        textMuted: "#7F8C8D",
      },
    },
  },
  plugins: [],
};

export default config;
