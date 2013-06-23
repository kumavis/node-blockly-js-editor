// Include Blockly Core
var codepage = require('./templates/template.soy.js')
var MSG = require('./lib/MSG.js')
var code_app = require('./lib/code.js')

var Blockly = module.exports = {}

// Required for cross-iframe communication
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

}

// Called from workspace iframe when ready
Blockly.init = function(blockly) {
  code_app.init(blockly)
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
