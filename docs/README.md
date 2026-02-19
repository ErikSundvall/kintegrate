# Kintegrate
Prototype of integration builder tool for open-minded people with wide screens.

Demo found at https://eriksundvall.github.io/kintegrate/demo/index.html (published from  `docs/` on GitHub Pages via automated workflow.)

The user interface has three rezisable columns
* The left "input-container" column is for input of instance data and/or schema (or other structure defitnitions). It contains 
** a textarea/field for input by pasting or by selecting examples from the /example/instance folder on web server or
from user's local files (upload button)
** a treeviewer where nodes from instance examples or schema can be selected and used in the editor in the "conversion-container" 
* The middle "conversion-container" is where conversion scripts can be created by the user in a text editor, and for certain formalisms (such as Handlebars) the scripts can also be precopmiled for more efficient use at runtime in production environments.
* The rightmost "output-container" column shows results of running instance examples from input through the conversion script.

Technology stack: Vanilla JavaScript + HTML + CSS  
Licensed under Apache-2.0. See `LICENSE` file for details.

## Credits
* Icons: https://mui.com/material-ui/material-icons/
* Editor Widget: https://codemirror.net
* Tree widget: https://github.com/daweilv/treejs
* Initial coding, Erik Sundvall & AI helpers...

## Build commands
```bash
# Install dependencies (first time)
npm install

# Build docs for GitHub Pages
npm run build

# Build with vendor libraries included (for private deployments with proprietary renderer)
npm run build:full

# Serve docs locally
npm run serve

# Development server from src
npm run dev
```

## GitHub Pages Deployment

The project is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment is handled by a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`).

The workflow:
- Runs on every push to `main`
- Builds the project with `npm run build`
- Deploys the `docs/` folder to GitHub Pages
- Preserves existing `.md` files in the `docs/` directory

## Better Form Renderer - Offline Upload Feature

The Better Form Renderer is a proprietary library that is **not included in version control**. Users can upload the renderer library to their browser cache for offline use:

1. **Obtain** the Better Form Renderer files (requires license):
   - `form-renderer.js`
   - `styles.css`
   - `styles-theme.css`

2. **Upload** via the Form Viewer:
   - Open the Form Viewer in Kintegrate
   - Click "📚 Upload Renderer" button
   - Select all three files
   - Files are cached in browser's Cache API

3. **Offline Use**: Once uploaded, the renderer works completely offline via Service Worker

See [docs/OFFLINE-FORM-RENDERING.md](docs/OFFLINE-FORM-RENDERING.md) for technical details.

## Setting up the NPM_BETTER_AUTH environment variable (for developers)

The `.npmrc` file references `${NPM_BETTER_AUTH}` for authentication. To set this:

**Windows (PowerShell):**
```powershell
# Temporary (current session only)
$env:NPM_BETTER_AUTH = "your-base64-encoded-auth-token"

# Permanent (user level)
[System.Environment]::SetEnvironmentVariable("NPM_BETTER_AUTH", "your-base64-encoded-auth-token", "User")
```

**Windows (Command Prompt):**
```cmd
setx NPM_BETTER_AUTH "your-base64-encoded-auth-token"
```

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export NPM_BETTER_AUTH="your-base64-encoded-auth-token"
```

The auth token should be base64 encoded `username:password`. This keeps secrets out of version control.

# Roadmap

See [ROADMAP.md](../ROADMAP.md) for the full roadmap.

