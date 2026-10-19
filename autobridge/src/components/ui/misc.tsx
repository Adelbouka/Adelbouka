import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow }: {
  title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-1 text-sm text-muted-foreground">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: {
  icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-muted", className)} aria-hidden="true" />;
}

export function DefinitionList({ items, className }: {
  items: Array<{ label: ReactNode; value: ReactNode; hint?: ReactNode }>; className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 sm:grid-cols-2", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-start justify-between gap-4 border-b border-border py-2.5 text-sm">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="text-end font-medium">
            {item.value}
            {item.hint ? <div className="text-xs font-normal text-muted-foreground">{item.hint}</div> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold ltr-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-surface", className)}>
      <table className="w-full min-w-[640px] text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-start [&_th]:font-medium [&_th]:text-muted-foreground [&_thead]:bg-surface-muted/60 [&_tr]:border-b [&_tr]:border-border [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}
