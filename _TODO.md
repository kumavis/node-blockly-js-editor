_TODO:
======
[ ] turn into node module(s)
  [✓] push to git
  [ ] split javascript editor and blockly core?
    [ ] core is a wrapper of the original repo + package.json + grunt build wrapper
      [ ] dep original repo
      [ ] make a grunt build system that sits on their build system, modifying source into modules as necesary
    [ ] editor
      [✓] mbalho js editor
      [✓] blockly editor
      [ ] widget injection
        [ ] css
        [ ] img assets
      [✓] master controller (exposes .getCode, .setCode, etc)
    [ ] demo app
      [ ] simple implementation, with get + set

[ ] roundtrip js
  [ ] how are blocks defined?
  [ ] how to start with a block in the field
  [✓] decent js code editor
    [✓] workspaceUpdate -> js_string -> editor
  [ ] AST -> blocks
  [ ] blocks for language features

[ ] sanity
  [ ] make readme newbie proof
  [ ] explain origin, purpose, deps, license

[ ] write feelings about node + ui widgets + browserify
  [ ] style injection
  [ ] img assets???

 - - - - - - - - - - - - - - - - - -

Notes:
======
unofficial git clone of blockly
https://github.com/tjpalmer/blockly

header script tags:
=================
storage
_soy/soyutils
template

body script tags:
================
[messages]
code

iframe script tags:
===================
blocky_compressed
javascript_compressed
python_compressed
en_compressed
[language loader]


Code.js
=======
write template to page
eval blocks
inf loop protection
add reserved words 
view stuff
clean workspace
switch tabs

Code Generation:
================
`Blockly.Generator.workspaceToCode('JavaScript')`

Xml Generation:
===============
var xmlDom = Blockly.Xml.workspaceToDom(Blockly.mainWorkspace);
var xmlText = Blockly.Xml.domToPrettyText(xmlDom);

Workspace Generation:
==========
try-catch:
xmlDom = Blockly.Xml.textToDom(xmlText);
Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, xmlDom);
