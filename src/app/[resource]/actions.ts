"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { getResource, type Field } from "@/lib/resources";
import { parseRowId, UUID } from "@/lib/resource-data";

export type FormState = { error: string | null };


// Only fields listed in the resource config are ever written, whatever the
// submitted form contains.
function readValues(fields: Field[], formData: FormData) {
  const values: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const raw = String(formData.get(field.key) ?? "").trim();
    if (field.type === "boolean") {
      values[field.key] = formData.get(field.key) === "on";
      continue;
    }
    if (!raw) {
      if (field.required) return { error: `${field.label} is required.` };
      values[field.key] = null;
      continue;
    }
    if (field.type === "number" || (field.type === "select" && /^\d+$/.test(raw))) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return { error: `${field.label} must be a number.` };
      values[field.key] = n;
      continue;
    }
    if (field.key.endsWith("_id") && field.type === "text" && !UUID.test(raw)) {
      return { error: `${field.label} must be a valid ID.` };
    }
    values[field.key] = raw;
  }
  return { values };
}

function friendly(message: string) {
  if (message.includes("duplicate key")) return "That already exists.";
  if (message.includes("violates foreign key")) {
    return "Other records still use this one, so it can't be removed or changed that way.";
  }
  return message;
}

export async function createRow(
  slug: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const resource = getResource(slug);
  if (!resource?.can.create || !resource.fields) return { error: "Not allowed." };

  const parsed = readValues(resource.fields, formData);
  if ("error" in parsed) return { error: parsed.error ?? "Invalid input." };

  const { data, error } = await supabase
    .from(resource.table)
    .insert(parsed.values)
    .select("id")
    .single();
  if (error) return { error: `Couldn't create it: ${friendly(error.message)}` };

  revalidatePath(`/${slug}`);
  redirect(`/${slug}/${data.id}?saved=created`);
}

export async function updateRow(
  slug: string,
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const { supabase } = await requireSuperadmin();
  const resource = getResource(slug);
  if (!resource?.can.update || !resource.fields) return { error: "Not allowed." };
  const rowId = parseRowId(resource, id);
  if (rowId === null) return { error: "Unknown record." };

  const fields = resource.updateFields
    ? resource.fields.filter((f) => resource.updateFields!.includes(f.key))
    : resource.fields;
  const parsed = readValues(fields, formData);
  if ("error" in parsed) return { error: parsed.error ?? "Invalid input." };

  const { data, error } = await supabase
    .from(resource.table)
    .update(parsed.values)
    .eq("id", rowId)
    .select("id");
  if (error) return { error: `Couldn't save: ${friendly(error.message)}` };
  if (!data?.length) return { error: "Nothing was saved. The database didn't allow the change." };

  revalidatePath(`/${slug}`);
  redirect(`/${slug}/${rowId}?saved=updated`);
}

export async function deleteRow(slug: string, id: string) {
  const { supabase } = await requireSuperadmin();
  const resource = getResource(slug);
  if (!resource?.can.delete) redirect(`/${slug}`);
  const rowId = parseRowId(resource!, id);
  if (rowId === null) redirect(`/${slug}`);

  const { data, error } = await supabase
    .from(resource!.table)
    .delete()
    .eq("id", rowId)
    .select("id");
  if (error || !data?.length) {
    const message = error ? friendly(error.message) : "The database didn't allow the delete.";
    redirect(`/${slug}/${rowId}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/${slug}`);
  redirect(`/${slug}?deleted=1`);
}
