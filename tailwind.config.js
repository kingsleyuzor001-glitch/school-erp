/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Base palette — overridden per-tenant at runtime via CSS vars
        // (see src/lib/theme.ts) so each school can brand its instance.
        brand: {
          50: "#f0fdfa", 100: "#ccfbf1", 200: "#99f6e4", 300: "#5eead4",
          400: "#2dd4bf", 500: "#14b8a6", 600: "#0d9488", 700: "#0f766e",
          800: "#115e59", 900: "#134e4a"
        },
        accent: {
          400: "#fbbf24", 500: "#f59e0b", 600: "#d97706"
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8fafc",
          dark: "#0f172a"
        }
      },
      fontFamily: {
        display: ["'Sora'", "sans-serif"],
        body: ["'Inter'", "sans-serif"]
      },
      borderRadius: {
        card: "0.875rem"
      }
    }
  },
  plugins: []
};
