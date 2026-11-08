import type { IconId } from '@/content/icons';

/**
 * Geometria dos ícones (spec 002, plan D4), como dados: o JSX só recebe variáveis.
 * Base: os SVGs de docs/design (viewBox 24, traço 1.8, pontas redondas). Os que o
 * design não tem foram desenhados no mesmo estilo.
 */

export type IconShape =
  | { tag: 'path'; attrs: { d: string } }
  | { tag: 'circle'; attrs: { cx: string; cy: string; r: string } }
  | { tag: 'rect'; attrs: { x: string; y: string; width: string; height: string; rx?: string } };

export type IconDefinition = { shapes: IconShape[]; strokeWidth?: number };

export const ICON_VIEW_BOX = '0 0 24 24';
export const ICON_STROKE_WIDTH = 1.8;

const path = (d: string): IconShape => ({ tag: 'path', attrs: { d } });
const circle = (cx: string, cy: string, r: string): IconShape => ({
  tag: 'circle',
  attrs: { cx, cy, r },
});
const rect = (x: string, y: string, width: string, height: string, rx?: string): IconShape => ({
  tag: 'rect',
  attrs: rx === undefined ? { x, y, width, height } : { x, y, width, height, rx },
});

const WHATSAPP_BUBBLE = 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z';

/** Ícones que ela escolhe para os cards (lista fixa em src/content/icons.ts). */
export const CARD_ICONS: Record<IconId, IconDefinition> = {
  // Do design
  clipboard: { shapes: [rect('6', '4', '12', '17', '2'), path('M9 4h6v3H9zM9 12h6M9 16h4')] },
  target: { shapes: [circle('12', '12', '8'), circle('12', '12', '4'), circle('12', '12', '1')] },
  family: { shapes: [path('M4 11l8-7 8 7v9H4z'), path('M10 20v-5h4v5')] },
  school: {
    shapes: [
      circle('9', '9', '3'),
      path('M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6'),
      circle('17', '8', '2.5'),
      path('M16 14c2.8 0 5 2.2 5 5'),
    ],
  },
  // Desenhados no mesmo estilo
  puzzle: {
    shapes: [path('M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v4h-3a2 2 0 1 0-4 0H5v-4a2 2 0 1 0 0-4z')],
  },
  chat: { shapes: [path('M4 5h16v11H10l-5 4v-4H4z'), path('M8 9.5h8M8 12.5h5')] },
  heart: {
    shapes: [path('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z')],
  },
  star: {
    shapes: [path('M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z')],
  },
  calendar: { shapes: [rect('3', '5', '18', '16', '2'), path('M3 10h18M8 3v4M16 3v4')] },
  book: {
    shapes: [path('M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z'), path('M5 20a2 2 0 0 0 2 1h12')],
  },
  sprout: {
    shapes: [
      path('M12 21v-9'),
      path('M12 12C12 8 9 5 4 5c0 4 3 7 8 7z'),
      path('M12 14c0-3 2.5-6 7-6 0 3.5-2.5 6-7 6z'),
    ],
  },
  hand: {
    shapes: [
      path(
        'M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 3 13.5V12a1.5 1.5 0 0 1 3 0v1',
      ),
    ],
  },
};

export const UI_ICON_NAMES = [
  'check',
  'menu',
  'close',
  'arrowRight',
  'whatsapp',
  'whatsappChat',
  'instagram',
  'email',
  'phone',
  'mapPin',
  'clock',
] as const;

export type UiIconName = (typeof UI_ICON_NAMES)[number];

/** Ícones de interface (todos do design, exceto "fechar"). */
export const UI_ICONS: Record<UiIconName, IconDefinition> = {
  check: { shapes: [path('M5 12.5l4.5 4.5L19 7.5')], strokeWidth: 2 },
  menu: { shapes: [path('M4 7h16M4 12h16M4 17h16')] },
  close: { shapes: [path('M6 6l12 12M18 6L6 18')] },
  arrowRight: { shapes: [path('M5 12h14M13 6l6 6-6 6')] },
  whatsapp: { shapes: [path(WHATSAPP_BUBBLE)] },
  whatsappChat: { shapes: [path(WHATSAPP_BUBBLE), path('M9 10.5h6M9 13.5h4')] },
  instagram: {
    shapes: [rect('3', '3', '18', '18', '5'), circle('12', '12', '4'), circle('17.5', '6.5', '.8')],
  },
  email: { shapes: [rect('3', '5', '18', '14', '2'), path('M3 7l9 6 9-6')] },
  phone: {
    shapes: [
      path(
        'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
      ),
    ],
  },
  mapPin: {
    shapes: [path('M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z'), circle('12', '10', '2.5')],
  },
  clock: { shapes: [circle('12', '12', '9'), path('M12 7v5l3 2')] },
};

export type IconName = IconId | UiIconName;

export function iconDefinition(name: IconName): IconDefinition {
  return name in UI_ICONS ? UI_ICONS[name as UiIconName] : CARD_ICONS[name as IconId];
}
