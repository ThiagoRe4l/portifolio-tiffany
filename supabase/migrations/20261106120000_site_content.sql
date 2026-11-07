-- Spec 001 (RF-18): conteúdo do site, um documento JSON por seção.
-- Leitura pública (o build lê com a chave anon). Escrita: nenhuma por enquanto;
-- a tabela admins e a política de escrita vêm na spec 003.
-- Aplicar: colar este arquivo no SQL Editor do painel do Supabase.

create table public.site_content (
  section text primary key
    check (section in ('geral', 'inicio', 'sobre', 'trabalho', 'atuacao', 'comoFunciona', 'espaco', 'contato')),
  data jsonb not null
    check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.site_content is
  'Conteúdo editável do site (um documento por seção). Validado pelos schemas em src/content/schema.ts.';

alter table public.site_content enable row level security;

create policy "site_content: leitura pública"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

-- Segunda trava além do RLS: o papel anônimo nunca grava.
revoke insert, update, delete, truncate on public.site_content from anon;
