// Pill: bottone-tag per filtri (active/inactive).

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function Pill({ active, children, className, ...rest }: PillProps) {
  return (
    <button
      type="button"
      className={cn(
        "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300",
        active
          ? "bg-forest-800 text-cream-50"
          : "bg-white text-forest-700 border border-forest-100 hover:bg-cream-100",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
