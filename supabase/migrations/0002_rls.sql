-- Row Level Security
-- Model: all customer/conversation/CRM data is staff-only (admins table).
-- The webhook and AI pipeline run server-side with the Supabase service role
-- key, which bypasses RLS by design (see src/lib/supabase/admin.ts) — RLS
-- here protects data if the anon/publishable key is ever used from a browser.

alter table admins enable row level security;
alter table customers enable row level security;
alter table customer_profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table services enable row level security;
alter table service_features enable row level security;
alter table faqs enable row level security;
alter table knowledge_documents enable row level security;
alter table knowledge_chunks enable row level security;
alter table leads enable row level security;
alter table lead_events enable row level security;
alter table quotes enable row level security;
alter table meetings enable row level security;
alter table handoffs enable row level security;
alter table message_templates enable row level security;
alter table followups enable row level security;
alter table opt_outs enable row level security;
alter table notifications enable row level security;
alter table analytics_daily enable row level security;
alter table settings enable row level security;
alter table audit_logs enable row level security;

-- Helper: is the current auth.uid() an active admin?
create or replace function is_active_admin() returns boolean as $$
  select exists (
    select 1 from admins where id = auth.uid() and is_active = true
  );
$$ language sql stable security definer;

-- Generic "authenticated active admins can read/write" policy, applied per table.
do $$
declare
  tbl text;
  tables text[] := array[
    'customers','customer_profiles','conversations','messages','services',
    'service_features','faqs','knowledge_documents','knowledge_chunks','leads',
    'lead_events','quotes','meetings','handoffs','message_templates','followups',
    'opt_outs','notifications','analytics_daily','settings','audit_logs'
  ];
begin
  foreach tbl in array tables loop
    execute format(
      'create policy "admins_select_%1$s" on %1$I for select using (is_active_admin());', tbl
    );
    execute format(
      'create policy "admins_write_%1$s" on %1$I for all using (is_active_admin()) with check (is_active_admin());', tbl
    );
  end loop;
end $$;

-- Admins can read all admin rows but only edit their own profile (except owners).
create policy "admins_select_self_or_admin" on admins
  for select using (is_active_admin());

create policy "admins_update_self" on admins
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "owners_manage_admins" on admins
  for all using (
    exists (select 1 from admins a where a.id = auth.uid() and a.role in ('owner','admin') and a.is_active)
  );
