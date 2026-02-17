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
  if (value === true) {
    return false;
  }
  if (value === false) {
    return true;
  }
  return null;
}

function extractConditionValue(statement) {
  const condition = statement?.condition;
  if (!condition) {
    return undefined;
  }
  if (condition?.value && typeof condition.value === 'object' && 'value' in condition.value) {
    return condition.value.value;
  }
  return condition.value;
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

function extractRulesFromConditions(conditionsPayload, rules) {
  const conditions = typeof conditionsPayload === 'string'
    ? JSON.parse(conditionsPayload)
    : conditionsPayload;
  const expressions = Array.isArray(conditions?.expressions) ? conditions.expressions : [];

  expressions.forEach((expression, expressionIndex) => {
    const statements = Array.isArray(expression?.statements) ? expression.statements : [];
    const triggerStatement = statements[0];
    const rawConditionValue = extractConditionValue(triggerStatement);
    const triggerValue = normalizeConditionValue(rawConditionValue);
    const triggerId = triggerStatement?.fieldId || null;
    if (!triggerId) {
      return;
    }

    const actions = Array.isArray(expression?.actions) ? expression.actions : [];
    actions.forEach((action, actionIndex) => {
      const actionName = action?.action;
      if (!action?.target || (actionName !== 'hide' && actionName !== 'show')) {
        return;
      }
      const values = deriveVisibilityValues(actionName, triggerValue);
      if (!values) {
        return;
      }
      const actionText = actionName === 'show' ? 'shown' : 'hidden';

      rules.push({
        key: 'conditions',
        index: `${expressionIndex}-${actionIndex}`,
        triggerTag: triggerId,
        targetTag: action.target,
        showValue: values.showValue,
        hideValue: values.hideValue,
        description: `${action.target} is ${actionText} when ${triggerId} is ${triggerValue}`
      });
    });
  });
}

function collectDependencyRules(node, rules, context = {}) {
  if (!node || typeof node !== 'object') {
    return;
  }

  const nextContext = {
    currentPath: node.aqlPath || node.path || context.currentPath || null,
    currentTag: node.tag || node.alias || node.id || context.currentTag || null
  };

  Object.entries(node).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (/conditions/i.test(key)) {
      try {
        extractRulesFromConditions(value, rules);
      } catch (error) {
        // Keep parsing other nodes if one conditions payload is malformed
      }
      return;
    }

    if (/dependenc|visibility/i.test(key)) {
      const candidates = Array.isArray(value) ? value : [value];
      candidates.forEach((candidate, index) => {
        if (!candidate || typeof candidate !== 'object') {
          return;
        }

        rules.push({
          key,
          index,
          triggerPath:
            candidate.triggerPath ||
            candidate.sourcePath ||
            candidate.dependsOn ||
            candidate.field ||
            nextContext.currentPath,
          triggerTag:
            candidate.triggerTag ||
            candidate.sourceTag ||
            candidate.tag ||
            nextContext.currentTag,
          targetPath: candidate.targetPath || candidate.path || nextContext.currentPath,
          targetTag: candidate.targetTag || candidate.target || nextContext.currentTag,
          showValue: candidate.triggerValue ?? candidate.value ?? true,
          hideValue: candidate.falsyValue ?? false,
          description: candidate.description || candidate.name || ''
        });
      });
    }
  });

  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectDependencyRules(item, rules, nextContext));
    } else if (value && typeof value === 'object') {
      collectDependencyRules(value, rules, nextContext);
    }
  });
}

function pushValidationRangeRule(rules, identifier, range, suffix = null) {
  if (!identifier || !range || typeof range !== 'object') {
    return;
  }
  const min = Number.isFinite(range.min) ? range.min : null;
  const max = Number.isFinite(range.max) ? range.max : null;
  if (min === null && max === null) {
    return;
  }

  rules.push({
    field: identifier,
    suffix,
    min,
    max,
    minOp: range.minOp || null,
    maxOp: range.maxOp || null
  });
}

function collectValidationRules(node, validations, valueRanges, requiredFields, calculations, context = {}) {
  if (!node || typeof node !== 'object') {
    return;
  }

  const nextContext = {
    currentPath: node.aqlPath || node.path || context.currentPath || null,
    currentTag: node.formId || node.tag || node.alias || node.id || context.currentTag || null
  };
  const currentIdentifier = nextContext.currentTag || nextContext.currentPath;

  const range = node.validation?.range;
  if (range) {
    pushValidationRangeRule(validations, currentIdentifier, range);
    pushValidationRangeRule(valueRanges, currentIdentifier, range);
  }

  if (Array.isArray(node.inputs)) {
    node.inputs.forEach((input) => {
      const inputRange = input?.validation?.range;
      if (inputRange) {
        pushValidationRangeRule(validations, currentIdentifier, inputRange, input?.suffix || null);
        pushValidationRangeRule(valueRanges, currentIdentifier, inputRange, input?.suffix || null);
      }
    });
  }

  if (currentIdentifier && Number.isFinite(node.min) && node.min > 0) {
    requiredFields.push({
      field: currentIdentifier,
      min: node.min
    });
  }

  Object.entries(node).forEach(([key, value]) => {
    if (!value || /conditions/i.test(key)) {
      return;
    }
    if (/calculation|formula|derived/i.test(key)) {
      calculations.push({
        field: currentIdentifier,
        expression: typeof value === 'string' ? value : JSON.stringify(value)
      });
    }
  });

  Object.values(node).forEach((value) => {
    if (Array.isArray(value)) {
      value.forEach((item) =>
        collectValidationRules(item, validations, valueRanges, requiredFields, calculations, nextContext)
      );
    } else if (value && typeof value === 'object') {
      collectValidationRules(value, validations, valueRanges, requiredFields, calculations, nextContext);
    }
  });
}

function parseFormDefinition(input) {
  const source = input?.formDescription || input?.webTemplate || input;
  const dependencies = [];
  const validations = [];
  const valueRanges = [];
  const requiredFields = [];
  const calculations = [];

  collectDependencyRules(source, dependencies);
  collectValidationRules(source, validations, valueRanges, requiredFields, calculations);
  return {
    name: input?.name || source?.name || source?.templateId || 'generated-form',
    dependencies,
    calculations,
    validations,
    valueRanges,
    requiredFields
  };
}

module.exports = {
  parseFormDefinition
};
