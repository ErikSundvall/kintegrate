# Fetching Documentation & recreating summary

Instructions for downloading/refreshing the cached documentation in `docs-cache/`.

## Better Platform Form Renderer

Download automatically via script:

```bash
npm run download:docs
```

This downloads from `https://docs.better.care/studio/form-renderer/` and stores HTML files in:
- **Location:** `docs-cache/form-renderer/`

## TietoEvry Care Desktop Developer Guide

**Manual Download Required** (JavaScript-based site cannot be scripted):

1. Visit: https://docs.open-platform.service.tietoevry.com/docs/default/component/care-desktop-developer-guide/operational_guide/CDR_Guide/openehr_export_import_artifacts/better_json_schema/
2. Use browser's "Save Page As" (Ctrl+S / Cmd+S) to save the complete page
3. Save as: `docs-cache/tietoevry-cdr/Developer guide _ Lifecare Open Platform.html`

**Location:** `docs-cache/tietoevry-cdr/`

## Notes

- These directories are excluded from Git (`.gitignore`)
- Refreshing requires internet connection
- Script download takes a few minutes to complete

## Possibly recreating the expected docs-cache/BETTER-FORM-RENDERER-REFERENCE.md 
That file was created by the following prompt sent to Claude Opus 4.5:
Make a comprehensive but effeiciently/compactly worded markdown file in docs-cache for use/reading by AI agents intended for understanding Better's form format and form-renderer usage. Base it on the documents cached in docs-cache and its subdirectories. Include references to original cached files so that the AI agent can look up further details if needed (but as said above try to make the markdown file fairly comprehensive).