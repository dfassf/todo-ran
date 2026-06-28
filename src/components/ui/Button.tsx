"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white active:opacity-90",
  secondary: "bg-surface-strong text-text active:bg-border",
  ghost: "bg-transparent text-text-sub active:bg-surface-strong",
  danger: "bg-danger text-white active:opacity-90",
};

const SIZES: Record<Size, string> = {
  lg: "h-control-lg text-body font-semibold rounded-md px-4",
  md: "h-control-md text-sub font-semibold rounded-md px-4",
  sm: "h-control-sm text-sub font-medium rounded-sm px-3",
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "lg",
    fullWidth = false,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        "inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:active:opacity-40",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
