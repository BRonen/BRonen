/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        transparent: "transparent",
        black: "#000000",
        white: "#ffffff",
        latte: {
          rosewater: "#dc8a78",
          flamingo: "#dd7878",
          magenta: "#da32a4",
          pink: "#ea76cb",
          mauve: "#8839ef",
          red: "#d20f39",
          maroon: "#e64553",
          peach: "#fe640b",
          yellow: "#df8e1d",
          green: "#40a02b",
          teal: "#179299",
          sapphire: "#209fb5",
          sky: "#04a5e5",
          lavender: "#7287fd",
          blue: "#1e66f5",
          gray: "#3c3f59",
          text: "#4c4f69",
          subtext1: "#5c5f77",
          subtext0: "#6c6f85",
          overlay2: "#7c7f93",
          overlay1: "#8c8fa1",
          overlay0: "#9ca0b0",
          surface2: "#acb0be",
          surface1: "#bcc0cc",
          surface0: "#ccd0da",
          crust: "#dce0e8",
          mantle: "#e6e9ef",
          base: "#eff1f5",
        },
      },
      keyframes: {
        oscillate: {
          "0%": { "background-position": "top left" },
          "50%": { "background-position": "bottom right" },
          "100%": { "background-position": "top left" },
        },
      },
      animation: {
        oscillation: "oscillate alternate 3s infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
