import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { ResourceForm } from "@/components/resource-form";
import { createRow } from "@/app/[resource]/actions";
import { getResource } from "@/lib/resources";
import { loadFieldOptions } from "@/lib/resource-data";

export default async function NewResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { supabase } = await requireSuperadmin();
  const { resource: slug } = await params;
  const resource = getResource(slug);
  if (!resource?.can.create || !resource.fields) notFound();

  const options = await loadFieldOptions(supabase, resource.fields);

  return (
    <main className="w-full max-w-3xl px-6 py-8">
      <Link href={`/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        ← {resource.title}
      </Link>
      <h1 className="mt-2 mb-6 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        New {resource.singular.toLowerCase()}
      </h1>
      <ResourceForm
        action={createRow.bind(null, slug)}
        fields={resource.fields}
        options={Object.fromEntries(options)}
        submitLabel={`Create ${resource.singular.toLowerCase()}`}
      />
    </main>
  );
}
