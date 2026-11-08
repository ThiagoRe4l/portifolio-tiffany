import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { instagramUrl, mailtoUrl, telUrl } from '@/lib/contactLinks';
import { formatPhoneBR } from '@/lib/phone';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { a11yLabels } from '../a11yLabels';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Contact } from './Contact';

// Spec 002, T08 — Contato (RF-11, RF-14 / CA-11, CA-14). O que aparece em cada
// largura é CSS (site-space-contact.spec.ts); aqui, destinos, opcionais e nomes.

function setup(content: SiteContent = makeUniqueContent()) {
  const view = render(
    <ContentProvider content={content}>
      <Contact />
    </ContentProvider>,
  );
  const section = view.container.querySelector('section');
  if (!section) throw new Error('sem <section>');
  return { content, section };
}

function onlyWhatsApp(): SiteContent {
  const content = makeUniqueContent();
  content.contato.instagram.handle = '';
  content.contato.email.address = '';
  content.contato.phone.number = '';
  content.contato.map.embedUrl = '';
  return content;
}

describe('Contact', () => {
  it('é a seção #contato, com etiqueta, h2 que a nomeia e texto', () => {
    const { content, section } = setup();
    const heading = within(section).getByRole('heading', { level: 2 });

    expect(section).toHaveAttribute('id', SECTION_IDS.contato);
    expect(heading).toHaveTextContent(content.contato.title);
    expect(heading).toHaveAttribute('id', headingIdFor(SECTION_IDS.contato));
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
    expect(within(section).getByText(content.contato.eyebrow)).toBeVisible();
    expect(within(section).getByText(content.contato.text)).toBeVisible();
  });

  describe('tudo preenchido: destinos exatos', () => {
    it('WhatsApp abre em nova aba e avisa isso', () => {
      const { content, section } = setup();
      const { number, message, buttonText } = content.contato.whatsapp;
      const link = within(section).getByRole('link', {
        name: `${buttonText} ${a11yLabels.newTab}`,
      });

      expect(link).toHaveAttribute('href', buildWhatsAppLink(number, message));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.querySelector('[data-icon="whatsapp"]')).not.toBeNull();
    });

    it('Instagram abre em nova aba e avisa isso', () => {
      const { content, section } = setup();
      const { handle, buttonText } = content.contato.instagram;
      const link = within(section).getByRole('link', {
        name: `${buttonText} ${a11yLabels.newTab}`,
      });

      expect(link).toHaveAttribute('href', instagramUrl(handle));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.querySelector('[data-icon="instagram"]')).not.toBeNull();
    });

    it('e-mail vai para mailto:, na mesma aba', () => {
      const { content, section } = setup();
      const { address, buttonText } = content.contato.email;
      const link = within(section).getByRole('link', { name: buttonText });

      expect(link).toHaveAttribute('href', mailtoUrl(address));
      expect(link).not.toHaveAttribute('target');
      expect(link.querySelector('[data-icon="email"]')).not.toBeNull();
    });

    it('o cartão de ligar vai para tel:, com o texto do conteúdo', () => {
      const { content, section } = setup();
      const { number, buttonText } = content.contato.phone;
      const link = within(section).getByRole('link', { name: buttonText });

      expect(link).toHaveAttribute('href', telUrl(number));
      expect(link).not.toHaveAttribute('target');
      expect(link.querySelector('[data-icon="phone"]')).not.toBeNull();
    });

    it('a linha do telefone mostra o número formatado, como link tel:', () => {
      const { content, section } = setup();
      const { number, buttonText } = content.contato.phone;
      const line = within(section).getByRole('group', { name: buttonText });
      const link = within(line).getByRole('link', { name: formatPhoneBR(number) });

      expect(link).toHaveAttribute('href', telUrl(number));
      expect(line.querySelector('[data-icon="phone"]')).not.toBeNull();
    });
  });

  describe('endereço e horários', () => {
    it('o título do conteúdo nomeia cada linha e não aparece como texto', () => {
      const { content, section } = setup();
      const { address, hours } = content.contato;

      const addressLine = within(section).getByRole('group', { name: address.title });
      const hoursLine = within(section).getByRole('group', { name: hours.title });

      expect(addressLine).toHaveTextContent(address.text);
      expect(addressLine.querySelector('[data-icon="mapPin"]')).not.toBeNull();
      expect(hoursLine).toHaveTextContent(hours.text);
      expect(hoursLine.querySelector('[data-icon="clock"]')).not.toBeNull();
      expect(within(section).queryByText(address.title)).toBeNull();
      expect(within(section).queryByText(hours.title)).toBeNull();
    });

    it('mantém as quebras de linha do conteúdo', () => {
      const content = makeUniqueContent();
      content.contato.address.text = '«linha 1»\n«linha 2»';
      content.contato.hours.text = '«seg»\n«sáb»';
      const { section } = setup(content);

      expect(
        within(section).getByRole('group', { name: content.contato.address.title }).textContent,
      ).toBe(content.contato.address.text);
      expect(
        within(section).getByRole('group', { name: content.contato.hours.title }).textContent,
      ).toBe(content.contato.hours.text);
      const css = readFileSync(resolve('src/site/sections/Contact.module.css'), 'utf8');
      expect(css).toMatch(/\.lineText\s*{[^}]*white-space:\s*pre-line/);
    });
  });

  describe('mapa', () => {
    it('é um iframe com título, carregamento adiado e o endereço do conteúdo', () => {
      const { content, section } = setup();
      const map = within(section).getByTitle(content.contato.map.title);

      expect(map.tagName).toBe('IFRAME');
      expect(map).toHaveAttribute('src', content.contato.map.embedUrl);
      expect(map).toHaveAttribute('loading', 'lazy');
      expect(map).toHaveAttribute('referrerpolicy', 'no-referrer-when-downgrade');
    });
  });

  describe('só o WhatsApp preenchido', () => {
    it('não sobra nenhum outro botão, linha de telefone ou mapa', () => {
      const content = onlyWhatsApp();
      const { section } = setup(content);

      expect(within(section).getAllByRole('link')).toHaveLength(1);
      expect(
        within(section).queryByRole('group', { name: content.contato.phone.buttonText }),
      ).toBeNull();
      expect(section.querySelector('iframe')).toBeNull();
    });

    it('não deixa contêiner vazio no lugar dos botões', () => {
      const { section } = setup(onlyWhatsApp());

      expect(section.querySelector('[data-part="channels"]')).toBeNull();
    });

    it('endereço e horários continuam', () => {
      const content = onlyWhatsApp();
      const { section } = setup(content);

      expect(within(section).getByText(content.contato.address.text)).toBeVisible();
      expect(within(section).getByText(content.contato.hours.text)).toBeVisible();
    });
  });

  it.each([
    ['instagram', (c: SiteContent): void => void (c.contato.instagram.handle = '')],
    ['email', (c: SiteContent): void => void (c.contato.email.address = '')],
    ['phone', (c: SiteContent): void => void (c.contato.phone.number = '')],
  ] as const)('sem %s, os outros canais continuam', (icon, clear) => {
    const content = makeUniqueContent();
    clear(content);
    const { section } = setup(content);
    const channels = section.querySelector('[data-part="channels"]');

    expect(channels?.querySelector(`[data-icon="${icon}"]`)).toBeNull();
    expect(channels?.querySelectorAll('a')).toHaveLength(2);
  });
});
