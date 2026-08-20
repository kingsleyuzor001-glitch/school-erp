-- ============================================================
-- RESULT ENTRY PERMISSION MODEL
-- Only class teachers prepare class results.
-- Subject teachers cannot enter results.
-- ============================================================

create or replace function public.is_result_class_teacher(
  p_class_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from classes c
    where c.id = p_class_id
      and c.class_teacher_id = auth.uid()
  );
$$;

grant execute on function public.is_result_class_teacher(uuid)
to authenticated;