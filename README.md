# Prompt Jailbreak Lab

A classroom sandbox for teaching CRAFT prompt engineering (Role, Context,
Action, Format, Tone). Students chat with a fictional "ClassBot" guarding a
classroom secret, using their **own free Gemini API key**. Teachers control
the secret code, class roster, and settings from a dashboard — no code
changes needed to run a new session.

Built for **6 classes × up to 80 students** on Vercel + Supabase, all on
free tiers.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql`.
3. Manually insert your first teacher row (until you build a signup flow):
   ```sql
   -- Generate a bcrypt hash first, e.g. via https://bcrypt-generator.com (cost 10)
   insert into teachers (email, password_hash, name)
   values ('you@school.edu', '<bcrypt-hash>', 'Your Name');
   ```
4. Insert a class per section you teach:
   ```sql
   insert into classes (teacher_id, class_name, class_code, secret_code)
   values ('<teacher-id>', 'Section 1', 'SEC1-A1', 'CRAFT-2026');
   ```
   Repeat with a unique `class_code` for each of your 6 classes.
5. Copy your **Project URL** and **service_role key** (Settings → API) —
   NOT the anon key, since API routes use the service role to bypass RLS.
6. Use the **pooled connection** if you later query Postgres directly
   (port 6543, `?pgbouncer=true`) — the Supabase JS client used here
   already goes over HTTPS, so this mainly matters if you add raw SQL later.

## 2. Set up Upstash Redis (rate limiting)

1. Create a free database at [upstash.com](https://upstash.com).
2. Copy the REST URL and REST token into your env vars.

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in every value. Generate the
encryption key and JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add all variables from `.env.example` under Project Settings → Environment
   Variables.
4. Deploy. Set the function region close to your Supabase project's region
   to minimize latency for your 480 students.

## What's stubbed vs. complete

**Complete and working:**
- Database schema (`supabase/schema.sql`)
- AES-256-GCM key encryption (`lib/crypto.ts`)
- Rule-based CRAFT + jailbreak-pattern detection (`lib/craft-detector.ts`)
- Gemini key validation + ClassBot calls (`lib/gemini.ts`)
- Per-student rate limiting (`lib/ratelimit.ts`)
- Student join / key-connect / chat flow, end to end
- Teacher login + single-class dashboard (secret update, roster, attempts)

**You'll likely want to add next:**
- A `GET /api/teacher/classes` route + a class-picker page (the login
  currently redirects to a placeholder `/teacher/dashboard/select` route —
  wire this to list the teacher's 6 classes)
- A teacher signup flow (right now, teacher rows are inserted manually via SQL)
- Supabase Realtime subscription on the dashboard instead of the 10s poll
- The 5 CRAFT missions are seeded in the DB but not yet surfaced as an
  unlockable sequence in the student UI — currently every student sees the
  same open-ended chat
- An admin view of full prompt/response history per student (currently only
  a truncated snippet is stored, by design, to limit stored data)
