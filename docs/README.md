# Kintegrate

Vanilla JavaScript + HTML project. Licensed under Apache-2.0.

See `docs/` for GitHub Pages documentation.

# Roadmap

## version 0.1 test setup - done!
* user interface with three rezisable columns
* The left "input-container" column is for input of instance data and/or schema (or other structure defitnitions). It contains the following:
** a textarea for stored instance examples as input from either
*** /example/instance folder on web server or
*** user's local files (upload button) or
*** what the user pastes into the textarea.
** a treeviewer where nodes from instance examples or schema can be selected and used in the editor in the "conversion-container" 
* The middle "conversion-container" is where conversion scripts can be created by the user in a text editor, and for certain formalisms (such as Handlebars) the scripts can also be precopmiled for more efficient use at runtime in production environments.
* The rightmost "output-container" column shows results of running instance examples from input through the conversion script.

## version 0.2 - done!
* Replace the treeviewer with https://github.com/daweilv/treejs (It allows multiple nodes can be selected and the selection is visible by checboxes in front of nodes.)
* Intelligent generation of conversion script structures based on selected nodes and their paths and hierarchical relationships. Buttons that determine output to be pasted into last cursor position in conversion script from selected:
** The ⤡ arrow: generate hierarchical nesting structrure between selected node closest to root to selected node furthest out on a branch (For Handlebars that would be nested {{#each ...}} clauses for things that can be repated and {{#with ...}} for non-repeating things.) 
*** Example: creating a tree-traversing structure corresponding to the flat path output... `{{granskning.context.0.vårdenhet.0.namn.0.[|value]}}` should instead output: 
```
{{#with granskning}}
 {{#each context}}
  {{#each vårdenhet}}
   {{#each namn}}
    {{[|value]}}
   {{/each}} 
  {{/each}} 
 {{/each}} 
{{/with}}
```
** The ↔ arrow: produce flat path from each selected subnode to the node closest to root (For Handlebars, if the source contains arrays, that would be a clauses like {{topmost_selected_node.subnode_with_array.0.anothersubnode.yet_another_subnode_with_array.0.['|subnode_with_in_handlebars_illegal_character'].lowest_seclected_node}})

## version 0.2.1 website version - starting soon...
* make a build step that can publish the html+css+js as a testable in /demo subdirectory of /docs and set up github pages with a short index page describing the project and a link to /demo where the app can be run

### version 0.2.1 — demo build and docs

Added a small build helper to prepare `docs/demo/` for GitHub Pages hosting. The helper copies the `src/` directory into `docs/demo/`, preserving relative paths so the single-page app can be served directly from the `docs/` folder.

- **Script:** `scripts/build_docs.ps1` (PowerShell) — run from the repository root on Windows.
- **Usage:**
    If using windows, open PowerShell in the project root and run:
    ```powershell
    .\scripts\build_docs.ps1
    ```

- The script will create `docs/demo/` and copy the `src/` contents there. It will also copy `LICENSE` and `README.md` into `docs/` so the site root has basic metadata.

- After building, publish the `docs/` folder via GitHub Pages (set Pages source to the `docs/` folder on the `main` branch, or deploy `docs/` to a `gh-pages` branch if you prefer).

## version 0.3 contexts and inserts directy from tree
* Add right-click context menu that allows both the ⤡ and ↔ functions directly from any node. Try to keep the cursor blinking/visible or insertation point somehow visible in script editor also when using node tree.
* Hide the selected paths list by default.
* Add popup menu choice (prefixed by the symbol combination √⬚) to set a "context boundary" in tree widget that allows setting what is considered the root level when producing ↔ flat paths and ⤡ hierarchies. Mark the selected node in the tree with a dotted line. ALso remember the node and use that as a stop (top level) when climbing path hierarchies in all path generation code.

## version 0.3.1 UI tweaks
* change click behaviour: only "normal" left clicking of the checkbox should select the node. Left-clicking the node label should now have the same effect as when curently right-clicking the node 

## version 0.4 dynamic sources (local use)
* Add extra (optional) window running e.g. Better's form renderer (or Cambio's form runtime or a Medblocks form or something else) that can populate the input window with instance data after press of a button, or possibly dynamically upon change of form contents.
* Get syntax highlihting working for Handlebars? Bug? (Works for JSON) and remove unnecesary highlighters.

## version 0.5
* add support for schema/structure defintition-format plugins that can feed the tree view instead of just instances
** refactor json instance to be such a plugin
** create a plugin for openEHR web template defintions (see documentation at ...TODO...)
** Stretch: add plugin for Sectra forms defintions

## Version 0.6
* Add support for plugins for other scripting formalisms than Handlebars. Keep supporting flat and hierarchical forms if scripting language allows it.
** refactor Handlebars support to be a plugin
** add support for https://github.com/WorkMaze/JUST.net sriptinh (used by Sectra)

## version 0.7 
* investigate if (another) tree view can be useful to produce TARGET structures (e.g. in conversion script editor) from schema etc, especially openEHR web templates
* Investigate support for FlatEHR

## version 0.x
* investigate if it in addition to a web based tool can be built as a VS Code extension so that it is easy to work with: 
** the examples and transformation scripts as local files and 
** version control in e.g. Git using VS Code's integrated version control support
** VS Code's integrated AI-integrations

## Possible extras later
* Investigate possible usage of https://github.com/josdejong/svelte-jsoneditor (if a separate transform code window could be added)
* user interface with three rezisable columns
* The left "input-container" column is for input of instance data and/or schema (or other structure defitnitions). It contains the following:
** a textarea for stored instance examples as input from either
*** /example/instance folder on web server or
*** user's local files (upload button) or
*** what the user pastes into the textarea.
** a treeviewer where nodes from instance examples or schema can be selected and used in the editor in the "conversion-container" 
* The middle "conversion-container" is where conversion scripts can be created by the user in a text editor, and for certain formalisms (such as Handlebars) the scripts can also be precopmiled for more efficient use at runtime in production environments.
* The rightmost "output-container" column shows results of running instance examples from input through the conversion script.
