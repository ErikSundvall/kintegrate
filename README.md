# Kintegrate

Vanilla JavaScript + HTML project. Licensed under Apache-2.0.

See `docs/` for GitHub Pages documentation.

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

## version 0.1.1 - in progress
* Replace the treeviewer with another one (https://github.com/daweilv/treejs already imported in index.html via https://cdn.jsdelivr.net/npm/@widgetjs/tree/dist/tree.min.js) It allows multiple nodes can be selected and the selection is visible by checboxes in front of nodes.
* Intelligent generation of conversion script structures based on selected nodes and their paths and hierarchical relationships. Buttons that determine output to be pasted into last cursor position in conversion script from selected:
** Arrow pointing northwest: gernerate hierarchical nesting structrure between selected node closest to root no selected node furthest out on a branch (For Handlebars that would be nested {{#each ...}} clauses for things that can be repated and {{#with ...}} for non-repeating things.) 
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
** Arrow pointing west: just produce flat path from each selected subnode to the node closest to root (For Handlebars, if the source contains arrays, that would be a clauses like {{topmost_selected_node.subnode_with_array.0.anothersubnode.yet_another_subnode_with_array.0.['|subnode_with_in_handlebars_illegal_character'].lowest_seclected_node}})


## version 0.2 website version
* make a build setup that can publish the html+css.js as a testable in /demo subdirectory of /docs and set up github pages to show it

## version 0.3 dynamic sources (local use)
* Add extra (optional) window running e.g. Better's form renderer (or Cambio's form runtime or a Medblocks form) that can populate the input window with instance data after press of a button, or possibly dynamically upon change.

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
