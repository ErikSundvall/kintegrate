import type { CategoryKey, GeneratedGroup, ParsedForm, RuleEntry, SerializedTest } from './types';
import { ALL_CATEGORIES, asLiteral, normalizeCategories, prefixCategoryTitle, quoteSingle, sanitizeTestTitle } from './test-title-utils';

interface CodeGenerationOptions extends Record<string, unknown> {
  categories?: unknown;
  logicLevel?: number;
  calcLevel?: number;
  validationLevel?: number;
  rangesLevel?: number;
  requiredLevel?: number;
  enabledRuleIds?: Set<string>;
  manualRangeCases?: SerializedTest[];
}

interface CategoryLevels {
  logic: number;
  calc: number;
  validation: number;
  ranges: number;
  required: number;
}

interface RangeSamplePayload {
  min: number | null;
  max: number | null;
  minOp: string;
  maxOp: string;
  validSamples: number[];
  invalidSamples: number[];
}

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function optionNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function pickIdentifier(rule: RuleEntry, type: 'trigger' | 'target'): string | null {
  const pathKey = `${type}Path` as 'triggerPath' | 'targetPath';
  const tagKey = `${type}Tag` as 'triggerTag' | 'targetTag';
  return rule[pathKey] || rule[tagKey] || null;
}

function normalizeOperator(op: unknown, bound: 'min' | 'max'): string {
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
  return String(op);
}

function isExclusive(op: string): boolean {
  return op === '>' || op === '<';
}

function pickStep(min: number | null, max: number | null): number {
  if (min !== null && max !== null && Number.isInteger(min) && Number.isInteger(max)) {
    const delta = Math.abs(max - min);
    return delta >= 2 ? 1 : 0.5;
  }
  return 0.1;
}

export function buildRangeSamples(rule: RuleEntry, richness: 'rich' | 'baseline' = 'rich'): RangeSamplePayload {
  const min = toFiniteNumber(rule.min);
  const max = toFiniteNumber(rule.max);
  const minOp = normalizeOperator(rule.minOp, 'min');
  const maxOp = normalizeOperator(rule.maxOp, 'max');
  const step = pickStep(min, max);

  const validSamples: number[] = [];
  const invalidSamples: number[] = [];

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

function toQuantitySamples(values: number[], unit: string): Array<{ magnitude: number; unit: string }> {
  return values.map((magnitude) => ({ magnitude, unit }));
}

function buildRangeAssertionPayload(rule: RuleEntry, samples: RangeSamplePayload) {
  const expectedUnit = rule.rmType === 'DV_QUANTITY' && rule.unit ? rule.unit : null;

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

function buildDependencyTests(parsedForm: ParsedForm, level: number): SerializedTest[] {
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
        const body = `throw new Error('Generator could not resolve ${missing} identifier for dependency rule ${index + 1}.');`;
        return {
          title: prefixCategoryTitle('logic', `dependency rule ${index + 1} has unresolved field identifiers`),
          callType: 'it',
          actions: [body],
          body
        };
      }

      const baseName = sanitizeTestTitle(rule.description || '') || `${target} visibility toggles from ${trigger}`;
      const actions = [
        `cy.visit('/form-viewer.html?testMode=1&autoLoad=0');`,
        'cy.formViewerReady();',
        '',
        `cy.fillField(${asLiteral(trigger)}, ${asLiteral(rule.hideValue)});`,
        `cy.expectHidden(${asLiteral(target)});`,
        `cy.fillField(${asLiteral(trigger)}, ${asLiteral(rule.showValue)});`,
        `cy.expectVisible(${asLiteral(target)});`
      ];

      return {
        title: prefixCategoryTitle('logic', baseName),
        callType: 'it',
        actions,
        body: actions.join('\n')
      };
    });
}

function buildCalculationTests(parsedForm: ParsedForm, level: number): SerializedTest[] {
  if (level <= 0) {
    return [];
  }

  return (parsedForm.calculations || []).map((rule, index) => {
    const actions = [
      `const field = ${asLiteral(rule.field || null)};`,
      `const expression = ${asLiteral(rule.expression || '')};`,
      '',
      "expect(field).to.be.a('string').and.not.to.equal('');",
      "expect(expression).to.be.a('string');",
      'expect(expression.trim().length).to.be.greaterThan(0);'
    ];

    return {
      title: prefixCategoryTitle('calc', rule.field ? `${rule.field} metadata exists` : `rule ${index + 1} metadata exists`),
      callType: 'it',
      actions,
      body: actions.join('\n')
    };
  });
}

function buildRangeValidationTests(parsedForm: ParsedForm, level: number): SerializedTest[] {
  if (level <= 0) {
    return [];
  }

  const richness = level >= 2 ? 'rich' : 'baseline';
  return (parsedForm.validations || []).map((rule, index) => {
    const samples = buildRangeSamples(rule, richness);
    const assertionPayload = buildRangeAssertionPayload(rule, samples);
    const action = `cy.assertRangeSamples(${asLiteral({
      label: `validation ${rule.field || 'field'} #${index + 1}`,
      min: assertionPayload.min,
      max: assertionPayload.max,
      minOp: assertionPayload.minOp,
      maxOp: assertionPayload.maxOp,
      validSamples: assertionPayload.validSamples,
      invalidSamples: assertionPayload.invalidSamples,
      expectedUnit: assertionPayload.expectedUnit
    })});`;

    return {
      title: prefixCategoryTitle('validation', `${rule.field || 'field'} #${index + 1}`),
      callType: 'it',
      actions: [action],
      body: action
    };
  });
}

function buildValueRangeMetadataTests(parsedForm: ParsedForm, levels: CategoryLevels): SerializedTest[] {
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
    const minOp = normalizeOperator(rule.minOp, 'min');
    const maxOp = normalizeOperator(rule.maxOp, 'max');
    const suffixPart = rule.suffix ? ` (${rule.suffix})` : '';
    const action = `cy.assertRangeSamples(${asLiteral({
      label: `value range ${rule.field || 'field'} #${index + 1}`,
      min: toFiniteNumber(rule.min),
      max: toFiniteNumber(rule.max),
      minOp,
      maxOp,
      validSamples: [],
      invalidSamples: [],
      expectedUnit: rule.rmType === 'DV_QUANTITY' ? rule.unit || null : null
    })});`;

    return {
      title: prefixCategoryTitle('ranges', `${rule.field || 'field'}${suffixPart} #${index + 1}`),
      callType: 'it',
      actions: [action],
      body: action
    };
  });
}

function buildRequiredFieldTests(parsedForm: ParsedForm, level: number): SerializedTest[] {
  if (level <= 0) {
    return [];
  }

  return (parsedForm.requiredFields || []).map((rule, index) => {
    const min = toFiniteNumber(rule.min) ?? 1;
    const actions = [
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
        actions.push(
          '',
          `const tooShort = Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x');`,
          `const enough = Array.from({ length: ${min} }, () => 'x');`,
          'expect(hasRequiredCardinality(tooShort)).to.equal(false);',
          'expect(hasRequiredCardinality(enough)).to.equal(true);',
          `expect(hasRequiredCardinality('x'.repeat(${Math.max(min - 1, 0)}))).to.equal(false);`,
          `expect(hasRequiredCardinality('x'.repeat(${min}))).to.equal(true);`
        );
      } else {
        actions.push(
          '',
          "expect(hasRequiredCardinality('x')).to.equal(true);",
          'expect(hasRequiredCardinality([1])).to.equal(true);',
          'expect(hasRequiredCardinality(1)).to.equal(true);',
          "expect(hasRequiredCardinality('')).to.equal(false);",
          'expect(hasRequiredCardinality([])).to.equal(false);'
        );
      }
    } else if (min > 1) {
      actions.push(
        '',
        `expect(hasRequiredCardinality(Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x'))).to.equal(false);`,
        `expect(hasRequiredCardinality(Array.from({ length: ${min} }, () => 'x'))).to.equal(true);`
      );
    } else {
      actions.push(
        '',
        'expect(hasRequiredCardinality([1])).to.equal(true);',
        'expect(hasRequiredCardinality([])).to.equal(false);'
      );
    }

    return {
      title: prefixCategoryTitle('required', `${rule.field || 'field'} min ${min}`) || `required field rule ${index + 1}`,
      callType: 'it',
      actions,
      body: actions.join('\n')
    };
  });
}

function filterParsedFormByRuleIds(parsedForm: ParsedForm, enabledRuleIds: Set<string> | null): ParsedForm {
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

export function normalizeScopeLevels(options: CodeGenerationOptions = {}): CategoryLevels {
  const selectedCategories = normalizeCategories(options.categories);
  const explicitLevels: Record<CategoryKey, number | null> = {
    logic: optionNumber(options.logicLevel),
    calc: optionNumber(options.calcLevel),
    validation: optionNumber(options.validationLevel),
    ranges: optionNumber(options.rangesLevel),
    required: optionNumber(options.requiredLevel)
  };
  const hasExplicitLevels = Object.values(explicitLevels).some((value) => value !== null);
  const levels = {} as CategoryLevels;

  ALL_CATEGORIES.forEach((category) => {
    if (explicitLevels[category] !== null) {
      levels[category] = explicitLevels[category] as number;
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

export function buildGeneratedGroups(parsedForm: ParsedForm, options: CodeGenerationOptions = {}): GeneratedGroup[] {
  const levels = normalizeScopeLevels(options);
  const enabledRuleIds = options.enabledRuleIds instanceof Set ? options.enabledRuleIds : null;
  const filteredParsed = filterParsedFormByRuleIds(parsedForm, enabledRuleIds);
  const groups: GeneratedGroup[] = [];

  const logicTests = buildDependencyTests(filteredParsed, levels.logic);
  if (logicTests.length) {
    groups.push({ name: 'logic', tests: logicTests, extrasText: '' });
  }

  const calcTests = buildCalculationTests(filteredParsed, levels.calc);
  if (calcTests.length) {
    groups.push({ name: 'calc', tests: calcTests, extrasText: '' });
  }

  const validationTests = buildRangeValidationTests(filteredParsed, levels.validation);
  if (validationTests.length) {
    groups.push({ name: 'validation', tests: validationTests, extrasText: '' });
  }

  const manualRangeCases = Array.isArray(options.manualRangeCases) ? options.manualRangeCases : [];
  const rangeTests = [
    ...buildValueRangeMetadataTests(filteredParsed, levels),
    ...(levels.ranges > 0 ? manualRangeCases : [])
  ];
  if (rangeTests.length) {
    groups.push({ name: 'ranges', tests: rangeTests, extrasText: '' });
  }

  const requiredTests = buildRequiredFieldTests(filteredParsed, levels.required);
  if (requiredTests.length) {
    groups.push({ name: 'required', tests: requiredTests, extrasText: '' });
  }

  return groups;
}

export function wrapDescribeSection(name: string, body: string): string {
  if (!body) {
    return `  describe(${quoteSingle(name)}, () => {\n  });`;
  }
  return `  describe(${quoteSingle(name)}, () => {\n${body}\n  });`;
}

export function serializeTestCase(test: SerializedTest): string {
  const sourceBody = typeof test.body === 'string' ? test.body : (test.actions || []).join('\n');
  const body = String(sourceBody || '').trimEnd();
  const bodyBlock = body
    ? `\n${body.split('\n').map((line) => (line ? `      ${line}` : '')).join('\n')}\n`
    : '\n';
  return `    ${(test.callType || 'it')}(${quoteSingle(test.title || 'unnamed test')}, () => {${bodyBlock}    });`;
}

export function buildDependencySpec(parsedForm: ParsedForm, options: CodeGenerationOptions = {}): string {
  const groups = buildGeneratedGroups(parsedForm, options);
  const suiteName = sanitizeTestTitle(parsedForm.name || 'Generated logic tests');
  const testBlocks = groups
    .map((group) => wrapDescribeSection(group.name, (group.tests || []).map((test) => serializeTestCase(test)).join('\n\n')))
    .join('\n\n');

  return `describe(${quoteSingle(`${suiteName} - autogenerated form tests`)}, () => {\n${testBlocks}\n});\n`;
}
