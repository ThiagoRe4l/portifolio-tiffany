-- Spec 004 (RF-14, RF-15, RF-19): quem gravou, quando, e publicar a cada gravação.
-- Aplicar: colar este arquivo no SQL Editor do painel do Supabase, depois das
-- migrations da 001 e da 003. Antes, guardar o endereço do deploy hook do Cloudflare
-- no Vault com o nome 'cloudflare_deploy_hook' (roteiro no plan.md da 004).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Esquema fora da API: nenhum papel do cliente enxerga nem executa o que está aqui.
create schema if not exists private;

-- Data e autor da alteração preenchidos pelo banco, nunca pelo navegador.
create function private.stamp_site_content() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end
$$;

create trigger site_content_stamp
  before insert or update on public.site_content
  for each row execute function private.stamp_site_content();

-- Dispara um novo deploy do site. O endereço é secreto e fica no Vault; ler o Vault
-- exige privilégios que a conta da administradora não tem, daí o security definer.
-- O pg_net só envia depois do commit: gravação desfeita não publica nada.
create function private.request_deploy() returns void
  language plpgsql security definer set search_path = '' as $$
declare
  hook text;
begin
  select decrypted_secret into hook from vault.decrypted_secrets
    where name = 'cloudflare_deploy_hook';
  if hook is null then
    raise warning 'cloudflare_deploy_hook ausente no Vault: deploy não disparado';
    return;
  end if;
  perform net.http_post(url := hook, body := '{}'::jsonb);
end
$$;

create function private.site_content_saved() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform private.request_deploy();
  return null;
end
$$;

-- Por linha: um update recusado por conflito (nenhuma linha) não publica.
create trigger site_content_publish
  after insert or update on public.site_content
  for each row execute function private.site_content_saved();

revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

-- 1º de janeiro, 00:05 em Brasília (03:05 UTC): o {ano} do rodapé muda sem edição.
select cron.schedule('deploy-ano-novo', '5 3 1 1 *', 'select private.request_deploy()');
