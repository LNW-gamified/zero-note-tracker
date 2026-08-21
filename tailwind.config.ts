import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#ECE6D6",
        paper: "#161B22",
        paperDark: "#10141A",
        teal: "#4FB9B3",
        stamp: "#E2665F",
        gold: "#D9B968",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-plex)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "paper-texture":
          "radial-gradient(circle at 1px 1px, rgba(236,230,214,0.05) 1px, transparent 0)",
      },
      backgroundSize: {
        grain: "18px 18px",
      },
    },
  },
  plugins: [],
};
export default config;
