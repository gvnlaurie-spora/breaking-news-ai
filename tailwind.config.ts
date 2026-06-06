import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Enable dark mode
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: "#3b82f6", // Blue-500 (for buttons, highlights)
          600: "#2563eb", // Blue-600
        },
        background: {
          900: "#0a0a0a", // Almost black
          800: "#1a1a1a", // Dark gray
        },
      },
    },
  },
  plugins: [],
};
export default config;
