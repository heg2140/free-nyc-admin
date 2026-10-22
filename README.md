# Free NYC Admin

Admin area for the [Free NYC](https://github.com/heg2140/nextjs-hello-world) app. It uses the same Supabase project.

- **Stats**: usage charts (searches per day, activity × time-of-day heatmap, neighborhoods, travel times, favorites, divisive picks, the AI's repeat suggestions)
- **Users**: read profiles, emails, sign-in dates and activity
- **AI suggestions**: create, read, update and delete
- **Votes**: read every upvote and downvote

Every route needs a Google login **and** `profiles.is_superadmin = true`. The proxy (`src/proxy.ts`) enforces this on every request. Each page and server action checks it again (`src/lib/auth.ts`), and Supabase row-level security policies enforce it in the database.

## Setup

1. Run `supabase/admin-setup.sql` in the Supabase SQL Editor.
2. Make yourself the first superadmin. The SQL Editor runs as the database owner, so it can set the flag even though the app can't:
   ```sql
   update public.profiles set is_superadmin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (and in Vercel).
4. Add `https://<your-admin-domain>/auth/callback` to Supabase → Authentication → URL Configuration → Redirect URLs.
5. `npm run dev`
