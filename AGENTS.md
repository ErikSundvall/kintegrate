# AI Agent Guidelines

This document contains information for AI agents working with this project.

## Better Form Renderer Documentation

**Version-controlled docs** (in Git):
- `docs/FORM-RENDERER-REFERENCE.md` - Quick API reference for Kintegrate integration
- `docs/OFFLINE-FORM-RENDERING.md` - Working solution for offline form loading via Service Worker

**Official online documentation:**
- **Form Renderer:** https://docs.better.care/studio/form-renderer/
- **openEHR Web Template:** https://specifications.openehr.org/releases/ITS-REST/development/simplified_formats.html

**Cached docs** (not in Git, for offline reference):
- `docs-cache/form-renderer/` - Original HTML docs from Better Platform
- `docs-cache/tietoevry-cdr/` - TietoEvry Better JSON Schema specs

To download cached documentation, see `FETCHING-DOCS.md`.

## Form Renderer Integration

The project uses Better Platform's proprietary `@better/form-renderer` package. Key points:

- **Package:** `@better/form-renderer` (installed from Better's NPM registry)
- **Authentication:** Requires `NPM_BETTER_AUTH` environment variable (see README)
- **Local files:** Stored in `src/vendor/` (excluded from Git)
- **Setup:** Run `npm run setup:vendor` after installing the package

## Build System

The project uses Node.js for building:

- **Development:** `npm run dev` - Serves from `src/` with vendor files
- **Build:** `npm run build` - Excludes vendor folder (for public GitHub Pages)
- **Full build:** `npm run build:full` - Includes vendor folder (for private deployments)

## Project Structure

- `/src/` - Source files for the application
- `/docs/demo/` - Built files for GitHub Pages
- `/docs-cache/` - Cached documentation (not in Git)
- `/src/vendor/` - Proprietary libraries (not in Git)
- `/scripts/` - Build and utility scripts

## openEHR Web Template Format

The Better Form Renderer's `webTemplate` property expects the **openEHR Web Template format**, not the Better Studio form-description. Key resources:

- **Specification:** https://specifications.openehr.org/releases/ITS-REST/development/simplified_formats.html#_web_template_metadata
- **Better Web Template Library:** https://github.com/better-care/web-template/tree/4.0
- **Documentation & MCP:** https://deepwiki.com/better-care/web-template

### Form Package Structure (Better Studio .zip)

Better Studio form packages contain:
- **Outer ZIP:** `package-manifest.json`, inner form ZIP, `.opt` file (openEHR Operational Template)
- **Inner ZIP:** `manifest.json`, `form-description`, `form-environment`, `form-layout`, etc.

The `.opt` file is an openEHR Operational Template. Web template format can be **generated from OPT** using the Better web-template library. The form-description is Better Studio's proprietary UI definition format.

## Useful Resources

When working with this project:

1. **Handlebars Documentation:** https://handlebarsjs.com/
2. **CodeMirror 5:** https://codemirror.net/5/
3. **Tree.js:** https://github.com/daweilv/treejs

## Contributing

When making changes:
1. Test locally with `npm run dev`
2. Build with `npm run build` to verify GitHub Pages deployment
3. Ensure proprietary files stay out of Git (vendor/, docs-cache/)
4. Update documentation in README.md for user-facing changes
5. Update this AGENTS.md for AI-agent-relevant changes
