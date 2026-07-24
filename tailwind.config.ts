import type { Config } from "tailwindcss";

// Wrap a CSS-variable color so Tailwind's `/opacity` modifier works. Tailwind
// substitutes <alpha-value> (default 1) → color-mix produces the tinted color.
const withAlpha = (v: string) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Alpha-aware: `bg-accent/20` etc. resolve via color-mix so opacity modifiers
        // work even though the underlying tokens are CSS variables (hex).
        bg: withAlpha("--bg"),
        surface: withAlpha("--surface"),
        "surface-2": withAlpha("--surface-2"),
        border: withAlpha("--border"),
        muted: withAlpha("--muted"),
        fg: withAlpha("--fg"),
        "fg-dim": withAlpha("--fg-dim"),
        accent: withAlpha("--accent"),
        "accent-fg": withAlpha("--accent-fg"),
        "accent-dim": withAlpha("--accent-dim"),
        spark: withAlpha("--spark"),
        mint: withAlpha("--mint"),
        violet: withAlpha("--violet"),
        danger: withAlpha("--danger"),
        warn: withAlpha("--warn"),
        ok: withAlpha("--ok"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
