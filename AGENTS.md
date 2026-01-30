# AI Agent Guidelines

This document contains information for AI agents working with this project.

## Better Form Renderer Documentation

**Primary reference:** `docs-cache/BETTER-FORM-RENDERER-REFERENCE.md` - Comprehensive API reference covering installation, configuration, events, ScriptApi, and form package structure.

**Additional cached docs** (not in Git):
- `docs-cache/form-renderer/` - Original HTML docs from Better Platform
- `docs-cache/tietoevry-cdr/` - TietoEvry Better JSON Schema specs

To refresh/download cached documentation, see `FETCHING-DOCS.md`.

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
