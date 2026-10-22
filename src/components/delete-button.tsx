"use client";

import { deleteSuggestion } from "@/app/suggestions/actions";

export function DeleteSuggestionButton({ id, title }: { id: number; title: string }) {
  return (
    <form
      action={deleteSuggestion}
      onSubmit={(e) => {
        if (!confirm(`Delete "${title}"? Its votes will be deleted too. This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950">
        Delete suggestion
      </button>
    </form>
  );
}
