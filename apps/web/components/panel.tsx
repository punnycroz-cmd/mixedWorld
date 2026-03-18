import { ReactNode } from "react";

interface PanelProps {
  title?: string;
  kicker?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Panel({
  title,
  kicker,
  children,
  className = "",
  contentClassName = ""
}: PanelProps) {
  return (
    <section className={`glass-panel !rounded-xl p-4 lg:p-4 ${className}`}>
      {kicker ? <p className="eyebrow mb-1.5">{kicker}</p> : null}
      {title ? (
        <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
      ) : null}
      <div className={`${title || kicker ? "mt-3" : ""} ${contentClassName}`.trim()}>{children}</div>
    </section>
  );
}
