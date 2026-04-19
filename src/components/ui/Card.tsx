// Card: container con bordo morbido, ombra leggera, padding standard.

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  // padding compatto vs standard
  compact?: boolean;
  // disabilita ombra (utile per card raggruppate)
  flat?: boolean;
}

export function Card({
  children,
  compact = false,
  flat = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-forest-100 bg-white",
        compact ? "p-3" : "p-5",
        !flat && "shadow-soft",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
