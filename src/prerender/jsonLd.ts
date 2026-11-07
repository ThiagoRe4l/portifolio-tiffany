import { serializeForScript } from '@/content/embedded';
import type { SiteContent } from '@/content/types';
import { normalizeSiteUrl } from './files';

/**
 * Dados estruturados para o Google (spec 001, RF-20): tipo `Psychologist`, só com
 * dados que já aparecem no site. Campos vazios ficam de fora. O número do WhatsApp
 * não entra, porque não aparece como texto (só o telefone do botão "Ligar").
 */
export function buildJsonLd(content: SiteContent, siteUrl?: string): Record<string, unknown> {
  const { geral, contato } = content;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Psychologist',
    name: geral.name,
    description: geral.seoDescription,
    identifier: geral.crp,
  };

  if (siteUrl) data.url = `${normalizeSiteUrl(siteUrl)}/`;
  if (geral.shareImage.src) data.image = geral.shareImage.src;
  if (contato.phone.number) data.telephone = `+${contato.phone.number}`;
  if (contato.email.address) data.email = contato.email.address;
  if (contato.instagram.handle) {
    data.sameAs = [`https://www.instagram.com/${contato.instagram.handle}`];
  }
  if (contato.address.text) {
    data.address = { '@type': 'PostalAddress', streetAddress: contato.address.text };
  }
  if (contato.hours.text) data.openingHours = contato.hours.text;

  return data;
}

export function renderJsonLdScript(content: SiteContent, siteUrl?: string): string {
  return `<script type="application/ld+json">${serializeForScript(buildJsonLd(content, siteUrl))}</script>`;
}
