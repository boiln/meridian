import type { Config } from "tailwindcss";

const config = {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(100% 100% at 50% 0%, var(--tw-gradient-stops))",
                meridian:
                    "linear-gradient(165deg, hsl(151 90% 39%) 0%, hsl(171 85% 25%) 25%, hsl(171 85% 12%) 100%)",
                "meridian-glow":
                    "radial-gradient(180% 180% at 50% -80%, hsl(160 100% 45% / 0.3) 0%, transparent 45%)",
                "meridian-card":
                    "linear-gradient(180deg, hsl(171 30% 12% / 0.7) 0%, hsl(171 30% 8% / 0.7) 100%)",
                "meridian-full":
                    "radial-gradient(180% 180% at 50% -80%, hsl(160 100% 45% / 0.3) 0%, transparent 45%), linear-gradient(165deg, hsl(151 90% 39%) 0%, hsl(171 85% 25%) 25%, hsl(171 85% 12%) 100%)",
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                "background-secondary": "hsl(var(--background-secondary))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                meridian: {
                    light: "hsl(151 90% 39%)",
                    DEFAULT: "hsl(171 85% 25%)",
                    dark: "hsl(171 85% 12%)",
                    border: "hsl(171 20% 15% / 0.5)",
                    card: "hsl(171 30% 8% / 0.5)",
                    "card-hover": "hsl(171 30% 12% / 0.5)",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                highlight: {
                    "0%": { backgroundColor: "transparent" },
                    "15%": { backgroundColor: "hsl(var(--muted) / 0.15)" },
                    "100%": { backgroundColor: "transparent" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                highlight: "highlight 0.6s ease-out",
            },
            boxShadow: {
                glow: "0 0 8px var(--glow-color)",
            },
            ringWidth: {
                DEFAULT: "0px",
            },
            ringOffsetWidth: {
                DEFAULT: "0px",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
