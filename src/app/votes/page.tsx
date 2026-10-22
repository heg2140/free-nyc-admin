import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { displayName, fetchAll } from "@/lib/data";
import { StatTile } from "@/components/charts";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type Vote = { suggestion_id: number; user_id: string; value: number };

export default async function VotesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireSuperadmin();
  const params = await searchParams;
  const filter = params.type === "up" || params.type === "down" ? params.type : "all";
  const page = Math.max(1, Number(params.page) || 1);

  const [votes, suggestions, profiles] = await Promise.all([
    fetchAll<Vote>(supabase, "votes", "suggestion_id, user_id, value"),
    fetchAll<{ id: number; title: string; neighborhood: string | null }>(
      supabase,
      "suggestions",
      "id, title, neighborhood"
    ),
    fetchAll<{ id: string; first_name: string | null; last_name: string | null }>(
      supabase,
      "profiles",
      "id, first_name, last_name"
    ),
  ]);

  const suggestionById = new Map(suggestions.map((s) => [s.id, s]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const up = votes.filter((v) => v.value > 0).length;

  const shown = votes
    .filter((v) => filter === "all" || (filter === "up" ? v.value > 0 : v.value < 0))
    .sort((a, b) => b.suggestion_id - a.suggestion_id);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (type: string, p = 1) => {
    const sp = new URLSearchParams();
    if (type !== "all") sp.set("type", type);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `/votes?${s}` : "/votes";
  };
  const tab = (type: string, label: string) => (
    <Link
      href={href(type)}
      className={
        filter === type
          ? "rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "rounded-full border border-black/[.08] px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-white/[.145] dark:text-zinc-300 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Votes
      </h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        Every upvote and downvote on AI suggestions. Read-only.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total votes" value={votes.length.toLocaleString()} />
        <StatTile label="Upvotes" value={`▲ ${up.toLocaleString()}`} />
        <StatTile label="Downvotes" value={`▼ ${(votes.length - up).toLocaleString()}`} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tab("all", "All")}
        {tab("up", "Upvotes")}
        {tab("down", "Downvotes")}
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/[.08] bg-white dark:border-white/[.1] dark:bg-zinc-900">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/[.08] text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.1] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Vote</th>
              <th className="px-4 py-3 font-medium">Suggestion</th>
              <th className="px-4 py-3 font-medium">Voter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
            {pageRows.map((v) => {
              const s = suggestionById.get(v.suggestion_id);
              return (
                <tr key={`${v.suggestion_id}-${v.user_id}`}>
                  <td className="px-4 py-3">
                    {v.value > 0 ? (
                      <span className="font-medium" style={{ color: "var(--viz-up)" }}>▲ Up</span>
                    ) : (
                      <span className="font-medium" style={{ color: "var(--viz-down)" }}>▼ Down</span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    {s ? (
                      <Link href={`/suggestions/${s.id}`} className="block truncate font-medium text-zinc-900 hover:underline dark:text-zinc-50">
                        {s.title}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">Suggestion #{v.suggestion_id}</span>
                    )}
                    {s?.neighborhood && (
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{s.neighborhood}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {displayName(profileById.get(v.user_id)) ?? (
                      <span className="font-mono text-xs">{v.user_id.slice(0, 8)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No votes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
          {page > 1 ? <Link href={href(filter, page - 1)} className="underline">← Previous</Link> : <span />}
          <span>Page {page} of {pageCount}</span>
          {page < pageCount ? <Link href={href(filter, page + 1)} className="underline">Next →</Link> : <span />}
        </div>
      )}
    </main>
  );
}
