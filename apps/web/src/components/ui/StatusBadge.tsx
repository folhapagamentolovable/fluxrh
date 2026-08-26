import type { ReactNode } from "react";

export function StatusBadge({ tone, children }: { tone: "red" | "amber" | "blue" | "green" | "gray"; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}
