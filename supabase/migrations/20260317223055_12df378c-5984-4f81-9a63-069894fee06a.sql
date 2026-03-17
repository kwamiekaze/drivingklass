
ALTER TABLE public.report_cards
ADD COLUMN IF NOT EXISTS strongest_skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS most_improved_skills jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS focus_areas jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.report_cards.strongest_skills IS 'Array of {skill_key, skill_label, source_type} objects';
COMMENT ON COLUMN public.report_cards.most_improved_skills IS 'Array of {skill_key, skill_label, source_type} objects';
COMMENT ON COLUMN public.report_cards.focus_areas IS 'Array of {skill_key, skill_label, source_type} objects';
