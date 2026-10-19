export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="var(--primary)" />
        <path d="M6 20.5c3.2-6.6 6.8-9.9 10-9.9s6.8 3.3 10 9.9" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6 20.5h20" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="16" cy="10.6" r="1.6" fill="var(--accent)" stroke="#fff" strokeWidth="1" />
      </svg>
      <span className="text-[1.05rem] font-semibold tracking-tight ltr-nums">
        AutoBridge <span className="text-accent">DZ</span>
      </span>
    </span>
  );
}
