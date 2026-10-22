"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";

export type FormState = { error: string | null };

const FIELDS = [
  "title",
  "description",
  "neighborhood",
  "activity_type",
  "transit_directions",
] as const;

function readFields(formData: FormData) {
  const values = Object.fromEntries(
    FIELDS.map((f) => [f, String(formData.get(f) ?? "").trim()])
  ) as Record<(typeof FIELDS)[number], string>;
  const missing = FIELDS.filter((f) => !values[f]);
  return { values, missing };
}

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createSuggestion(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase, user } = await requireSuperadmin();
  const { values, missing } = readFields(formData);
  if (missing.length) return { error: "Fill in every field." };

  const { data, error } = await supabase
    .from("suggestions")
    .insert({ ...values, user_id: user.id, generation_id: null })
    .select("id")
    .single();
  if (error) return { error: `Couldn't create it: ${error.message}` };

  revalidatePath("/suggestions");
  redirect(`/suggestions/${data.id}?saved=created`);
}

export async function updateSuggestion(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) return { error: "Unknown suggestion." };
  const { values, missing } = readFields(formData);
  if (missing.length) return { error: "Fill in every field." };

  const { data, error } = await supabase
    .from("suggestions")
    .update(values)
    .eq("id", id)
    .select("id");
  if (error) return { error: `Couldn't save: ${error.message}` };
  if (!data?.length) return { error: "Nothing was saved. Check the superadmin policies." };

  revalidatePath("/suggestions");
  redirect(`/suggestions/${id}?saved=updated`);
}

export async function deleteSuggestion(formData: FormData) {
  const { supabase } = await requireSuperadmin();
  const id = parseId(String(formData.get("id") ?? ""));
  if (!id) redirect("/suggestions");

  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) {
    redirect(`/suggestions/${id}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/suggestions");
  redirect("/suggestions?deleted=1");
}
