# Humor Project Admin

Admin area for the Humor Project (Crackd) database, built on the course's teaching-data copy.

| Section | Table | Access |
|---|---|---|
| Users | `profiles` | Read |
| Allowed signup domains | `allowed_signup_domains` | Create / read / update / delete |
| Whitelisted emails | `whitelist_email_addresses` | Create / read / update / delete |
| Prompt chains | `humor_flavors` | Read |
| Prompt chain steps | `humor_flavor_steps` | Read |
| Prompt chain mix | `humor_flavor_mix` | Read / update |
| Prompt chain runs | `llm_prompt_chains` | Read |
| AI generated captions | `captions` | Read |
| Images | `images` | Read |
| Generation requests | `caption_requests` | Read |
| LLM responses | `llm_model_responses` | Read |
| AI generation examples | `caption_examples` | Create / read / update / delete |
| LLM providers | `llm_providers` | Create / read / update / delete |
| LLM models | `llm_models` | Create / read / update / delete |
| Terms | `terms` | Create / read / update / delete |

Every section is described in `src/lib/resources.ts`. The generic pages in `src/app/[resource]` render the list, detail, create and edit views from that config, and the server actions only write the fields it allows.

## Access

Every route needs a Google login **and** `profiles.is_superadmin = true`. The proxy (`src/proxy.ts`) enforces this on every request, and each page and server action checks it again (`src/lib/auth.ts`).

To avoid locking yourself out, sign in once (this creates your profile), then set the flag from the Supabase SQL Editor, which runs as the database owner:

```sql
update public.profiles set is_superadmin = true
where id = (select id from auth.users where email = 'you@example.com');
```

## Setup

1. Restore the teaching data into a new Supabase project (see the data ZIP's `RESTORE.md`).
2. Enable Google sign-in in that project and add `https://<your-domain>/auth/callback` to its Redirect URLs.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (and in Vercel) to that project's values.
4. `npm run dev`
