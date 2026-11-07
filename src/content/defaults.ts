import type { SiteContent } from './types';

/**
 * Conteúdo padrão (spec 001, RF-08). Textos aprovados do CLAUDE.md §8, rótulos de
 * interface do design e placeholders `[...]` para todo o resto. Nada sobre a
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
    name: '[Nome]',
    profession: 'Psicóloga',
    crp: '[CRP 00/00000]',
    initials: PLACEHOLDER_INITIALS,
    footerText: '[Texto do rodapé]',
    copyright: '© {ano} [Nome]',
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
      subtitle: '[Cidade · modalidade]',
    },
  },
  sobre: {
    eyebrow: 'Sobre mim',
    title: 'Olá, eu sou a [Nome].',
    photo: { src: '', width: 800, height: 1000, alt: '[Descreva a sua foto]' },
    text: '[Primeiro parágrafo sobre você]',
    secondaryText: '[Segundo parágrafo sobre você]',
    educationTitle: 'Formação',
    education: [
      'Graduação em Psicologia — [Instituição, ano]',
      'Pós-graduação em Análise do Comportamento aplicada ao TEA — em andamento',
      'Registro CRP [00/00000]',
    ],
  },
  trabalho: {
    eyebrow: 'Meu trabalho',
    title: '[Título da seção Meu trabalho]',
    cards: [
      {
        icon: 'clipboard',
        title: 'Avaliação comportamental',
        text: '[Texto sobre a avaliação comportamental]',
      },
      {
        icon: 'puzzle',
        title: 'Intervenção individualizada',
        text: '[Texto sobre a intervenção individualizada]',
      },
      {
        icon: 'family',
        title: 'Orientação parental',
        text: '[Texto sobre a orientação parental]',
      },
      {
        icon: 'school',
        title: 'Parceria com escola e equipe',
        text: '[Texto sobre a parceria com escola e equipe]',
      },
    ],
  },
  atuacao: {
    eyebrow: 'Área de atuação',
    title: 'Transtorno do Espectro Autista (TEA)',
    text: '[Texto sobre a área de atuação]',
    focusTitle: '[Título das etiquetas de foco]',
    focusTags: [
      'Comunicação',
      'Habilidades sociais',
      'Autonomia no dia a dia',
      'Manejo de comportamentos',
      'Orientação familiar',
    ],
    audienceTitle: 'Público atendido',
    audience: [
      { title: 'Crianças', text: '[Texto sobre o atendimento de crianças]' },
      { title: 'Adolescentes', text: '[Texto sobre o atendimento de adolescentes]' },
      { title: 'Famílias', text: '[Texto sobre o trabalho com as famílias]' },
    ],
  },
  comoFunciona: {
    eyebrow: 'Como funciona',
    title: '[Título da seção Como funciona]',
    steps: [
      { title: 'Primeiro contato', text: '[Texto sobre o primeiro contato]' },
      { title: 'Avaliação inicial', text: '[Texto sobre a avaliação inicial]' },
      { title: 'Plano e acompanhamento', text: '[Texto sobre o plano e o acompanhamento]' },
    ],
  },
  espaco: {
    eyebrow: 'O espaço',
    title: '[Título da seção O espaço]',
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
    text: '[Texto da seção de contato]',
    whatsapp: {
      number: PLACEHOLDER_WHATSAPP,
      message: 'Olá! Vim pelo site e gostaria de saber mais sobre o atendimento.',
      buttonText: 'Agendar pelo WhatsApp',
    },
    floatingButton: { enabled: true, text: 'Fale comigo' },
    instagram: { handle: '', buttonText: 'Instagram' },
    email: { address: '', buttonText: 'E-mail' },
    phone: { number: '', buttonText: 'Ligar' },
    address: { title: 'Endereço', text: '[Rua, número, bairro, cidade]' },
    hours: { title: 'Horários', text: '[Dias e horários de atendimento]' },
    map: { embedUrl: '', title: '[Título do mapa para leitores de tela]' },
  },
});
