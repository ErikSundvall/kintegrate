import type { CategoryKey } from './types';

const CATEGORY_ALIASES: Record<string, CategoryKey> = {
  logic: 'logic',
  dependencies: 'logic',
  'form-logic': 'logic',
  calculations: 'calc',
  calc: 'calc',
  validation: 'validation',
  validations: 'validation',
  ranges: 'ranges',
  'value-ranges': 'ranges',
  valuerranges: 'ranges',
  required: 'required',
  'required-fields': 'required',
  requiredfields: 'required'
};

export const ALL_CATEGORIES: CategoryKey[] = ['logic', 'calc', 'validation', 'ranges', 'required'];

function isCategoryKey(value: string): value is CategoryKey {
  return ALL_CATEGORIES.includes(value as CategoryKey);
}

export function sanitizeTestTitle(text: string): string {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/['`]/g, '')
    .trim();
}

export function quoteSingle(value: unknown): string {
  return `'${String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")}'`;
}

export function asLiteral(value: unknown): string {
  return JSON.stringify(value);
}

export function prefixCategoryTitle(category: string, text: string): string {
  const cleaned = sanitizeTestTitle(String(text || '').replace(/^\[[^\]]+\]\s*/, ''));
  return sanitizeTestTitle(`[${category}] ${cleaned}`);
}

export function sanitizeGroupName(text: string): string {
  return sanitizeTestTitle(String(text || '').replace(/^\[[^\]]+\]\s*/, ''));
}

export function normalizeCategoryKey(value: unknown): string {
  const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
  return CATEGORY_ALIASES[key] || key;
}

export function normalizeCategories(categories: unknown): CategoryKey[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return [];
  }

  const normalized = categories
    .map((item) => normalizeCategoryKey(item))
    .filter((item): item is CategoryKey => isCategoryKey(item));

  return [...new Set(normalized)];
}
