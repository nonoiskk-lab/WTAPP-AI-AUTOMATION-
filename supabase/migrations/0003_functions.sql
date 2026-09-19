-- RPC used by the RAG retrieval layer (src/lib/ai/knowledge.ts).
-- Falls back gracefully: if no embeddings are indexed yet, callers should
-- use the plain-text search in knowledge.ts instead of this function.
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  min_similarity float default 0.72
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.document_id,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.embedding is not null
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- Recomputes a lead's score from its event log. Called after every
-- lead_events insert so the score always matches an auditable trail
-- (see spec section 18 — scoring signals).
create or replace function recompute_lead_score(p_lead_id uuid)
returns int
language plpgsql
as $$
declare
  v_total int;
begin
  select coalesce(sum(score_delta), 0) into v_total
  from lead_events
  where lead_id = p_lead_id;

  v_total := greatest(0, least(100, v_total));

  update leads set score = v_total, updated_at = now() where id = p_lead_id;

  return v_total;
end;
$$;
