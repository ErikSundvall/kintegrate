# Test Generation Algorithm

## Purpose

This note documents the current automated test generation flow for Better forms and outlines refinements for scope levels before changing the generator semantics further.

## Current Inputs

- Better Studio form package as `.zip` or unpacked JSON.
- `form-description` from the Better package.
- Optional `webTemplate` JSON when the source is template-oriented rather than form-definition-oriented.

## Current Code Paths

### Browser tester

- [src/cypress-form-tester.html](src/cypress-form-tester.html)
- Loads JSON or Better ZIP in the browser with `fflate`.
- Parses discovered rules in browser-local code.
- Generates Cypress code in the editor.
- Can open from [src/form-viewer.html](src/form-viewer.html) and receive loaded form data via `postMessage`.

### CLI generator

- [test-generator/generate-cli.js](test-generator/generate-cli.js)
- Uses [test-generator/parser.js](test-generator/parser.js) and [test-generator/generator.js](test-generator/generator.js).
- Loads ZIP or JSON from disk.
- Writes generated Cypress specs into `cypress/e2e/generated` by default.

## Important Separation

- The form viewer runtime does not import [test-generator/parser.js](test-generator/parser.js).
- The browser tester has duplicated parsing logic inside [src/cypress-form-tester.html](src/cypress-form-tester.html).
- Parser changes in `test-generator/` affect the CLI and unit tests, not the form-viewer runtime directly.
- The real maintenance risk is drift between the CLI parser and the browser tester parser.

## Current Discovery Algorithm

### Input unpacking

1. If the source is a Better ZIP, unpack the outer ZIP.
2. If an inner ZIP exists, unpack that as well.
3. Read `form-description`.
4. Parse JSON.

### Rule categories discovered today

1. Logic rules
2. Calculation metadata
3. Validation ranges
4. Value-range metadata
5. Required field/cardinality rules

### Logic rule extraction

- Reads `viewConfig.annotations.conditions`.
- Parses `conditions.expressions`.
- Uses the first statement and first action from each expression in the browser implementation.
- Extracts:
	- triggering field id
	- target field id
	- condition value
	- simple description text

### Validation and range extraction

- Reads `node.validation.range`.
- Reads `node.inputs[].validation.range`.
- Creates min/max-based validation and value-range rules.
- DV_QUANTITY is handled specially in the CLI parser by splitting unit-specific ranges.

### Calculation extraction

- Scans object keys matching `calculation|formula|derived`.
- Keeps field identifier and expression text.

### Required rule extraction

- Uses `node.min > 0`.
- Stores the field and its minimum cardinality.

### Deduplication

- CLI parser deduplicates by signatures per rule type.
- Browser tester currently keeps a simpler direct list.

## Current Generation Algorithm

### Category selection

- UI scope levels exist for `logic`, `calc`, `validation`, `ranges`, and `required`.
- Today those levels behave as category toggles, not true level semantics.
- `0` means off.
- `1`, `2`, and `3` currently all mean the same thing: include that category.

### Test emission

- Logic: generate toggle tests using `cy.fillField`, `cy.expectHidden`, `cy.expectVisible`.
- Calculations: generate metadata existence checks.
- Validation: generate range-sample assertions with valid and invalid samples.
- Ranges: generate metadata-oriented range assertions.
- Required: generate cardinality helper assertions.

### Browser output structure

- Produces grouped `describe()` sections named by category.
- Preserves non-generated custom groups already present in the editor.
- Appends custom-step comments after generated sections.

## Current Limitations

1. Scope levels are not real levels yet.
2. The browser logic parser only uses the first statement/action pair from a condition expression.
3. Default visibility state is not modeled explicitly.
4. Logic generation tends to assume a hide-then-show flow.
5. This produces too many obvious tests when a field is already visible by default.
6. Calculation tests are shallow metadata checks rather than behavioral verification.
7. CLI parser and browser parser are similar but separate.

## Why Level 1 Needs To Change

Level 1 should represent sensible coverage, not maximal coverage.

That means:

- Do not generate tests that only prove the obvious default rendering of already-visible content.
- Prefer tests that exercise meaningful logic transitions, constraints, or derived behavior.
- Keep generated tests readable enough for informaticians to review.

Example:

- If a field is visible by default and no realistic level-1 scenario should make it invisible, do not generate a level-1 test that first forces it hidden just to prove it can become visible again.

## Proposed Scope Semantics

### Level 0

- Do not generate that category.

### Level 1

- Generate non-obvious, review-friendly baseline tests.
- Favor clinically or behaviorally meaningful transitions.
- Avoid synthetic reversals that only test UI defaults.

Suggested per category:

- Logic:
	- Include rules where a trigger causes a meaningful visibility change.
	- Prefer cases where the target is conditionally revealed or suppressed in normal use.
	- Exclude trivial “already visible by default” proofs unless the form definition indicates real conditional visibility.
- Validation:
	- Include one representative valid case and one representative invalid case per meaningful constraint.
	- Avoid exhaustive boundary permutations.
- Ranges:
	- Include one concise metadata/range check when it adds value.
	- Avoid duplicating validation coverage if the validation test already proves the rule well enough (and validation test generation level is not set to 0).
- Required:
	- Include only truly required inputs with clear user-facing importance.
	- Skip weak or purely structural requirements that are not useful to review at baseline.
- Calculations:
	- Prefer smoke-level checks for important derived fields.
	- Avoid generating large numbers of metadata-only checks for minor derived expressions.

### Level 2

- Generate broader behavioral coverage.
- Add more boundary and transition cases.

Suggested per category:

- Logic:
	- Include both enabling and disabling transitions when both are meaningful.
	- Add checks for state restoration or dependent section combinations where useful.
- Validation:
	- Add lower and upper boundary cases.
	- Include exclusive vs inclusive boundary distinctions where known.
- Ranges:
	- Include unit-specific cases for DV_QUANTITY when present.
- Required:
	- Add collection/string cardinality distinctions.
- Calculations:
	- Add a few behavioral input/output examples for high-value formulas.

### Level 3

- Generate exhaustive or edge-oriented coverage.
- Accept more synthetic cases and broader combinatorics.

Suggested per category:

- Logic:
	- Include more permutations across multiple dependencies.
	- Include explicit reverse transitions and reset scenarios.
- Validation:
	- Include dense boundary and edge-case sampling.
	- Include malformed input classes where supported.
- Ranges:
	- Include exhaustive unit/range combinations.
- Required:
	- Include more edge representations of missing/partial values.
- Calculations:
	- Include edge-case arithmetic, null propagation, and dependent recalculation sequences.

## Suggested Near-Term Algorithm Refinements

1. Keep the discovered-rules table as the review surface.
2. Use row-level enable/disable to suppress unhelpful generated tests before export.
3. Introduce explicit per-rule metadata for:
	 - rule kind
	 - field/trigger/target identifiers
	 - form/template path
	 - default inclusion recommendation per scope level
4. Add a future pass that estimates whether a logic rule is meaningful at level 1 by considering default visibility and realistic transitions.
5. Align the browser and CLI parser outputs around a shared normalized rule shape even if implementation remains in two code paths.

## In Scope For The Current Refactor

- Make discovered rules easier to sort and group.
- Add row-level enable/disable.
- Clarify the intended meaning of scope levels.

## Out Of Scope For This Pass

- Full rewrite of the generator semantics.
- Cross-form or cross-template reasoning.
- Deep behavioral calculation verification.
- Full elimination of browser/CLI parser duplication.
