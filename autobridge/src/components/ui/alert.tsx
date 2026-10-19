import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  info: { box: "bg-info-soft border-info/20 text-info", Icon: Info },
  warning: { box: "bg-warning-soft border-warning/20 text-warning", Icon: AlertTriangle },
  success: { box: "bg-success-soft border-success/20 text-success", Icon: CheckCircle2 },
  danger: { box: "bg-danger-soft border-danger/20 text-danger", Icon: XCircle },
} as const;

export function Alert({ tone = "info", title, children, className }: {
  tone?: keyof typeof styles; title?: ReactNode; children?: ReactNode; className?: string;
}) {
  const { box, Icon } = styles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-foreground/90">
        {title ? <p className="font-semibold text-current">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}
