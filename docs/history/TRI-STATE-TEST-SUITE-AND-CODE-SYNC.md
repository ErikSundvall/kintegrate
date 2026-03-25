# Tri-State Test Suite Behavior And Code Sync

## Purpose

This note documents the committed tri-state test execution model that existed in the Cypress form tester UI, and how that model synchronized with the generated Cypress code.

The restored implementation snapshot is available in:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html)

That file was restored from committed revision `d3c70cd`.

## Provenance

### Exact committed version

The tri-state implementation is present in the historical version of the tester at commit `d3c70cd`.

Key markers in that snapshot:

- grouped rule table with `rule-group-mode`
- `Run active tests` button label
- execution-state field on suite and test rows
- `skip / run / only` segmented buttons in the Tabulator table
- parser and serializer support for `it.only`, `it.skip`, `describe.only`, and `describe.skip`

### Restored file

To make the implementation directly inspectable without overwriting the current tester, the historical snapshot was restored as:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html)

## Overview

The tri-state behavior replaced the simpler checkbox-based row selection model with an explicit execution-state model.

Instead of a boolean `selected` flag per test row, each row had one of three states:

1. `skip`
2. `run`
3. `only`

This applied to both:

- individual test rows
- describe-group rows

That allowed the table to behave like a structured Cypress suite editor rather than only a list of selected tests.

## State Model

### Canonical states

The implementation normalized execution state through two helper functions:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L757)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L765)

Behavior:

- `it.skip` maps to `skip`
- `it.only` maps to `only`
- plain `it` maps to `run`
- `describe.skip` maps to `skip`
- `describe.only` maps to `only`
- plain `describe` maps to `run`

This made `executionState` the UI-facing state and `callType` the code-facing representation.

### Mapping rules

`callTypeToExecutionState(callType)`:

- `it.skip` -> `skip`
- `it.only` -> `only`
- `describe.skip` -> `skip`
- `describe.only` -> `only`
- default -> `run`

`executionStateToCallType(state, baseType)`:

- `skip` -> `${baseType}.skip`
- `only` -> `${baseType}.only`
- `run` -> `${baseType}`

The important design choice is that the state machine was not stored independently from the Cypress syntax. The UI and code stayed aligned by converting back and forth between the two.

## UI Representation

### Table control

The tri-state UI appeared as a three-segment control inside the `State` column of the test suite table:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1421)

Rendered buttons:

- `skip`
- `run`
- `only`

Visual emphasis:

- `skip` used a neutral gray treatment
- `run` used a green treatment
- `only` used an amber treatment

Relevant styles:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L91)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L94)

### Interaction

When the user clicked one of the three state buttons:

1. the row's `executionState` was updated
2. the row's `callType` was recalculated from that state
3. the row in Tabulator was updated in place
4. the code editor was regenerated from table state

Implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1437)

This meant the table was not merely decorative. It was an editor for the Cypress source model.

## Persistence In Parsed Table Rows

When Cypress code was parsed back into the table model, each group and test row carried an `executionState` derived from the parsed `callType`.

Group row state initialization:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L987)

Test row state initialization:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1007)

This preserved user intent across re-parses of the editor contents.

## Code Parsing Semantics

### Test parsing

The tri-state version extended the parser so it accepted:

- `it(...)`
- `it.skip(...)`
- `it.only(...)`

Implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L850)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L861)

### Group parsing

The same pattern was added for describe blocks:

- `describe(...)`
- `describe.skip(...)`
- `describe.only(...)`

Implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L919)

### Why this matters

Without this parser change, the UI could not round-trip Cypress code containing `.only` or `.skip`.

The tri-state implementation was therefore not just a visual enhancement. It required expanding the grammar that the tester accepted from its own editor.

## Code Serialization Semantics

When table rows were converted back into a suite model, the selected execution state was converted back into Cypress call syntax.

Group serialization:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1567)

Test serialization:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1587)

This produced output such as:

```js
it.skip('...', () => {
});

it('...', () => {
});

it.only('...', () => {
});
```

and similarly for `describe` groups.

## Runnable Test Resolution

### Core rule

The `Run active tests` button did not simply run all rows in state `run`.

Instead it applied Cypress-like precedence rules over both group and test state.

Implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1025)

### Resolution algorithm

For each test row:

1. inherit the current group's execution state
2. if either group or test is `skip`, exclude the test
3. otherwise include the test in the runnable set
4. if either group or test is `only`, also add it to the `only` set
5. after scanning all rows:
   - if any `only` tests exist, return only those
   - otherwise return all runnable tests

This gave the UI the same focusing behavior developers expect from Cypress itself.

### Effective precedence

The precedence was:

1. `skip` excludes a test immediately
2. `only` narrows the runnable set if at least one `only` test or group exists
3. `run` is the default included state

### Group-level impact

A group marked `skip` disabled all contained tests.

A group marked `only` caused all contained non-skipped tests to become exclusive runnable candidates.

A test inside a `run` group could still become exclusive by setting that specific row to `only`.

## Editor And Table Sync Model

### Direction 1: editor -> table

The editor contents were parsed into a suite model, then flattened into table rows.

Key path:

1. `parseSuiteModelFromCode(code)`
2. `buildTableRowsFromSuiteModel(model, previousRows)`
3. `renderTestSuiteTable(rows)`

Relevant implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L893)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L977)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1499)

The previous row map was used to preserve UI metadata where possible, including:

- `executionState`
- `modified`
- `result`

### Direction 2: table -> editor

The table was converted back into a grouped suite model, then serialized into Cypress source.

Key path:

1. `buildSuiteModelFromTable()`
2. `serializeSuiteModel(model)`
3. `setEditorContent(code, reason)`

Relevant implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1558)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L832)

### Sync loop guard

`setEditorContent()` temporarily enabled `suppressEditorSync` before writing to the CodeMirror instance, then turned it off and re-synced the table.

This guarded against a simple feedback loop while still ensuring the rendered table matched the final serialized editor contents.

Implementation:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L1595)

## Why The Tri-State Model Was Better Than Checkbox Selection

Compared with a checkbox-based `selected` model, tri-state execution control provided:

1. direct correspondence with Cypress syntax
2. group-level execution control
3. exclusive focus mode through `only`
4. reliable round-tripping between UI and code editor
5. clearer semantics than transient row selection

A checkbox can only answer "selected or not selected". It cannot encode:

- disabled in source output
- normal included state
- exclusive focused state

The tri-state model encoded all three.

## Relationship To Rule Discovery Changes

The same restored snapshot also includes the improved discovered-rules table and grouping mode control:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L169)
- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html#L381)

That matters because the tri-state work was part of a broader move from simple list controls toward table-backed, stateful editing surfaces.

## Recommended Restoration Strategy

If this behavior should be brought back into the main tester, the safest path is:

1. diff the restored snapshot against the current [src/cypress-form-tester.html](src/cypress-form-tester.html)
2. reintroduce the execution-state model in the test suite table first
3. restore parser support for `it.only` and `describe.only`
4. restore code serialization from execution state rather than boolean row selection
5. restore runnable-test resolution using `skip/run/only` precedence

Do not restore by copying only the button UI. The behavior depends on coordinated changes in:

- parsing
- table row model
- serialization
- run filtering

## Short Conclusion

The committed tri-state implementation was a real state machine, not just a UI embellishment.

It introduced:

- an `executionState` domain model
- Cypress-syntax round-tripping
- group-aware runnable filtering
- `only` precedence semantics
- synchronized editing between Tabulator rows and the code editor

That full implementation is now preserved in:

- [src/cypress-form-tester-tristate.html](src/cypress-form-tester-tristate.html)
