-- Spec 003 (RF-13): quem pode gravar o conteúdo do site.
-- Aplicar: colar este arquivo no SQL Editor do painel do Supabase, depois da migration
-- da 001. A linha da administradora é inserida à mão (roteiro no plan.md da 003).

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Contas que podem editar o site. Alterada só pelo painel do Supabase.';

alter table public.admins enable row level security;

-- Cada conta enxerga apenas a própria linha. É o que permite às políticas abaixo
-- consultarem esta tabela sem precisar de função com privilégios elevados.
create policy "admins: ler a própria linha"
  on public.admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Segunda trava além do RLS: nenhum papel do cliente grava nesta tabela.
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create policy "site_content: administradora insere"
  on public.site_content
  for insert
  to authenticated
  with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

create policy "site_content: administradora atualiza"
  on public.site_content
  for update
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

-- Apagar segue proibido: as seções são fixas, e o conteúdo só é substituído.
revoke delete, truncate on public.site_content from authenticated;
grant insert, update on public.site_content to authenticated;
