// Bottone standard dell'app. Variant: primary (forest), secondary (outline),
// ghost (testo + hover), danger (rosso). Size: sm/md/lg.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary:
    "bg-forest-800 text-cream-50 hover:bg-forest-900 active:bg-forest-900 focus-visible:ring-forest-700",
  secondary:
    "bg-white text-forest-800 border border-forest-200 hover:bg-cream-100 active:bg-cream-200 focus-visible:ring-forest-300",
  ghost:
    "bg-transparent text-forest-800 hover:bg-forest-50 active:bg-forest-100 focus-visible:ring-forest-300",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-400",
};

const SIZE_CLS: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-13 px-5 text-base gap-2.5",
};

const BASE =
  "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:cursor-not-allowed disabled:opacity-50";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading,
      iconLeft,
      iconRight,
      fullWidth,
      className,
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          BASE,
          VARIANT_CLS[variant],
          SIZE_CLS[size],
          fullWidth && "w-full",
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Spinner size={size} />
        ) : (
          <>
            {iconLeft}
            {children}
            {iconRight}
          </>
        )}
      </button>
    );
  },
);

function Spinner({ size }: { size: Size }) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        dim,
      )}
      aria-hidden
    />
  );
}
