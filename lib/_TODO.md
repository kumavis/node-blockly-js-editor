_TODO:
======
[ ] turn into node module(s)
  [ ] push to git
  [ ] require in sample proj as git

[ ] Proper build tools
  [ ] template compiler

[ ] roundtrip js
  [ ] code generation
  [ ] AST -> blocks

Notes:
======
craftingTable within iframe:
<iframe id=​"content_blocks" src=​"frame.html?en_compressed.js" style=​"display:​ block;​">​


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
