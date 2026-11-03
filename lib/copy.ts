import copy from './site-copy.json';

export type CopyKey = keyof typeof copy;
export type CopyValues = Record<string, string | number>;

/** Customer-facing copy. Named placeholders stay stable across editorial imports. */
export function t(key: CopyKey, values: CopyValues = {}): string {
  return copy[key].replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder,
  );
}
