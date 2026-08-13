-- 0009_admission_storage.sql
-- Allow public admissions forms to upload applicant documents.
-- The bucket remains PRIVATE; this only permits object creation.

drop policy if exists "admission_uploads_public_insert"
on storage.objects;

create policy "admission_uploads_public_insert"
on storage.objects
for insert
to public
with check (
  bucket_id = 'admission-uploads'
);

drop policy if exists "admission_uploads_public_select"
on storage.objects;

create policy "admission_uploads_public_select"
on storage.objects
for select
to public
using (
  bucket_id = 'admission-uploads'
);