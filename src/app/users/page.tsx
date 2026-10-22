import { requireSuperadmin } from "@/lib/auth";
import { displayName, fetchAll, formatDate } from "@/lib/data";

export const dynamic = "force-dynamic";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_superadmin: boolean;
};

type Account = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireSuperadmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";

  const [profiles, accountsResult, generations, votes] = await Promise.all([
    fetchAll<Profile>(
      supabase,
      "profiles",
      "id, first_name, last_name, avatar_url, is_superadmin"
    ),
    supabase.rpc("admin_list_users"),
    fetchAll<{ user_id: string }>(supabase, "generations", "user_id"),
    fetchAll<{ user_id: string }>(supabase, "votes", "user_id"),
  ]);

  const accounts = new Map<string, Account>(
    ((accountsResult.data ?? []) as Account[]).map((a) => [a.id, a])
  );
  const countBy = (rows: Array<{ user_id: string }>) => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
    return counts;
  };
  const searchCounts = countBy(generations);
  const voteCounts = countBy(votes);

  const users = profiles
    .map((p) => ({
      ...p,
      name: displayName(p),
      account: accounts.get(p.id),
      searches: searchCounts.get(p.id) ?? 0,
      votes: voteCounts.get(p.id) ?? 0,
    }))
    .filter(
      (u) =>
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.account?.email?.toLowerCase().includes(query)
    )
    .sort(
      (a, b) =>
        (b.account?.created_at ?? "").localeCompare(a.account?.created_at ?? "")
    );

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Users
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {profiles.length.toLocaleString()} profiles. Read-only.
          </p>
        </div>
        <form className="w-full sm:w-72">
          <input
            name="q"
            defaultValue={typeof q === "string" ? q : ""}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-800 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200"
          />
        </form>
      </div>

      {accountsResult.error && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Couldn&apos;t load emails and sign-in dates ({accountsResult.error.message}).
          Make sure supabase/admin-setup.sql has been run.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-black/[.08] bg-white dark:border-white/[.1] dark:bg-zinc-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/[.08] text-xs uppercase tracking-wide text-zinc-500 dark:border-white/[.1] dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 text-right font-medium">Searches</th>
              <th className="px-4 py-3 text-right font-medium">Votes</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {(u.name ?? u.account?.email ?? "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                        {u.name ?? <span className="text-zinc-400">No name</span>}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {u.account?.email ?? u.id}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatDate(u.account?.created_at)}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {formatDate(u.account?.last_sign_in_at)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {u.searches}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {u.votes}
                </td>
                <td className="px-4 py-3">
                  {u.is_superadmin ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                      Superadmin
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">User</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No users match &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
