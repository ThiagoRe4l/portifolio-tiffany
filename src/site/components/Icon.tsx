import { createElement } from 'react';
import { ICON_STROKE_WIDTH, ICON_VIEW_BOX, iconDefinition, type IconName } from '../icons/paths';

const SVG_PAINT = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/**
 * Ícone de linha (spec 002, RF-16). Sempre decorativo: o texto ao lado dá o
 * significado, então fica escondido de leitores de tela.
 */
export function Icon({
  name,
  size = 24,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const definition = iconDefinition(name);

  return (
    <svg
      {...SVG_PAINT}
      className={className}
      width={size}
      height={size}
      viewBox={ICON_VIEW_BOX}
      strokeWidth={definition.strokeWidth ?? ICON_STROKE_WIDTH}
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {definition.shapes.map((shape, index) =>
        createElement(shape.tag, { key: index, ...shape.attrs }),
      )}
    </svg>
  );
}
