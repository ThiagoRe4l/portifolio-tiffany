-- Spec 005 (RF-09, RF-10): onde ficam as fotos do site e quem pode enviá-las.
-- Aplicar: colar este arquivo no SQL Editor do painel do Supabase, depois das
-- migrations da 001, 003 e 004.

-- Bucket público para leitura: o build baixa as fotos pelo endereço /object/public/
-- (spec 005, D6). Segunda trava além da preparação no aparelho: até 2 MB, só WebP e JPG.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Enviar, trocar e apagar: só contas em admins (003), e só neste bucket.
-- Sem política de leitura: o bucket público serve cada foto pelo endereço dela,
-- sem permitir que alguém liste os arquivos pela API.
create policy "site-photos: administradora envia"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );

create policy "site-photos: administradora troca"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  )
  with check (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );

create policy "site-photos: administradora apaga"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'site-photos'
    and exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
  );
