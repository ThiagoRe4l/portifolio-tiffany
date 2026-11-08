import { describe, expect, it } from 'vitest';
import { defaultContent, PLACEHOLDER_INITIALS, PLACEHOLDER_WHATSAPP } from './defaults';
import { ICONS } from './icons';
import { siteContentSchema } from './schema';
import { contentLeaves, textLeaves } from '../../tests/support/contentValues';

// T03 — conteúdo padrão (RF-08 / CA-08). Regra do projeto: nada sobre a psicóloga é
// inventado. Cada texto do padrão precisa ser (a) um texto aprovado do CLAUDE.md §8,
// (b) um texto do design de referência aprovado na spec 002 (A1), (c) um rótulo de
// interface listado abaixo, (d) um placeholder inteiro `[...]` ou (e) vazio, nos
// campos opcionais que o design não mostra (spec 002, A2/A3).

/** Textos aprovados (CLAUDE.md §8), exatamente como escritos, no campo certo. */
const APPROVED: Record<string, string> = {
  'inicio.eyebrow': 'Psicologia · TEA · Análise do Comportamento',
  'inicio.title': 'Cada criança no seu tempo, com acolhimento e ciência.',
  'inicio.text':
    'Atendimento psicológico para crianças e adolescentes no espectro autista, com intervenção baseada em Análise do Comportamento e orientação próxima às famílias.',
  'inicio.primaryCta': 'Agendar pelo WhatsApp',
  'inicio.secondaryCta': 'Conheça meu trabalho',
  'inicio.badge.title': 'Clínica especializada em TEA',
  'sobre.title': 'Olá, eu sou a [Nome].',
  'sobre.education.0': 'Graduação em Psicologia — [Instituição, ano]',
  'sobre.education.1': 'Pós-graduação em Análise do Comportamento aplicada ao TEA — em andamento',
  'sobre.education.2': 'Registro CRP [00/00000]',
  'trabalho.cards.0.title': 'Avaliação comportamental',
  'trabalho.cards.1.title': 'Intervenção individualizada',
  'trabalho.cards.2.title': 'Orientação parental',
  'trabalho.cards.3.title': 'Parceria com escola e equipe',
  'atuacao.title': 'Transtorno do Espectro Autista (TEA)',
  'atuacao.focusTags.0': 'Comunicação',
  'atuacao.focusTags.1': 'Habilidades sociais',
  'atuacao.focusTags.2': 'Autonomia no dia a dia',
  'atuacao.focusTags.3': 'Manejo de comportamentos',
  'atuacao.focusTags.4': 'Orientação familiar',
  'atuacao.audience.0.title': 'Crianças',
  'atuacao.audience.1.title': 'Adolescentes',
  'atuacao.audience.2.title': 'Famílias',
  'comoFunciona.steps.0.title': 'Primeiro contato',
  'comoFunciona.steps.1.title': 'Avaliação inicial',
  'comoFunciona.steps.2.title': 'Plano e acompanhamento',
  'contato.title': 'Vamos conversar?',
  'contato.whatsapp.message': 'Olá! Vim pelo site e gostaria de saber mais sobre o atendimento.',
};

/** Textos do design de referência (docs/design), aprovados na spec 002 (ajuste A1). */
const FROM_DESIGN: Record<string, string> = {
  'geral.crp': 'CRP [00/00000]',
  'geral.copyright': '© {ano} · Todos os direitos reservados',
  'inicio.badge.subtitle': '[Cidade] · [presencial]',
  'sobre.text':
    'Sou psicóloga e atuo em uma clínica especializada no atendimento de pessoas com Transtorno do Espectro Autista. Meu trabalho é guiado pela Análise do Comportamento, que olha para cada pessoa de forma individual e constrói o caminho a partir do que ela já sabe fazer.',
  'sobre.secondaryText':
    'Sigo estudando: curso pós-graduação em Análise do Comportamento aplicada ao TEA, porque um bom atendimento depende de atualização constante.',
  'trabalho.title': 'Como posso ajudar',
  'trabalho.cards.0.text':
    'Observação e levantamento das habilidades e necessidades da criança para definir objetivos claros.',
  'trabalho.cards.1.text':
    'Planos baseados em Análise do Comportamento, com metas acompanhadas de perto a cada etapa.',
  'trabalho.cards.2.text':
    'Encontros com a família para levar as estratégias para a rotina de casa.',
  'trabalho.cards.3.text':
    'Diálogo com a escola e outros profissionais para que todos caminhem na mesma direção.',
  'atuacao.text':
    'O TEA se manifesta de forma diferente em cada pessoa. Por isso o atendimento parte da realidade de cada criança e da sua família, com foco em comunicação, interação social, autonomia e comportamento.',
  'comoFunciona.title': 'Do primeiro contato ao acompanhamento',
  'comoFunciona.steps.0.text': 'Você me chama pelo WhatsApp e conversamos sobre a sua necessidade.',
  'comoFunciona.steps.1.text':
    'Conheço a criança e a família e definimos juntos os objetivos do atendimento.',
  'comoFunciona.steps.2.text':
    'Montamos o plano de intervenção e acompanhamos a evolução com devolutivas à família.',
  'espaco.title': 'Um ambiente pensado para acolher',
  'contato.text':
    'Tire suas dúvidas ou agende uma avaliação. Respondo pelo WhatsApp em [horário de resposta].',
  'contato.whatsapp.buttonText': 'Chamar no WhatsApp',
  'contato.address.text': '[Rua, número — Bairro, Cidade]',
  'contato.hours.text': '[Seg a sex, 8h às 18h]',
};

/** Opcionais que o design não mostra: vazios no padrão (spec 002, A2 e A3). */
const EMPTY_BY_DESIGN = [
  'geral.footerText',
  'sobre.educationTitle',
  'atuacao.focusTitle',
  'atuacao.audienceTitle',
  'atuacao.audience.0.text',
  'atuacao.audience.1.text',
  'atuacao.audience.2.text',
];

/**
 * Rótulos de interface que o design mostra e que não descrevem a psicóloga
 * (plan.md › "Conteúdo padrão"). Ela pode editar todos no admin.
 */
const INTERFACE: Record<string, string> = {
  'geral.profession': 'Psicóloga',
  'geral.restrictedAreaLink': 'Área restrita',
  'geral.menu.about': 'Sobre mim',
  'geral.menu.work': 'Meu trabalho',
  'geral.menu.focus': 'Área de atuação',
  'geral.menu.howItWorks': 'Como funciona',
  'geral.menu.space': 'O espaço',
  'geral.menu.contact': 'Contato',
  'geral.headerCta': 'Agendar consulta',
  'sobre.eyebrow': 'Sobre mim',
  'trabalho.eyebrow': 'Meu trabalho',
  'atuacao.eyebrow': 'Área de atuação',
  'comoFunciona.eyebrow': 'Como funciona',
  'espaco.eyebrow': 'O espaço',
  'contato.eyebrow': 'Contato',
  'contato.floatingButton.text': 'Fale comigo',
  'contato.instagram.buttonText': 'Instagram',
  'contato.email.buttonText': 'E-mail',
  'contato.phone.buttonText': 'Ligar',
  'contato.address.title': 'Endereço',
  'contato.hours.title': 'Horários',
};

const PLACEHOLDER = /^\[[^[\]]+\]$/;

const leaves = contentLeaves(defaultContent);
const valueAt = (path: string) => leaves.find((leaf) => leaf.path === path)?.value;

describe('conteúdo padrão (CA-08)', () => {
  it('passa no schema', () => {
    const result = siteContentSchema.safeParse(defaultContent);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it.each(Object.entries(APPROVED))('%s tem o texto aprovado', (path, expected) => {
    expect(valueAt(path)).toBe(expected);
  });

  it.each(Object.entries(FROM_DESIGN))('%s tem o texto do design', (path, expected) => {
    expect(valueAt(path)).toBe(expected);
  });

  it.each(Object.entries(INTERFACE))('%s tem o rótulo de interface', (path, expected) => {
    expect(valueAt(path)).toBe(expected);
  });

  it.each(EMPTY_BY_DESIGN)('%s fica vazio (o design não mostra)', (path) => {
    expect(valueAt(path)).toBe('');
  });

  it('o nome é o placeholder do design', () => {
    expect(defaultContent.geral.name).toBe('[Nome Sobrenome]');
  });

  it('não inventa: todo outro texto é um placeholder inteiro entre colchetes', () => {
    const invented = textLeaves(defaultContent)
      .filter((leaf) => !(leaf.path in APPROVED) && !(leaf.path in INTERFACE))
      .filter((leaf) => !(leaf.path in FROM_DESIGN) && !EMPTY_BY_DESIGN.includes(leaf.path))
      // Iniciais só aceitam letras: placeholder declarado, como o número do WhatsApp.
      .filter((leaf) => leaf.path !== 'geral.initials')
      .filter((leaf) => !PLACEHOLDER.test(String(leaf.value)))
      .map((leaf) => `${leaf.path} = ${JSON.stringify(leaf.value)}`);

    expect(invented).toEqual([]);
    expect(PLACEHOLDER_INITIALS).toBe('NN');
    expect(defaultContent.geral.initials).toBe(PLACEHOLDER_INITIALS);
  });

  it('as listas têm a quantidade do design', () => {
    expect(defaultContent.sobre.education).toHaveLength(3);
    expect(defaultContent.trabalho.cards).toHaveLength(4);
    expect(defaultContent.atuacao.focusTags).toHaveLength(5);
    expect(defaultContent.atuacao.audience).toHaveLength(3);
    expect(defaultContent.comoFunciona.steps).toHaveLength(3);
    expect(defaultContent.espaco.photos).toHaveLength(3);
  });

  it('os cards usam os ícones do design (spec 002, D4)', () => {
    expect(defaultContent.trabalho.cards.map((card) => card.icon)).toEqual([
      'clipboard',
      'target',
      'family',
      'school',
    ]);
  });

  it('os nomes de family e school descrevem o desenho do design (casa e pessoas)', () => {
    const label = (id: string) => ICONS.find((icon) => icon.id === id)?.label ?? '';

    expect(label('family')).toMatch(/casa/i);
    expect(label('school')).toMatch(/pessoas/i);
  });

  it('nenhuma foto tem endereço ainda, e todas têm as proporções do design', () => {
    const { geral, inicio, sobre, espaco } = defaultContent;

    for (const photo of [
      geral.shareImage,
      inicio.photo,
      sobre.photo,
      ...espaco.photos.map((p) => p.photo),
    ]) {
      expect(photo.src).toBe('');
    }
    expect(geral.shareImage.width / geral.shareImage.height).toBeCloseTo(1200 / 630);
    expect(inicio.photo.width / inicio.photo.height).toBeCloseTo(4 / 5);
    expect(sobre.photo.width / sobre.photo.height).toBeCloseTo(4 / 5);
    for (const { photo } of espaco.photos) {
      expect(photo.width / photo.height).toBeCloseTo(4 / 3);
    }
  });

  it('contatos: WhatsApp fictício, botão flutuante ligado, opcionais vazios', () => {
    const { contato } = defaultContent;

    expect(PLACEHOLDER_WHATSAPP).toBe('5500000000000');
    expect(contato.whatsapp.number).toBe(PLACEHOLDER_WHATSAPP);
    expect(contato.floatingButton.enabled).toBe(true);
    expect(contato.instagram.handle).toBe('');
    expect(contato.email.address).toBe('');
    expect(contato.phone.number).toBe('');
    expect(contato.map.embedUrl).toBe('');
  });

  it('o objeto padrão não pode ser alterado por engano', () => {
    expect(Object.isFrozen(defaultContent)).toBe(true);
    expect(Object.isFrozen(defaultContent.trabalho.cards[0])).toBe(true);
  });
});
