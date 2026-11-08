import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { makeUniqueContent } from '../../../tests/fixtures/content';
import { a11yLabels } from '../a11yLabels';
import { FloatingWhatsApp } from './FloatingWhatsApp';

// Spec 002, T09 — botão flutuante (RF-13, RF-14 / CA-13). Tamanho, texto por largura
// e entrada ficam no E2E (site-page.spec.ts).

function setup(content: SiteContent = makeUniqueContent()) {
  return render(
    <ContentProvider content={content}>
      <FloatingWhatsApp />
    </ContentProvider>,
  );
}

describe('FloatingWhatsApp', () => {
  it('com enabled, leva ao WhatsApp em nova aba, com o texto do conteúdo como nome', () => {
    const content = makeUniqueContent();
    setup(content);
    const { number, message } = content.contato.whatsapp;
    const link = screen.getByRole('link', {
      name: `${content.contato.floatingButton.text} ${a11yLabels.newTab}`,
    });

    expect(link).toHaveAttribute('href', buildWhatsAppLink(number, message));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.querySelector('[data-icon="whatsapp"]')).not.toBeNull();
  });

  it('sem enabled, não existe', () => {
    const content = makeUniqueContent();
    content.contato.floatingButton.enabled = false;
    const { container } = setup(content);

    expect(container).toBeEmptyDOMElement();
  });
});
