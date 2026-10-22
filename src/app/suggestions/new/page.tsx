import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createSuggestion } from "@/app/suggestions/actions";
import { SuggestionForm } from "@/components/suggestion-form";

export default async function NewSuggestionPage() {
  await requireSuperadmin();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/suggestions" className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        ← All suggestions
      </Link>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        New suggestion
      </h1>
      <p className="mt-1 mb-6 text-zinc-600 dark:text-zinc-400">
        Add a free activity by hand. It shows up in the app like an AI suggestion.
      </p>
      <SuggestionForm action={createSuggestion} submitLabel="Create suggestion" />
    </main>
  );
}
