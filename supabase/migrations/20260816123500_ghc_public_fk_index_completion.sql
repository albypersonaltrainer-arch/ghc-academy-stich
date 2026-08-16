-- Complete single-column FK coverage in public after the Academy hot-path pass.
-- This is schema-only performance hardening: no RLS, data or business semantics change.

create index if not exists ghc_academy_entitlements_activated_by_fk_idx
  on public.academy_entitlements (activated_by);
create index if not exists ghc_certificates_course_completion_fk_idx
  on public.certificates (course_completion_id);
create index if not exists ghc_course_access_granted_by_fk_idx
  on public.course_access (granted_by);
create index if not exists ghc_course_relations_course_fk_idx
  on public.course_relations (course_id);
create index if not exists ghc_course_relations_related_course_fk_idx
  on public.course_relations (related_course_id);
create index if not exists ghc_course_tags_tag_fk_idx
  on public.course_tags (tag_id);
create index if not exists ghc_courses_category_fk_idx
  on public.courses (category_id);
create index if not exists ghc_courses_subcategory_fk_idx
  on public.courses (subcategory_id);
create index if not exists ghc_exam_ai_generations_created_by_fk_idx
  on public.exam_ai_generations (created_by);
create index if not exists ghc_exam_ai_generations_exam_fk_idx
  on public.exam_ai_generations (exam_id);
create index if not exists ghc_exam_blueprint_lessons_course_fk_idx
  on public.exam_blueprint_lessons (course_id);
create index if not exists ghc_exam_blueprint_lessons_module_fk_idx
  on public.exam_blueprint_lessons (module_id);
create index if not exists ghc_exam_blueprints_approved_by_fk_idx
  on public.exam_blueprints (approved_by);
create index if not exists ghc_exam_blueprints_created_by_fk_idx
  on public.exam_blueprints (created_by);
create index if not exists ghc_exam_blueprints_generated_exam_fk_idx
  on public.exam_blueprints (generated_exam_id);
create index if not exists ghc_exam_blueprints_published_by_fk_idx
  on public.exam_blueprints (published_by);
create index if not exists ghc_exam_blueprints_reviewed_by_fk_idx
  on public.exam_blueprints (reviewed_by);
create index if not exists ghc_exam_blueprints_updated_by_fk_idx
  on public.exam_blueprints (updated_by);
create index if not exists ghc_exam_extra_attempt_requests_course_fk_idx
  on public.exam_extra_attempt_requests (course_id);
create index if not exists ghc_exam_extra_attempt_requests_exam_fk_idx
  on public.exam_extra_attempt_requests (exam_id);
create index if not exists ghc_exam_extra_attempt_requests_reviewed_by_fk_idx
  on public.exam_extra_attempt_requests (reviewed_by);
create index if not exists ghc_exam_questions_ai_generation_fk_idx
  on public.exam_questions (ai_generation_id);
create index if not exists ghc_exam_questions_regenerated_from_fk_idx
  on public.exam_questions (regenerated_from_question_id);
create index if not exists ghc_subcategories_category_fk_idx
  on public.subcategories (category_id);
