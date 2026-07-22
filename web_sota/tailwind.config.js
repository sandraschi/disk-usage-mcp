/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#09090b",
          alt: "#18181b",
          border: "#27272a",
        },
      },
    },
  },
  plugins: [],
};
