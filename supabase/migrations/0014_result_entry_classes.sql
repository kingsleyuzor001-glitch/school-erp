-- ============================================================
-- RESULT ENTRY CLASSES
-- Only class teachers prepare class results.
-- Subject teacher assignments do not grant result-entry access.
-- ============================================================

create or replace function public.get_my_result_classes()
returns setof classes
language sql
stable
as $$
  select c.*
  from classes c
  where c.class_teacher_id = auth.uid()
  order by c.name, c.arm;
$$;

grant execute on function public.get_my_result_classes()
to authenticated;