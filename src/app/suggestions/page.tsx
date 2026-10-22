import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { fetchAll, formatDate } from "@/lib/data";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { VoteSplit } from "@/components/charts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const activity = typeof params.activity === "string" ? params.activity : "";
  const page = Math.max(1, Number(params.page) || 1);

  let listQuery = supabase
    .from("suggestions")
    .select("id, title, neighborhood, activity_type, created_at, generation_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    // Commas and parentheses would break the or() filter syntax.
    const term = q.replace(/[,()]/g, " ");
    listQuery = listQuery.or(`title.ilike.%${term}%,neighborhood.ilike.%${term}%`);
  }
  if (activity) listQuery = listQuery.eq("activity_type", activity);

  const [{ data: suggestions, count, error }, votes] = await Promise.all([
    listQuery,
    fetchAll<{ suggestion_id: number; value: number }>(supabase, "votes", "suggestion_id, value"),
  ]);

  const tally = new Map<number, { up: number; down: number }>();
  for (const v of votes) {
    const t = tally.get(v.suggestion_id) ?? { up: 0, down: 0 };
    if (v.value > 0) t.up++;
    else t.down++;
    tally.set(v.suggestion_id, t);
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (activity) sp.set("activity", activity);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/suggestions?${s}` : "/suggestions";
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI suggestions
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {total.toLocaleString()} {q || activity ? "matching" : "total"}. Click one to edit or delete it.
          </p>
        </div>
        <Link
          href="/suggestions/new"
          className="rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
        >
          New suggestion
        </Link>
      </div>

      {params.deleted && (
        <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ✓ Suggestion deleted.
        </p>
      )}

      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title or neighborhood..."
          className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-800 sm:w-72 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
        />
        <select
          name="activity"
          defaultValue={activity}
          className="rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-800 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
        >
          <option value="">All activity types</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button className="rounded-lg border border-black/[.08] px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-800">
          Filter
        </button>
      </form>

      {error && (
        <p className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Failed to load suggestions: {error.message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/[.08] bg-white dark:border-white/[.1] dark:bg-zinc-900">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-black/[.08] text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.1] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Activity type</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Votes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
            {(suggestions ?? []).map((s) => {
              const t = tally.get(s.id) ?? { up: 0, down: 0 };
              return (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={`/suggestions/${s.id}`}
                      className="block truncate font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {s.title}
                    </Link>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {s.neighborhood}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{s.activity_type ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {s.generation_id ? "AI search" : "Added by admin"}
                  </td>
                  <td className="px-4 py-3">
                    <VoteSplit up={t.up} down={t.down} />
                  </td>
                </tr>
              );
            })}
            {!error && (suggestions ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No suggestions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          {page > 1 ? <Link href={pageHref(page - 1)} className="underline">← Newer</Link> : <span />}
          <span>Page {page} of {pageCount}</span>
          {page < pageCount ? <Link href={pageHref(page + 1)} className="underline">Older →</Link> : <span />}
        </div>
      )}
    </main>
  );
}
