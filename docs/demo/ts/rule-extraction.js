"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeConditionValue = normalizeConditionValue;
exports.oppositeValue = oppositeValue;
exports.extractConditionValue = extractConditionValue;
exports.deriveVisibilityValues = deriveVisibilityValues;
exports.extractRulesFromConditions = extractRulesFromConditions;
exports.collectDependencyRules = collectDependencyRules;
exports.pushValidationRangeRule = pushValidationRangeRule;
exports.extractQuantityUnitRules = extractQuantityUnitRules;
function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function asArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === null || value === undefined) {
        return [];
    }
    return [value];
}
function getFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function getCategory(value) {
    if (value === 'logic' || value === 'calc' || value === 'validation' || value === 'ranges' || value === 'required') {
        return value;
    }
    return undefined;
}
function normalizeConditionValue(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value !== 'string') {
        return value;
    }
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true') {
        return true;
    }
    if (trimmed === 'false') {
        return false;
    }
    return value;
}
function oppositeValue(value) {
    const normalized = normalizeConditionValue(value);
    if (normalized === true) {
        return false;
    }
    if (normalized === false) {
        return true;
    }
    return null;
}
function extractConditionValue(statement) {
    if (!isRecord(statement) || !isRecord(statement.condition)) {
        return null;
    }
    const conditionValue = statement.condition.value;
    if (isRecord(conditionValue) && 'value' in conditionValue) {
        return conditionValue.value;
    }
    return conditionValue ?? null;
}
function deriveVisibilityValues(actionName, triggerValue) {
    const opposite = oppositeValue(triggerValue);
    if (opposite === null) {
        return null;
    }
    if (actionName === 'show') {
        return { showValue: triggerValue, hideValue: opposite };
    }
    return { showValue: opposite, hideValue: triggerValue };
}
function extractRulesFromConditions(conditionsPayload, rules, context = {}) {
    const conditions = typeof conditionsPayload === 'string'
        ? JSON.parse(conditionsPayload)
        : conditionsPayload;
    if (!isRecord(conditions)) {
        return;
    }
    const expressions = Array.isArray(conditions.expressions) ? conditions.expressions : [];
    expressions.forEach((expression, expressionIndex) => {
        if (!isRecord(expression)) {
            return;
        }
        const statements = Array.isArray(expression.statements) ? expression.statements : [];
        const actions = Array.isArray(expression.actions) ? expression.actions : [];
        statements.forEach((statement, statementIndex) => {
            const rawConditionValue = extractConditionValue(statement);
            const triggerValue = normalizeConditionValue(rawConditionValue);
            const triggerId = isRecord(statement) && typeof statement.fieldId === 'string' ? statement.fieldId : null;
            if (!triggerId) {
                return;
            }
            actions.forEach((action, actionIndex) => {
                if (!isRecord(action)) {
                    return;
                }
                const actionName = typeof action.action === 'string' ? action.action : null;
                const target = typeof action.target === 'string' ? action.target : null;
                if (!target || (actionName !== 'hide' && actionName !== 'show')) {
                    return;
                }
                const values = deriveVisibilityValues(actionName, triggerValue);
                if (!values) {
                    return;
                }
                const actionText = actionName === 'show' ? 'shown' : 'hidden';
                rules.push({
                    type: 'logic',
                    id: `conditions:${expressionIndex}-${statementIndex}-${actionIndex}`,
                    identifier: triggerId,
                    triggerValue,
                    targetIdentifier: target,
                    targetPath: typeof context.currentPath === 'string' ? context.currentPath : null,
                    showValue: values.showValue,
                    hideValue: values.hideValue,
                    key: 'conditions',
                    index: `${expressionIndex}-${statementIndex}-${actionIndex}`,
                    triggerTag: triggerId,
                    targetTag: target,
                    triggerPath: typeof context.currentPath === 'string' ? context.currentPath : null,
                    actionName,
                    description: `${target} is ${actionText} when ${triggerId} is ${String(triggerValue)}`
                });
            });
        });
    });
}
function collectDependencyRules(node, rules, context = {}) {
    if (!isRecord(node)) {
        return;
    }
    const nextContext = {
        currentPath: typeof node.aqlPath === 'string'
            ? node.aqlPath
            : typeof node.path === 'string'
                ? node.path
                : typeof context.currentPath === 'string'
                    ? context.currentPath
                    : null,
        currentTag: typeof node.formId === 'string'
            ? node.formId
            : typeof node.tag === 'string'
                ? node.tag
                : typeof node.alias === 'string'
                    ? node.alias
                    : typeof node.id === 'string'
                        ? node.id
                        : typeof context.currentTag === 'string'
                            ? context.currentTag
                            : null
    };
    Object.entries(node).forEach(([key, value]) => {
        if (!value) {
            return;
        }
        if (/conditions/i.test(key)) {
            try {
                extractRulesFromConditions(value, rules, nextContext);
            }
            catch (_error) {
                // Keep parsing other nodes if one conditions payload is malformed.
            }
            return;
        }
        if (/dependenc|visibility/i.test(key)) {
            asArray(value).forEach((candidate, index) => {
                if (!isRecord(candidate)) {
                    return;
                }
                const showValue = candidate.triggerValue ?? candidate.value ?? true;
                const hideValue = candidate.falsyValue ?? oppositeValue(showValue) ?? false;
                rules.push({
                    type: 'logic',
                    identifier: typeof candidate.triggerTag === 'string'
                        ? candidate.triggerTag
                        : typeof candidate.sourceTag === 'string'
                            ? candidate.sourceTag
                            : typeof candidate.tag === 'string'
                                ? candidate.tag
                                : typeof nextContext.currentTag === 'string'
                                    ? nextContext.currentTag
                                    : null,
                    triggerValue: showValue,
                    targetIdentifier: typeof candidate.targetTag === 'string'
                        ? candidate.targetTag
                        : typeof candidate.target === 'string'
                            ? candidate.target
                            : typeof nextContext.currentTag === 'string'
                                ? nextContext.currentTag
                                : null,
                    targetPath: typeof candidate.targetPath === 'string'
                        ? candidate.targetPath
                        : typeof candidate.path === 'string'
                            ? candidate.path
                            : typeof nextContext.currentPath === 'string'
                                ? nextContext.currentPath
                                : null,
                    showValue,
                    hideValue,
                    key,
                    index,
                    triggerPath: typeof candidate.triggerPath === 'string'
                        ? candidate.triggerPath
                        : typeof candidate.sourcePath === 'string'
                            ? candidate.sourcePath
                            : typeof candidate.dependsOn === 'string'
                                ? candidate.dependsOn
                                : typeof candidate.field === 'string'
                                    ? candidate.field
                                    : typeof nextContext.currentPath === 'string'
                                        ? nextContext.currentPath
                                        : null,
                    triggerTag: typeof candidate.triggerTag === 'string'
                        ? candidate.triggerTag
                        : typeof candidate.sourceTag === 'string'
                            ? candidate.sourceTag
                            : typeof candidate.tag === 'string'
                                ? candidate.tag
                                : typeof nextContext.currentTag === 'string'
                                    ? nextContext.currentTag
                                    : null,
                    targetTag: typeof candidate.targetTag === 'string'
                        ? candidate.targetTag
                        : typeof candidate.target === 'string'
                            ? candidate.target
                            : typeof nextContext.currentTag === 'string'
                                ? nextContext.currentTag
                                : null,
                    actionName: typeof candidate.action === 'string' ? candidate.action : 'show',
                    description: typeof candidate.description === 'string'
                        ? candidate.description
                        : typeof candidate.name === 'string'
                            ? candidate.name
                            : ''
                });
            });
        }
    });
    Object.values(node).forEach((value) => {
        if (Array.isArray(value)) {
            value.forEach((item) => collectDependencyRules(item, rules, nextContext));
            return;
        }
        if (isRecord(value)) {
            collectDependencyRules(value, rules, nextContext);
        }
    });
}
function pushValidationRangeRule(rules, identifier, range, suffix = null, extras = {}) {
    if (!identifier || !isRecord(range)) {
        return;
    }
    const min = getFiniteNumber(range.min);
    const max = getFiniteNumber(range.max);
    if (min === null && max === null) {
        return;
    }
    rules.push({
        type: getCategory(extras.type),
        identifier,
        field: identifier,
        fieldPath: typeof extras.fieldPath === 'string' ? extras.fieldPath : null,
        suffix,
        rmType: typeof extras.rmType === 'string' ? extras.rmType : null,
        unit: typeof extras.unit === 'string' ? extras.unit : null,
        min,
        max,
        minOp: typeof range.minOp === 'string' ? range.minOp : null,
        maxOp: typeof range.maxOp === 'string' ? range.maxOp : null
    });
}
function extractQuantityUnitRules(inputs) {
    const unitInput = (inputs || []).find((input) => isRecord(input) && input.suffix === 'unit');
    if (!isRecord(unitInput) || !Array.isArray(unitInput.list)) {
        return [];
    }
    const output = [];
    unitInput.list.forEach((entry) => {
        if (!isRecord(entry)) {
            return;
        }
        const unit = typeof entry.value === 'string'
            ? entry.value
            : typeof entry.label === 'string'
                ? entry.label
                : null;
        if (!unit) {
            return;
        }
        output.push({
            unit,
            range: isRecord(entry.validation) ? entry.validation.range ?? null : null
        });
    });
    return output;
}
