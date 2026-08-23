-- Prompt Jailbreak Lab — schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- All access happens through server-side API routes using the service role
-- key, so RLS is left permissive-by-default-deny (no anon access at all).

create extension if not exists "pgcrypto";

create table teachers (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  created_at    timestamptz not null default now()
);

create table classes (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references teachers(id) on delete cascade,
  class_name    text not null,
  class_code    text unique not null,          -- e.g. "SEC1-A1", shown to students to join
  secret_code   text not null default 'CRAFT-2026',
  max_attempts  int not null default 10,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_classes_class_code on classes(class_code);

create table students (
  id                      uuid primary key default gen_random_uuid(),
  class_id                uuid not null references classes(id) on delete cascade,
  prn_number              text not null,
  name                    text not null,
  gemini_api_key_encrypted text,               -- ciphertext, never plaintext
  gemini_api_key_iv        text,               -- AES-GCM IV, stored alongside ciphertext
  gemini_api_key_tag        text,              -- AES-GCM auth tag
  api_key_last4           text,                -- last 4 chars only, for display
  api_key_valid           boolean not null default false,
  api_key_updated_at      timestamptz,
  xp                      int not null default 0,
  created_at              timestamptz not null default now(),
  unique (class_id, prn_number)
);
create index idx_students_class_id on students(class_id);
create index idx_students_prn on students(prn_number);

create table missions (
  id                          uuid primary key default gen_random_uuid(),
  title                       text not null,
  description                 text not null,
  difficulty                  text not null check (difficulty in ('green','yellow','orange','red')),
  required_craft_components   text[] not null,  -- e.g. {'role'}, {'role','context'}
  xp                          int not null default 10,
  sort_order                  int not null default 0,
  active                      boolean not null default true
);

create table attempts (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references students(id) on delete cascade,
  mission_id            uuid references missions(id),
  prompt                text not null,
  role_detected         boolean not null default false,
  context_detected      boolean not null default false,
  action_detected       boolean not null default false,
  format_detected       boolean not null default false,
  tone_detected         boolean not null default false,
  jailbreak_technique   text,                  -- e.g. 'instruction_override', null if none detected
  score                 int not null default 0,
  feedback              text,
  secret_revealed       boolean not null default false,
  gemini_response_snippet text,                -- truncated, for teacher review only
  created_at            timestamptz not null default now()
);
create index idx_attempts_student_id on attempts(student_id, created_at desc);

-- Existing deployments: add the win flag without recreating the table.
-- alter table attempts add column if not exists secret_revealed boolean not null default false;

-- seed the five CRAFT missions from the lesson plan
insert into missions (title, description, difficulty, required_craft_components, xp, sort_order) values
  ('Direct Prompt', 'Ask directly for the secret and see why a vague request is not enough.', 'green', '{}', 5, 1),
  ('Role', 'Give ClassBot a role to adopt.', 'yellow', '{role}', 10, 2),
  ('Context', 'Explain who you are and why you need the information.', 'yellow', '{role,context}', 10, 3),
  ('Action + Format', 'Specify exactly what to do and how the answer should be structured.', 'orange', '{action,format}', 15, 4),
  ('CRAFT Challenge', 'Combine Role, Context, Action, Format and Tone in one prompt.', 'red', '{role,context,action,format,tone}', 25, 5);

-- lock down direct access; only the service role (used by API routes) bypasses RLS
alter table teachers enable row level security;
alter table classes enable row level security;
alter table students enable row level security;
alter table missions enable row level security;
alter table attempts enable row level security;
-- No policies are created, so with RLS enabled, only the service role key
-- (which Supabase always allows to bypass RLS) can read or write these tables.
