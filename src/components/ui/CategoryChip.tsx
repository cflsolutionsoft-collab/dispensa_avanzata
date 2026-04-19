// Chip categoria con icona + label, in versione compatta o "filter pill".

import { CATEGORY_STYLE } from "@/lib/categoryStyle";
import { CATEGORY_LABELS, type Category } from "@/lib/enums";
import { cn } from "@/lib/utils";

interface CategoryChipProps {
  category: Category;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function CategoryChip({
  category,
  count,
  active,
  onClick,
  size = "md",
}: CategoryChipProps) {
  const style = CATEGORY_STYLE[category];
  const label = CATEGORY_LABELS[category];
  const Icon = style.icon;

  const isInteractive = !!onClick;
  const Tag = isInteractive ? "button" : "div";

  return (
    <Tag
      type={isInteractive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium transition-all",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs",
        active
          ? "bg-forest-800 text-cream-50 shadow-soft"
          : `${style.bg} ${style.text} ${style.border} border hover:scale-[1.02]`,
        isInteractive && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-300",
      )}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span className="truncate">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-semibold",
            active ? "bg-cream-50/20 text-cream-50" : "bg-white/60 text-current",
          )}
        >
          {count}
        </span>
      )}
    </Tag>
  );
}
