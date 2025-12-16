/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Netflix-inspired blue palette
        background: "hsl(222, 47%, 6%)",
        foreground: "hsl(210, 40%, 98%)",
        card: {
          DEFAULT: "hsl(222, 47%, 9%)",
          foreground: "hsl(210, 40%, 98%)",
        },
        popover: {
          DEFAULT: "hsl(222, 47%, 9%)",
          foreground: "hsl(210, 40%, 98%)",
        },
        primary: {
          DEFAULT: "hsl(217, 91%, 60%)",
          foreground: "hsl(222, 47%, 6%)",
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        secondary: {
          DEFAULT: "hsl(222, 47%, 15%)",
          foreground: "hsl(210, 40%, 98%)",
        },
        muted: {
          DEFAULT: "hsl(222, 47%, 15%)",
          foreground: "hsl(215, 20%, 65%)",
        },
        accent: {
          DEFAULT: "hsl(217, 91%, 60%)",
          foreground: "hsl(222, 47%, 6%)",
        },
        destructive: {
          DEFAULT: "hsl(0, 84%, 60%)",
          foreground: "hsl(210, 40%, 98%)",
        },
        success: {
          DEFAULT: "hsl(142, 76%, 36%)",
          foreground: "hsl(210, 40%, 98%)",
        },
        warning: {
          DEFAULT: "hsl(38, 92%, 50%)",
          foreground: "hsl(222, 47%, 6%)",
        },
        border: "hsl(222, 47%, 18%)",
        input: "hsl(222, 47%, 18%)",
        ring: "hsl(217, 91%, 60%)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Cal Sans", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" },
          "100%": { boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-gradient": "linear-gradient(135deg, hsl(222, 47%, 6%) 0%, hsl(222, 47%, 12%) 50%, hsl(217, 91%, 15%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
