-- Central pricing equations (idempotent)
create table if not exists public.model_credit_rules (
  model_id text primary key,
  asset_type text not null check (asset_type in ('image','video','music','tool')),
  base_credits integer not null default 0 check (base_credits >= 0),
  formula text not null default 'fixed',
  params jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_packages (
  plan_id text primary key,
  title text not null,
  monthly_usd numeric(10,2) not null,
  monthly_credits integer not null,
  annual_discount_percent integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.topup_packages (
  package_id text primary key,
  usd numeric(10,2) not null,
  credits integer not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_model_credit_rules_updated_at') then
    create trigger trg_model_credit_rules_updated_at
    before update on public.model_credit_rules
    for each row execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_plan_packages_updated_at') then
    create trigger trg_plan_packages_updated_at
    before update on public.plan_packages
    for each row execute function public.touch_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_topup_packages_updated_at') then
    create trigger trg_topup_packages_updated_at
    before update on public.topup_packages
    for each row execute function public.touch_updated_at();
  end if;
end $$;

-- Plans from current app settings
insert into public.plan_packages (plan_id, title, monthly_usd, monthly_credits, annual_discount_percent)
values
  ('starter', 'Starter', 15, 250, 0),
  ('plus',    'Plus',    35, 600, 10),
  ('pro',     'Pro',     70, 1200, 12),
  ('max',     'Max',     99, 3000, 15)
on conflict (plan_id) do update
set
  title = excluded.title,
  monthly_usd = excluded.monthly_usd,
  monthly_credits = excluded.monthly_credits,
  annual_discount_percent = excluded.annual_discount_percent,
  is_active = true;

-- Top-ups from current app settings
insert into public.topup_packages (package_id, usd, credits)
values
  ('t75',  5,  75),
  ('t160', 10, 160),
  ('t250', 15, 250),
  ('t330', 20, 330),
  ('t500', 30, 500)
on conflict (package_id) do update
set
  usd = excluded.usd,
  credits = excluded.credits,
  is_active = true;

-- Image models: all = 2 credits per image
insert into public.model_credit_rules (model_id, asset_type, base_credits, formula, params)
values
  ('*image*', 'image', 2, 'fixed_per_image', '{"credits_per_image":2}'::jsonb),
  ('kling-3.0/video', 'video', 0, 'kling_duration_quality', '{}'::jsonb),
  ('bytedance/seedance-2', 'video', 0, 'seedance_duration', '{"d4":24,"d15":85}'::jsonb),
  ('minimax/hailuo-2.3/i2v-standard', 'video', 12, 'fixed', '{}'::jsonb)
on conflict (model_id) do update
set
  asset_type = excluded.asset_type,
  base_credits = excluded.base_credits,
  formula = excluded.formula,
  params = excluded.params,
  is_active = true;

create or replace function public.calculate_generation_credits(
  p_model_id text,
  p_payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
as $$
declare
  v_duration integer;
  v_quality text;
  v_num_images integer;
  v_base integer;
begin
  -- Global image policy: all image models = 2 credits per image
  if p_model_id like '%image%' or p_model_id like '%nano-banana%' or p_model_id like '%flux%' or p_model_id like '%gpt-image%' or p_model_id like '%imagen%' or p_model_id like '%seedream%' or p_model_id = 'z-image' then
    v_num_images := greatest(1, coalesce((p_payload->>'numImages')::integer, 1));
    return v_num_images * 2;
  end if;

  if p_model_id = 'kling-3.0/video' then
    v_duration := greatest(1, coalesce((p_payload->>'duration')::integer, 5));
    v_quality := lower(coalesce(p_payload->>'quality', p_payload->>'resolution', p_payload->>'mode', 'std'));

    if v_quality = 'pro' or position('1080' in v_quality) > 0 then
      if v_duration <= 3 then
        return 9;
      end if;
      return greatest(9, ceil((v_duration * 41.0) / 15.0)::integer);
    end if;

    return greatest(6, v_duration * 2);
  end if;

  if p_model_id = 'bytedance/seedance-2' then
    v_duration := greatest(1, coalesce((p_payload->>'duration')::integer, 4));

    if v_duration = 4 then
      return 24;
    elsif v_duration = 15 then
      return 85;
    elsif v_duration < 4 then
      return greatest(1, ceil(v_duration * 6.0)::integer);
    else
      return ceil((v_duration * 85.0) / 15.0)::integer;
    end if;
  end if;

  select base_credits into v_base
  from public.model_credit_rules
  where model_id = p_model_id and is_active = true
  limit 1;

  return coalesce(v_base, 0);
end;
$$;
