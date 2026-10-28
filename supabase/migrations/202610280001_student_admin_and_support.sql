-- Grant the explicitly designated NesAI owner the database role required by
-- the Vault storage policies. Also cover an account created after this migration.
CREATE OR REPLACE FUNCTION public.grant_nesai_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lower(coalesce(NEW.email, '')) = 'ntando@nesmaholdings.co.za' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_nesai_owner_admin_role ON auth.users;
CREATE TRIGGER grant_nesai_owner_admin_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_nesai_owner_admin_role();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'ntando@nesmaholdings.co.za'
ON CONFLICT (user_id, role) DO NOTHING;

-- Policies previously called has_role(), whose EXECUTE privilege is revoked
-- from authenticated users. This wrapper only reveals the signed-in user's role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS own_roles_read ON public.user_roles;
CREATE POLICY own_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS resources_admin_write ON public.resources;
CREATE POLICY resources_admin_write ON public.resources FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS document_chunks_admin_write ON public.document_chunks;
CREATE POLICY document_chunks_admin_write ON public.document_chunks FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS resource_files_admin_write ON storage.objects;
CREATE POLICY resource_files_admin_write ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resource-files' AND public.is_admin());
DROP POLICY IF EXISTS resource_files_admin_update ON storage.objects;
CREATE POLICY resource_files_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resource-files' AND public.is_admin());
DROP POLICY IF EXISTS resource_files_admin_delete ON storage.objects;
CREATE POLICY resource_files_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resource-files' AND public.is_admin());

-- Return ranked matching passages, while still returning the first passages
-- when a learner's question uses wording absent from the paper.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  _resource_id uuid,
  _query text,
  _limit integer DEFAULT 4
)
RETURNS TABLE (id uuid, content text, chunk_index integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH query_terms AS (
    SELECT DISTINCT lower(term) AS term
    FROM regexp_split_to_table(coalesce(_query, ''), '[^[:alnum:]]+') AS tokens(term)
    WHERE char_length(term) >= 2
  ), ranked AS (
    SELECT dc.id, dc.content, dc.chunk_index,
      count(q.term) FILTER (
        WHERE q.term IS NOT NULL AND lower(dc.content) LIKE '%' || q.term || '%'
      )::bigint AS score
    FROM public.document_chunks dc
    LEFT JOIN query_terms q ON lower(dc.content) LIKE '%' || q.term || '%'
    WHERE dc.resource_id = _resource_id
    GROUP BY dc.id, dc.content, dc.chunk_index
  )
  SELECT ranked.id, ranked.content, ranked.chunk_index
  FROM ranked
  ORDER BY
    CASE WHEN coalesce(_query, '') = '' THEN ranked.chunk_index::bigint ELSE -ranked.score END,
    ranked.chunk_index
  LIMIT greatest(1, least(coalesce(_limit, 4), 20));
$$;
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(uuid, text, integer) TO authenticated;

CREATE TABLE IF NOT EXISTS public.student_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('complaint', 'account', 'billing', 'content', 'other')),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 160),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_note text NOT NULL DEFAULT '' CHECK (char_length(admin_note) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_support_requests_created_idx
  ON public.student_support_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS student_support_requests_status_idx
  ON public.student_support_requests (status, created_at DESC);

ALTER TABLE public.student_support_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_support_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.student_support_requests TO authenticated;
GRANT ALL ON TABLE public.student_support_requests TO service_role;

DROP POLICY IF EXISTS student_support_own_read ON public.student_support_requests;
CREATE POLICY student_support_own_read
  ON public.student_support_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS student_support_own_create ON public.student_support_requests;
CREATE POLICY student_support_own_create
  ON public.student_support_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_note = '');

DROP POLICY IF EXISTS student_support_admin_update ON public.student_support_requests;
CREATE POLICY student_support_admin_update
  ON public.student_support_requests FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_student_support_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_student_support_request ON public.student_support_requests;
CREATE TRIGGER touch_student_support_request
BEFORE UPDATE ON public.student_support_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_student_support_request();
