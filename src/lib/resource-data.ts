import type { SupabaseClient } from "@supabase/supabase-js";
import type { Column, Field, Relation, Resource } from "@/lib/resources";

type Row = Record<string, unknown>;

// Look up readable labels (e.g. a provider's name) for every foreign key
// shown in these columns, with one query per related table.
export async function loadRelationLabels(
  supabase: SupabaseClient,
  columns: Column[],
  rows: Row[]
) {
  const labels = new Map<string, Map<string, string>>();
  await Promise.all(
    columns
      .filter((c) => c.relation)
      .map(async (c) => {
        const relation = c.relation as Relation;
        const ids = [
          ...new Set(rows.map((r) => r[c.key]).filter((v) => v !== null && v !== undefined)),
        ];
        const map = new Map<string, string>();
        if (ids.length) {
          const { data } = await supabase
            .from(relation.table)
            .select(`id, ${relation.labelColumn}`)
            .in("id", ids as string[]);
          for (const r of (data ?? []) as unknown as Row[]) {
            map.set(String(r.id), String(r[relation.labelColumn] ?? r.id));
          }
        }
        labels.set(c.key, map);
      })
  );
  return labels;
}

// Options for "select" fields in forms.
export async function loadFieldOptions(supabase: SupabaseClient, fields: Field[]) {
  const options = new Map<string, Array<{ value: string; label: string }>>();
  await Promise.all(
    fields
      .filter((f) => f.type === "select" && f.relation)
      .map(async (f) => {
        const relation = f.relation as Relation;
        const { data } = await supabase
          .from(relation.table)
          .select(`id, ${relation.labelColumn}`)
          .order(relation.labelColumn, { ascending: true })
          .limit(1000);
        options.set(
          f.key,
          ((data ?? []) as unknown as Row[]).map((r) => ({
            value: String(r.id),
            label: String(r[relation.labelColumn] ?? r.id),
          }))
        );
      })
  );
  return options;
}

// The column list for a select() call (always includes id).
export function selectColumns(columns: Column[]) {
  return [...new Set(["id", ...columns.map((c) => c.key)])].join(", ");
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseRowId(resource: Resource, raw: string) {
  if (resource.idType === "uuid") return UUID.test(raw) ? raw : null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
