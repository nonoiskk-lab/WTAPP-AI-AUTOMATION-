-- KRTECH.SPACE WhatsApp AI Agent - Initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists vector;

-- =========================================================================
-- ENUMS
-- =========================================================================

create type lead_stage as enum (
  'new', 'qualifying', 'qualified', 'hot', 'proposal', 'negotiation', 'converted', 'lost'
);

create type message_direction as enum ('inbound', 'outbound');

create type message_status as enum ('received', 'sent', 'delivered', 'read', 'failed');

create type sender_type as enum ('customer', 'ai', 'agent', 'system');

create type ai_confidence as enum ('high', 'medium', 'low');

create type handoff_status as enum ('open', 'in_progress', 'resolved', 'cancelled');

create type followup_status as enum ('scheduled', 'sent', 'cancelled', 'skipped_opt_out');

create type meeting_status as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');

create type admin_role as enum ('owner', 'admin', 'sales', 'support', 'viewer');

-- =========================================================================
-- CORE IDENTITY
-- =========================================================================

-- Admin/staff users. Mirrors auth.users (Supabase Auth) 1:1 via id.
create table admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role admin_role not null default 'support',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- WhatsApp end-customers. Phone number (E.164) is the durable unique key.
create table customers (
  id uuid primary key default uuid_generate_v4(),
  wa_id text not null unique, -- WhatsApp phone id, digits only, e.g. 919876543210
  display_name text,
  language_preference text, -- 'en' | 'hi' | 'hinglish' | null (auto-detect)
  marketing_opt_out boolean not null default false,
  opted_out_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_wa_id on customers(wa_id);

-- Structured business/requirement profile the AI has learned about a customer.
-- Kept separate from `customers` so it can be wiped/edited independently
-- and so we can track confidence/source per field.
create table customer_profiles (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade unique,
  business_name text,
  business_category text,
  current_process text,
  problem_statement text,
  desired_solution text,
  required_features text[],
  user_count int,
  monthly_volume_estimate text,
  existing_software text,
  integration_requirements text,
  budget_range text,
  timeline text,
  location text,
  is_decision_maker boolean,
  preferred_contact_method text,
  notes text,
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- CONVERSATIONS & MESSAGES
-- =========================================================================

create table conversations (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  channel text not null default 'whatsapp',
  current_intent text,
  ai_confidence ai_confidence,
  is_active boolean not null default true,
  assigned_admin_id uuid references admins(id),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_conversations_customer on conversations(customer_id);
create index idx_conversations_last_message on conversations(last_message_at desc);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  wa_message_id text unique, -- WhatsApp's message id; used for idempotency/dedup
  direction message_direction not null,
  sender_type sender_type not null,
  sender_admin_id uuid references admins(id),
  content_type text not null default 'text', -- text|image|document|interactive|location|template
  body text,
  media_url text,
  interactive_payload jsonb,
  intent text,
  ai_confidence ai_confidence,
  status message_status not null default 'received',
  error_detail text,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at);
create index idx_messages_wa_message_id on messages(wa_message_id);
create index idx_messages_customer on messages(customer_id, created_at desc);

-- =========================================================================
-- SERVICES CATALOG (verified knowledge, prevents pricing hallucination)
-- =========================================================================

create table services (
  id uuid primary key default uuid_generate_v4(),
  category text not null, -- AI_AUTOMATION | WEBSITE | DIGITAL_MARKETING | CRM_AUTOMATION | IT_SOLUTIONS
  name text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  starting_price numeric,
  price_is_fixed boolean not null default false,
  price_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_features (
  id uuid primary key default uuid_generate_v4(),
  service_id uuid not null references services(id) on delete cascade,
  feature text not null,
  sort_order int not null default 0
);

create table faqs (
  id uuid primary key default uuid_generate_v4(),
  category text,
  question text not null,
  answer text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- KNOWLEDGE BASE (RAG)
-- =========================================================================

create table knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  category text not null, -- COMPANY|SERVICES|PACKAGES|FAQ|PRICING|PROCESS|...
  source_type text not null default 'text', -- pdf|doc|txt|manual
  storage_path text, -- Supabase Storage path if uploaded file
  raw_text text,
  status text not null default 'pending', -- pending|processing|indexed|failed
  uploaded_by uuid references admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references knowledge_documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index idx_knowledge_chunks_document on knowledge_chunks(document_id);
-- ivfflat requires ANALYZE after bulk load; fine to create empty.
create index idx_knowledge_chunks_embedding on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- =========================================================================
-- LEADS / CRM
-- =========================================================================

create table leads (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  conversation_id uuid references conversations(id),
  stage lead_stage not null default 'new',
  score int not null default 0,
  service_interest text[],
  requirement_summary text,
  budget_range text,
  timeline text,
  urgency text, -- low|medium|high
  decision_maker boolean,
  assigned_admin_id uuid references admins(id),
  next_action text,
  next_action_due timestamptz,
  last_contacted_at timestamptz,
  followup_date timestamptz,
  is_lost boolean not null default false,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_customer on leads(customer_id);
create index idx_leads_stage on leads(stage);
create index idx_leads_score on leads(score desc);

-- Append-only audit trail of scoring/stage changes (drives lead score calc).
create table lead_events (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  event_type text not null, -- signal name, e.g. 'budget_provided', 'demo_requested'
  score_delta int not null default 0,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_lead_events_lead on lead_events(lead_id, created_at);

create table quotes (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references leads(id) on delete cascade,
  services text[],
  scope_summary text,
  amount numeric,
  status text not null default 'draft', -- draft|sent|accepted|rejected
  created_by uuid references admins(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete set null,
  customer_id uuid not null references customers(id) on delete cascade,
  requested_date date,
  requested_time text,
  confirmed_at timestamptz,
  status meeting_status not null default 'requested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table handoffs (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  lead_id uuid references leads(id),
  reason text not null,
  summary jsonb not null, -- {business, requirement, problem, solution, budget, timeline, questions, next_action}
  status handoff_status not null default 'open',
  assigned_admin_id uuid references admins(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_handoffs_status on handoffs(status);

-- =========================================================================
-- AUTOMATION
-- =========================================================================

create table message_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  category text not null, -- followup|reminder|notification|marketing
  language text not null default 'en',
  body text not null,
  whatsapp_template_name text, -- if using Meta-approved template
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table followups (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  template_id uuid references message_templates(id),
  trigger_reason text not null, -- new_lead_no_response|quote_no_response|demo_reminder|hot_lead
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status followup_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index idx_followups_scheduled on followups(scheduled_at) where status = 'scheduled';

create table opt_outs (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade unique,
  reason text,
  opted_out_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  type text not null, -- hot_lead|handoff|meeting_request|followup_due|error
  title text not null,
  body text,
  target_admin_id uuid references admins(id),
  related_lead_id uuid references leads(id),
  related_conversation_id uuid references conversations(id),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_target on notifications(target_admin_id, is_read);

-- =========================================================================
-- ANALYTICS / SETTINGS / AUDIT
-- =========================================================================

create table analytics_daily (
  id uuid primary key default uuid_generate_v4(),
  day date not null unique,
  total_conversations int not null default 0,
  new_leads int not null default 0,
  qualified_leads int not null default 0,
  hot_leads int not null default 0,
  meetings_booked int not null default 0,
  quotes_sent int not null default 0,
  conversions int not null default 0,
  ai_resolutions int not null default 0,
  human_handoffs int not null default 0,
  avg_response_seconds numeric,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references admins(id),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_admin_id uuid references admins(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs(entity_type, entity_id);

-- =========================================================================
-- updated_at triggers
-- =========================================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'admins','customers','conversations','services','knowledge_documents',
    'leads','quotes','meetings','handoffs'
  ])
  loop
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;
