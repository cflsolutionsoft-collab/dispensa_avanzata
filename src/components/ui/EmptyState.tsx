// EmptyState: icona + titolo + descrizione + CTA opzionale.

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-forest-200 bg-cream-100/50 px-6 py-12 text-center">
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-100 text-forest-600">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-base font-medium text-forest-900">{title}</p>
        {description && (
          <p className="max-w-xs text-sm text-forest-600">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
