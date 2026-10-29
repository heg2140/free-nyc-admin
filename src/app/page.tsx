import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSuperadmin } from "@/lib/auth";
import { BarList, Card, ColumnChart, EmptyState, Heatmap, StatTile } from "@/components/charts";

export const dynamic = "force-dynamic";

const DAYS_SHOWN = 30;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const TIME_BLOCKS = ["12–6am", "6am–12pm", "12–6pm", "6pm–12am"] as const;

function headCount(supabase: SupabaseClient, table: string) {
  return supabase.from(table).select("id", { count: "exact", head: true });
}

async function count(
  supabase: SupabaseClient,
  table: string,
  filter?: (q: ReturnType<typeof headCount>) => ReturnType<typeof headCount>
) {
  let query = headCount(supabase, table);
  if (filter) query = filter(query);
  const { count: n } = await query;
  return n ?? 0;
}

function nyParts(iso: string) {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday as (typeof WEEKDAYS)[number],
    hour: Number(parts.hour),
  };
}

function percent(part: number, whole: number) {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

export default async function StatsPage() {
  const { supabase } = await requireSuperadmin();

  // The data is a snapshot, so anchor the "recent" window on the newest caption.
  const { data: newest } = await supabase
    .from("captions")
    .select("created_datetime_utc")
    .order("created_datetime_utc", { ascending: false })
    .limit(1)
    .maybeSingle();
  const windowEnd = newest ? new Date(newest.created_datetime_utc) : new Date();
  const windowStart = new Date(windowEnd);
  windowStart.setDate(windowEnd.getDate() - (DAYS_SHOWN - 1));
  windowStart.setHours(0, 0, 0, 0);

  const [
    users,
    captions,
    requests,
    responses,
    upvotes,
    downvotes,
    { data: models },
    { data: flavors },
  ] = await Promise.all([
    count(supabase, "profiles"),
    count(supabase, "captions"),
    count(supabase, "caption_requests"),
    count(supabase, "llm_model_responses"),
    count(supabase, "caption_votes", (q) => q.gt("vote_value", 0)),
    count(supabase, "caption_votes", (q) => q.lt("vote_value", 0)),
    supabase.from("llm_models").select("id, name"),
    supabase.from("humor_flavors").select("id, slug"),
  ]);

  // Captions in the window (paged: Supabase returns at most 1000 rows per call).
  const recent: Array<{ created_datetime_utc: string; humor_flavor_id: number | null }> = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data } = await supabase
      .from("captions")
      .select("created_datetime_utc, humor_flavor_id")
      .gte("created_datetime_utc", windowStart.toISOString())
      .order("created_datetime_utc", { ascending: true })
      .range(from, from + 999);
    recent.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  // LLM workload per model (one fast count per model).
  const modelCounts = await Promise.all(
    (models ?? []).map(async (m) => ({
      label: m.name as string,
      value: await count(supabase, "llm_model_responses", (q) => q.eq("llm_model_id", m.id)),
    }))
  );
  const busiestModels = modelCounts.filter((m) => m.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  // Captions per day.
  const perDay = new Map<string, number>();
  const heat = new Map<string, number>();
  const perFlavor = new Map<number, number>();
  for (const c of recent) {
    const { day, weekday, hour } = nyParts(c.created_datetime_utc);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    const block = TIME_BLOCKS[Math.floor(hour / 6)];
    heat.set(`${weekday}|${block}`, (heat.get(`${weekday}|${block}`) ?? 0) + 1);
    if (c.humor_flavor_id !== null) {
      perFlavor.set(c.humor_flavor_id, (perFlavor.get(c.humor_flavor_id) ?? 0) + 1);
    }
  }
  const dayColumns = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const date = new Date(windowStart);
    date.setDate(windowStart.getDate() + i);
    const { day } = nyParts(date.toISOString());
    return {
      key: day,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }),
      value: perDay.get(day) ?? 0,
    };
  });

  const flavorName = new Map((flavors ?? []).map((f) => [f.id as number, f.slug as string]));
  const topFlavors = [...perFlavor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, value]) => ({
      label: flavorName.get(id) ?? `#${id}`,
      value,
      tooltip: `${flavorName.get(id) ?? `#${id}`}: ${value} captions (${percent(value, recent.length)} of recent)`,
    }));

  const votes = upvotes + downvotes;

  return (
    <main className="w-full px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Stats</h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        What the caption pipeline is producing, and how people react to it.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Users" value={users.toLocaleString()} />
        <StatTile label="AI captions" value={captions.toLocaleString()} detail={`${(captions / Math.max(1, requests)).toFixed(1)} per generation request`} />
        <StatTile label="Generation requests" value={requests.toLocaleString()} />
        <StatTile label="LLM responses" value={responses.toLocaleString()} detail={`${(responses / Math.max(1, requests)).toFixed(1)} model calls per request`} />
        <StatTile label="Votes" value={votes.toLocaleString()} detail={`${percent(upvotes, votes)} upvotes`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card
          title="Captions generated per day"
          subtitle={`${DAYS_SHOWN} days ending ${windowEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })} (the newest caption)`}
          className="xl:col-span-2"
        >
          {recent.length ? <ColumnChart columns={dayColumns} /> : <EmptyState>No captions in this window.</EmptyState>}
        </Card>

        <Card title="When captions get made" subtitle="Recent captions by weekday and time of day (New York time)">
          {recent.length ? (
            <Heatmap rows={WEEKDAYS} columns={TIME_BLOCKS} values={(r, c) => heat.get(`${r}|${c}`) ?? 0} unit="captions" />
          ) : (
            <EmptyState>No captions in this window.</EmptyState>
          )}
        </Card>

        <Card title="Busiest prompt chains" subtitle="Share of recent captions by humor flavor">
          {topFlavors.length ? <BarList rows={topFlavors} /> : <EmptyState>No captions in this window.</EmptyState>}
        </Card>

        <Card title="LLM workload by model" subtitle="All-time responses per model">
          {busiestModels.length ? <BarList rows={busiestModels} /> : <EmptyState>No LLM responses yet.</EmptyState>}
        </Card>

        <Card title="How people vote" subtitle="All caption votes">
          {votes ? (
            <BarList
              rows={[
                { label: "▲ Upvotes", value: upvotes, tooltip: `${upvotes.toLocaleString()} upvotes (${percent(upvotes, votes)})` },
                { label: "▼ Downvotes", value: downvotes, tooltip: `${downvotes.toLocaleString()} downvotes (${percent(downvotes, votes)})` },
              ]}
            />
          ) : (
            <EmptyState>No votes yet.</EmptyState>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Browse the underlying rows from the sidebar, for example{" "}
        <Link href="/captions" className="underline">AI generated captions</Link> or{" "}
        <Link href="/llm-responses" className="underline">LLM responses</Link>.
      </p>
    </main>
  );
}
