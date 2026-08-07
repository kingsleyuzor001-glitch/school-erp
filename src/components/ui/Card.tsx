import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-card border border-slate-200 bg-surface p-5 shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  icon,
  trend
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-white">
          {value}
        </p>
        {trend && (
          <span
            className={clsx(
              "mt-1 inline-block text-xs font-medium",
              trend.positive ? "text-emerald-600" : "text-rose-600"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {icon && <div className="rounded-full bg-brand-50 p-2 text-brand-600 dark:bg-brand-900/40">{icon}</div>}
    </Card>
  );
}
