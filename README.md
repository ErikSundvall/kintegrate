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

## version 0.1.1
* Replaces the treeviewer with another one (https://github.com/daweilv/treejs) where multiple nodes can be selected
* Intelligent generation of conversion script structures based on selected nodes and their paths and hierarchical relationships.     

## version 0.2 website version
* make a build setup that can publish the html+css.js as a testable in /demo subdirectory of /docs and set up github pages to show it

## version 0.3 dynamic sources (local use)
* Add extra (optional) window running e.g. Better's form renderer (or Cambio's form runtime or a Medblocks form) that can populate the input window with instance data after press of a button, or possibly dynamically upon change.

## version 0.x
* investigate if it in addition to a web based tool can be built as a VS Code extension so that it is easy to work with: 
** the examples and transformation scripts as local files and 
** version control in e.g. Git using VS Code's integrated version control support
** VS Code's integrated AI-integrations

## Possible extras
* Investigate possible usage of https://github.com/josdejong/svelte-jsoneditor (if a separate transform code window could be added)