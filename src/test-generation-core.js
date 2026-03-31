(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }
  root.TestGenerationCore = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const titleUtils = require('./ts/test-title-utils.js');
  const fieldIndexMod = require('./ts/field-index.js');
  const ruleExtractionMod = require('./ts/rule-extraction.js');
  const codeGenMod = require('./ts/code-generation.js');

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

  const ALL_CATEGORIES = ['logic', 'calc', 'validation', 'ranges', 'required'];

  function sanitizeTestTitle(text) {
    return titleUtils.sanitizeTestTitle(text);
  }

  function quoteSingle(value) {
    return titleUtils.quoteSingle(value);
  }

  function asLiteral(value) {
    return titleUtils.asLiteral(value);
  }

  function prefixCategoryTitle(category, text) {
    return titleUtils.prefixCategoryTitle(category, text);
  }

  function wrapDescribeSection(name, body) {
    return codeGenMod.wrapDescribeSection(name, body);
  }

  function normalizeCategoryKey(value) {
    return titleUtils.normalizeCategoryKey(value);
  }

  function normalizeCategories(categories) {
    return titleUtils.normalizeCategories(categories);
  }

  function uniqueValues(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function stableValueKey(value) {
    if (value === null || value === undefined) {
      return String(value);
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, Object.keys(value).sort());
      } catch (_error) {
        return String(value);
      }
    }
    return String(value);
  }

  function dedupeBySignature(items, signatureBuilder) {
    const seen = new Set();
    const output = [];

    (items || []).forEach((item) => {
      const signature = signatureBuilder(item);
      if (!signature || seen.has(signature)) {
        return;
      }
      seen.add(signature);
      output.push(item);
    });

    return output;
  }

  function normalizeConditionValue(value) {
    return ruleExtractionMod.normalizeConditionValue(value);
  }

  function oppositeValue(value) {
    return ruleExtractionMod.oppositeValue(value);
  }

  function extractConditionValue(statement) {
    return ruleExtractionMod.extractConditionValue(statement);
  }

  function deriveVisibilityValues(actionName, triggerValue) {
    return ruleExtractionMod.deriveVisibilityValues(actionName, triggerValue);
  }

  function buildFieldIndex(source) {
    return fieldIndexMod.buildFieldIndex(source);
  }

  function resolveRulePath(fieldIndex, identifier, explicitPath) {
    return fieldIndexMod.resolveRulePathDetails(fieldIndex, identifier, explicitPath);
  }

  function extractRulesFromConditions(conditionsPayload, rules, context = {}) {
    return ruleExtractionMod.extractRulesFromConditions(conditionsPayload, rules, context);
  }

  function collectDependencyRules(node, rules, context = {}) {
    return ruleExtractionMod.collectDependencyRules(node, rules, context);
  }

  function pushValidationRangeRule(rules, identifier, range, suffix = null, extras = {}) {
    return ruleExtractionMod.pushValidationRangeRule(rules, identifier, range, suffix, extras);
  }

  function extractQuantityUnitRules(inputs) {
    return ruleExtractionMod.extractQuantityUnitRules(inputs);
  }

  function collectValidationRules(node, validations, valueRanges, requiredFields, calculations, context = {}) {
    if (!node || typeof node !== 'object') {
      return;
    }

    const ownIdentifier = node.formId || node.tag || node.alias || node.id || node.aqlPath || node.path || null;
    const nextContext = {
      currentPath: node.aqlPath || node.path || context.currentPath || null,
      currentTag: node.formId || node.tag || node.alias || node.id || context.currentTag || null
    };
    const currentIdentifier = nextContext.currentTag || nextContext.currentPath;

    const range = node.validation?.range;
    if (range) {
      pushValidationRangeRule(validations, currentIdentifier, range, null, {
        rmType: node.rmType || null,
        fieldPath: nextContext.currentPath || null
      });
      pushValidationRangeRule(valueRanges, currentIdentifier, range, null, {
        rmType: node.rmType || null,
        fieldPath: nextContext.currentPath || null
      });
    }

    const quantityUnitRules = node.rmType === 'DV_QUANTITY'
      ? extractQuantityUnitRules(node.inputs)
      : [];

    if (Array.isArray(node.inputs)) {
      node.inputs.forEach((input) => {
        const inputRange = input?.validation?.range;
        if (!inputRange) {
          return;
        }
        const inputSuffix = input?.suffix || null;

        if (node.rmType === 'DV_QUANTITY' && inputSuffix === 'magnitude' && quantityUnitRules.length) {
          quantityUnitRules.forEach((unitRule) => {
            pushValidationRangeRule(
              validations,
              currentIdentifier,
              unitRule.range || inputRange,
              inputSuffix,
              { rmType: node.rmType, unit: unitRule.unit, fieldPath: nextContext.currentPath || null }
            );
            pushValidationRangeRule(
              valueRanges,
              currentIdentifier,
              unitRule.range || inputRange,
              inputSuffix,
              { rmType: node.rmType, unit: unitRule.unit, fieldPath: nextContext.currentPath || null }
            );
          });
          return;
        }

        if (inputSuffix === 'unit') {
          return;
        }

        pushValidationRangeRule(validations, currentIdentifier, inputRange, inputSuffix, {
          rmType: node.rmType || null,
          fieldPath: nextContext.currentPath || null
        });
        pushValidationRangeRule(valueRanges, currentIdentifier, inputRange, inputSuffix, {
          rmType: node.rmType || null,
          fieldPath: nextContext.currentPath || null
        });
      });
    }

    if (ownIdentifier && Number.isFinite(node.min) && node.min > 0) {
      requiredFields.push({
        field: currentIdentifier,
        fieldPath: nextContext.currentPath || null,
        min: node.min
      });
    }

    Object.entries(node).forEach(([key, value]) => {
      if (!value || /conditions/i.test(key)) {
        return;
      }
      if (ownIdentifier && /calculation|formula|derived/i.test(key)) {
        calculations.push({
          field: currentIdentifier,
          fieldPath: nextContext.currentPath || null,
          expression: typeof value === 'string' ? value : JSON.stringify(value)
        });
      }
    });

    Object.entries(node).forEach(([key, value]) => {
      if (!value || key === 'inputs' || key === 'validation' || key === 'list' || /conditions/i.test(key)) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          collectValidationRules(item, validations, valueRanges, requiredFields, calculations, nextContext);
        });
        return;
      }

      if (value && typeof value === 'object') {
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

    const uniqueDependencies = dedupeBySignature(
      dependencies,
      (rule) => [
        rule?.key,
        rule?.triggerPath,
        rule?.triggerTag,
        rule?.targetPath,
        rule?.targetTag,
        rule?.actionName,
        stableValueKey(rule?.showValue),
        stableValueKey(rule?.hideValue)
      ].join('|')
    );

    const uniqueValidations = dedupeBySignature(
      validations,
      (rule) => [rule?.field, rule?.fieldPath, rule?.suffix, rule?.rmType, rule?.unit, rule?.min, rule?.max, rule?.minOp, rule?.maxOp].join('|')
    );

    const uniqueValueRanges = dedupeBySignature(
      valueRanges,
      (rule) => [rule?.field, rule?.fieldPath, rule?.suffix, rule?.rmType, rule?.unit, rule?.min, rule?.max, rule?.minOp, rule?.maxOp].join('|')
    );

    const uniqueRequiredFields = dedupeBySignature(
      requiredFields,
      (rule) => [rule?.field, rule?.fieldPath, rule?.min].join('|')
    );

    const uniqueCalculations = dedupeBySignature(
      calculations,
      (rule) => [rule?.field, rule?.fieldPath, rule?.expression].join('|')
    );

    return {
      name: input?.name || source?.name || source?.templateId || 'generated-form',
      fields: new Set(uniqueValues([
        ...uniqueDependencies.flatMap((rule) => [rule.triggerTag, rule.targetTag, rule.triggerPath, rule.targetPath]),
        ...uniqueValidations.flatMap((rule) => [rule.field, rule.fieldPath]),
        ...uniqueValueRanges.flatMap((rule) => [rule.field, rule.fieldPath]),
        ...uniqueRequiredFields.flatMap((rule) => [rule.field, rule.fieldPath]),
        ...uniqueCalculations.flatMap((rule) => [rule.field, rule.fieldPath])
      ])),
      dependencies: uniqueDependencies,
      calculations: uniqueCalculations,
      validations: uniqueValidations,
      valueRanges: uniqueValueRanges,
      requiredFields: uniqueRequiredFields,
      fieldIndex: buildFieldIndex(source)
    };
  }

  function formatBoundSummary(rule) {
    const pieces = [];
    if (Number.isFinite(rule?.min)) {
      pieces.push(`min:${rule.min}`);
    }
    if (Number.isFinite(rule?.max)) {
      pieces.push(`max:${rule.max}`);
    }
    if (rule?.unit) {
      pieces.push(`unit:${rule.unit}`);
    }
    if (Number.isFinite(rule?.min) || Number.isFinite(rule?.max)) {
      return pieces.join(' ');
    }
    return 'metadata';
  }

  function formatIdentifierList(values) {
    const items = uniqueValues(values);
    return items.join(', ');
  }

  function buildDiscoveredRuleRows(parsed) {
    const fieldIndex = parsed?.fieldIndex;
    const rows = [];

    (parsed?.dependencies || []).forEach((rule, index) => {
      const triggerPath = resolveRulePath(fieldIndex, rule.triggerTag, rule.triggerPath);
      const targetPath = resolveRulePath(fieldIndex, rule.targetTag, rule.targetPath);
      const levelRecommendation = rule.actionName === 'show' ? 1 : 2;
      rows.push({
        rowId: `logic::${index}`,
        enabled: levelRecommendation <= 1,
        recommendedLevel: levelRecommendation,
        kind: 'logic',
        kindLabel: 'logic',
        scopeSection: 'logic',
        scopeInput: 'logic',
        summary: rule.description || `${rule.targetTag || 'target'} when ${rule.triggerTag || 'trigger'}=${rule.showValue}`,
        trigger: formatIdentifierList([rule.triggerTag, ...triggerPath.candidates]),
        subject: formatIdentifierList([rule.targetTag, ...targetPath.candidates]),
        formPath: targetPath.primary || triggerPath.primary,
        formPathSort: (targetPath.primary || triggerPath.primary || '').toLowerCase(),
        sortSummary: (rule.description || '').toLowerCase(),
        sourceIndex: index
      });
    });

    (parsed?.calculations || []).forEach((rule, index) => {
      const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
      rows.push({
        rowId: `calc::${index}`,
        enabled: true,
        recommendedLevel: 1,
        kind: 'calc',
        kindLabel: 'calc',
        scopeSection: 'calc',
        scopeInput: 'calc',
        summary: `${rule.field || 'field'} = derived expression`,
        trigger: '',
        subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
        formPath: fieldPath.primary,
        formPathSort: (fieldPath.primary || '').toLowerCase(),
        sortSummary: `${rule.field || ''} ${(rule.expression || '')}`.toLowerCase(),
        sourceIndex: index
      });
    });

    (parsed?.validations || []).forEach((rule, index) => {
      const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
      rows.push({
        rowId: `validation::${index}`,
        enabled: true,
        recommendedLevel: 1,
        kind: 'validation',
        kindLabel: 'validation',
        scopeSection: 'validation',
        scopeInput: 'val',
        summary: `${rule.field || 'field'} ${formatBoundSummary(rule)}`,
        trigger: '',
        subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
        formPath: fieldPath.primary,
        formPathSort: (fieldPath.primary || '').toLowerCase(),
        sortSummary: `${rule.field || ''} ${formatBoundSummary(rule)}`.toLowerCase(),
        sourceIndex: index
      });
    });

    (parsed?.valueRanges || []).forEach((rule, index) => {
      const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
      rows.push({
        rowId: `ranges::${index}`,
        enabled: true,
        recommendedLevel: 2,
        kind: 'ranges',
        kindLabel: 'ranges',
        scopeSection: 'ranges',
        scopeInput: 'range',
        summary: `${rule.field || 'field'} ${formatBoundSummary(rule)}`,
        trigger: '',
        subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
        formPath: fieldPath.primary,
        formPathSort: (fieldPath.primary || '').toLowerCase(),
        sortSummary: `${rule.field || ''} ${formatBoundSummary(rule)}`.toLowerCase(),
        sourceIndex: index
      });
    });

    (parsed?.requiredFields || []).forEach((rule, index) => {
      const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
      rows.push({
        rowId: `required::${index}`,
        enabled: true,
        recommendedLevel: 1,
        kind: 'required',
        kindLabel: 'required',
        scopeSection: 'required',
        scopeInput: 'req',
        summary: `${rule.field || 'field'} min ${Number.isFinite(rule?.min) ? rule.min : 1}`,
        trigger: '',
        subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
        formPath: fieldPath.primary,
        formPathSort: (fieldPath.primary || '').toLowerCase(),
        sortSummary: `${rule.field || ''} ${rule.min || 1}`.toLowerCase(),
        sourceIndex: index
      });
    });

    return rows;
  }

  function filterParsedFormByRuleIds(parsedForm, enabledRuleIds) {
    if (!(enabledRuleIds instanceof Set)) {
      return parsedForm;
    }
    return {
      ...parsedForm,
      dependencies: (parsedForm.dependencies || []).filter((_rule, index) => enabledRuleIds.has(`logic::${index}`)),
      calculations: (parsedForm.calculations || []).filter((_rule, index) => enabledRuleIds.has(`calc::${index}`)),
      validations: (parsedForm.validations || []).filter((_rule, index) => enabledRuleIds.has(`validation::${index}`)),
      valueRanges: (parsedForm.valueRanges || []).filter((_rule, index) => enabledRuleIds.has(`ranges::${index}`)),
      requiredFields: (parsedForm.requiredFields || []).filter((_rule, index) => enabledRuleIds.has(`required::${index}`))
    };
  }

  function normalizeScopeLevels(options = {}) {
    const selectedCategories = normalizeCategories(options.categories);
    const explicitLevels = {
      logic: Number.isFinite(options.logicLevel) ? options.logicLevel : null,
      calc: Number.isFinite(options.calcLevel) ? options.calcLevel : null,
      validation: Number.isFinite(options.validationLevel) ? options.validationLevel : null,
      ranges: Number.isFinite(options.rangesLevel) ? options.rangesLevel : null,
      required: Number.isFinite(options.requiredLevel) ? options.requiredLevel : null
    };
    const hasExplicitLevels = Object.values(explicitLevels).some((value) => value !== null);
    const levels = {};

    ALL_CATEGORIES.forEach((category) => {
      if (explicitLevels[category] !== null) {
        levels[category] = explicitLevels[category];
        return;
      }
      if (selectedCategories.length) {
        levels[category] = selectedCategories.includes(category) ? 1 : 0;
        return;
      }
      levels[category] = hasExplicitLevels ? 0 : 1;
    });

    return levels;
  }

  function pickIdentifier(rule, type) {
    const pathKey = `${type}Path`;
    const tagKey = `${type}Tag`;
    return rule[pathKey] || rule[tagKey] || null;
  }

  function normalizeOperator(op, bound) {
    if (!op) {
      return bound === 'min' ? '>=' : '<=';
    }
    const normalized = String(op).trim().toLowerCase();
    if (normalized === 'ge' || normalized === 'gte') {
      return '>=';
    }
    if (normalized === 'le' || normalized === 'lte') {
      return '<=';
    }
    if (normalized === 'gt') {
      return '>';
    }
    if (normalized === 'lt') {
      return '<';
    }
    return op;
  }

  function isExclusive(op) {
    return op === '>' || op === '<';
  }

  function pickStep(min, max) {
    const finiteMin = Number.isFinite(min);
    const finiteMax = Number.isFinite(max);
    if (finiteMin && finiteMax && Number.isInteger(min) && Number.isInteger(max)) {
      const delta = Math.abs(max - min);
      return delta >= 2 ? 1 : 0.5;
    }
    return 0.1;
  }

  function buildRangeSamples(rule, richness = 'rich') {
    const min = Number.isFinite(rule?.min) ? rule.min : null;
    const max = Number.isFinite(rule?.max) ? rule.max : null;
    const minOp = normalizeOperator(rule?.minOp, 'min');
    const maxOp = normalizeOperator(rule?.maxOp, 'max');
    const step = pickStep(min, max);

    const validSamples = [];
    const invalidSamples = [];

    if (min !== null && max !== null) {
      const lower = isExclusive(minOp) ? min + step : min;
      const upper = isExclusive(maxOp) ? max - step : max;
      if (lower <= upper) {
        validSamples.push(lower);
        if (richness === 'rich') {
          if (upper !== lower) {
            validSamples.push(upper);
          }
          const middle = (lower + upper) / 2;
          if (!validSamples.includes(middle)) {
            validSamples.push(middle);
          }
        }
      }
      invalidSamples.push(isExclusive(minOp) ? min : min - step);
      if (richness === 'rich') {
        invalidSamples.push(isExclusive(maxOp) ? max : max + step);
      }
    } else if (min !== null) {
      validSamples.push(isExclusive(minOp) ? min + step : min);
      invalidSamples.push(isExclusive(minOp) ? min : min - step);
      if (richness === 'rich') {
        validSamples.push((isExclusive(minOp) ? min + step : min) + step);
      }
    } else if (max !== null) {
      validSamples.push(isExclusive(maxOp) ? max - step : max);
      invalidSamples.push(isExclusive(maxOp) ? max : max + step);
      if (richness === 'rich') {
        validSamples.push((isExclusive(maxOp) ? max - step : max) - step);
      }
    }

    return {
      min,
      max,
      minOp,
      maxOp,
      validSamples: [...new Set(validSamples.filter((value) => Number.isFinite(value)))],
      invalidSamples: [...new Set(invalidSamples.filter((value) => Number.isFinite(value)))]
    };
  }

  function toQuantitySamples(values, unit) {
    return (values || []).map((magnitude) => ({ magnitude, unit }));
  }

  function buildRangeAssertionPayload(rule, samples) {
    const expectedUnit = rule?.rmType === 'DV_QUANTITY' && rule?.unit ? rule.unit : null;

    const validSamples = expectedUnit
      ? toQuantitySamples(samples.validSamples, expectedUnit)
      : samples.validSamples;

    const invalidSamples = expectedUnit
      ? [
        ...toQuantitySamples(samples.invalidSamples, expectedUnit),
        ...(samples.validSamples.length
          ? [{ magnitude: samples.validSamples[0], unit: `${expectedUnit}__INVALID` }]
          : [])
      ]
      : samples.invalidSamples;

    return {
      min: samples.min,
      max: samples.max,
      minOp: samples.minOp,
      maxOp: samples.maxOp,
      validSamples,
      invalidSamples,
      expectedUnit
    };
  }

  function buildDependencyTests(parsedForm, level) {
    if (level <= 0) {
      return [];
    }
    return (parsedForm.dependencies || [])
      .filter((rule) => level >= 2 || rule.actionName === 'show')
      .map((rule, index) => {
        const trigger = pickIdentifier(rule, 'trigger');
        const target = pickIdentifier(rule, 'target');

        if (!trigger || !target) {
          const missing = [!trigger ? 'trigger' : null, !target ? 'target' : null].filter(Boolean).join(' and ');
          return {
            title: prefixCategoryTitle('logic', `dependency rule ${index + 1} has unresolved field identifiers`),
            callType: 'it',
            body: `throw new Error('Generator could not resolve ${missing} identifier for dependency rule ${index + 1}.');`
          };
        }

        const baseName = sanitizeTestTitle(rule.description) || `${target} visibility toggles from ${trigger}`;
        return {
          title: prefixCategoryTitle('logic', baseName),
          callType: 'it',
          body: [
            `cy.visit('/form-viewer.html?testMode=1&autoLoad=0');`,
            'cy.formViewerReady();',
            '',
            `cy.fillField(${asLiteral(trigger)}, ${asLiteral(rule.hideValue)});`,
            `cy.expectHidden(${asLiteral(target)});`,
            `cy.fillField(${asLiteral(trigger)}, ${asLiteral(rule.showValue)});`,
            `cy.expectVisible(${asLiteral(target)});`
          ].join('\n')
        };
      });
  }

  function buildCalculationTests(parsedForm, level) {
    if (level <= 0) {
      return [];
    }
    return (parsedForm.calculations || []).map((rule, index) => ({
      title: prefixCategoryTitle('calc', rule?.field ? `${rule.field} metadata exists` : `rule ${index + 1} metadata exists`),
      callType: 'it',
      body: [
        `const field = ${asLiteral(rule?.field || null)};`,
        `const expression = ${asLiteral(rule?.expression || '')};`,
        '',
        "expect(field).to.be.a('string').and.not.to.equal('');",
        "expect(expression).to.be.a('string');",
        'expect(expression.trim().length).to.be.greaterThan(0);'
      ].join('\n')
    }));
  }

  function buildRangeValidationTests(parsedForm, level) {
    if (level <= 0) {
      return [];
    }
    const richness = level >= 2 ? 'rich' : 'baseline';
    return (parsedForm.validations || []).map((rule, index) => {
      const samples = buildRangeSamples(rule, richness);
      const assertionPayload = buildRangeAssertionPayload(rule, samples);
      return {
        title: prefixCategoryTitle('validation', `${rule?.field || 'field'} #${index + 1}`),
        callType: 'it',
        body: `cy.assertRangeSamples(${asLiteral({
          label: `validation ${rule?.field || 'field'} #${index + 1}`,
          min: assertionPayload.min,
          max: assertionPayload.max,
          minOp: assertionPayload.minOp,
          maxOp: assertionPayload.maxOp,
          validSamples: assertionPayload.validSamples,
          invalidSamples: assertionPayload.invalidSamples,
          expectedUnit: assertionPayload.expectedUnit
        })});`
      };
    });
  }

  function buildValueRangeMetadataTests(parsedForm, levels) {
    if (levels.ranges <= 0) {
      return [];
    }
    if (levels.ranges === 1 && levels.validation > 0) {
      return [];
    }
    if (levels.ranges < 2) {
      return [];
    }
    return (parsedForm.valueRanges || []).map((rule, index) => {
      const minOp = normalizeOperator(rule?.minOp, 'min');
      const maxOp = normalizeOperator(rule?.maxOp, 'max');
      const suffixPart = rule?.suffix ? ` (${rule.suffix})` : '';
      return {
        title: prefixCategoryTitle('ranges', `${rule?.field || 'field'}${suffixPart} #${index + 1}`),
        callType: 'it',
        body: `cy.assertRangeSamples(${asLiteral({
          label: `value range ${rule?.field || 'field'} #${index + 1}`,
          min: Number.isFinite(rule?.min) ? rule.min : null,
          max: Number.isFinite(rule?.max) ? rule.max : null,
          minOp,
          maxOp,
          validSamples: [],
          invalidSamples: [],
          expectedUnit: rule?.rmType === 'DV_QUANTITY' ? rule?.unit || null : null
        })});`
      };
    });
  }

  function buildRequiredFieldTests(parsedForm, level) {
    if (level <= 0) {
      return [];
    }
    return (parsedForm.requiredFields || []).map((rule, index) => {
      const min = Number.isFinite(rule?.min) ? rule.min : 1;
      const body = [
        `const min = ${asLiteral(min)};`,
        '',
        'const hasRequiredCardinality = (value) => {',
        '  if (value === null || value === undefined) {',
        '    return false;',
        '  }',
        '  if (Array.isArray(value)) {',
        '    return value.length >= min;',
        '  }',
        "  if (typeof value === 'string') {",
        '    return value.length >= min;',
        '  }',
        '  return min <= 1;',
        '};',
        '',
        'expect(hasRequiredCardinality(null)).to.equal(false);',
        'expect(hasRequiredCardinality(undefined)).to.equal(false);'
      ];

      if (level >= 2) {
        if (min > 1) {
          body.push(
            '',
            `const tooShort = Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x');`,
            `const enough = Array.from({ length: ${min} }, () => 'x');`,
            'expect(hasRequiredCardinality(tooShort)).to.equal(false);',
            'expect(hasRequiredCardinality(enough)).to.equal(true);',
            `expect(hasRequiredCardinality('x'.repeat(${Math.max(min - 1, 0)}))).to.equal(false);`,
            `expect(hasRequiredCardinality('x'.repeat(${min}))).to.equal(true);`
          );
        } else {
          body.push(
            '',
            "expect(hasRequiredCardinality('x')).to.equal(true);",
            'expect(hasRequiredCardinality([1])).to.equal(true);',
            'expect(hasRequiredCardinality(1)).to.equal(true);',
            "expect(hasRequiredCardinality('')).to.equal(false);",
            'expect(hasRequiredCardinality([])).to.equal(false);'
          );
        }
      } else {
        if (min > 1) {
          body.push(
            '',
            `expect(hasRequiredCardinality(Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x'))).to.equal(false);`,
            `expect(hasRequiredCardinality(Array.from({ length: ${min} }, () => 'x'))).to.equal(true);`
          );
        } else {
          body.push(
            '',
            'expect(hasRequiredCardinality([1])).to.equal(true);',
            'expect(hasRequiredCardinality([])).to.equal(false);'
          );
        }
      }

      return {
        title: prefixCategoryTitle('required', `${rule?.field || 'field'} min ${min}`) || `required field rule ${index + 1}`,
        callType: 'it',
        body: body.join('\n')
      };
    });
  }

  function buildGeneratedGroups(parsedForm, options = {}) {
    return codeGenMod.buildGeneratedGroups(parsedForm, options);
  }

  function serializeTestCase(test) {
    return codeGenMod.serializeTestCase(test);
  }

  function buildDependencySpec(parsedForm, options = {}) {
    return codeGenMod.buildDependencySpec(parsedForm, options);
  }

  return {
    ALL_CATEGORIES,
    normalizeConditionValue,
    parseFormDefinition,
    buildDiscoveredRuleRows,
    filterParsedFormByRuleIds,
    buildGeneratedGroups,
    buildDependencySpec,
    normalizeScopeLevels,
    buildRangeSamples,
    buildFieldIndex,
    resolveRulePath,
    normalizeCategoryKey,
    normalizeCategories,
    prefixCategoryTitle
  };
}));
