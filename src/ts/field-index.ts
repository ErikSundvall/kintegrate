import type { FieldEntry } from './types';

export interface LegacyFieldIndex extends Map<string, string[]> {
  allPathsFor(identifier: string | null): string[];
  preferredPathFor(identifier: string | null): string | null;
}

export interface RulePathDetails {
  candidates: string[];
  primary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function buildFieldIndex(source: unknown): LegacyFieldIndex {
  const tagToPaths = new Map<string, string[]>() as LegacyFieldIndex;

  function walk(node: unknown, context: { structuralPath: string[] } = { structuralPath: [] }): void {
    if (!isRecord(node)) {
      return;
    }

    const entry: FieldEntry = {
      tag: typeof node.formId === 'string'
        ? node.formId
        : typeof node.tag === 'string'
          ? node.tag
          : typeof node.alias === 'string'
            ? node.alias
            : typeof node.id === 'string'
              ? node.id
              : null,
      path: typeof node.aqlPath === 'string'
        ? node.aqlPath
        : typeof node.path === 'string'
          ? node.path
          : null,
      structuralPath: null
    };

    const nextStructuralPath = entry.tag
      ? [...context.structuralPath, entry.tag]
      : context.structuralPath;
    entry.structuralPath = nextStructuralPath.length ? nextStructuralPath.join('/') : null;

    const preferredPaths = uniqueValues([entry.path, entry.structuralPath, entry.tag]);
    if (entry.tag) {
      const knownPaths = tagToPaths.get(entry.tag) || [];
      tagToPaths.set(entry.tag, [...new Set([...knownPaths, ...preferredPaths])]);
    }

    Object.values(node).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => walk(item, { structuralPath: nextStructuralPath }));
        return;
      }
      if (isRecord(value)) {
        walk(value, { structuralPath: nextStructuralPath });
      }
    });
  }

  walk(source);
  tagToPaths.allPathsFor = function allPathsFor(identifier: string | null): string[] {
    if (!identifier) {
      return [];
    }
    return [...(this.get(identifier) || [])];
  };

  tagToPaths.preferredPathFor = function preferredPathFor(identifier: string | null): string | null {
    return this.allPathsFor(identifier)[0] || null;
  };

  return tagToPaths;
}

export function resolveRulePath(
  fieldIndex: Map<string, string[]> | null | undefined,
  identifier: string | null,
  explicitPath?: string | null
): string | null {
  if (explicitPath) {
    return explicitPath;
  }
  if (!identifier || !fieldIndex) {
    return null;
  }
  const candidates = fieldIndex.get(identifier) || [];
  return candidates[0] || null;
}

export function resolveRulePathDetails(
  fieldIndex: LegacyFieldIndex | null | undefined,
  identifier: string | null,
  explicitPath?: string | null
): RulePathDetails {
  const candidates = uniqueValues([
    explicitPath,
    ...(fieldIndex?.allPathsFor(identifier) || [])
  ]);

  return {
    candidates,
    primary: candidates[0] || identifier || 'unknown'
  };
}
