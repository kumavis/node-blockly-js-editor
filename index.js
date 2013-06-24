// hotfix for browserify bugging out
window.process = process

// Modules Deps
var createEditor = require('javascript-editor')

//  Blockly Core Deps
var codepage = require('./templates/template.soy.js')
var MSG = require('./lib/MSG.js')
var code_app = require('./lib/code.js')

// Create module root object
var Blockly = module.exports = {}

// Pollute window - Required for cross-iframe communication
window.Blockly = Blockly;

// Called by consumer to insert the workspace into the DOM
Blockly.injectWorkspace = function( options ) {
  var frameSrc = ["en_compressed.js"]

  var targetElement = options.targetElement || document.body

  // Build html into target div
  var holder = document.createElement('div');
  holder.innerHTML = codepage.start({}, null, {MSG: MSG, frameSrc: frameSrc.join('&')});
  while (holder.hasChildNodes()) {
    targetElement.appendChild( holder.firstChild )
  }

  // Add in code editor
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

  Blockly.editor.on('change', function() {
    var value = this.getValue()
    console.log( value )
  })

}

// Called from workspace iframe when ready
Blockly.init = function(blockly) {
  code_app.init(blockly)
}

// Public methods
Blockly.setCode = function(newCode) {
  Blockly.editor.setValue(newCode)
}

Blockly.getCode = function(newCode) {
  Blockly.editor.getValue(newCode)
}

// Patch commands from DOM into code_app
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

// === example (non-module code) ====

// shortcut for Debug
window._ = Blockly;


window.onload = function() {

  Blockly.injectWorkspace({
    targetElement: document.getElementById("my_blockly_container")
  })

}

// ====================================

