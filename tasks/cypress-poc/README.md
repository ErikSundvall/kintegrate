# Cypress PoC: Form Viewer Logic Tests

This PoC exercises the Better Form Renderer via the Kintegrate form viewer popup in **Test Mode**.

## What it proves
- Cypress can drive the form renderer through `window.formTestApi` (ScriptApi wrapper)
- Field identifiers can be passed as `tagOrPath` (prefer `aqlPath`)
- Tests can run against the form viewer in local offline mode

## Prerequisites
- Run the Kintegrate dev server (`npm run dev` from repo root). This serves `/form-viewer.html` on port 3000.
- Load a form in the viewer at least once (ZIP or server mode) so the form renderer can render fields.

## Run
```bash
npm install
npm run cypress:open
```

## URL Query Parameters
The `form-viewer.html` supports the following query parameters (can be passed via `?` or `#` hash):

| Parameter | Value | Description |
|-----------|-------|-------------|
| `testMode` | `1` | Enables **Test Mode**. Overlays a "TEST MODE" badge and installs `window.formTestApi` for Cypress automation. |
| `autoLoad` | `0` | Disables the automatic loading of example forms on startup when in `testMode`. Useful if the test wants to handle the loading process itself. |

## Notes
- The PoC assumes the form is already rendered before the test asserts on fields.
- Use `testMode=1` in the URL to enable `window.formTestApi`.
