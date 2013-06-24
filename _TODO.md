_TODO:
======
[ ] turn into node module(s)
  [X] push to git
  [ ] test in sample proj as git dep

[ ] roundtrip js
  [ ] how are blocks defined?
  [ ] how to start with a block
  [X] decent js code editor
    [ ] workspaceUpdate -> js_string -> editor
  [ ] code generation
  [ ] AST -> blocks
  [ ] blocks for language features

[ ] sanity
  [ ] Proper build tools
    [ ] blockly source builder? / use uncompressed?
    [ ] template compiler
    [ ] browserify
  [ ] shed unnecesary deps
    [ ] soy
    [ ] code_app
    [ ] sound + cursor files
  [ ] make readme newbie proof
  [ ] explain origin, purpose, site deps license

Notes:
======
unofficial git branch
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
