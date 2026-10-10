ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subjects TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS degree_name TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS study_year TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, academic_level, subjects, degree_name, institution, study_year)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'academic_level', 'Grade 12'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'subjects', '[]'::jsonb))), '{}'),
    NULLIF(NEW.raw_user_meta_data->>'degree_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'institution', ''),
    NULLIF(NEW.raw_user_meta_data->>'study_year', '')
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    academic_level = EXCLUDED.academic_level,
    subjects = EXCLUDED.subjects,
    degree_name = EXCLUDED.degree_name,
    institution = EXCLUDED.institution,
    study_year = EXCLUDED.study_year;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
