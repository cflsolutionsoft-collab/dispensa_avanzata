// Badge: piccolo elemento di stato. Tones: neutral, success, warning,
// danger (forte), info, urgent (rosso pieno per scaduti).

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "urgent"
  | "info"
  | "muted";

const TONE_CLS: Record<BadgeTone, string> = {
  neutral: "bg-cream-100 text-forest-800",
  success: "bg-forest-100 text-forest-800",
  warning: "bg-ember-100 text-ember-800",
  danger: "bg-red-100 text-red-700",
  urgent: "bg-red-600 text-white",
  info: "bg-forest-50 text-forest-700",
  muted: "bg-cream-100 text-forest-400",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
