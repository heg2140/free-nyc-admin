"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/[resource]/actions";
import type { Field } from "@/lib/resources";

const inputClass =
  "w-full rounded-lg border border-black/[.08] bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-800 dark:border-white/[.145] dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200";

export function ResourceForm({
  action,
  fields,
  options,
  initial,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  options: Record<string, Array<{ value: string; label: string }>>;
  initial?: Record<string, unknown>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.1] dark:bg-zinc-900"
    >
      {fields.map((field) => {
        const value = initial?.[field.key];
        const defaultValue = value === null || value === undefined ? "" : String(value);
        return (
          <div key={field.key}>
            {field.type === "boolean" ? (
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" name={field.key} defaultChecked={value === true} className="h-4 w-4" />
                {field.label}
              </label>
            ) : (
              <>
                <label htmlFor={field.key} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {field.label}
                  {!field.required && <span className="font-normal text-zinc-400"> (optional)</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea id={field.key} name={field.key} required={field.required} rows={4} defaultValue={defaultValue} className={inputClass} />
                ) : field.type === "select" ? (
                  <select id={field.key} name={field.key} required={field.required} defaultValue={defaultValue} className={inputClass}>
                    <option value="">{field.required ? "Choose..." : "None"}</option>
                    {(options[field.key] ?? []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.key}
                    name={field.key}
                    type={field.type === "number" ? "number" : "text"}
                    required={field.required}
                    defaultValue={defaultValue}
                    className={inputClass}
                  />
                )}
              </>
            )}
            {field.help && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{field.help}</p>}
          </div>
        );
      })}

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

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
