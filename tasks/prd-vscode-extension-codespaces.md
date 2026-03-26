# PRD: Kintegrate As A VS Code Extension For Codespaces

## Purpose

Define a separate-project refactor where the current Kintegrate web application is reimagined as a VS Code extension intended to run primarily in GitHub Codespaces and other browser-hosted VS Code environments.

This PRD is for a new project that will reference the current Kintegrate repository for implementation details, UI behavior, parsing/generation logic, and form-renderer integration patterns.

Current reference repository:

- `https://github.com/ErikSundvall/kintegrate`

Target new-project repository:

- `https://github.com/regionstockholm/intehrgrator`

The new project will have a different name and repository identity from the current Kintegrate repo, even though it reuses ideas, behavior, and code structure from it.

## Problem

- The current Kintegrate architecture is a static web application with browser-only capabilities.
- Core Kintegrate workflows such as mappings, examples, and generated artifacts are more awkward than necessary in a browser-only storage model.
- Advanced testing workflows now depend on tools such as Cypress and GitHub integration, which need capabilities outside the browser sandbox.
- The main target users cannot install local desktop software freely.
- Some users can work in local VS Code, while others will only have remote/browser-hosted options such as GitHub Codespaces.
- The users are advanced enough to work in VS Code-based environments even if they are not yet full software developers.
- The Better renderer vendor files are proprietary and cannot be committed to a public starter repository.

## Product Decision

Build a new Kintegrate product as a VS Code extension, optimized for Codespaces-first usage.

This extension should replace the current static-web-app-first architecture as the main future direction.

## Goals

- Run the new product primarily inside VS Code, especially GitHub Codespaces, while still supporting some users working in local VS Code.
- Keep a browser-accessible user experience for advanced informaticians.
- Gain access to workspace files, terminals, tasks, GitHub workflows, and extension APIs.
- Simplify the main Kintegrate data model by making mappings, examples, generated tests, and related assets file-based and version controlled inside the workspace.
- Support test authoring, test generation, GitHub-backed storage, and remote execution workflows.
- Keep onboarding simple through a clonable Codespace setup.
- Keep proprietary Better files outside public version control while still supporting user-provided upload/setup.

## Non-Goals

- Do not preserve the static web app as the primary long-term architecture.
- Do not require hospital users to install local native applications.
- Do not include proprietary Better vendor files in the public template repository.
- Do not solve all enterprise deployment/security concerns in the first pass.

## Target Users

- Primary users: advanced informaticians who are comfortable using browser-hosted VS Code environments but are not yet software developers.
- Secondary users: developers and maintainers who extend the tool, maintain workflows, and debug integrations.

## Why VS Code Extension + Codespaces

- VS Code extensions can access the workspace, files, tasks, terminals, settings, and command palette.
- Codespaces provides a no-local-install environment with Node, Git, terminal access, browser-based VS Code UI, and GitHub integration.
- Local VS Code remains a valid option for users who are allowed to run it, so the new architecture should support both local and remote VS Code usage.
- This gives Kintegrate access to capabilities that a static web app cannot obtain, including:
  - storing mappings, examples, templates, and generated artifacts as normal workspace files
  - saving generated tests into the repo workspace
  - launching tasks and scripts
  - coordinating with GitHub workflows
  - presenting richer panels, editors, and webviews
- The Codespaces model matches the no-local-install constraint, while local VS Code support gives flexibility for users who are allowed to use it.

## Product Shape

The new project should be a VS Code extension with a small set of extension-native surfaces.

Recommended surfaces:

1. Webview-based main application UI
   - Replaces the current static app shell
   - Hosts the main Kintegrate experience inside VS Code

2. Commands
   - Open Kintegrate
   - Load form package
  - Open mapping/example file
   - Generate tests
   - Save tests to repo
   - Run tests
   - Trigger remote workflow

3. Explorer / custom views
  - Mappings and example assets
   - Saved test specs
   - Form metadata or discovered rules
   - Recent runs / artifacts

4. Task integration
   - run local scripts when allowed in Codespaces
   - launch Cypress or other automation in the Codespace environment

## Scope Of Migration

### In Scope

- Move the core Kintegrate experience into a VS Code extension architecture.
- Reuse and migrate major functional areas from this repo:
  - main app concepts from `src/index.html`
  - form viewer concepts from `src/form-viewer.html`
  - Cypress form tester concepts from `src/cypress-form-tester.html`
  - test generation logic from `src/test-generation-core.js`
  - Cypress command patterns from `cypress/support/commands.js`
- Refactor the main Kintegrate storage model so mappings, examples, generated assets, and related project data become normal file-based workspace content instead of primarily browser-held state.
- Provide a Codespaces-first onboarding flow.
- Support both browser-hosted VS Code environments and local VS Code usage.
- Provide a documented proprietary vendor upload/setup flow for Better renderer files.

### Out Of Scope

- Perfect 1:1 UI parity with the current static app in the first pass.
- Full migration of every historical/legacy HTML page before the core workflows work.
- Bundling or publishing Better proprietary assets in the public starter repo.

## Architecture

### 1. Extension Host Responsibilities

The extension host should own:

- workspace file read/write
- file-oriented project operations for mappings, examples, generated tests, and configuration assets
- commands and menus
- task/terminal launches
- GitHub workflow triggering where appropriate
- secure storage of tokens/settings where appropriate
- orchestration between webviews and workspace/runtime tools

### 2. Webview Responsibilities

The webview UI should own:

- user-facing interaction flows
- visual test generation and editing flows
- form/test summaries
- preview-oriented interfaces

The webview should not be treated as an isolated static app. It should call extension commands for privileged operations.

### 3. Shared Logic

Reusable logic from this repo should be extracted or ported into shared modules where possible, especially:

- mapping/transformation logic and related project-model behavior from the current main app
- form parsing and test generation logic from `src/test-generation-core.js`
- normalized test/spec generation models
- reusable helper semantics for test generation

### 4. File-Based Project Model Strategy

The new project should simplify the main Kintegrate workflows by embracing normal workspace files as the primary storage model.

This should apply not only to tests, but also to the main app concepts from `src/index.html`, including:

- mappings / transformation definitions
- example inputs and outputs
- generated artifacts
- saved project state that currently fits awkwardly into browser-only flows

Expected benefits:

- simpler storage and retrieval
- natural version control through Git
- easier sharing and review
- less browser-specific persistence complexity
- better alignment with both Codespaces and local VS Code usage

### 5. Form Viewer Strategy

The current `src/form-viewer.html` behavior should be rethought as an extension-owned viewer surface.

Possible forms:

1. webview-based form viewer
2. local preview server opened inside VS Code simple browser/webview
3. extension-managed test target page

The exact rendering surface can be decided later, but it must support test mode, form loading, and ScriptApi-backed automation.

## Codespaces Onboarding Model

The new project should be designed to be easily clonable into a Codespace.

Target flow:

1. User opens the project in GitHub Codespaces.
2. Codespace starts with documented prerequisites already prepared.
3. User installs or enables the extension in the Codespace.
4. User uploads or configures proprietary Better renderer files manually.
5. User can load forms, generate tests, save tests to GitHub, and run workflows.

The public starter must work without proprietary files, while clearly explaining how to enable the full Better integration after manual upload.

The same project should also support local VS Code usage for users who are allowed to run VS Code locally. Codespaces is the primary onboarding path, not the only supported path.

## Proprietary Vendor File Strategy

The Better vendor files must remain outside public version control.

Required approach:

- public repository contains no proprietary Better assets
- onboarding docs explain manual upload/setup
- uploaded vendor files can live in workspace-local ignored paths, extension storage, or another non-committed location
- the extension must detect missing vendor files and present a clear setup path instead of failing silently

Recommended first-pass behavior:

- extension shows a setup state when Better assets are missing
- user selects the required files manually
- extension stores them in a non-committed location available in the Codespace/session
- docs explain that these files will not be pushed to GitHub

## Testing Strategy

This new product should embrace GitHub-backed and Codespaces-compatible workflows.

Recommended model:

- author tests in the extension
- store tests in GitHub-backed workspace files
- run tests either:
  - in the Codespace environment
  - through GitHub Actions
- show results back in the extension UI

This avoids relying on a browser-only executor.

## Functional Requirements

1. The extension must provide a main Kintegrate UI inside VS Code.
2. The extension must load Better form packages and/or extracted JSON definitions.
3. The extension must support the current major Kintegrate workflows:
   - transformation/integration work
   - form viewing
   - test generation
   - test editing
4. The extension must treat mappings, examples, generated tests, and related assets as normal workspace files where possible.
5. The extension must save generated tests into the workspace/repository.
6. The extension must support GitHub-backed workflows for storing and sharing tests.
7. The extension must support browser-based usage in Codespaces without requiring local app installation.
8. The extension must also support local VS Code usage where available.
9. The extension must provide a documented proprietary vendor setup path.
10. The extension must support running tests from the Codespace and/or triggering remote GitHub workflows.

## Acceptance Criteria

1. A new user can open the new project in Codespaces and reach a working Kintegrate UI without installing local apps.
2. The extension can open a main webview and perform core Kintegrate workflows.
3. Main Kintegrate workflows for mappings/examples become simpler through normal file-based workspace storage and retrieval.
4. Test generation logic from this repo is reused or ported, not rewritten from scratch without reason.
5. Generated tests can be stored in the workspace/repository.
6. Proprietary Better files are not present in public version control, but the user can enable them through a documented manual setup path.
7. The new architecture clearly removes the static-web-app limitation for workspace/task/GitHub operations.

## Migration Guidance From This Repo

Use this repository as the behavioral and technical reference for the new project.

Repository mapping:

- Current reference repo: `https://github.com/ErikSundvall/kintegrate`
- New target repo: `https://github.com/regionstockholm/intehrgrator`

High-value references:

- `src/index.html`
  - current main app interaction model, including mappings/examples flows that should become file-based
- `src/form-viewer.html`
  - form viewing, test mode, vendor upload, Better renderer integration
- `src/cypress-form-tester.html`
  - generation UI, grouped test editing, GitHub-target ideas, run/report UX
- `src/test-generation-core.js`
  - shared parsing/generation logic
- `cypress/support/commands.js`
  - current Cypress command surface
- `scripts/build.js`
  - current build assumptions and public/private artifact separation
- `README.md`
  - current setup commands and user-facing explanation
- `AGENTS.md`
  - repo-specific implementation constraints and vendor handling notes

## Recommended First Milestones

1. Create the new VS Code extension project scaffold.
2. Define the file-based project model for mappings, examples, generated assets, and tests.
3. Port the shared generation/core logic.
4. Stand up a main Kintegrate webview.
5. Add workspace save/load flows.
6. Add Better vendor setup flow.
7. Add test generation and GitHub-backed save flow.
8. Add Codespaces-first documentation and devcontainer setup.

## Risks

- VS Code extension migration is a major product and architecture shift.
- Webview migration may require rethinking large HTML files instead of copying them unchanged.
- Better renderer integration inside Codespaces/webviews may have CSP, loading, and storage constraints that need careful handling.
- User onboarding must be extremely clear or the Codespaces-first model will still feel too technical.

## Verification

1. Create the new project and open it in Codespaces.
2. Confirm the extension also works in local VS Code for users who have that option.
3. Confirm the extension loads and opens the main Kintegrate UI.
4. Confirm mappings/examples and related main-app assets work as normal file-based workspace content.
5. Confirm a user can complete vendor setup without adding proprietary files to git.
6. Confirm test generation can reuse logic from this repo.
7. Confirm the new project can save tests to the repository and support a remote-run workflow.