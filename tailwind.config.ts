import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        morning: "#f5f7f2",
        fern: "#366b5b",
        gold: "#b9852a",
        cloud: "#e8edf0"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 38, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
