// Create module root object
var Blockly = module.exports = {}

// Modules Deps
var createEditor = require('javascript-editor')
var path = require('path')
var treeify = require('treeify')
var esprima = require('esprima')

//  Blockly Core Deps
var MSG = require('./node_modules/blockly/lib/MSG.js')
var code_app = require('./node_modules/blockly/lib/code.js')

//  Blockly JSEditor Deps
var blocklyTemplate = require('./templates/template.soy.js')
var jslangInit = require('./language/jslang.js')
Blockly.util = require('./util.js')

// Pollute window - Required for cross-iframe communication
window.Blockly = Blockly;

// Called by consumer to insert the workspace into the DOM
Blockly.injectWorkspace = function( options ) {

  // Set Defaults
  var targetElement = options.targetElement || document.body

  // Inject Blockly into target div
  var holder = document.createElement('div');
  holder.innerHTML = blocklyTemplate.start({}, null, {MSG: MSG, framePathname: path.join(__dirname,"frame.html"), frameSrc: "en_compressed.js"});
  while (holder.hasChildNodes()) {
    targetElement.appendChild( holder.firstChild )
  }

  // inject styles
  if (options.injectStyles) injectStyles(['./style.css'])

  // Prepare for code editor
  // create left and right sections
  var editorContainer = document.querySelector('#content_javascript')
  var left = document.createElement('div')
  left.setAttribute("class","left")
  editorContainer.appendChild(left)
  var right = document.createElement('div')
  right.setAttribute("class","right")
  editorContainer.appendChild(right)

  // inject editor
  Blockly.editor = createEditor({
    container: editorContainer,
    injectStyles: true
  })

  // Blockly.editor.on('change', function() {})

}

// Called from workspace iframe when ready
Blockly.init = function(blockly) {
  // Recieve core
  Blockly.core = blockly
  // Initialize basic JS Language definitions (Blocks + Generators)
  jslangInit(Blockly)
  // Init App (UI stuff etc)
  code_app.init(Blockly.core)
}

// ===
// = Debugging
// ===

window._parse = function(src) {
  return esprima.parse(src || Blockly.getCode())
}

window._tree = function(src) {
  return treeify.asTree(_parse(src),true)
}

window._dumpcode = function(src) {
  console.log( _tree(src) )
}

window._xml = function() {
  var xmlDom = Blockly.blockly.Xml.workspaceToDom(Blockly.blockly.mainWorkspace)
  console.log( Blockly.blockly.Xml.domToPrettyText(xmlDom) )
}

// ===
// = Public Methods
// ===

Blockly.setCode = function(newCode) {
  Blockly.editor.setValue(newCode)
}
Blockly.getCode = function(newCode) {
  return Blockly.editor.getValue(newCode)
}
Blockly.refresh = function(newCode) {
  Blockly.editor.refresh()
}

// Patch commands from DOM (embedded event handlers) into code_app
// TODO: remove(?)
Blockly.tabClick = function(id) {
  code_app.tabClick(id)
}
Blockly.discard = function() {
  code_app.discard()
}
Blockly.renderContent = function() {
  code_app.renderContent()
}
Blockly.runJS = function() {
  code_app.runJS()
}


// ===
// = Private Methods
// ===

function injectStyles(styles) {
  styles.forEach(function(cssFile) {
    var pathname = path.join(__dirname,cssFile)
    injectStyle( pathname )
  })
}

function injectStyle( pathname ) {
  var linkTag = document.createElement("link")
  linkTag.setAttribute("rel", "stylesheet")
  linkTag.setAttribute("type", "text/css")
  linkTag.setAttribute("href", pathname)
  linkTag.setAttribute("onload", "Blockly.refresh()")
  document.getElementsByTagName("head")[0].appendChild(linkTag)
}