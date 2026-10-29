import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { Cell } from "@/components/cell";
import { RESOURCES, getResource, permissionSummary } from "@/lib/resources";
import { loadRelationLabels, selectColumns } from "@/lib/resource-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

// Columns a list may be filtered on: its own columns, plus any foreign key a
// parent resource uses to link to it (e.g. steps by humor_flavor_id).
function filterableColumns(slug: string) {
  const resource = getResource(slug)!;
  const keys = new Set([
    ...resource.listColumns.map((c) => c.key),
    ...(resource.detailColumns ?? []).map((c) => c.key),
  ]);
  for (const r of RESOURCES) {
    for (const child of r.children ?? []) {
      if (child.resource === slug) keys.add(child.foreignKey);
    }
  }
  return keys;
}

export default async function ResourceListPage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireSuperadmin();
  const { resource: slug } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const allowed = filterableColumns(slug);
  const filters = Object.entries(sp)
    .filter(([k, v]) => k.startsWith("f_") && typeof v === "string" && allowed.has(k.slice(2)))
    .map(([k, v]) => [k.slice(2), v as string] as const);

  let query = supabase
    .from(resource.table)
    .select(selectColumns(resource.listColumns), {
      count: resource.estimateCount && !q && !filters.length ? "estimated" : "exact",
    })
    .order(resource.orderBy.column, { ascending: resource.orderBy.ascending })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  for (const [column, value] of filters) query = query.eq(column, value);
  if (q && resource.search?.length) {
    // Commas and parentheses would break the or() filter syntax.
    const term = q.replace(/[,()]/g, " ");
    query = query.or(resource.search.map((c) => `${c}.ilike.%${term}%`).join(","));
  }

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const labels = await loadRelationLabels(supabase, resource.listColumns, rows);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    for (const [column, value] of filters) next.set(`f_${column}`, value);
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return s ? `/${slug}?${s}` : `/${slug}`;
  };

  return (
    <main className="w-full px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {resource.group} · {permissionSummary(resource)}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {resource.title}
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">{resource.description}</p>
        </div>
        {resource.can.create && (
          <Link
            href={`/${slug}/new`}
            className="rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            New {resource.singular.toLowerCase()}
          </Link>
        )}
      </div>

      {sp.deleted && (
        <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ✓ Deleted.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {resource.search?.length ? (
          <form className="flex gap-2">
            {filters.map(([column, value]) => (
              <input key={column} type="hidden" name={`f_${column}`} value={value} />
            ))}
            <input
              name="q"
              defaultValue={q}
              placeholder={`Search ${resource.title.toLowerCase()}...`}
              className="w-64 rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-800 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
            />
            <button className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-800">
              Search
            </button>
          </form>
        ) : null}
        {filters.map(([column, value]) => (
          <span key={column} className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {column} = {value}
          </span>
        ))}
        {(q || filters.length > 0) && (
          <Link href={`/${slug}`} className="text-sm text-zinc-500 underline dark:text-zinc-400">
            Clear
          </Link>
        )}
        <span className="ml-auto text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {resource.estimateCount && !q && !filters.length ? "About " : ""}
          {total.toLocaleString()} {total === 1 ? "row" : "rows"}
        </span>
      </div>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load: {error.message}
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/[.08] bg-white dark:border-white/[.1] dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/[.08] text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.1] dark:text-zinc-400">
            <tr>
              {resource.listColumns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium whitespace-nowrap">{c.label}</th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
            {rows.map((row) => (
              <tr key={String(row.id)} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                {resource.listColumns.map((c) => (
                  <td key={c.key} className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    <Cell column={c} value={row[c.key]} label={labels.get(c.key)?.get(String(row[c.key]))} />
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <Link href={`/${slug}/${String(row.id)}`} className="text-sm font-medium whitespace-nowrap text-zinc-900 underline dark:text-zinc-50">
                    {resource.can.update ? "View / edit" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {!error && rows.length === 0 && (
              <tr>
                <td colSpan={resource.listColumns.length + 1} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  Nothing here{q ? ` matching “${q}”` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          {page > 1 ? <Link href={href(page - 1)} className="underline">← Previous</Link> : <span />}
          <span className="tabular-nums">Page {page.toLocaleString()} of {pageCount.toLocaleString()}</span>
          {page < pageCount ? <Link href={href(page + 1)} className="underline">Next →</Link> : <span />}
        </div>
      )}
    </main>
  );
}
