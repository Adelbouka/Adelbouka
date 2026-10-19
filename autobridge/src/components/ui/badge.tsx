import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/domain/request-status";

const tones: Record<Tone | "accent" | "primary", string> = {
  neutral: "bg-surface-muted text-muted-foreground border-border",
  info: "bg-info-soft text-info border-info/15",
  warning: "bg-warning-soft text-warning border-warning/15",
  success: "bg-success-soft text-success border-success/15",
  danger: "bg-danger-soft text-danger border-danger/15",
  accent: "bg-accent-soft text-accent border-accent/15",
  primary: "bg-primary-soft text-primary border-primary/15",
};

export function Badge({ tone = "neutral", children, className, icon }: {
  tone?: keyof typeof tones; children: ReactNode; className?: string; icon?: ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
