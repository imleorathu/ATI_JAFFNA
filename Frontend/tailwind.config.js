export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Google Sans Text", "Google Sans", "Roboto", "Noto Sans", "Arial", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        navy: "#071527",
        ocean: "#0d6efd",
        ink: "#152033",
        clay: {
          bg: "#f0f4f8",
          card: "#ffffff",
          text: "#0f172a",
          muted: "#64748b",
          accent: "#0d6efd",
          warm: "#0b5ed7"
        }
      }
    }
  },
  plugins: []
};
