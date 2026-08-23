/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        lab: {
          bg: "#0B0F0E",       // near-black, slight green cast — "terminal at night"
          panel: "#111715",
          line: "#1F2B27",
          text: "#DCE8E3",
          dim: "#7C948C",
          signal: "#5EEAD4",  // teal-green "signal" accent — the one bright color
          warn: "#F5A524",
          danger: "#F0596A",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        signal: "0 0 0 1px rgba(94,234,212,0.25), 0 0 24px rgba(94,234,212,0.08)",
      },
    },
  },
  plugins: [],
};
