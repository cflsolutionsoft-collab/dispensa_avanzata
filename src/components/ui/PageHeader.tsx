// Header standard di pagina: kicker (categoria), titolo, slot azione a destra.

import type { ReactNode } from "react";

interface PageHeaderProps {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {kicker && (
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500">
            {kicker}
          </p>
        )}
        <h1 className="mt-0.5 text-2xl font-semibold leading-tight text-forest-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-forest-600">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
