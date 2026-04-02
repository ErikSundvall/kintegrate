"use strict";
var TestGenerationCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/ts/test-title-utils.js
  var require_test_title_utils = __commonJS({
    "src/ts/test-title-utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ALL_CATEGORIES = void 0;
      exports.sanitizeTestTitle = sanitizeTestTitle2;
      exports.quoteSingle = quoteSingle2;
      exports.asLiteral = asLiteral2;
      exports.prefixCategoryTitle = prefixCategoryTitle2;
      exports.sanitizeGroupName = sanitizeGroupName2;
      exports.normalizeCategoryKey = normalizeCategoryKey2;
      exports.normalizeCategories = normalizeCategories2;
      var CATEGORY_ALIASES2 = {
        logic: "logic",
        dependencies: "logic",
        "form-logic": "logic",
        calculations: "calc",
        calc: "calc",
        validation: "validation",
        validations: "validation",
        ranges: "ranges",
        "value-ranges": "ranges",
        valuerranges: "ranges",
        required: "required",
        "required-fields": "required",
        requiredfields: "required"
      };
      exports.ALL_CATEGORIES = ["logic", "calc", "validation", "ranges", "required"];
      function isCategoryKey2(value) {
        return exports.ALL_CATEGORIES.includes(value);
      }
      function sanitizeTestTitle2(text) {
        return String(text || "").replace(/\s+/g, " ").replace(/['`]/g, "").trim();
      }
      function quoteSingle2(value) {
        return `'${String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
      }
      function asLiteral2(value) {
        return JSON.stringify(value);
      }
      function prefixCategoryTitle2(category, text) {
        const cleaned = sanitizeTestTitle2(String(text || "").replace(/^\[[^\]]+\]\s*/, ""));
        return sanitizeTestTitle2(`[${category}] ${cleaned}`);
      }
      function sanitizeGroupName2(text) {
        return sanitizeTestTitle2(String(text || "").replace(/^\[[^\]]+\]\s*/, ""));
      }
      function normalizeCategoryKey2(value) {
        const key = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
        return CATEGORY_ALIASES2[key] || key;
      }
      function normalizeCategories2(categories) {
        if (!Array.isArray(categories) || categories.length === 0) {
          return [];
        }
        const normalized = categories.map((item) => normalizeCategoryKey2(item)).filter((item) => isCategoryKey2(item));
        return [...new Set(normalized)];
      }
    }
  });

  // src/ts/field-index.js
  var require_field_index = __commonJS({
    "src/ts/field-index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.buildFieldIndex = buildFieldIndex;
      exports.resolveRulePath = resolveRulePath;
      exports.resolveRulePathDetails = resolveRulePathDetails;
      function isRecord(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
      }
      function uniqueValues(values) {
        return [...new Set(values.filter((value) => Boolean(value)))];
      }
      function buildFieldIndex(source) {
        const tagToPaths = /* @__PURE__ */ new Map();
        function walk(node, context = { structuralPath: [] }) {
          if (!isRecord(node)) {
            return;
          }
          const entry = {
            tag: typeof node.formId === "string" ? node.formId : typeof node.tag === "string" ? node.tag : typeof node.alias === "string" ? node.alias : typeof node.id === "string" ? node.id : null,
            path: typeof node.aqlPath === "string" ? node.aqlPath : typeof node.path === "string" ? node.path : null,
            structuralPath: null
          };
          const nextStructuralPath = entry.tag ? [...context.structuralPath, entry.tag] : context.structuralPath;
          entry.structuralPath = nextStructuralPath.length ? nextStructuralPath.join("/") : null;
          const preferredPaths = uniqueValues([entry.path, entry.structuralPath, entry.tag]);
          if (entry.tag) {
            const knownPaths = tagToPaths.get(entry.tag) || [];
            tagToPaths.set(entry.tag, [.../* @__PURE__ */ new Set([...knownPaths, ...preferredPaths])]);
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
        tagToPaths.allPathsFor = function allPathsFor(identifier) {
          if (!identifier) {
            return [];
          }
          return [...this.get(identifier) || []];
        };
        tagToPaths.preferredPathFor = function preferredPathFor(identifier) {
          return this.allPathsFor(identifier)[0] || null;
        };
        return tagToPaths;
      }
      function resolveRulePath(fieldIndex, identifier, explicitPath) {
        if (explicitPath) {
          return explicitPath;
        }
        if (!identifier || !fieldIndex) {
          return null;
        }
        const candidates = fieldIndex.get(identifier) || [];
        return candidates[0] || null;
      }
      function resolveRulePathDetails(fieldIndex, identifier, explicitPath) {
        const candidates = uniqueValues([
          explicitPath,
          ...fieldIndex?.allPathsFor(identifier) || []
        ]);
        return {
          candidates,
          primary: candidates[0] || identifier || "unknown"
        };
      }
    }
  });

  // src/ts/rule-extraction.js
  var require_rule_extraction = __commonJS({
    "src/ts/rule-extraction.js"(exports) {
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
        return !!value && typeof value === "object" && !Array.isArray(value);
      }
      function asArray(value) {
        if (Array.isArray(value)) {
          return value;
        }
        if (value === null || value === void 0) {
          return [];
        }
        return [value];
      }
      function getFiniteNumber(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
      }
      function getCategory(value) {
        if (value === "logic" || value === "calc" || value === "validation" || value === "ranges" || value === "required") {
          return value;
        }
        return void 0;
      }
      function normalizeConditionValue(value) {
        if (typeof value === "boolean") {
          return value;
        }
        if (typeof value !== "string") {
          return value;
        }
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "true") {
          return true;
        }
        if (trimmed === "false") {
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
        if (isRecord(conditionValue) && "value" in conditionValue) {
          return conditionValue.value;
        }
        return conditionValue ?? null;
      }
      function deriveVisibilityValues(actionName, triggerValue) {
        const opposite = oppositeValue(triggerValue);
        if (opposite === null) {
          return null;
        }
        if (actionName === "show") {
          return { showValue: triggerValue, hideValue: opposite };
        }
        return { showValue: opposite, hideValue: triggerValue };
      }
      function extractRulesFromConditions(conditionsPayload, rules, context = {}) {
        const conditions = typeof conditionsPayload === "string" ? JSON.parse(conditionsPayload) : conditionsPayload;
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
            const triggerId = isRecord(statement) && typeof statement.fieldId === "string" ? statement.fieldId : null;
            if (!triggerId) {
              return;
            }
            actions.forEach((action, actionIndex) => {
              if (!isRecord(action)) {
                return;
              }
              const actionName = typeof action.action === "string" ? action.action : null;
              const target = typeof action.target === "string" ? action.target : null;
              if (!target || actionName !== "hide" && actionName !== "show") {
                return;
              }
              const values = deriveVisibilityValues(actionName, triggerValue);
              if (!values) {
                return;
              }
              const actionText = actionName === "show" ? "shown" : "hidden";
              rules.push({
                type: "logic",
                id: `conditions:${expressionIndex}-${statementIndex}-${actionIndex}`,
                identifier: triggerId,
                triggerValue,
                targetIdentifier: target,
                targetPath: typeof context.currentPath === "string" ? context.currentPath : null,
                showValue: values.showValue,
                hideValue: values.hideValue,
                key: "conditions",
                index: `${expressionIndex}-${statementIndex}-${actionIndex}`,
                triggerTag: triggerId,
                targetTag: target,
                triggerPath: typeof context.currentPath === "string" ? context.currentPath : null,
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
          currentPath: typeof node.aqlPath === "string" ? node.aqlPath : typeof node.path === "string" ? node.path : typeof context.currentPath === "string" ? context.currentPath : null,
          currentTag: typeof node.formId === "string" ? node.formId : typeof node.tag === "string" ? node.tag : typeof node.alias === "string" ? node.alias : typeof node.id === "string" ? node.id : typeof context.currentTag === "string" ? context.currentTag : null
        };
        Object.entries(node).forEach(([key, value]) => {
          if (!value) {
            return;
          }
          if (/conditions/i.test(key)) {
            try {
              extractRulesFromConditions(value, rules, nextContext);
            } catch (_error) {
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
                type: "logic",
                identifier: typeof candidate.triggerTag === "string" ? candidate.triggerTag : typeof candidate.sourceTag === "string" ? candidate.sourceTag : typeof candidate.tag === "string" ? candidate.tag : typeof nextContext.currentTag === "string" ? nextContext.currentTag : null,
                triggerValue: showValue,
                targetIdentifier: typeof candidate.targetTag === "string" ? candidate.targetTag : typeof candidate.target === "string" ? candidate.target : typeof nextContext.currentTag === "string" ? nextContext.currentTag : null,
                targetPath: typeof candidate.targetPath === "string" ? candidate.targetPath : typeof candidate.path === "string" ? candidate.path : typeof nextContext.currentPath === "string" ? nextContext.currentPath : null,
                showValue,
                hideValue,
                key,
                index,
                triggerPath: typeof candidate.triggerPath === "string" ? candidate.triggerPath : typeof candidate.sourcePath === "string" ? candidate.sourcePath : typeof candidate.dependsOn === "string" ? candidate.dependsOn : typeof candidate.field === "string" ? candidate.field : typeof nextContext.currentPath === "string" ? nextContext.currentPath : null,
                triggerTag: typeof candidate.triggerTag === "string" ? candidate.triggerTag : typeof candidate.sourceTag === "string" ? candidate.sourceTag : typeof candidate.tag === "string" ? candidate.tag : typeof nextContext.currentTag === "string" ? nextContext.currentTag : null,
                targetTag: typeof candidate.targetTag === "string" ? candidate.targetTag : typeof candidate.target === "string" ? candidate.target : typeof nextContext.currentTag === "string" ? nextContext.currentTag : null,
                actionName: typeof candidate.action === "string" ? candidate.action : "show",
                description: typeof candidate.description === "string" ? candidate.description : typeof candidate.name === "string" ? candidate.name : ""
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
          fieldPath: typeof extras.fieldPath === "string" ? extras.fieldPath : null,
          suffix,
          rmType: typeof extras.rmType === "string" ? extras.rmType : null,
          unit: typeof extras.unit === "string" ? extras.unit : null,
          min,
          max,
          minOp: typeof range.minOp === "string" ? range.minOp : null,
          maxOp: typeof range.maxOp === "string" ? range.maxOp : null
        });
      }
      function extractQuantityUnitRules(inputs) {
        const unitInput = (inputs || []).find((input) => isRecord(input) && input.suffix === "unit");
        if (!isRecord(unitInput) || !Array.isArray(unitInput.list)) {
          return [];
        }
        const output = [];
        unitInput.list.forEach((entry) => {
          if (!isRecord(entry)) {
            return;
          }
          const unit = typeof entry.value === "string" ? entry.value : typeof entry.label === "string" ? entry.label : null;
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
    }
  });

  // src/ts/test-title-utils.ts
  var test_title_utils_exports = {};
  __export(test_title_utils_exports, {
    ALL_CATEGORIES: () => ALL_CATEGORIES,
    asLiteral: () => asLiteral,
    normalizeCategories: () => normalizeCategories,
    normalizeCategoryKey: () => normalizeCategoryKey,
    prefixCategoryTitle: () => prefixCategoryTitle,
    quoteSingle: () => quoteSingle,
    sanitizeGroupName: () => sanitizeGroupName,
    sanitizeTestTitle: () => sanitizeTestTitle
  });
  function isCategoryKey(value) {
    return ALL_CATEGORIES.includes(value);
  }
  function sanitizeTestTitle(text) {
    return String(text || "").replace(/\s+/g, " ").replace(/['`]/g, "").trim();
  }
  function quoteSingle(value) {
    return `'${String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  }
  function asLiteral(value) {
    return JSON.stringify(value);
  }
  function prefixCategoryTitle(category, text) {
    const cleaned = sanitizeTestTitle(String(text || "").replace(/^\[[^\]]+\]\s*/, ""));
    return sanitizeTestTitle(`[${category}] ${cleaned}`);
  }
  function sanitizeGroupName(text) {
    return sanitizeTestTitle(String(text || "").replace(/^\[[^\]]+\]\s*/, ""));
  }
  function normalizeCategoryKey(value) {
    const key = String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
    return CATEGORY_ALIASES[key] || key;
  }
  function normalizeCategories(categories) {
    if (!Array.isArray(categories) || categories.length === 0) {
      return [];
    }
    const normalized = categories.map((item) => normalizeCategoryKey(item)).filter((item) => isCategoryKey(item));
    return [...new Set(normalized)];
  }
  var CATEGORY_ALIASES, ALL_CATEGORIES;
  var init_test_title_utils = __esm({
    "src/ts/test-title-utils.ts"() {
      "use strict";
      CATEGORY_ALIASES = {
        logic: "logic",
        dependencies: "logic",
        "form-logic": "logic",
        calculations: "calc",
        calc: "calc",
        validation: "validation",
        validations: "validation",
        ranges: "ranges",
        "value-ranges": "ranges",
        valuerranges: "ranges",
        required: "required",
        "required-fields": "required",
        requiredfields: "required"
      };
      ALL_CATEGORIES = ["logic", "calc", "validation", "ranges", "required"];
    }
  });

  // src/ts/code-generation.js
  var require_code_generation = __commonJS({
    "src/ts/code-generation.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.buildRangeSamples = buildRangeSamples;
      exports.normalizeScopeLevels = normalizeScopeLevels;
      exports.buildGeneratedGroups = buildGeneratedGroups;
      exports.wrapDescribeSection = wrapDescribeSection;
      exports.serializeTestCase = serializeTestCase;
      exports.buildDependencySpec = buildDependencySpec;
      var test_title_utils_1 = (init_test_title_utils(), __toCommonJS(test_title_utils_exports));
      function toFiniteNumber(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
      }
      function optionNumber(value) {
        return typeof value === "number" && Number.isFinite(value) ? value : null;
      }
      function pickIdentifier(rule, type) {
        const pathKey = `${type}Path`;
        const tagKey = `${type}Tag`;
        return rule[pathKey] || rule[tagKey] || null;
      }
      function humanizeFieldName(value) {
        const raw = String(value || "field").trim();
        const segments = raw.split("/").filter(Boolean);
        const leaf = segments[segments.length - 1] || raw;
        return (0, test_title_utils_1.sanitizeTestTitle)(leaf.replace(/_/g, "-")) || "field";
      }
      function humanizeValue(value) {
        if (typeof value === "boolean") {
          return value ? "true" : "false";
        }
        if (value === null || value === void 0) {
          return "empty";
        }
        return (0, test_title_utils_1.sanitizeTestTitle)(String(value)) || "value";
      }
      function buildVisibilityTitle(rule, trigger, target) {
        const verb = rule.actionName === "hide" ? "hides" : "shows";
        const triggerValue = rule.triggerValue ?? rule.showValue;
        return `${verb} ${humanizeFieldName(target)} when ${humanizeFieldName(trigger)} is ${humanizeValue(triggerValue)}`;
      }
      function buildRangeTitle(rule) {
        const fieldName = humanizeFieldName(rule.field || rule.fieldPath || "field");
        const min = toFiniteNumber(rule.min);
        const max = toFiniteNumber(rule.max);
        if (min !== null && max !== null) {
          return `validates ${fieldName} is between ${min} and ${max}`;
        }
        if (min !== null) {
          return `validates ${fieldName} is ${normalizeOperator(rule.minOp, "min")} ${min}`;
        }
        if (max !== null) {
          return `validates ${fieldName} is ${normalizeOperator(rule.maxOp, "max")} ${max}`;
        }
        return `validates ${fieldName}`;
      }
      function normalizeOperator(op, bound) {
        if (!op) {
          return bound === "min" ? ">=" : "<=";
        }
        const normalized = String(op).trim().toLowerCase();
        if (normalized === "ge" || normalized === "gte") {
          return ">=";
        }
        if (normalized === "le" || normalized === "lte") {
          return "<=";
        }
        if (normalized === "gt") {
          return ">";
        }
        if (normalized === "lt") {
          return "<";
        }
        return String(op);
      }
      function isExclusive(op) {
        return op === ">" || op === "<";
      }
      function pickStep(min, max) {
        if (min !== null && max !== null && Number.isInteger(min) && Number.isInteger(max)) {
          const delta = Math.abs(max - min);
          return delta >= 2 ? 1 : 0.5;
        }
        return 0.1;
      }
      function buildRangeSamples(rule, richness = "rich") {
        const min = toFiniteNumber(rule.min);
        const max = toFiniteNumber(rule.max);
        const minOp = normalizeOperator(rule.minOp, "min");
        const maxOp = normalizeOperator(rule.maxOp, "max");
        const step = pickStep(min, max);
        const validSamples = [];
        const invalidSamples = [];
        if (min !== null && max !== null) {
          const lower = isExclusive(minOp) ? min + step : min;
          const upper = isExclusive(maxOp) ? max - step : max;
          if (lower <= upper) {
            validSamples.push(lower);
            if (richness === "rich") {
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
          if (richness === "rich") {
            invalidSamples.push(isExclusive(maxOp) ? max : max + step);
          }
        } else if (min !== null) {
          validSamples.push(isExclusive(minOp) ? min + step : min);
          invalidSamples.push(isExclusive(minOp) ? min : min - step);
          if (richness === "rich") {
            validSamples.push((isExclusive(minOp) ? min + step : min) + step);
          }
        } else if (max !== null) {
          validSamples.push(isExclusive(maxOp) ? max - step : max);
          invalidSamples.push(isExclusive(maxOp) ? max : max + step);
          if (richness === "rich") {
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
        return values.map((magnitude) => ({ magnitude, unit }));
      }
      function buildRangeAssertionPayload(rule, samples) {
        const expectedUnit = rule.rmType === "DV_QUANTITY" && rule.unit ? rule.unit : null;
        const validSamples = expectedUnit ? toQuantitySamples(samples.validSamples, expectedUnit) : samples.validSamples;
        const invalidSamples = expectedUnit ? [
          ...toQuantitySamples(samples.invalidSamples, expectedUnit),
          ...samples.validSamples.length ? [{ magnitude: samples.validSamples[0], unit: `${expectedUnit}__INVALID` }] : []
        ] : samples.invalidSamples;
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
        return (parsedForm.dependencies || []).filter((rule) => level >= 2 || rule.actionName === "show").map((rule, index) => {
          const trigger = pickIdentifier(rule, "trigger");
          const target = pickIdentifier(rule, "target");
          if (!trigger || !target) {
            const missing = [!trigger ? "trigger" : null, !target ? "target" : null].filter(Boolean).join(" and ");
            const body = `throw new Error('Generator could not resolve ${missing} identifier for dependency rule ${index + 1}.');`;
            return {
              title: `dependency rule ${index + 1} has unresolved field identifiers`,
              callType: "it",
              actions: [body],
              body
            };
          }
          const baseName = buildVisibilityTitle(rule, trigger, target);
          const actions = [
            `cy.fillField(${(0, test_title_utils_1.asLiteral)(trigger)}, ${(0, test_title_utils_1.asLiteral)(rule.hideValue)});`,
            `cy.expectHidden(${(0, test_title_utils_1.asLiteral)(target)});`,
            `cy.fillField(${(0, test_title_utils_1.asLiteral)(trigger)}, ${(0, test_title_utils_1.asLiteral)(rule.showValue)});`,
            `cy.expectVisible(${(0, test_title_utils_1.asLiteral)(target)});`
          ];
          return {
            title: baseName,
            callType: "it",
            actions,
            body: actions.join("\n")
          };
        });
      }
      function buildCalculationTests(parsedForm, level) {
        if (level <= 0) {
          return [];
        }
        return (parsedForm.calculations || []).map((rule, index) => {
          const actions = [
            `const field = ${(0, test_title_utils_1.asLiteral)(rule.field || null)};`,
            `const expression = ${(0, test_title_utils_1.asLiteral)(rule.expression || "")};`,
            "",
            "expect(field).to.be.a('string').and.not.to.equal('');",
            "expect(expression).to.be.a('string');",
            "expect(expression.trim().length).to.be.greaterThan(0);"
          ];
          return {
            title: rule.field ? `captures calculation metadata for ${humanizeFieldName(rule.field)}` : `captures calculation metadata for rule ${index + 1}`,
            callType: "it",
            actions,
            body: actions.join("\n")
          };
        });
      }
      function buildRangeValidationTests(parsedForm, level) {
        if (level <= 0) {
          return [];
        }
        const richness = level >= 2 ? "rich" : "baseline";
        return (parsedForm.validations || []).map((rule, index) => {
          const samples = buildRangeSamples(rule, richness);
          const assertionPayload = buildRangeAssertionPayload(rule, samples);
          const action = `cy.assertRangeSamples(${(0, test_title_utils_1.asLiteral)({
            label: `validation ${rule.field || "field"} #${index + 1}`,
            min: assertionPayload.min,
            max: assertionPayload.max,
            minOp: assertionPayload.minOp,
            maxOp: assertionPayload.maxOp,
            validSamples: assertionPayload.validSamples,
            invalidSamples: assertionPayload.invalidSamples,
            expectedUnit: assertionPayload.expectedUnit
          })});`;
          return {
            title: buildRangeTitle(rule),
            callType: "it",
            actions: [action],
            body: action
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
          const samples = buildRangeSamples(rule, "rich");
          const assertionPayload = buildRangeAssertionPayload(rule, samples);
          const action = `cy.assertRangeSamples(${(0, test_title_utils_1.asLiteral)({
            label: `value range ${rule.field || "field"} #${index + 1}`,
            min: assertionPayload.min,
            max: assertionPayload.max,
            minOp: assertionPayload.minOp,
            maxOp: assertionPayload.maxOp,
            validSamples: assertionPayload.validSamples,
            invalidSamples: assertionPayload.invalidSamples,
            expectedUnit: assertionPayload.expectedUnit
          })});`;
          return {
            title: buildRangeTitle(rule),
            callType: "it",
            actions: [action],
            body: action
          };
        });
      }
      function buildRequiredFieldTests(parsedForm, level) {
        if (level <= 0) {
          return [];
        }
        return (parsedForm.requiredFields || []).map((rule, index) => {
          const min = toFiniteNumber(rule.min) ?? 1;
          const actions = [
            `const min = ${(0, test_title_utils_1.asLiteral)(min)};`,
            "",
            "const hasRequiredCardinality = (value) => {",
            "  if (value === null || value === undefined) {",
            "    return false;",
            "  }",
            "  if (Array.isArray(value)) {",
            "    return value.length >= min;",
            "  }",
            "  if (typeof value === 'string') {",
            "    return value.length >= min;",
            "  }",
            "  return min <= 1;",
            "};",
            "",
            "expect(hasRequiredCardinality(null)).to.equal(false);",
            "expect(hasRequiredCardinality(undefined)).to.equal(false);"
          ];
          if (level >= 2) {
            if (min > 1) {
              actions.push("", `const tooShort = Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x');`, `const enough = Array.from({ length: ${min} }, () => 'x');`, "expect(hasRequiredCardinality(tooShort)).to.equal(false);", "expect(hasRequiredCardinality(enough)).to.equal(true);", `expect(hasRequiredCardinality('x'.repeat(${Math.max(min - 1, 0)}))).to.equal(false);`, `expect(hasRequiredCardinality('x'.repeat(${min}))).to.equal(true);`);
            } else {
              actions.push("", "expect(hasRequiredCardinality('x')).to.equal(true);", "expect(hasRequiredCardinality([1])).to.equal(true);", "expect(hasRequiredCardinality(1)).to.equal(true);", "expect(hasRequiredCardinality('')).to.equal(false);", "expect(hasRequiredCardinality([])).to.equal(false);");
            }
          } else if (min > 1) {
            actions.push("", `expect(hasRequiredCardinality(Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x'))).to.equal(false);`, `expect(hasRequiredCardinality(Array.from({ length: ${min} }, () => 'x'))).to.equal(true);`);
          } else {
            actions.push("", "expect(hasRequiredCardinality([1])).to.equal(true);", "expect(hasRequiredCardinality([])).to.equal(false);");
          }
          return {
            title: `requires ${humanizeFieldName(rule.field || rule.fieldPath || `field ${index + 1}`)}`,
            callType: "it",
            actions,
            body: actions.join("\n")
          };
        });
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
        const selectedCategories = (0, test_title_utils_1.normalizeCategories)(options.categories);
        const explicitLevels = {
          logic: optionNumber(options.logicLevel),
          calc: optionNumber(options.calcLevel),
          validation: optionNumber(options.validationLevel),
          ranges: optionNumber(options.rangesLevel),
          required: optionNumber(options.requiredLevel)
        };
        const hasExplicitLevels = Object.values(explicitLevels).some((value) => value !== null);
        const levels = {};
        test_title_utils_1.ALL_CATEGORIES.forEach((category) => {
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
      function buildGeneratedGroups(parsedForm, options = {}) {
        const levels = normalizeScopeLevels(options);
        const enabledRuleIds = options.enabledRuleIds instanceof Set ? options.enabledRuleIds : null;
        const filteredParsed = filterParsedFormByRuleIds(parsedForm, enabledRuleIds);
        const groups = [];
        const logicTests = buildDependencyTests(filteredParsed, levels.logic);
        if (logicTests.length) {
          groups.push({ name: "logic", tests: logicTests, extrasText: "" });
        }
        const calcTests = buildCalculationTests(filteredParsed, levels.calc);
        if (calcTests.length) {
          groups.push({ name: "calc", tests: calcTests, extrasText: "" });
        }
        const validationTests = buildRangeValidationTests(filteredParsed, levels.validation);
        if (validationTests.length) {
          groups.push({ name: "validation", tests: validationTests, extrasText: "" });
        }
        const manualRangeCases = Array.isArray(options.manualRangeCases) ? options.manualRangeCases : [];
        const rangeTests = [
          ...buildValueRangeMetadataTests(filteredParsed, levels),
          ...levels.ranges > 0 ? manualRangeCases : []
        ];
        if (rangeTests.length) {
          groups.push({ name: "ranges", tests: rangeTests, extrasText: "" });
        }
        const requiredTests = buildRequiredFieldTests(filteredParsed, levels.required);
        if (requiredTests.length) {
          groups.push({ name: "required", tests: requiredTests, extrasText: "" });
        }
        return groups;
      }
      function wrapDescribeSection(name, body) {
        const setupLines = [
          "    before(() => { cy.formViewerReady(); });",
          "",
          "    beforeEach(() => { cy.resetForm(); });"
        ].join("\n");
        if (!body) {
          return `  describe(${(0, test_title_utils_1.quoteSingle)(name)}, () => {
${setupLines}
  });`;
        }
        return `  describe(${(0, test_title_utils_1.quoteSingle)(name)}, () => {
${setupLines}

${body}
  });`;
      }
      function serializeTestCase(test) {
        const sourceBody = typeof test.body === "string" ? test.body : (test.actions || []).join("\n");
        const body = String(sourceBody || "").trimEnd();
        const bodyBlock = body ? `
${body.split("\n").map((line) => line ? `      ${line}` : "").join("\n")}
` : "\n";
        return `    ${test.callType || "it"}(${(0, test_title_utils_1.quoteSingle)(test.title || "unnamed test")}, () => {${bodyBlock}    });`;
      }
      function buildDependencySpec(parsedForm, options = {}) {
        const groups = buildGeneratedGroups(parsedForm, options);
        const suiteName = (0, test_title_utils_1.sanitizeTestTitle)(parsedForm.name || "Generated logic tests");
        const testBlocks = groups.map((group) => wrapDescribeSection(group.name, (group.tests || []).map((test) => serializeTestCase(test)).join("\n\n"))).join("\n\n");
        return `describe(${(0, test_title_utils_1.quoteSingle)(`${suiteName} - autogenerated form tests`)}, () => {
${testBlocks}
});
`;
      }
    }
  });

  // src/test-generation-core.js
  var require_test_generation_core = __commonJS({
    "src/test-generation-core.js"(exports, module) {
      (function(root, factory) {
        if (typeof module !== "undefined" && module.exports) {
          module.exports = factory();
          return;
        }
        root.TestGenerationCore = factory();
      })(typeof globalThis !== "undefined" ? globalThis : exports, function() {
        const titleUtils = require_test_title_utils();
        const fieldIndexMod = require_field_index();
        const ruleExtractionMod = require_rule_extraction();
        const codeGenMod = require_code_generation();
        const CATEGORY_ALIASES2 = {
          logic: "logic",
          dependencies: "logic",
          "form-logic": "logic",
          calculations: "calc",
          calc: "calc",
          validation: "validation",
          validations: "validation",
          ranges: "ranges",
          "value-ranges": "ranges",
          valuerranges: "ranges",
          required: "required",
          "required-fields": "required",
          requiredfields: "required"
        };
        const ALL_CATEGORIES2 = ["logic", "calc", "validation", "ranges", "required"];
        function sanitizeTestTitle2(text) {
          return titleUtils.sanitizeTestTitle(text);
        }
        function quoteSingle2(value) {
          return titleUtils.quoteSingle(value);
        }
        function asLiteral2(value) {
          return titleUtils.asLiteral(value);
        }
        function prefixCategoryTitle2(category, text) {
          return titleUtils.prefixCategoryTitle(category, text);
        }
        function wrapDescribeSection(name, body) {
          return codeGenMod.wrapDescribeSection(name, body);
        }
        function normalizeCategoryKey2(value) {
          return titleUtils.normalizeCategoryKey(value);
        }
        function normalizeCategories2(categories) {
          return titleUtils.normalizeCategories(categories);
        }
        function uniqueValues(values) {
          return [...new Set((values || []).filter(Boolean))];
        }
        function stableValueKey(value) {
          if (value === null || value === void 0) {
            return String(value);
          }
          if (typeof value === "object") {
            try {
              return JSON.stringify(value, Object.keys(value).sort());
            } catch (_error) {
              return String(value);
            }
          }
          return String(value);
        }
        function dedupeBySignature(items, signatureBuilder) {
          const seen = /* @__PURE__ */ new Set();
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
          if (!node || typeof node !== "object") {
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
          const quantityUnitRules = node.rmType === "DV_QUANTITY" ? extractQuantityUnitRules(node.inputs) : [];
          if (Array.isArray(node.inputs)) {
            node.inputs.forEach((input) => {
              const inputRange = input?.validation?.range;
              if (!inputRange) {
                return;
              }
              const inputSuffix = input?.suffix || null;
              if (node.rmType === "DV_QUANTITY" && inputSuffix === "magnitude" && quantityUnitRules.length) {
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
              if (inputSuffix === "unit") {
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
                expression: typeof value === "string" ? value : JSON.stringify(value)
              });
            }
          });
          Object.entries(node).forEach(([key, value]) => {
            if (!value || key === "inputs" || key === "validation" || key === "list" || /conditions/i.test(key)) {
              return;
            }
            if (Array.isArray(value)) {
              value.forEach((item) => {
                collectValidationRules(item, validations, valueRanges, requiredFields, calculations, nextContext);
              });
              return;
            }
            if (value && typeof value === "object") {
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
            ].join("|")
          );
          const uniqueValidations = dedupeBySignature(
            validations,
            (rule) => [rule?.field, rule?.fieldPath, rule?.suffix, rule?.rmType, rule?.unit, rule?.min, rule?.max, rule?.minOp, rule?.maxOp].join("|")
          );
          const uniqueValueRanges = dedupeBySignature(
            valueRanges,
            (rule) => [rule?.field, rule?.fieldPath, rule?.suffix, rule?.rmType, rule?.unit, rule?.min, rule?.max, rule?.minOp, rule?.maxOp].join("|")
          );
          const uniqueRequiredFields = dedupeBySignature(
            requiredFields,
            (rule) => [rule?.field, rule?.fieldPath, rule?.min].join("|")
          );
          const uniqueCalculations = dedupeBySignature(
            calculations,
            (rule) => [rule?.field, rule?.fieldPath, rule?.expression].join("|")
          );
          return {
            name: input?.name || source?.name || source?.templateId || "generated-form",
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
            return pieces.join(" ");
          }
          return "metadata";
        }
        function formatIdentifierList(values) {
          const items = uniqueValues(values);
          return items.join(", ");
        }
        function buildDiscoveredRuleRows(parsed) {
          const fieldIndex = parsed?.fieldIndex;
          const rows = [];
          (parsed?.dependencies || []).forEach((rule, index) => {
            const triggerPath = resolveRulePath(fieldIndex, rule.triggerTag, rule.triggerPath);
            const targetPath = resolveRulePath(fieldIndex, rule.targetTag, rule.targetPath);
            const levelRecommendation = rule.actionName === "show" ? 1 : 2;
            rows.push({
              rowId: `logic::${index}`,
              enabled: levelRecommendation <= 1,
              recommendedLevel: levelRecommendation,
              kind: "logic",
              kindLabel: "logic",
              scopeSection: "logic",
              scopeInput: "logic",
              summary: rule.description || `${rule.targetTag || "target"} when ${rule.triggerTag || "trigger"}=${rule.showValue}`,
              trigger: formatIdentifierList([rule.triggerTag, ...triggerPath.candidates]),
              subject: formatIdentifierList([rule.targetTag, ...targetPath.candidates]),
              formPath: targetPath.primary || triggerPath.primary,
              formPathSort: (targetPath.primary || triggerPath.primary || "").toLowerCase(),
              sortSummary: (rule.description || "").toLowerCase(),
              sourceIndex: index
            });
          });
          (parsed?.calculations || []).forEach((rule, index) => {
            const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
            rows.push({
              rowId: `calc::${index}`,
              enabled: true,
              recommendedLevel: 1,
              kind: "calc",
              kindLabel: "calc",
              scopeSection: "calc",
              scopeInput: "calc",
              summary: `${rule.field || "field"} = derived expression`,
              trigger: "",
              subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
              formPath: fieldPath.primary,
              formPathSort: (fieldPath.primary || "").toLowerCase(),
              sortSummary: `${rule.field || ""} ${rule.expression || ""}`.toLowerCase(),
              sourceIndex: index
            });
          });
          (parsed?.validations || []).forEach((rule, index) => {
            const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
            rows.push({
              rowId: `validation::${index}`,
              enabled: true,
              recommendedLevel: 1,
              kind: "validation",
              kindLabel: "validation",
              scopeSection: "validation",
              scopeInput: "val",
              summary: `${rule.field || "field"} ${formatBoundSummary(rule)}`,
              trigger: "",
              subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
              formPath: fieldPath.primary,
              formPathSort: (fieldPath.primary || "").toLowerCase(),
              sortSummary: `${rule.field || ""} ${formatBoundSummary(rule)}`.toLowerCase(),
              sourceIndex: index
            });
          });
          (parsed?.valueRanges || []).forEach((rule, index) => {
            const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
            rows.push({
              rowId: `ranges::${index}`,
              enabled: true,
              recommendedLevel: 2,
              kind: "ranges",
              kindLabel: "ranges",
              scopeSection: "ranges",
              scopeInput: "range",
              summary: `${rule.field || "field"} ${formatBoundSummary(rule)}`,
              trigger: "",
              subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
              formPath: fieldPath.primary,
              formPathSort: (fieldPath.primary || "").toLowerCase(),
              sortSummary: `${rule.field || ""} ${formatBoundSummary(rule)}`.toLowerCase(),
              sourceIndex: index
            });
          });
          (parsed?.requiredFields || []).forEach((rule, index) => {
            const fieldPath = resolveRulePath(fieldIndex, rule.field, rule.fieldPath);
            rows.push({
              rowId: `required::${index}`,
              enabled: true,
              recommendedLevel: 1,
              kind: "required",
              kindLabel: "required",
              scopeSection: "required",
              scopeInput: "req",
              summary: `${rule.field || "field"} min ${Number.isFinite(rule?.min) ? rule.min : 1}`,
              trigger: "",
              subject: formatIdentifierList([rule.field, ...fieldPath.candidates]),
              formPath: fieldPath.primary,
              formPathSort: (fieldPath.primary || "").toLowerCase(),
              sortSummary: `${rule.field || ""} ${rule.min || 1}`.toLowerCase(),
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
          const selectedCategories = normalizeCategories2(options.categories);
          const explicitLevels = {
            logic: Number.isFinite(options.logicLevel) ? options.logicLevel : null,
            calc: Number.isFinite(options.calcLevel) ? options.calcLevel : null,
            validation: Number.isFinite(options.validationLevel) ? options.validationLevel : null,
            ranges: Number.isFinite(options.rangesLevel) ? options.rangesLevel : null,
            required: Number.isFinite(options.requiredLevel) ? options.requiredLevel : null
          };
          const hasExplicitLevels = Object.values(explicitLevels).some((value) => value !== null);
          const levels = {};
          ALL_CATEGORIES2.forEach((category) => {
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
            return bound === "min" ? ">=" : "<=";
          }
          const normalized = String(op).trim().toLowerCase();
          if (normalized === "ge" || normalized === "gte") {
            return ">=";
          }
          if (normalized === "le" || normalized === "lte") {
            return "<=";
          }
          if (normalized === "gt") {
            return ">";
          }
          if (normalized === "lt") {
            return "<";
          }
          return op;
        }
        function isExclusive(op) {
          return op === ">" || op === "<";
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
        function buildRangeSamples(rule, richness = "rich") {
          const min = Number.isFinite(rule?.min) ? rule.min : null;
          const max = Number.isFinite(rule?.max) ? rule.max : null;
          const minOp = normalizeOperator(rule?.minOp, "min");
          const maxOp = normalizeOperator(rule?.maxOp, "max");
          const step = pickStep(min, max);
          const validSamples = [];
          const invalidSamples = [];
          if (min !== null && max !== null) {
            const lower = isExclusive(minOp) ? min + step : min;
            const upper = isExclusive(maxOp) ? max - step : max;
            if (lower <= upper) {
              validSamples.push(lower);
              if (richness === "rich") {
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
            if (richness === "rich") {
              invalidSamples.push(isExclusive(maxOp) ? max : max + step);
            }
          } else if (min !== null) {
            validSamples.push(isExclusive(minOp) ? min + step : min);
            invalidSamples.push(isExclusive(minOp) ? min : min - step);
            if (richness === "rich") {
              validSamples.push((isExclusive(minOp) ? min + step : min) + step);
            }
          } else if (max !== null) {
            validSamples.push(isExclusive(maxOp) ? max - step : max);
            invalidSamples.push(isExclusive(maxOp) ? max : max + step);
            if (richness === "rich") {
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
          const expectedUnit = rule?.rmType === "DV_QUANTITY" && rule?.unit ? rule.unit : null;
          const validSamples = expectedUnit ? toQuantitySamples(samples.validSamples, expectedUnit) : samples.validSamples;
          const invalidSamples = expectedUnit ? [
            ...toQuantitySamples(samples.invalidSamples, expectedUnit),
            ...samples.validSamples.length ? [{ magnitude: samples.validSamples[0], unit: `${expectedUnit}__INVALID` }] : []
          ] : samples.invalidSamples;
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
          return (parsedForm.dependencies || []).filter((rule) => level >= 2 || rule.actionName === "show").map((rule, index) => {
            const trigger = pickIdentifier(rule, "trigger");
            const target = pickIdentifier(rule, "target");
            if (!trigger || !target) {
              const missing = [!trigger ? "trigger" : null, !target ? "target" : null].filter(Boolean).join(" and ");
              return {
                title: prefixCategoryTitle2("logic", `dependency rule ${index + 1} has unresolved field identifiers`),
                callType: "it",
                body: `throw new Error('Generator could not resolve ${missing} identifier for dependency rule ${index + 1}.');`
              };
            }
            const baseName = sanitizeTestTitle2(rule.description) || `${target} visibility toggles from ${trigger}`;
            return {
              title: prefixCategoryTitle2("logic", baseName),
              callType: "it",
              body: [
                `cy.visit('/form-viewer.html?testMode=1&autoLoad=0');`,
                "cy.formViewerReady();",
                "",
                `cy.fillField(${asLiteral2(trigger)}, ${asLiteral2(rule.hideValue)});`,
                `cy.expectHidden(${asLiteral2(target)});`,
                `cy.fillField(${asLiteral2(trigger)}, ${asLiteral2(rule.showValue)});`,
                `cy.expectVisible(${asLiteral2(target)});`
              ].join("\n")
            };
          });
        }
        function buildCalculationTests(parsedForm, level) {
          if (level <= 0) {
            return [];
          }
          return (parsedForm.calculations || []).map((rule, index) => ({
            title: prefixCategoryTitle2("calc", rule?.field ? `${rule.field} metadata exists` : `rule ${index + 1} metadata exists`),
            callType: "it",
            body: [
              `const field = ${asLiteral2(rule?.field || null)};`,
              `const expression = ${asLiteral2(rule?.expression || "")};`,
              "",
              "expect(field).to.be.a('string').and.not.to.equal('');",
              "expect(expression).to.be.a('string');",
              "expect(expression.trim().length).to.be.greaterThan(0);"
            ].join("\n")
          }));
        }
        function buildRangeValidationTests(parsedForm, level) {
          if (level <= 0) {
            return [];
          }
          const richness = level >= 2 ? "rich" : "baseline";
          return (parsedForm.validations || []).map((rule, index) => {
            const samples = buildRangeSamples(rule, richness);
            const assertionPayload = buildRangeAssertionPayload(rule, samples);
            return {
              title: prefixCategoryTitle2("validation", `${rule?.field || "field"} #${index + 1}`),
              callType: "it",
              body: `cy.assertRangeSamples(${asLiteral2({
                label: `validation ${rule?.field || "field"} #${index + 1}`,
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
            const minOp = normalizeOperator(rule?.minOp, "min");
            const maxOp = normalizeOperator(rule?.maxOp, "max");
            const suffixPart = rule?.suffix ? ` (${rule.suffix})` : "";
            return {
              title: prefixCategoryTitle2("ranges", `${rule?.field || "field"}${suffixPart} #${index + 1}`),
              callType: "it",
              body: `cy.assertRangeSamples(${asLiteral2({
                label: `value range ${rule?.field || "field"} #${index + 1}`,
                min: Number.isFinite(rule?.min) ? rule.min : null,
                max: Number.isFinite(rule?.max) ? rule.max : null,
                minOp,
                maxOp,
                validSamples: [],
                invalidSamples: [],
                expectedUnit: rule?.rmType === "DV_QUANTITY" ? rule?.unit || null : null
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
              `const min = ${asLiteral2(min)};`,
              "",
              "const hasRequiredCardinality = (value) => {",
              "  if (value === null || value === undefined) {",
              "    return false;",
              "  }",
              "  if (Array.isArray(value)) {",
              "    return value.length >= min;",
              "  }",
              "  if (typeof value === 'string') {",
              "    return value.length >= min;",
              "  }",
              "  return min <= 1;",
              "};",
              "",
              "expect(hasRequiredCardinality(null)).to.equal(false);",
              "expect(hasRequiredCardinality(undefined)).to.equal(false);"
            ];
            if (level >= 2) {
              if (min > 1) {
                body.push(
                  "",
                  `const tooShort = Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x');`,
                  `const enough = Array.from({ length: ${min} }, () => 'x');`,
                  "expect(hasRequiredCardinality(tooShort)).to.equal(false);",
                  "expect(hasRequiredCardinality(enough)).to.equal(true);",
                  `expect(hasRequiredCardinality('x'.repeat(${Math.max(min - 1, 0)}))).to.equal(false);`,
                  `expect(hasRequiredCardinality('x'.repeat(${min}))).to.equal(true);`
                );
              } else {
                body.push(
                  "",
                  "expect(hasRequiredCardinality('x')).to.equal(true);",
                  "expect(hasRequiredCardinality([1])).to.equal(true);",
                  "expect(hasRequiredCardinality(1)).to.equal(true);",
                  "expect(hasRequiredCardinality('')).to.equal(false);",
                  "expect(hasRequiredCardinality([])).to.equal(false);"
                );
              }
            } else {
              if (min > 1) {
                body.push(
                  "",
                  `expect(hasRequiredCardinality(Array.from({ length: ${Math.max(min - 1, 0)} }, () => 'x'))).to.equal(false);`,
                  `expect(hasRequiredCardinality(Array.from({ length: ${min} }, () => 'x'))).to.equal(true);`
                );
              } else {
                body.push(
                  "",
                  "expect(hasRequiredCardinality([1])).to.equal(true);",
                  "expect(hasRequiredCardinality([])).to.equal(false);"
                );
              }
            }
            return {
              title: prefixCategoryTitle2("required", `${rule?.field || "field"} min ${min}`) || `required field rule ${index + 1}`,
              callType: "it",
              body: body.join("\n")
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
          ALL_CATEGORIES: ALL_CATEGORIES2,
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
          normalizeCategoryKey: normalizeCategoryKey2,
          normalizeCategories: normalizeCategories2,
          prefixCategoryTitle: prefixCategoryTitle2
        };
      });
    }
  });
  return require_test_generation_core();
})();
//# sourceMappingURL=test-generation-core.browser.js.map
