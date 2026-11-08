import type { SiteContent } from './types';

/**
 * Conteúdo padrão (spec 001, RF-08; ajustes A1–A3 da spec 002). Textos aprovados do
 * CLAUDE.md §8, textos do design de referência (docs/design), rótulos de interface e
 * placeholders `[...]` para todo o resto. Opcionais que o design não mostra ficam vazios. Nada sobre a
 * psicóloga é inventado: ela preenche os placeholders no admin.
 */

/** O validador não aceita placeholder no número; o build de produção avisa se sobrar. */
export const PLACEHOLDER_WHATSAPP = '5500000000000';

/** Iniciais só aceitam letras; o build de produção avisa se sobrar. */
export const PLACEHOLDER_INITIALS = 'NN';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const defaultContent: SiteContent = deepFreeze({
  geral: {
    name: '[Nome Sobrenome]',
    profession: 'Psicóloga',
    crp: 'CRP [00/00000]',
    initials: PLACEHOLDER_INITIALS,
    footerText: '',
    copyright: '© {ano} · Todos os direitos reservados',
    restrictedAreaLink: 'Área restrita',
    menu: {
      about: 'Sobre mim',
      work: 'Meu trabalho',
      focus: 'Área de atuação',
      howItWorks: 'Como funciona',
      space: 'O espaço',
      contact: 'Contato',
    },
    headerCta: 'Agendar consulta',
    seoTitle: '[Nome · Psicóloga · Cidade]',
    seoDescription: '[Descrição curta que aparece no Google]',
    shareImage: {
      src: '',
      width: 1200,
      height: 630,
      alt: '[Descreva a imagem de compartilhamento]',
    },
  },
  inicio: {
    eyebrow: 'Psicologia · TEA · Análise do Comportamento',
    title: 'Cada criança no seu tempo, com acolhimento e ciência.',
    text: 'Atendimento psicológico para crianças e adolescentes no espectro autista, com intervenção baseada em Análise do Comportamento e orientação próxima às famílias.',
    primaryCta: 'Agendar pelo WhatsApp',
    secondaryCta: 'Conheça meu trabalho',
    photo: { src: '', width: 800, height: 1000, alt: '[Descreva a foto principal]' },
    badge: {
      title: 'Clínica especializada em TEA',
      subtitle: '[Cidade] · [presencial]',
    },
  },
  sobre: {
    eyebrow: 'Sobre mim',
    title: 'Olá, eu sou a [Nome].',
    photo: { src: '', width: 800, height: 1000, alt: '[Descreva a sua foto]' },
    text: 'Sou psicóloga e atuo em uma clínica especializada no atendimento de pessoas com Transtorno do Espectro Autista. Meu trabalho é guiado pela Análise do Comportamento, que olha para cada pessoa de forma individual e constrói o caminho a partir do que ela já sabe fazer.',
    secondaryText:
      'Sigo estudando: curso pós-graduação em Análise do Comportamento aplicada ao TEA, porque um bom atendimento depende de atualização constante.',
    educationTitle: '',
    education: [
      'Graduação em Psicologia — [Instituição, ano]',
      'Pós-graduação em Análise do Comportamento aplicada ao TEA — em andamento',
      'Registro CRP [00/00000]',
    ],
  },
  trabalho: {
    eyebrow: 'Meu trabalho',
    title: 'Como posso ajudar',
    cards: [
      {
        icon: 'clipboard',
        title: 'Avaliação comportamental',
        text: 'Observação e levantamento das habilidades e necessidades da criança para definir objetivos claros.',
      },
      {
        icon: 'target',
        title: 'Intervenção individualizada',
        text: 'Planos baseados em Análise do Comportamento, com metas acompanhadas de perto a cada etapa.',
      },
      {
        icon: 'family',
        title: 'Orientação parental',
        text: 'Encontros com a família para levar as estratégias para a rotina de casa.',
      },
      {
        icon: 'school',
        title: 'Parceria com escola e equipe',
        text: 'Diálogo com a escola e outros profissionais para que todos caminhem na mesma direção.',
      },
    ],
  },
  atuacao: {
    eyebrow: 'Área de atuação',
    title: 'Transtorno do Espectro Autista (TEA)',
    text: 'O TEA se manifesta de forma diferente em cada pessoa. Por isso o atendimento parte da realidade de cada criança e da sua família, com foco em comunicação, interação social, autonomia e comportamento.',
    focusTitle: '',
    focusTags: [
      'Comunicação',
      'Habilidades sociais',
      'Autonomia no dia a dia',
      'Manejo de comportamentos',
      'Orientação familiar',
    ],
    audienceTitle: '',
    audience: [
      { title: 'Crianças', text: '' },
      { title: 'Adolescentes', text: '' },
      { title: 'Famílias', text: '' },
    ],
  },
  comoFunciona: {
    eyebrow: 'Como funciona',
    title: 'Do primeiro contato ao acompanhamento',
    steps: [
      {
        title: 'Primeiro contato',
        text: 'Você me chama pelo WhatsApp e conversamos sobre a sua necessidade.',
      },
      {
        title: 'Avaliação inicial',
        text: 'Conheço a criança e a família e definimos juntos os objetivos do atendimento.',
      },
      {
        title: 'Plano e acompanhamento',
        text: 'Montamos o plano de intervenção e acompanhamos a evolução com devolutivas à família.',
      },
    ],
  },
  espaco: {
    eyebrow: 'O espaço',
    title: 'Um ambiente pensado para acolher',
    photos: [
      {
        photo: { src: '', width: 1200, height: 900, alt: '[Descreva a foto 1 do espaço]' },
        caption: '[Legenda da foto 1]',
      },
      {
        photo: { src: '', width: 1200, height: 900, alt: '[Descreva a foto 2 do espaço]' },
        caption: '[Legenda da foto 2]',
      },
      {
        photo: { src: '', width: 1200, height: 900, alt: '[Descreva a foto 3 do espaço]' },
        caption: '[Legenda da foto 3]',
      },
    ],
  },
  contato: {
    eyebrow: 'Contato',
    title: 'Vamos conversar?',
    text: 'Tire suas dúvidas ou agende uma avaliação. Respondo pelo WhatsApp em [horário de resposta].',
    whatsapp: {
      number: PLACEHOLDER_WHATSAPP,
      message: 'Olá! Vim pelo site e gostaria de saber mais sobre o atendimento.',
      buttonText: 'Chamar no WhatsApp',
    },
    floatingButton: { enabled: true, text: 'Fale comigo' },
    instagram: { handle: '', buttonText: 'Instagram' },
    email: { address: '', buttonText: 'E-mail' },
    phone: { number: '', buttonText: 'Ligar' },
    address: { title: 'Endereço', text: '[Rua, número — Bairro, Cidade]' },
    hours: { title: 'Horários', text: '[Seg a sex, 8h às 18h]' },
    map: { embedUrl: '', title: '[Título do mapa para leitores de tela]' },
  },
});
