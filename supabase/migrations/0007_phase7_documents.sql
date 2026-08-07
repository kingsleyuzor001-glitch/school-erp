-- =====================================================================
-- PHASE 7 — DOCUMENT GENERATION
-- Student/staff ID cards, PDF report cards, and the school branding
-- (logo, signature, stamp) that generated documents draw from.
--
-- Gap found and fixed: `schools` has had a write policy since Phase 1
-- restricted to `auth.is_super_admin()` ONLY — meaning no school_owner
-- or school_admin could ever update their own school's row, including
-- branding fields. RLS can't cleanly restrict an UPDATE to a subset of
-- columns (a row policy is all-or-nothing for the row), so rather than
-- opening the whole `schools` row to owner writes — which would let a
-- school flip its own `status` back to 'active' after a suspension —
-- this is a narrow RPC that only ever touches branding columns.
-- =====================================================================

create or replace function public.update_school_branding(
  p_logo_url text default null, p_address text default null, p_phone text default null,
  p_website text default null, p_motto text default null,
  p_brand_primary_color text default null, p_brand_secondary_color text default null,
  p_principal_signature_url text default null, p_official_stamp_url text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_school_id uuid := auth.school_id();
begin
  if v_school_id is null then raise exception 'No school context'; end if;
  if auth.role_name() not in ('school_owner','school_admin') then raise exception 'Not authorized'; end if;

  update schools set
    logo_url = coalesce(p_logo_url, logo_url),
    address = coalesce(p_address, address),
    phone = coalesce(p_phone, phone),
    website = coalesce(p_website, website),
    motto = coalesce(p_motto, motto),
    brand_primary_color = coalesce(p_brand_primary_color, brand_primary_color),
    brand_secondary_color = coalesce(p_brand_secondary_color, brand_secondary_color),
    principal_signature_url = coalesce(p_principal_signature_url, principal_signature_url),
    official_stamp_url = coalesce(p_official_stamp_url, official_stamp_url)
  where id = v_school_id;

  insert into audit_logs (school_id, actor_id, action, entity, entity_id)
  values (v_school_id, auth.uid(), 'branding_updated', 'schools', v_school_id);
end;
$$;
grant execute on function public.update_school_branding to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE: school-assets bucket is PUBLIC, unlike lesson-notes/
-- school-activities/passports. Logos, signatures, and stamps are
-- meant to appear on documents that get printed, shared with parents,
-- and rendered client-side into PDFs — there's no tenant-confidentiality
-- reason to gate them behind signed URLs, and doing so would add
-- expiring-URL complexity to every document template for no security
-- benefit. Isolation is still enforced on WRITE (only your own
-- school's admins can upload into your folder).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('school-assets', 'school-assets', true)
  on conflict (id) do nothing;

create policy school_assets_public_read on storage.objects for select using (bucket_id = 'school-assets');

create policy school_assets_write on storage.objects for insert with check (
  bucket_id = 'school-assets' and (
    auth.is_super_admin() or (
      (storage.foldername(name))[1] = auth.school_id()::text
      and auth.role_name() in ('school_owner','school_admin')
    )
  )
);
create policy school_assets_delete on storage.objects for delete using (
  bucket_id = 'school-assets' and (
    auth.is_super_admin() or (
      (storage.foldername(name))[1] = auth.school_id()::text
      and auth.role_name() in ('school_owner','school_admin')
    )
  )
);
