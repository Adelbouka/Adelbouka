import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Label({ htmlFor, children, required, className }: {
  htmlFor?: string; children: ReactNode; required?: boolean; className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}>
      {children}
      {required ? <span className="ms-0.5 text-danger" aria-hidden="true">*</span> : null}
    </label>
  );
}

export function Field({
  id, label, hint, error, required, children, className,
}: {
  id: string; label: ReactNode; hint?: ReactNode; error?: string | null; required?: boolean;
  children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id} required={required}>{label}</Label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

/** aria attributes linking a control to its hint/error. */
export function describedBy(id: string, error?: string | null, hint?: ReactNode) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}
