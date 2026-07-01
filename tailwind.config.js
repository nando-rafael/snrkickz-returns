/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1F1F1F",
        border: "#DADADA",
        subtitle: "#7B7B7B",
      },
    },
  },
  plugins: [],
};
