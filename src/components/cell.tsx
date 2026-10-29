import Link from "next/link";
import type { Column } from "@/lib/resources";

const RELATION_ROUTES: Record<string, string> = {
  llm_providers: "llm-providers",
  llm_models: "llm-models",
  humor_flavors: "prompt-chains",
  images: "images",
  profiles: "users",
  term_types: "",
  humor_flavor_step_types: "",
  llm_input_types: "",
  llm_output_types: "",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export function Cell({
  column,
  value,
  label,
  full = false,
}: {
  column: Column;
  value: unknown;
  label?: string;
  full?: boolean;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-zinc-400 dark:text-zinc-600">—</span>;
  }

  if (column.format === "image") {
    const src = column.relation ? label : String(value);
    if (!src || !/^https?:\/\//.test(src)) {
      return <span className="text-zinc-400">No image</span>;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        className={
          full
            ? "max-h-96 max-w-full rounded-lg border border-black/[.08] object-contain dark:border-white/[.1]"
            : "h-12 w-12 rounded-md border border-black/[.08] object-cover dark:border-white/[.1]"
        }
      />
    );
  }

  if (column.format === "boolean") {
    return value ? (
      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
        Yes
      </span>
    ) : (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">No</span>
    );
  }

  if (column.format === "date") {
    return <span className="whitespace-nowrap">{formatDateTime(String(value))}</span>;
  }

  if (column.format === "id") {
    return <span className="font-mono text-xs">{String(value)}</span>;
  }

  if (column.relation) {
    const text = label ?? `#${String(value)}`;
    const route = RELATION_ROUTES[column.relation.table];
    return route ? (
      <Link href={`/${route}/${String(value)}`} className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100">
        {text}
      </Link>
    ) : (
      <span>{text}</span>
    );
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (column.format === "long") {
    return full ? (
      <span className="whitespace-pre-wrap break-words">{text}</span>
    ) : (
      <span className="line-clamp-2 max-w-md break-words" title={text.slice(0, 500)}>
        {text}
      </span>
    );
  }

  return <span className={column.format === "number" ? "tabular-nums" : ""}>{text}</span>;
}
