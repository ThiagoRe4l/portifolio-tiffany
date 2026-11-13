import type { Photo } from '@/content/types';
import type { Path } from './draft';
import { GroupField } from './fields/GroupField';
import { IconField } from './fields/IconField';
import { ListField } from './fields/ListField';
import { PhotoField } from './fields/PhotoField';
import { TextAreaField } from './fields/TextAreaField';
import { TextInputField } from './fields/TextInputField';
import { ToggleField } from './fields/ToggleField';
import type { FieldNode } from './schemaTree';
import { pathKey } from './validation';

export type RenderContext = {
  errors: ReadonlyMap<string, string>;
  provisional: ReadonlySet<string>;
  onChange: (path: Path, value: unknown) => void;
};

type FieldRendererProps = RenderContext & { node: FieldNode; path: Path; value: unknown };

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};

/** Campos de um grupo, um embaixo do outro. */
export function GroupChildren({ node, path, value, ...context }: FieldRendererProps) {
  const record = asRecord(value);
  return (
    <>
      {(node.children ?? []).map((child) => (
        <FieldRenderer
          key={child.key}
          {...context}
          node={child}
          path={[...path, child.key]}
          value={record[child.key]}
        />
      ))}
    </>
  );
}

/** Escolhe o controle pelo tipo do campo no schema (spec 004, D5). */
export function FieldRenderer(props: FieldRendererProps) {
  const { node, path, value, errors, provisional, onChange } = props;
  const key = pathKey(path);
  const common = {
    node,
    path,
    value,
    error: errors.get(key),
    provisional: provisional.has(key),
    onChange: (next: unknown) => onChange(path, next),
  };

  switch (node.kind) {
    case 'group':
      return (
        <GroupField node={node}>
          <GroupChildren {...props} />
        </GroupField>
      );
    case 'list': {
      const items = Array.isArray(value) ? value : [];
      const item = node.item as FieldNode;
      return (
        <ListField
          {...common}
          value={items}
          renderItem={(index) =>
            // No item que é grupo, o título do item já faz o papel do bloco.
            item.kind === 'group' ? (
              <GroupChildren {...props} node={item} path={[...path, index]} value={items[index]} />
            ) : (
              <FieldRenderer {...props} node={item} path={[...path, index]} value={items[index]} />
            )
          }
        />
      );
    }
    case 'photo':
      return (
        <PhotoField
          {...common}
          value={value as Photo}
          altError={errors.get(`${key}.alt`)}
          altProvisional={provisional.has(`${key}.alt`)}
        />
      );
    case 'longText':
      return <TextAreaField {...common} />;
    case 'toggle':
      return <ToggleField {...common} />;
    case 'icon':
      return <IconField {...common} />;
    case 'text':
    case 'phone':
    case 'instagram':
    case 'email':
    case 'mapUrl':
      return <TextInputField {...common} />;
    default:
      // Tipo novo no schema sem controle: o teste de cobertura falha aqui.
      throw new Error(`Tipo de campo sem controle no admin: ${node.kind} (${key})`);
  }
}
