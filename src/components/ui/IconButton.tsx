// IconButton: bottone solo-icona, target tap >= 40px.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "ghost" | "secondary" | "primary";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string; // aria-label obbligatorio
  variant?: Variant;
}

const VARIANT_CLS: Record<Variant, string> = {
  ghost: "text-forest-700 hover:bg-forest-50 active:bg-forest-100",
  secondary:
    "border border-forest-100 bg-white text-forest-700 hover:bg-cream-100",
  primary: "bg-forest-800 text-cream-50 hover:bg-forest-900",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, label, variant = "ghost", className, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLS[variant],
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    );
  },
);
