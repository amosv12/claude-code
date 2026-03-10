import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          navy: "#1a2744",
          slate: "#334155",
          blue: "#2563eb",
          lightblue: "#dbeafe",
          gold: "#d97706",
          lightgold: "#fef3c7",
          green: "#059669",
          lightgreen: "#d1fae5",
          red: "#dc2626",
          lightred: "#fee2e2",
          gray: "#f1f5f9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
