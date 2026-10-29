import type { ReactNode } from "react";

// Small server-rendered chart pieces built from plain HTML. Each mark shows
// its exact value in a tooltip on hover/focus.

export function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-900 ${className}`}
    >
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      {subtitle && (
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {subtitle}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {children}
    </p>
  );
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus:block dark:bg-zinc-100 dark:text-zinc-900">
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>
      )}
    </div>
  );
}

// Horizontal bars: one row per category, value labeled at the end.
export function BarList({
  rows,
  format = (v) => v.toLocaleString(),
  max,
}: {
  rows: Array<{ label: string; value: number; tooltip?: string }>;
  format?: (value: number) => string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <span className="truncate text-sm text-zinc-700 dark:text-zinc-300" title={row.label}>
            {row.label}
          </span>
          <span className="flex items-center gap-2">
            <span
              tabIndex={0}
              className="group relative block h-3.5 rounded-r-[4px] outline-none"
              style={{
                width: `${Math.max(1, (row.value / top) * 100)}%`,
                background: "var(--viz-bar)",
              }}
            >
              <Tooltip>{row.tooltip ?? `${row.label}: ${format(row.value)}`}</Tooltip>
            </span>
            <span className="shrink-0 text-xs font-medium text-zinc-600 tabular-nums dark:text-zinc-400">
              {format(row.value)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// Vertical columns over time (one column per day).
export function ColumnChart({
  columns,
  height = 140,
}: {
  columns: Array<{ key: string; label: string; value: number }>;
  height?: number;
}) {
  const top = Math.max(1, ...columns.map((c) => c.value));
  return (
    <div>
      <div className="relative flex items-end gap-[2px]" style={{ height }}>
        <span className="absolute inset-x-0 bottom-0 border-b" style={{ borderColor: "var(--viz-grid)" }} />
        <span className="absolute -top-1 left-0 text-[10px] text-zinc-500 tabular-nums dark:text-zinc-400">
          {top}
        </span>
        {columns.map((c) => (
          <span
            key={c.key}
            tabIndex={0}
            className="group relative flex-1 rounded-t-[4px] outline-none"
            style={{
              height: c.value === 0 ? 0 : `${Math.max(3, (c.value / top) * 100)}%`,
              background: "var(--viz-bar)",
            }}
          >
            <Tooltip>
              {c.label}: {c.value.toLocaleString()}
            </Tooltip>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>{columns[0]?.label}</span>
        <span>{columns[columns.length - 1]?.label}</span>
      </div>
    </div>
  );
}

const RAMP = [1, 2, 3, 4, 5, 6, 7].map((i) => `var(--viz-ramp-${i})`);

// Rows x columns grid; darker cells mean more.
export function Heatmap({
  rows,
  columns,
  values,
  unit = "searches",
}: {
  rows: readonly string[];
  columns: readonly string[];
  values: (row: string, column: string) => number;
  unit?: string;
}) {
  const all = rows.flatMap((r) => columns.map((c) => values(r, c)));
  const top = Math.max(1, ...all);
  const colorFor = (v: number) =>
    v === 0
      ? "var(--viz-ramp-0)"
      : RAMP[Math.min(RAMP.length - 1, Math.floor((v / top) * (RAMP.length - 1)))];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[3px] text-sm">
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c} className="px-1 pb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th className="whitespace-nowrap pr-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {r}
              </th>
              {columns.map((c) => {
                const v = values(r, c);
                const dark = v / top > 0.55;
                return (
                  <td
                    key={c}
                    tabIndex={0}
                    className="group relative h-9 min-w-14 rounded-md text-center text-xs font-medium tabular-nums outline-none"
                    style={{ background: colorFor(v) }}
                  >
                    <span
                      className={
                        dark
                          ? "text-white dark:text-zinc-950"
                          : "text-zinc-700 dark:text-zinc-200"
                      }
                    >
                      {v > 0 ? v : ""}
                    </span>
                    <Tooltip>
                      {r} · {c}: {v.toLocaleString()} {unit}
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Upvotes vs downvotes for one item, as a split bar.
export function VoteSplit({ up, down }: { up: number; down: number }) {
  const total = up + down;
  if (total === 0) {
    return <span className="text-xs text-zinc-500 dark:text-zinc-400">No votes</span>;
  }
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-2.5 w-24 gap-[2px] overflow-hidden rounded-[4px]">
        {up > 0 && <span style={{ flex: up, background: "var(--viz-up)" }} />}
        {down > 0 && <span style={{ flex: down, background: "var(--viz-down)" }} />}
      </span>
      <span className="text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
        ▲{up} ▼{down}
      </span>
    </span>
  );
}
