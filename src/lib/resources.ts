// Every table the admin area manages, and what an admin may do with it.
// The generic pages under src/app/[resource] read this config, so adding a
// table here adds its list, detail, create and edit pages.

export type ColumnFormat = "text" | "long" | "date" | "boolean" | "number" | "image" | "id";

export type Column = {
  key: string;
  label: string;
  format?: ColumnFormat;
  // Show a related row's label instead of the raw foreign key.
  relation?: Relation;
};

export type Relation = { table: string; labelColumn: string };

export type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "select";
  required?: boolean;
  // For "select": options come from another table.
  relation?: Relation;
  help?: string;
};

export type Child = {
  title: string;
  resource: string; // slug of the child resource
  foreignKey: string;
};

export type Resource = {
  slug: string;
  table: string;
  title: string;
  singular: string;
  group: "People & access" | "Prompt chains" | "AI output" | "LLMs" | "Content";
  description: string;
  idType: "number" | "uuid";
  labelColumn: string;
  orderBy: { column: string; ascending: boolean };
  // Text columns searched with the list page's search box.
  search?: string[];
  listColumns: Column[];
  // Columns shown on the detail page (defaults to listColumns + created/modified).
  detailColumns?: Column[];
  can: { create?: boolean; update?: boolean; delete?: boolean };
  fields?: Field[];
  // Only these fields can be edited on an existing row (defaults to all fields).
  updateFields?: string[];
  children?: Child[];
  // Huge tables: use a fast estimated count on the list page.
  estimateCount?: boolean;
};

const created: Column = { key: "created_datetime_utc", label: "Created", format: "date" };
const modified: Column = { key: "modified_datetime_utc", label: "Modified", format: "date" };

const PROVIDER: Relation = { table: "llm_providers", labelColumn: "name" };
const MODEL: Relation = { table: "llm_models", labelColumn: "name" };
const FLAVOR: Relation = { table: "humor_flavors", labelColumn: "slug" };
const IMAGE: Relation = { table: "images", labelColumn: "url" };
const PROFILE: Relation = { table: "profiles", labelColumn: "email" };
const TERM_TYPE: Relation = { table: "term_types", labelColumn: "name" };

export const RESOURCES: Resource[] = [
  // --- People & access ---
  {
    slug: "users",
    table: "profiles",
    title: "Users",
    singular: "User",
    group: "People & access",
    description: "Every profile. Read-only.",
    idType: "uuid",
    labelColumn: "email",
    orderBy: { column: "created_datetime_utc", ascending: false },
    search: ["email", "first_name", "last_name"],
    listColumns: [
      { key: "email", label: "Email" },
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "is_superadmin", label: "Superadmin", format: "boolean" },
      { key: "is_matrix_admin", label: "Matrix admin", format: "boolean" },
      { key: "is_in_study", label: "In study", format: "boolean" },
      created,
    ],
    detailColumns: [
      { key: "id", label: "ID", format: "id" },
      { key: "email", label: "Email" },
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "is_superadmin", label: "Superadmin", format: "boolean" },
      { key: "is_matrix_admin", label: "Matrix admin", format: "boolean" },
      { key: "is_in_study", label: "In study", format: "boolean" },
      { key: "is_student_brain_member", label: "Student brain member", format: "boolean" },
      created,
      modified,
    ],
    can: {},
  },
  {
    slug: "signup-domains",
    table: "allowed_signup_domains",
    title: "Allowed signup domains",
    singular: "Signup domain",
    group: "People & access",
    description: "Email domains that may create accounts (e.g. columbia.edu).",
    idType: "number",
    labelColumn: "apex_domain",
    orderBy: { column: "apex_domain", ascending: true },
    search: ["apex_domain"],
    listColumns: [{ key: "apex_domain", label: "Domain" }, created, modified],
    can: { create: true, update: true, delete: true },
    fields: [
      {
        key: "apex_domain",
        label: "Domain",
        type: "text",
        required: true,
        help: "Just the domain, like columbia.edu (no @).",
      },
    ],
  },
  {
    slug: "whitelisted-emails",
    table: "whitelist_email_addresses",
    title: "Whitelisted emails",
    singular: "Whitelisted email",
    group: "People & access",
    description: "Individual email addresses allowed in regardless of domain.",
    idType: "number",
    labelColumn: "email_address",
    orderBy: { column: "email_address", ascending: true },
    search: ["email_address"],
    listColumns: [{ key: "email_address", label: "Email address" }, created, modified],
    can: { create: true, update: true, delete: true },
    fields: [{ key: "email_address", label: "Email address", type: "text", required: true }],
  },

  // --- Prompt chains ---
  {
    slug: "prompt-chains",
    table: "humor_flavors",
    title: "Prompt chains",
    singular: "Prompt chain",
    group: "Prompt chains",
    description: "Humor flavors: named, multi-step prompt pipelines. Read-only.",
    idType: "number",
    labelColumn: "slug",
    orderBy: { column: "created_datetime_utc", ascending: false },
    search: ["slug", "description"],
    listColumns: [
      { key: "slug", label: "Slug" },
      { key: "description", label: "Description", format: "long" },
      { key: "is_pinned", label: "Pinned", format: "boolean" },
      created,
    ],
    can: {},
    children: [
      { title: "Steps", resource: "prompt-chain-steps", foreignKey: "humor_flavor_id" },
      { title: "Mix", resource: "prompt-chain-mix", foreignKey: "humor_flavor_id" },
    ],
  },
  {
    slug: "prompt-chain-steps",
    table: "humor_flavor_steps",
    title: "Prompt chain steps",
    singular: "Prompt chain step",
    group: "Prompt chains",
    description: "Each step of each prompt chain: model, prompts and temperature. Read-only.",
    idType: "number",
    labelColumn: "description",
    orderBy: { column: "humor_flavor_id", ascending: false },
    search: ["description", "llm_system_prompt", "llm_user_prompt"],
    listColumns: [
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "order_by", label: "Step #", format: "number" },
      { key: "description", label: "Description", format: "long" },
      { key: "llm_model_id", label: "Model", relation: MODEL },
      { key: "llm_temperature", label: "Temperature", format: "number" },
    ],
    detailColumns: [
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "order_by", label: "Step #", format: "number" },
      { key: "description", label: "Description", format: "long" },
      { key: "llm_model_id", label: "Model", relation: MODEL },
      { key: "llm_temperature", label: "Temperature", format: "number" },
      { key: "humor_flavor_step_type_id", label: "Step type", relation: { table: "humor_flavor_step_types", labelColumn: "slug" } },
      { key: "llm_input_type_id", label: "Input type", relation: { table: "llm_input_types", labelColumn: "slug" } },
      { key: "llm_output_type_id", label: "Output type", relation: { table: "llm_output_types", labelColumn: "slug" } },
      { key: "llm_system_prompt", label: "System prompt", format: "long" },
      { key: "llm_user_prompt", label: "User prompt", format: "long" },
      { key: "is_hidden", label: "Hidden", format: "boolean" },
      created,
      modified,
    ],
    can: {},
  },
  {
    slug: "prompt-chain-mix",
    table: "humor_flavor_mix",
    title: "Prompt chain mix",
    singular: "Mix entry",
    group: "Prompt chains",
    description: "How many captions each prompt chain contributes. Edit the caption counts here.",
    idType: "number",
    labelColumn: "humor_flavor_id",
    orderBy: { column: "caption_count", ascending: false },
    listColumns: [
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "caption_count", label: "Caption count", format: "number" },
      modified,
    ],
    can: { update: true },
    fields: [{ key: "caption_count", label: "Caption count", type: "number", required: true }],
  },
  {
    slug: "prompt-chain-runs",
    table: "llm_prompt_chains",
    title: "Prompt chain runs",
    singular: "Prompt chain run",
    group: "Prompt chains",
    description: "Each time a prompt chain ran for a generation request. Read-only.",
    idType: "number",
    labelColumn: "id",
    orderBy: { column: "created_datetime_utc", ascending: false },
    listColumns: [
      { key: "id", label: "Run", format: "number" },
      { key: "caption_request_id", label: "Generation request", format: "number" },
      created,
    ],
    can: {},
    children: [
      { title: "LLM responses", resource: "llm-responses", foreignKey: "llm_prompt_chain_id" },
      { title: "Captions", resource: "captions", foreignKey: "llm_prompt_chain_id" },
    ],
  },

  // --- AI output ---
  {
    slug: "captions",
    table: "captions",
    title: "AI generated captions",
    singular: "Caption",
    group: "AI output",
    description: "Captions the AI wrote for images. Read-only.",
    idType: "uuid",
    labelColumn: "content",
    orderBy: { column: "created_datetime_utc", ascending: false },
    search: ["content"],
    listColumns: [
      { key: "image_id", label: "Image", format: "image", relation: IMAGE },
      { key: "content", label: "Caption", format: "long" },
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "like_count", label: "Likes", format: "number" },
      { key: "is_public", label: "Public", format: "boolean" },
      created,
    ],
    detailColumns: [
      { key: "image_id", label: "Image", format: "image", relation: IMAGE },
      { key: "content", label: "Caption", format: "long" },
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "caption_request_id", label: "Generation request", format: "number" },
      { key: "llm_prompt_chain_id", label: "Prompt chain run", format: "number" },
      { key: "profile_id", label: "Requested by", relation: PROFILE },
      { key: "like_count", label: "Likes", format: "number" },
      { key: "is_public", label: "Public", format: "boolean" },
      { key: "is_featured", label: "Featured", format: "boolean" },
      { key: "image_alignment_score", label: "Image alignment score", format: "number" },
      created,
      modified,
    ],
    can: {},
    estimateCount: true,
  },
  {
    slug: "images",
    table: "images",
    title: "Images",
    singular: "Image",
    group: "AI output",
    description: "Images captions are written for. Read-only.",
    idType: "uuid",
    labelColumn: "url",
    orderBy: { column: "created_datetime_utc", ascending: false },
    search: ["image_description", "additional_context"],
    listColumns: [
      { key: "url", label: "Image", format: "image" },
      { key: "image_description", label: "Description", format: "long" },
      { key: "is_public", label: "Public", format: "boolean" },
      { key: "is_common_use", label: "Common use", format: "boolean" },
      created,
    ],
    detailColumns: [
      { key: "url", label: "Image", format: "image" },
      { key: "image_description", label: "Description", format: "long" },
      { key: "additional_context", label: "Additional context", format: "long" },
      { key: "celebrity_recognition", label: "Celebrity recognition", format: "long" },
      { key: "profile_id", label: "Uploaded by", relation: PROFILE },
      { key: "is_public", label: "Public", format: "boolean" },
      { key: "is_common_use", label: "Common use", format: "boolean" },
      created,
      modified,
    ],
    can: {},
    children: [{ title: "Captions", resource: "captions", foreignKey: "image_id" }],
  },
  {
    slug: "generation-requests",
    table: "caption_requests",
    title: "Generation requests",
    singular: "Generation request",
    group: "AI output",
    description: "Requests to generate captions for an image. Read-only.",
    idType: "number",
    labelColumn: "id",
    orderBy: { column: "created_datetime_utc", ascending: false },
    listColumns: [
      { key: "id", label: "Request", format: "number" },
      { key: "image_id", label: "Image", format: "image", relation: IMAGE },
      { key: "profile_id", label: "Requested by", relation: PROFILE },
      created,
    ],
    can: {},
    children: [
      { title: "Captions", resource: "captions", foreignKey: "caption_request_id" },
      { title: "LLM responses", resource: "llm-responses", foreignKey: "caption_request_id" },
    ],
  },
  {
    slug: "llm-responses",
    table: "llm_model_responses",
    title: "LLM responses",
    singular: "LLM response",
    group: "AI output",
    description: "Raw model output for every prompt chain step. Read-only.",
    idType: "uuid",
    labelColumn: "id",
    orderBy: { column: "created_datetime_utc", ascending: false },
    search: ["llm_model_response"],
    listColumns: [
      { key: "llm_model_response", label: "Response", format: "long" },
      { key: "llm_model_id", label: "Model", relation: MODEL },
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "processing_time_seconds", label: "Seconds", format: "number" },
      created,
    ],
    detailColumns: [
      { key: "llm_model_id", label: "Model", relation: MODEL },
      { key: "humor_flavor_id", label: "Prompt chain", relation: FLAVOR },
      { key: "humor_flavor_step_id", label: "Step", format: "number" },
      { key: "caption_request_id", label: "Generation request", format: "number" },
      { key: "llm_prompt_chain_id", label: "Prompt chain run", format: "number" },
      { key: "processing_time_seconds", label: "Processing time (s)", format: "number" },
      { key: "llm_temperature", label: "Temperature", format: "number" },
      { key: "llm_system_prompt", label: "System prompt", format: "long" },
      { key: "llm_user_prompt", label: "User prompt", format: "long" },
      { key: "llm_model_response", label: "Response", format: "long" },
      created,
    ],
    can: {},
    estimateCount: true,
  },
  {
    slug: "generation-examples",
    table: "caption_examples",
    title: "AI generation examples",
    singular: "Generation example",
    group: "AI output",
    description: "Example captions (with explanations) used to guide the AI.",
    idType: "number",
    labelColumn: "caption",
    orderBy: { column: "priority", ascending: false },
    search: ["caption", "image_description", "explanation"],
    listColumns: [
      { key: "caption", label: "Caption", format: "long" },
      { key: "image_description", label: "Image description", format: "long" },
      { key: "priority", label: "Priority", format: "number" },
      modified,
    ],
    detailColumns: [
      { key: "caption", label: "Caption", format: "long" },
      { key: "image_description", label: "Image description", format: "long" },
      { key: "explanation", label: "Explanation", format: "long" },
      { key: "priority", label: "Priority", format: "number" },
      { key: "image_id", label: "Image", format: "image", relation: IMAGE },
      created,
      modified,
    ],
    can: { create: true, update: true, delete: true },
    fields: [
      { key: "caption", label: "Caption", type: "textarea", required: true },
      { key: "image_description", label: "Image description", type: "textarea", required: true },
      { key: "explanation", label: "Explanation", type: "textarea", required: true, help: "Why this caption is funny." },
      { key: "priority", label: "Priority", type: "number", required: true, help: "Higher numbers are used first." },
      { key: "image_id", label: "Image ID (optional)", type: "text", help: "UUID of an image from the Images page." },
    ],
  },

  // --- LLMs ---
  {
    slug: "llm-providers",
    table: "llm_providers",
    title: "LLM providers",
    singular: "LLM provider",
    group: "LLMs",
    description: "Companies that serve the models (OpenAI, Google, ...).",
    idType: "number",
    labelColumn: "name",
    orderBy: { column: "name", ascending: true },
    search: ["name"],
    listColumns: [{ key: "name", label: "Name" }, created, modified],
    can: { create: true, update: true, delete: true },
    fields: [{ key: "name", label: "Name", type: "text", required: true }],
    children: [{ title: "Models", resource: "llm-models", foreignKey: "llm_provider_id" }],
  },
  {
    slug: "llm-models",
    table: "llm_models",
    title: "LLM models",
    singular: "LLM model",
    group: "LLMs",
    description: "Models prompt chain steps can use.",
    idType: "number",
    labelColumn: "name",
    orderBy: { column: "name", ascending: true },
    search: ["name", "provider_model_id"],
    listColumns: [
      { key: "name", label: "Name" },
      { key: "llm_provider_id", label: "Provider", relation: PROVIDER },
      { key: "provider_model_id", label: "Provider's model ID" },
      { key: "is_temperature_supported", label: "Temperature", format: "boolean" },
      modified,
    ],
    can: { create: true, update: true, delete: true },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "llm_provider_id", label: "Provider", type: "select", required: true, relation: PROVIDER },
      {
        key: "provider_model_id",
        label: "Provider's model ID",
        type: "text",
        required: true,
        help: "The ID the provider's API expects, like gpt-4.1 or gemini-2.5-flash.",
      },
      { key: "is_temperature_supported", label: "Supports temperature", type: "boolean" },
    ],
  },

  // --- Content ---
  {
    slug: "terms",
    table: "terms",
    title: "Terms",
    singular: "Term",
    group: "Content",
    description: "Slang and references the AI is taught, with definitions and examples.",
    idType: "number",
    labelColumn: "term",
    orderBy: { column: "term", ascending: true },
    search: ["term", "definition"],
    listColumns: [
      { key: "term", label: "Term" },
      { key: "definition", label: "Definition", format: "long" },
      { key: "term_type_id", label: "Type", relation: TERM_TYPE },
      { key: "priority", label: "Priority", format: "number" },
    ],
    detailColumns: [
      { key: "term", label: "Term" },
      { key: "definition", label: "Definition", format: "long" },
      { key: "example", label: "Example", format: "long" },
      { key: "term_type_id", label: "Type", relation: TERM_TYPE },
      { key: "priority", label: "Priority", format: "number" },
      created,
      modified,
    ],
    can: { create: true, update: true, delete: true },
    fields: [
      { key: "term", label: "Term", type: "text", required: true },
      { key: "definition", label: "Definition", type: "textarea", required: true },
      { key: "example", label: "Example", type: "textarea", required: true },
      { key: "term_type_id", label: "Type", type: "select", relation: TERM_TYPE },
      { key: "priority", label: "Priority", type: "number", required: true },
    ],
  },
];

export const RESOURCE_GROUPS = [
  "People & access",
  "Prompt chains",
  "AI output",
  "LLMs",
  "Content",
] as const;

export function getResource(slug: string) {
  return RESOURCES.find((r) => r.slug === slug) ?? null;
}

export function detailColumnsOf(resource: Resource) {
  return resource.detailColumns ?? [...resource.listColumns.filter((c) => c.key !== "created_datetime_utc" && c.key !== "modified_datetime_utc"), created, modified];
}

// Columns that store the "label" for a row, so links can show something readable.
export function permissionSummary(resource: Resource) {
  const ops = ["Read"];
  if (resource.can.create) ops.push("Create");
  if (resource.can.update) ops.push("Update");
  if (resource.can.delete) ops.push("Delete");
  return ops.join(" · ");
}
