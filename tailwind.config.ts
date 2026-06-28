import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-strong": "var(--color-surface-strong)",
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        text: "var(--color-text)",
        "text-sub": "var(--color-text-sub)",
        muted: "var(--color-muted)",
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
      },
      fontSize: {
        display: ["28px", { lineHeight: "1.3", fontWeight: "700", letterSpacing: "-0.02em" }],
        title: ["20px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.01em" }],
        body: ["16px", { lineHeight: "1.5" }],
        sub: ["14px", { lineHeight: "1.45" }],
        caption: ["13px", { lineHeight: "1.4" }],
        tiny: ["12px", { lineHeight: "1.4" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      height: {
        "control-lg": "var(--size-control-lg)",
        "control-md": "var(--size-control-md)",
        "control-sm": "var(--size-control-sm)",
        completion: "var(--size-completion)",
        fab: "var(--size-fab)",
      },
      width: {
        completion: "var(--size-completion)",
        fab: "var(--size-fab)",
      },
      maxWidth: {
        app: "480px",
      },
      boxShadow: {
        fab: "var(--shadow-fab)",
      },
    },
  },
  plugins: [],
};

export default config;
