import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#165DFF",
      },
    },
  },
  plugins: [],
} satisfies Config;
