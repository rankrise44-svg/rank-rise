-- ═══════════════════════════════════════════════════════════════
-- Cedarline — 4/4 · Image storage
-- ───────────────────────────────────────────────────────────────
-- Bucket "product-images":
--   • public = true → anyone can VIEW an image by its URL (needed for
--     the storefront). Listing the bucket is not public.
--   • Only admins can upload, replace or delete images.
--   • 5 MB per file; JPEG, PNG, WebP or AVIF only.
-- Suggested object paths: products/<product-id>/<file>,
-- categories/<id>/<file>, brands/<id>/<file>.
-- ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "admins list product images" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins replace product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
