"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/suggestions/actions";
import { ACTIVITY_TYPES } from "@/lib/constants";

type Values = {
  id?: number;
  title: string;
  description: string;
  neighborhood: string;
  activity_type: string;
  transit_directions: string;
};

const inputClass =
  "w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-800 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200";
const labelClass = "mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function SuggestionForm({
  action,
  initial,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: Values;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const activityOptions =
    initial?.activity_type &&
    !(ACTIVITY_TYPES as readonly string[]).includes(initial.activity_type)
      ? [...ACTIVITY_TYPES, initial.activity_type]
      : ACTIVITY_TYPES;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-900"
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="title" className={labelClass}>Title</label>
        <input id="title" name="title" required defaultValue={initial?.title} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="neighborhood" className={labelClass}>Neighborhood</label>
          <input
            id="neighborhood"
            name="neighborhood"
            required
            defaultValue={initial?.neighborhood}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="activity_type" className={labelClass}>Activity type</label>
          <select
            id="activity_type"
            name="activity_type"
            required
            defaultValue={initial?.activity_type ?? ACTIVITY_TYPES[0]}
            className={inputClass}
          >
            {activityOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>Description</label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={initial?.description}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="transit_directions" className={labelClass}>Transit directions</label>
        <textarea
          id="transit_directions"
          name="transit_directions"
          required
          rows={3}
          defaultValue={initial?.transit_directions}
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-100"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
