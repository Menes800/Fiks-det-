create table if not exists public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('packing_plan')),
  model text,
  success boolean not null default false,
  input_hash text,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  created_at timestamptz not null default now()
);

alter table public.ai_requests enable row level security;
revoke all on table public.ai_requests from anon, authenticated;
revoke all on sequence public.ai_requests_id_seq from anon, authenticated;

create index if not exists ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);

comment on table public.ai_requests is
  'Metadata-only AI usage log. Prompts and home locations are never stored.';