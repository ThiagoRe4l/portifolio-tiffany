import { z } from 'zod';
import {
  email,
  group,
  icon,
  instagram,
  list,
  longText,
  mapUrl,
  phone,
  photo,
  text,
  toggle,
} from './fields';

/**
 * Contrato do conteúdo do site (spec 001, RF-01 a RF-07).
 * Um documento por seção; a mesma fonte valida o build e gera o admin (004).
 *
 * Mudanças de schema: campo novo em objeto recebe o valor padrão automaticamente
 * (ver `mergeWithDefaults`); campo novo dentro de item de lista precisa ser opcional
 * ou ter `.default()`, porque listas não são mescladas.
 */

export const SECTION_KEYS = [
  'geral',
  'inicio',
  'sobre',
  'trabalho',
  'atuacao',
  'comoFunciona',
  'espaco',
  'contato',
] as const;

const eyebrow = () => text('Etiqueta', { max: 60, hint: 'Texto pequeno acima do título' });
const sectionTitle = () => text('Título', { max: 80 });

const geral = group('Geral', {
  name: text('Nome', { max: 60 }),
  profession: text('Profissão', { max: 40 }),
  crp: text('Registro (CRP)', { max: 20, hint: 'Ex.: CRP 06/123456' }),
  initials: text('Iniciais do monograma', {
    max: 3,
    pattern: /^\p{L}+$/u,
    patternMessage: 'Use só letras',
  }),
  footerText: longText('Texto do rodapé', {
    max: 200,
    optional: true,
    hint: 'Vazio não aparece no rodapé',
  }),
  copyright: text('Linha de direitos', {
    max: 100,
    hint: '{ano} vira o ano atual',
  }),
  restrictedAreaLink: text('Texto do link "Área restrita"', { max: 30 }),
  menu: group('Itens do menu', {
    about: text('Sobre mim', { max: 24 }),
    work: text('Meu trabalho', { max: 24 }),
    focus: text('Área de atuação', { max: 24 }),
    howItWorks: text('Como funciona', { max: 24 }),
    space: text('O espaço', { max: 24 }),
    contact: text('Contato', { max: 24 }),
  }),
  headerCta: text('Botão do topo (desktop)', { max: 30 }),
  seoTitle: text('Título para o Google', { max: 60 }),
  seoDescription: longText('Descrição para o Google', { max: 160 }),
  shareImage: photo('Imagem de compartilhamento', {
    hint: 'Aparece na prévia do link no WhatsApp e nas redes',
  }),
});

const inicio = group('Início', {
  eyebrow: eyebrow(),
  title: text('Título principal', { max: 90 }),
  text: longText('Texto', { max: 260 }),
  primaryCta: text('Botão principal (WhatsApp)', { max: 30 }),
  secondaryCta: text('Botão secundário', { max: 30 }),
  photo: photo('Foto principal'),
  badge: group('Selo sobre a foto', {
    title: text('Título do selo', { max: 50 }),
    subtitle: text('Linha do selo', { max: 60, hint: 'Ex.: cidade ou modalidade' }),
  }),
});

const sobre = group('Sobre mim', {
  eyebrow: eyebrow(),
  title: sectionTitle(),
  photo: photo('Foto'),
  text: longText('Texto principal', { max: 700 }),
  secondaryText: longText('Texto complementar', { max: 700 }),
  educationTitle: text('Título da formação', { max: 40, optional: true }),
  education: list('Formação', text('Item da formação', { max: 140 }), { min: 1, max: 8 }),
});

const trabalho = group('Meu trabalho', {
  eyebrow: eyebrow(),
  title: sectionTitle(),
  cards: list(
    'Cards do trabalho',
    group('Card', {
      icon: icon('Ícone'),
      title: text('Título do card', { max: 50 }),
      text: longText('Texto do card', { max: 220 }),
    }),
    { min: 1, max: 8 },
  ),
});

const atuacao = group('Área de atuação', {
  eyebrow: eyebrow(),
  title: sectionTitle(),
  text: longText('Texto', { max: 500 }),
  focusTitle: text('Título das etiquetas de foco', { max: 40, optional: true }),
  focusTags: list('Etiquetas de foco', text('Etiqueta de foco', { max: 32 }), { min: 1, max: 12 }),
  audienceTitle: text('Título do público atendido', { max: 40, optional: true }),
  audience: list(
    'Público atendido',
    group('Bloco de público', {
      title: text('Título do bloco', { max: 30 }),
      text: longText('Texto do bloco', { max: 200, optional: true }),
    }),
    { min: 1, max: 4 },
  ),
});

const comoFunciona = group('Como funciona', {
  eyebrow: eyebrow(),
  title: sectionTitle(),
  steps: list(
    'Passos',
    group('Passo', {
      title: text('Título do passo', { max: 50 }),
      text: longText('Texto do passo', { max: 240 }),
    }),
    { min: 2, max: 5, hint: 'O número de cada passo é gerado pela posição' },
  ),
});

const espaco = group('O espaço', {
  eyebrow: eyebrow(),
  title: sectionTitle(),
  photos: list(
    'Fotos',
    group('Foto da galeria', {
      photo: photo('Foto'),
      caption: text('Legenda', { max: 80, optional: true }),
    }),
    { min: 1, max: 9 },
  ),
});

const contato = group('Contato', {
  eyebrow: eyebrow(),
  title: sectionTitle(),
  text: longText('Texto', { max: 300 }),
  whatsapp: group('Botão do WhatsApp', {
    number: phone('Número do WhatsApp'),
    message: longText('Mensagem pronta', {
      max: 300,
      hint: 'Texto que já aparece escrito quando a pessoa abre a conversa',
    }),
    buttonText: text('Texto do botão', { max: 30 }),
  }),
  floatingButton: group('Botão flutuante', {
    enabled: toggle('Mostrar botão flutuante do WhatsApp'),
    text: text('Texto do botão (desktop)', { max: 20 }),
  }),
  instagram: group('Botão do Instagram', {
    handle: instagram('Usuário do Instagram', {
      optional: true,
      hint: 'Vazio esconde o botão',
    }),
    buttonText: text('Texto do botão', { max: 30 }),
  }),
  email: group('Botão de e-mail', {
    address: email('Endereço de e-mail', { optional: true, hint: 'Vazio esconde o botão' }),
    buttonText: text('Texto do botão', { max: 30 }),
  }),
  phone: group('Botão de ligar', {
    number: phone('Número de telefone', { optional: true, hint: 'Vazio esconde o botão' }),
    buttonText: text('Texto do botão', { max: 30 }),
  }),
  address: group('Endereço', {
    title: text('Título do endereço', { max: 40 }),
    text: longText('Endereço completo', { max: 200 }),
  }),
  hours: group('Horários', {
    title: text('Título dos horários', { max: 40 }),
    text: longText('Horários de atendimento', { max: 200 }),
  }),
  map: group('Mapa', {
    embedUrl: mapUrl('Link de incorporação do mapa', {
      optional: true,
      hint: 'Vazio esconde o mapa',
    }),
    title: text('Título do mapa (leitores de tela)', { max: 80 }),
  }),
});

export const sectionSchemas = {
  geral,
  inicio,
  sobre,
  trabalho,
  atuacao,
  comoFunciona,
  espaco,
  contato,
};

export const siteContentSchema = z.strictObject(sectionSchemas);
