/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        poker: {
          bg: "#0f2f1a",       // 牌桌深绿
          bg2: "#143a22",
          felt: "#1b5e3a",     // 呢子感
          gold: "#eab308",
          gold2: "#facc15",
          trump: "#a855f7",    // 主牌紫色边框
          red: "#dc2626",
          black: "#0a0a0a",
          back: "#1e40af",     // 牌背蓝
        },
      },
      boxShadow: {
        card: "0 4px 10px rgba(0,0,0,0.35)",
        trump: "0 0 16px 2px rgba(234,179,8,0.55), 0 4px 10px rgba(0,0,0,0.35)",
        selected: "0 -10px 0 0 rgba(168,85,247,0.6) inset, 0 4px 14px rgba(0,0,0,0.45)",
      },
      keyframes: {
        deal: {
          "0%": { transform: "translateY(-80px) scale(0.6)", opacity: 0 },
          "60%": { opacity: 1 },
          "100%": { transform: "translateY(0) scale(1)", opacity: 1 },
        },
        flip: {
          "0%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(234,179,8,0.6)" },
          "50%": { boxShadow: "0 0 20px 6px rgba(234,179,8,0.35)" },
        },
      },
      animation: {
        deal: "deal 280ms cubic-bezier(0.2,0.7,0.2,1.1) both",
        flip: "flip 320ms ease both",
        pulseGlow: "pulseGlow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
