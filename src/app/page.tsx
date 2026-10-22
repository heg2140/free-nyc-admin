import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { fetchAll } from "@/lib/data";
import { ACTIVITY_TYPES, TIMES_OF_DAY } from "@/lib/constants";
import {
  BarList,
  Card,
  ColumnChart,
  EmptyState,
  Heatmap,
  StatTile,
  VoteSplit,
} from "@/components/charts";

export const dynamic = "force-dynamic";

type Generation = {
  id: number;
  user_id: string;
  activity_type: string;
  time_of_day: string;
  max_travel_minutes: number;
  created_at: string;
};

type Suggestion = {
  id: number;
  title: string;
  neighborhood: string | null;
  activity_type: string | null;
  created_at: string;
};

type Vote = { suggestion_id: number; user_id: string; value: number };

const DAYS_SHOWN = 30;

const TRAVEL_BUCKETS = [
  { label: "15 min or less", max: 15 },
  { label: "16–30 min", max: 30 },
  { label: "31–45 min", max: 45 },
  { label: "46–60 min", max: 60 },
  { label: "61–90 min", max: 90 },
  { label: "Over 90 min", max: Infinity },
];

function nyDateKey(date: Date) {
  // en-CA formats as YYYY-MM-DD.
  return date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function percent(part: number, whole: number) {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

export default async function StatsPage() {
  const { supabase } = await requireSuperadmin();

  const [{ count: userCount }, generations, suggestions, votes] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      fetchAll<Generation>(
        supabase,
        "generations",
        "id, user_id, activity_type, time_of_day, max_travel_minutes, created_at"
      ),
      fetchAll<Suggestion>(
        supabase,
        "suggestions",
        "id, title, neighborhood, activity_type, created_at"
      ),
      fetchAll<Vote>(supabase, "votes", "suggestion_id, user_id, value"),
    ]);

  // --- Headline numbers ---
  const upvotes = votes.filter((v) => v.value > 0).length;
  const downvotes = votes.length - upvotes;
  const searchers = new Set(generations.map((g) => g.user_id)).size;
  const voters = new Set(votes.map((v) => v.user_id)).size;
  const votedSuggestionIds = new Set(votes.map((v) => v.suggestion_id));

  // --- Searches per day (last 30 days, New York time) ---
  const perDay = new Map<string, number>();
  for (const g of generations) {
    const key = nyDateKey(new Date(g.created_at));
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const today = new Date();
  const dayColumns = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS_SHOWN - 1 - i));
    const key = nyDateKey(date);
    return {
      key,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/New_York",
      }),
      value: perDay.get(key) ?? 0,
    };
  });
  const searchesInWindow = dayColumns.reduce((sum, c) => sum + c.value, 0);

  // --- What people search for, by time of day ---
  const heat = new Map<string, number>();
  for (const g of generations) {
    const key = `${g.activity_type}|${g.time_of_day}`;
    heat.set(key, (heat.get(key) ?? 0) + 1);
  }
  const heatRows = [
    ...ACTIVITY_TYPES,
    ...[...new Set(generations.map((g) => g.activity_type))].filter(
      (t) => !(ACTIVITY_TYPES as readonly string[]).includes(t)
    ),
  ];

  // --- Neighborhoods the AI sends people to ---
  const byNeighborhood = new Map<string, number>();
  for (const s of suggestions) {
    const n = s.neighborhood?.trim() || "Unknown";
    byNeighborhood.set(n, (byNeighborhood.get(n) ?? 0) + 1);
  }
  const topNeighborhoods = [...byNeighborhood.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, value]) => ({
      label,
      value,
      tooltip: `${label}: ${value} suggestions (${percent(value, suggestions.length)} of all)`,
    }));

  // --- How far people are willing to travel ---
  const travelCounts = TRAVEL_BUCKETS.map(() => 0);
  for (const g of generations) {
    const index = TRAVEL_BUCKETS.findIndex((b) => g.max_travel_minutes <= b.max);
    travelCounts[index]++;
  }
  const sortedTravel = generations
    .map((g) => g.max_travel_minutes)
    .sort((a, b) => a - b);
  const medianTravel = sortedTravel.length
    ? sortedTravel[Math.floor(sortedTravel.length / 2)]
    : null;

  // --- Votes per suggestion ---
  const tally = new Map<number, { up: number; down: number }>();
  for (const v of votes) {
    const t = tally.get(v.suggestion_id) ?? { up: 0, down: 0 };
    if (v.value > 0) t.up++;
    else t.down++;
    tally.set(v.suggestion_id, t);
  }
  const suggestionById = new Map(suggestions.map((s) => [s.id, s]));
  const rated = [...tally.entries()]
    .map(([id, t]) => ({ suggestion: suggestionById.get(id), ...t }))
    .filter((r) => r.suggestion);

  const favorites = [...rated]
    .sort((a, b) => b.up - b.down - (a.up - a.down) || b.up - a.up)
    .slice(0, 5);

  // Divisive = lots of votes on both sides.
  const divisive = rated
    .filter((r) => r.up > 0 && r.down > 0)
    .sort((a, b) => Math.min(b.up, b.down) - Math.min(a.up, a.down) || b.up + b.down - (a.up + a.down))
    .slice(0, 5);

  // --- Which activity types win votes ---
  const approvalByType = new Map<string, { up: number; down: number }>();
  for (const r of rated) {
    const type = r.suggestion!.activity_type ?? "Other";
    const t = approvalByType.get(type) ?? { up: 0, down: 0 };
    t.up += r.up;
    t.down += r.down;
    approvalByType.set(type, t);
  }
  const approvalRows = [...approvalByType.entries()]
    .map(([label, t]) => ({
      label,
      value: Math.round((t.up / (t.up + t.down)) * 100),
      tooltip: `${label}: ${t.up} up, ${t.down} down`,
    }))
    .sort((a, b) => b.value - a.value);

  // --- Places the AI keeps recommending ---
  const titleCounts = new Map<string, { label: string; value: number }>();
  for (const s of suggestions) {
    const key = s.title.trim().toLowerCase();
    const entry = titleCounts.get(key) ?? { label: s.title.trim(), value: 0 };
    entry.value++;
    titleCounts.set(key, entry);
  }
  const repeats = [...titleCounts.values()]
    .filter((t) => t.value > 1)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Stats
      </h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        How students are using Free NYC, and what the AI keeps telling them.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Users"
          value={(userCount ?? 0).toLocaleString()}
          detail={`${percent(searchers, userCount ?? 0)} have run a search`}
        />
        <StatTile
          label="Searches"
          value={generations.length.toLocaleString()}
          detail={`${searchesInWindow.toLocaleString()} in the last ${DAYS_SHOWN} days`}
        />
        <StatTile
          label="AI suggestions"
          value={suggestions.length.toLocaleString()}
          detail={`${percent(votedSuggestionIds.size, suggestions.length)} have at least one vote`}
        />
        <StatTile
          label="Votes"
          value={votes.length.toLocaleString()}
          detail={`${percent(upvotes, votes.length)} upvotes · ${voters} voters`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={`Searches per day`}
          subtitle={`Last ${DAYS_SHOWN} days, New York time`}
          className="lg:col-span-2"
        >
          {generations.length ? (
            <ColumnChart columns={dayColumns} />
          ) : (
            <EmptyState>No searches yet.</EmptyState>
          )}
        </Card>

        <Card
          title="What people look for, and when"
          subtitle="Searches by activity type and time of day"
          className="lg:col-span-2"
        >
          {generations.length ? (
            <Heatmap
              rows={heatRows}
              columns={TIMES_OF_DAY}
              values={(r, c) => heat.get(`${r}|${c}`) ?? 0}
            />
          ) : (
            <EmptyState>No searches yet.</EmptyState>
          )}
        </Card>

        <Card
          title="Where the AI sends people"
          subtitle="Top 10 neighborhoods by number of suggestions"
        >
          {topNeighborhoods.length ? (
            <BarList rows={topNeighborhoods} />
          ) : (
            <EmptyState>No suggestions yet.</EmptyState>
          )}
        </Card>

        <Card
          title="How far will students go?"
          subtitle={
            medianTravel === null
              ? "Maximum one-way travel time per search"
              : `Maximum one-way travel time per search · median ${medianTravel} min`
          }
        >
          {generations.length ? (
            <BarList
              rows={TRAVEL_BUCKETS.map((b, i) => ({
                label: b.label,
                value: travelCounts[i],
                tooltip: `${b.label}: ${travelCounts[i]} searches (${percent(travelCounts[i], generations.length)})`,
              }))}
            />
          ) : (
            <EmptyState>No searches yet.</EmptyState>
          )}
        </Card>

        <Card title="Community favorites" subtitle="Highest net score (upvotes minus downvotes)">
          <RankedSuggestions rows={favorites} empty="No votes yet." />
        </Card>

        <Card title="Most divisive" subtitle="Suggestions with the most votes on both sides">
          <RankedSuggestions
            rows={divisive}
            empty="Nothing divisive yet. Every voted suggestion is all up or all down."
          />
        </Card>

        <Card
          title="Which activity types win votes"
          subtitle="Share of votes that are upvotes, by activity type"
        >
          {approvalRows.length ? (
            <BarList rows={approvalRows} max={100} format={(v) => `${v}%`} />
          ) : (
            <EmptyState>No votes yet.</EmptyState>
          )}
        </Card>

        <Card
          title="The AI's go-to spots"
          subtitle="Places suggested more than once across all searches"
        >
          {repeats.length ? (
            <BarList
              rows={repeats.map((r) => ({
                ...r,
                tooltip: `${r.label}: suggested ${r.value} times`,
              }))}
            />
          ) : (
            <EmptyState>The AI hasn&apos;t repeated itself yet.</EmptyState>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Downvotes total {downvotes.toLocaleString()}. See every vote on the{" "}
        <Link href="/votes" className="underline">
          Votes
        </Link>{" "}
        page.
      </p>
    </main>
  );
}

function RankedSuggestions({
  rows,
  empty,
}: {
  rows: Array<{ suggestion?: Suggestion; up: number; down: number }>;
  empty: string;
}) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ol className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
      {rows.map(({ suggestion, up, down }, i) => (
        <li key={suggestion!.id} className="flex items-center gap-3 py-2.5">
          <span className="w-4 shrink-0 text-sm font-semibold text-zinc-400 tabular-nums">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">
            <Link
              href={`/suggestions/${suggestion!.id}`}
              className="block truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              {suggestion!.title}
            </Link>
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
              {suggestion!.neighborhood ?? "Unknown"} · {suggestion!.activity_type ?? "Other"}
            </span>
          </span>
          <VoteSplit up={up} down={down} />
        </li>
      ))}
    </ol>
  );
}
