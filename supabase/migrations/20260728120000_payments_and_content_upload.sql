-- =========================================================
-- 5. Subscriptions (PayPal billing)
-- =========================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paypal',
  paypal_subscription_id TEXT UNIQUE,
  paypal_plan_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | cancelled | expired | suspended
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_subscriptions_read" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- Inserts/updates only ever happen from the server (service role) after we verify
-- the payment with PayPal directly, so there is no authenticated write policy.

-- =========================================================
-- 6. Document chunks (grounds the tutor agent in uploaded notes/papers)
-- =========================================================
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX document_chunks_tsv_idx ON public.document_chunks USING GIN (content_tsv);
CREATE INDEX document_chunks_resource_idx ON public.document_chunks (resource_id);

GRANT SELECT ON public.document_chunks TO authenticated;
GRANT ALL ON public.document_chunks TO service_role;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
-- Chunks are only ever read indirectly through the /api/chat server route
-- (which uses the service role), so authenticated users get no direct policy.
CREATE POLICY "document_chunks_admin_write" ON public.document_chunks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Search helper used by the chat route to pull the most relevant chunks
-- for a given resource + free-text query.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  _resource_id UUID,
  _query TEXT,
  _limit INT DEFAULT 4
)
RETURNS TABLE (id UUID, content TEXT, chunk_index INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT dc.id, dc.content, dc.chunk_index
  FROM public.document_chunks dc
  WHERE dc.resource_id = _resource_id
    AND (
      _query IS NULL OR _query = '' OR
      dc.content_tsv @@ plainto_tsquery('english', _query)
    )
  ORDER BY
    CASE WHEN _query IS NULL OR _query = '' THEN dc.chunk_index
      ELSE -ts_rank(dc.content_tsv, plainto_tsquery('english', _query)) END
  LIMIT _limit;
$$;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(UUID, TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(UUID, TEXT, INT) TO authenticated;

-- =========================================================
-- 7. Storage bucket for staff uploads (past papers, memos, notes)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('resource-files', 'resource-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "resource_files_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'resource-files');

CREATE POLICY "resource_files_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resource-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "resource_files_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resource-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "resource_files_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resource-files' AND public.has_role(auth.uid(), 'admin'));
