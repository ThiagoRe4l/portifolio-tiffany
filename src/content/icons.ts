/**
 * Ícones disponíveis para os cards (RF-05). O `label` aparece no seletor do admin;
 * os desenhos (SVG de linha, traço 1.8) são feitos na spec 002.
 */
export const ICONS = [
  { id: 'clipboard', label: 'Prancheta (avaliação)' },
  { id: 'puzzle', label: 'Quebra-cabeça' },
  { id: 'family', label: 'Família' },
  { id: 'school', label: 'Escola' },
  { id: 'chat', label: 'Conversa' },
  { id: 'heart', label: 'Coração' },
  { id: 'star', label: 'Estrela' },
  { id: 'calendar', label: 'Calendário' },
  { id: 'book', label: 'Livro' },
  { id: 'sprout', label: 'Broto (desenvolvimento)' },
  { id: 'hand', label: 'Mão (apoio)' },
  { id: 'target', label: 'Alvo (objetivos)' },
] as const;

export type IconId = (typeof ICONS)[number]['id'];

export const ICON_IDS = ICONS.map((icon) => icon.id) as [IconId, ...IconId[]];
