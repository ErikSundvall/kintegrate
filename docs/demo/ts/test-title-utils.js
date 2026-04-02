"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_CATEGORIES = void 0;
exports.sanitizeTestTitle = sanitizeTestTitle;
exports.quoteSingle = quoteSingle;
exports.asLiteral = asLiteral;
exports.prefixCategoryTitle = prefixCategoryTitle;
exports.sanitizeGroupName = sanitizeGroupName;
exports.normalizeCategoryKey = normalizeCategoryKey;
exports.normalizeCategories = normalizeCategories;
const CATEGORY_ALIASES = {
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
exports.ALL_CATEGORIES = ['logic', 'calc', 'validation', 'ranges', 'required'];
function isCategoryKey(value) {
    return exports.ALL_CATEGORIES.includes(value);
}
function sanitizeTestTitle(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/['`]/g, '')
        .trim();
}
function quoteSingle(value) {
    return `'${String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")}'`;
}
function asLiteral(value) {
    return JSON.stringify(value);
}
function prefixCategoryTitle(category, text) {
    const cleaned = sanitizeTestTitle(String(text || '').replace(/^\[[^\]]+\]\s*/, ''));
    return sanitizeTestTitle(`[${category}] ${cleaned}`);
}
function sanitizeGroupName(text) {
    return sanitizeTestTitle(String(text || '').replace(/^\[[^\]]+\]\s*/, ''));
}
function normalizeCategoryKey(value) {
    const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
    return CATEGORY_ALIASES[key] || key;
}
function normalizeCategories(categories) {
    if (!Array.isArray(categories) || categories.length === 0) {
        return [];
    }
    const normalized = categories
        .map((item) => normalizeCategoryKey(item))
        .filter((item) => isCategoryKey(item));
    return [...new Set(normalized)];
}
