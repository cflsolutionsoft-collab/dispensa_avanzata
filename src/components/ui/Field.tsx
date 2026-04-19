// Field: wrapper label + input/select uniforme.

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const CONTROL_CLS =
  "w-full rounded-xl border border-forest-100 bg-white px-3 py-2.5 text-sm text-forest-900 placeholder:text-forest-300 focus:border-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-200 transition-colors disabled:bg-cream-100 disabled:text-forest-400";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      {label && (
        <span className="block text-xs font-medium text-forest-700">
          {label}
        </span>
      )}
      {children}
      {hint && <span className="block text-xs text-forest-400">{hint}</span>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL_CLS, className)} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(CONTROL_CLS, "appearance-none pr-8", className)}
        {...rest}
      >
        {children}
      </select>
    );
  },
);
