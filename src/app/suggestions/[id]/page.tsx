import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { updateSuggestion } from "@/app/suggestions/actions";
import { SuggestionForm } from "@/components/suggestion-form";
import { DeleteSuggestionButton } from "@/components/delete-button";
import { VoteSplit } from "@/components/charts";
import { displayName, formatDate } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SuggestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireSuperadmin();
  const { id: rawId } = await params;
  const { saved, error: deleteError } = await searchParams;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const { data: suggestion } = await supabase
    .from("suggestions")
    .select("id, title, description, neighborhood, activity_type, transit_directions, created_at, user_id, generation_id")
    .eq("id", id)
    .maybeSingle();
  if (!suggestion) notFound();

  const [{ data: votes }, { data: generation }, { data: author }] = await Promise.all([
    supabase.from("votes").select("value, user_id").eq("suggestion_id", id),
    suggestion.generation_id
      ? supabase
          .from("generations")
          .select("starting_point, time_of_day, max_travel_minutes")
          .eq("id", suggestion.generation_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", suggestion.user_id)
      .maybeSingle(),
  ]);
  const up = (votes ?? []).filter((v) => v.value > 0).length;
  const down = (votes ?? []).length - up;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/suggestions" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        ← All suggestions
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Edit suggestion
      </h1>

      {saved && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ✓ Suggestion {saved === "created" ? "created" : "saved"}.
        </p>
      )}
      {typeof deleteError === "string" && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Couldn&apos;t delete: {deleteError}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-black/[.08] bg-white p-5 text-sm sm:grid-cols-4 dark:border-white/[.1] dark:bg-zinc-900">
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
          <dd className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">{formatDate(suggestion.created_at)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 dark:text-zinc-400">{generation ? "Searched by" : "Added by"}</dt>
          <dd className="mt-0.5 truncate font-medium text-zinc-900 dark:text-zinc-50">{displayName(author) ?? "Unknown"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Votes</dt>
          <dd className="mt-1"><VoteSplit up={up} down={down} /></dd>
        </div>
        {generation && (
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-zinc-500 dark:text-zinc-400">From the search</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-300">
              {generation.starting_point} · {generation.time_of_day} · up to {generation.max_travel_minutes} min
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6">
        <SuggestionForm
          action={updateSuggestion}
          initial={{
            id: suggestion.id,
            title: suggestion.title,
            description: suggestion.description,
            neighborhood: suggestion.neighborhood ?? "",
            activity_type: suggestion.activity_type ?? "",
            transit_directions: suggestion.transit_directions,
          }}
          submitLabel="Save changes"
        />
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-red-200 p-5 dark:border-red-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Deleting removes this suggestion and its votes from the app.
        </p>
        <DeleteSuggestionButton id={suggestion.id} title={suggestion.title} />
      </div>
    </main>
  );
}
