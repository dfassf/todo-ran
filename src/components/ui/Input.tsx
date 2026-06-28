"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className = "", ...rest },
  ref
) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sub font-medium text-text-sub">{label}</span>}
      <input
        ref={ref}
        className={[
          "block w-full bg-surface-strong text-body text-text placeholder:text-muted",
          "h-control-lg rounded-md px-4",
          "border border-transparent focus:border-accent focus:bg-bg outline-none transition-colors",
          error ? "border-danger" : "",
          className,
        ].join(" ")}
        {...rest}
      />
      {(hint || error) && (
        <span className={`mt-2 block text-caption ${error ? "text-danger" : "text-muted"}`}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
});

export default Input;
