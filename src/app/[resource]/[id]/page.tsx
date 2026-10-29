import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { Cell } from "@/components/cell";
import { DeleteButton } from "@/components/delete-button";
import { ResourceForm } from "@/components/resource-form";
import { deleteRow, updateRow } from "@/app/[resource]/actions";
import { detailColumnsOf, getResource, permissionSummary } from "@/lib/resources";
import {
  loadFieldOptions,
  loadRelationLabels,
  parseRowId,
  selectColumns,
} from "@/lib/resource-data";

export const dynamic = "force-dynamic";

const CHILD_PREVIEW = 10;

export default async function ResourceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase } = await requireSuperadmin();
  const { resource: slug, id } = await params;
  const resource = getResource(slug);
  if (!resource) notFound();
  const rowId = parseRowId(resource, id);
  if (rowId === null) notFound();
  const { saved, error: actionError } = await searchParams;

  const columns = detailColumnsOf(resource);
  const { data } = await supabase
    .from(resource.table)
    .select(selectColumns(columns))
    .eq("id", rowId)
    .maybeSingle();
  if (!data) notFound();
  const row = data as unknown as Record<string, unknown>;

  const editFields = resource.can.update
    ? (resource.fields ?? []).filter(
        (f) => !resource.updateFields || resource.updateFields.includes(f.key)
      )
    : [];

  const [labels, options, children] = await Promise.all([
    loadRelationLabels(supabase, columns, [row]),
    loadFieldOptions(supabase, editFields),
    Promise.all(
      (resource.children ?? []).map(async (child) => {
        const childResource = getResource(child.resource)!;
        const { data: childRows, count } = await supabase
          .from(childResource.table)
          .select(selectColumns(childResource.listColumns), { count: "exact" })
          .eq(child.foreignKey, rowId)
          .order(childResource.orderBy.column, { ascending: childResource.orderBy.ascending })
          .limit(CHILD_PREVIEW);
        const rows = (childRows ?? []) as unknown as Record<string, unknown>[];
        return {
          child,
          childResource,
          rows,
          count: count ?? 0,
          labels: await loadRelationLabels(supabase, childResource.listColumns, rows),
        };
      })
    ),
  ]);

  const title = String(row[resource.labelColumn] ?? `${resource.singular} ${String(row.id)}`);
  const boundUpdate = updateRow.bind(null, slug, String(rowId));
  const boundDelete = deleteRow.bind(null, slug, String(rowId));

  return (
    <main className="w-full max-w-4xl px-6 py-8">
      <Link href={`/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        ← {resource.title}
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {resource.singular} · {permissionSummary(resource)}
      </p>
      <h1 className="mt-1 line-clamp-2 text-2xl font-semibold tracking-tight break-words text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>

      {saved && (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          ✓ {saved === "created" ? "Created" : "Saved"}.
        </p>
      )}
      {typeof actionError === "string" && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </p>
      )}

      <dl className="mt-6 divide-y divide-black/[.06] rounded-2xl border border-black/[.08] bg-white dark:divide-white/[.08] dark:border-white/[.1] dark:bg-zinc-900">
        <div className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr]">
          <dt className="text-sm text-zinc-500 dark:text-zinc-400">ID</dt>
          <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{String(row.id)}</dd>
        </div>
        {columns.filter((c) => c.key !== "id").map((c) => (
          <div key={c.key} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-sm text-zinc-500 dark:text-zinc-400">{c.label}</dt>
            <dd className="text-sm text-zinc-800 dark:text-zinc-200">
              <Cell column={c} value={row[c.key]} label={labels.get(c.key)?.get(String(row[c.key]))} full />
            </dd>
          </div>
        ))}
      </dl>

      {editFields.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Edit</h2>
          <ResourceForm
            action={boundUpdate}
            fields={editFields}
            options={Object.fromEntries(options)}
            initial={row}
            submitLabel="Save changes"
          />
        </section>
      )}

      {children.map(({ child, childResource, rows, count, labels: childLabels }) => (
        <section key={child.resource + child.foreignKey} className="mt-8">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {child.title} <span className="text-sm font-normal text-zinc-500">({count.toLocaleString()})</span>
            </h2>
            {count > 0 && (
              <Link href={`/${child.resource}?f_${child.foreignKey}=${encodeURIComponent(String(rowId))}`} className="text-sm underline text-zinc-600 dark:text-zinc-400">
                See all
              </Link>
            )}
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">None.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/[.08] bg-white dark:border-white/[.1] dark:bg-zinc-900">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-black/[.06] dark:divide-white/[.08]">
                  {rows.map((r) => (
                    <tr key={String(r.id)} className="align-top">
                      {childResource.listColumns.filter((c) => c.key !== child.foreignKey).map((c) => (
                        <td key={c.key} className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                          <Cell column={c} value={r[c.key]} label={childLabels.get(c.key)?.get(String(r[c.key]))} />
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <Link href={`/${child.resource}/${String(r.id)}`} className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {resource.can.delete && (
        <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-red-200 p-5 dark:border-red-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Permanently delete this {resource.singular.toLowerCase()}.
          </p>
          <DeleteButton action={boundDelete} label={title.slice(0, 80)} />
        </div>
      )}
    </main>
  );
}
