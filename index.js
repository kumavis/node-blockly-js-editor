/*
// Blockly-JsEditor
//
//  - Consumer calls injectWorkspace
//  - this loads in the template including the iframe'd workspace
//  - on load, iframe calls Blockly.init to complete
//
//  - user modifies blocks or code 
//  - blocks and code are sync'd
//
*/

// Create module root object
var Blockly = module.exports = {}

// Modules Deps
var createEditor = require('javascript-editor')
var path = require('path')
var treeify = require('treeify')
var esprima = require('esprima')

//  Blockly Core Deps
var initBlocklyCore = require('./node_modules/blockly/lib/blockly_compressed.js')
var MSG = require('./node_modules/blockly/lib/MSG.js')
var code_app = require('./node_modules/blockly/lib/code.js')
var initEnglish = require('./node_modules/blockly/lib/en_compressed.js')

//  Blockly JSEditor Deps
var blocklyTemplate = require('./templates/template.soy.js')
var initCoreJs = require('./node_modules/blockly/lib/javascript_compressed.js')
var initLanguageBlocks = require('./language/config.js')
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
  if (options.injectStyles) injectStyles(['./css/style.css','./css/codemirror.css','./css/theme.css'])

  // Prepare for code editor
  // build DOM for left and right sections
  var editorContainer = document.querySelector('#content_javascript')
  var left = document.createElement('div')
  left.setAttribute("class","left")
  editorContainer.appendChild(left)

  // inject editor
  Blockly.editor = createEditor({
    container: editorContainer,
  })

}

// Called from workspace iframe when ready
Blockly.init = function(frameWindow) {
  Blockly.core = initBlocklyCore(frameWindow)
  initCoreJs(frameWindow,Blockly.core)
  initWorkspace(frameWindow,Blockly.core)
  initEnglish(frameWindow,Blockly.core)
  // Initialize basic JS Language definitions (Blocks + Generators)
  initLanguageBlocks(Blockly)

  // setup a blockly-changed callback
  Blockly.core.addChangeListener(Blockly.onBlocklyChange);

  // setup a cellback for JS-update, after error-checking
  Blockly.editor.on('valid', function(noErrors) {
    if (noErrors) Blockly.onJsChange()
  })
  
  // give cursor focus in editor
  Blockly.editor.editor.focus()

  // Init App (UI stuff etc)
  code_app.init(Blockly.core)

}

// ===
// = Debugging
// ===

window._parse = function(src) {
  return esprima.parse(src)
}

window._tree = function(src) {
  src = src || Blockly.getCode()
  if (typeof src  == 'object') {
    console.log( treeify.asTree(src,true) )
  } else {
    console.log( treeify.asTree(_parse(src),true) )
  }
}

window._code = function() {
  _tree(Blockly.core.Generator.workspaceToCode('JavaScript')) 
}

window._xml = function(src) {
  var xmlDom = src ? Blockly.util.jsToBlocklyXml(src) : Blockly.core.Xml.workspaceToDom(Blockly.core.mainWorkspace)
  console.log( Blockly.core.Xml.domToPrettyText(xmlDom) || xmlDom )
}

// ===
// = Public Methods
// ===

Blockly.setCode = function(newCode) {
  Blockly.editor.setValue(newCode)
}
Blockly.getCode = function() {
  return Blockly.editor.getValue()
}
Blockly.refresh = function(newCode) {
  Blockly.editor.refresh()
}

Blockly.toggleToolbox = function(){
  var toolbox = queryToolbox()
  if (toolbox.style.display === "none")
    Blockly.showToolbox(toolbox)
  else
    Blockly.hideToolbox(toolbox)
}
Blockly.showToolbox = function(toolbox){
  toolbox = toolbox || queryToolbox()
  toolbox.style.display = "block"
}
Blockly.hideToolbox = function(toolbox){
  toolbox = toolbox || queryToolbox()
  toolbox.style.display = "none"
}

function queryToolbox() {
  return document.getElementById('content_blocks').contentDocument.querySelector('.blocklyToolboxDiv')
}

// Patch commands from DOM (embedded event handlers) into code_app
// TODO: remove(?)
Blockly.tabClick = function(id) {
  code_app.tabClick(id)
}
Blockly.discard = function() {
  code_app.discard()
  code_app.renderContent();
}
Blockly.renderContent = function() {
  code_app.renderContent()
}
Blockly.runJS = function() {
  code_app.runJS()
}

// Blocks have changed
Blockly.onBlocklyChange = function() {
  if (Blockly.ignoreNextBlocklyChange)
  {
    Blockly.ignoreNextBlocklyChange = false
  } else {
    Blockly.ignoreNextJsChange = true
    Blockly.setCode(Blockly.core.Generator.workspaceToCode('JavaScript'))
  }
}

// JS has changed
Blockly.onJsChange = function() {
  if (Blockly.ignoreNextJsChange) {
    Blockly.ignoreNextJsChange = false
  } else {
    Blockly.ignoreNextBlocklyChange = true
    // Code to Blocks
    var jsText = Blockly.getCode();
    var xmlText = Blockly.util.jsToBlocklyXml(jsText);
    var xmlDom = null;
    try {
      xmlDom = Blockly.core.Xml.textToDom(xmlText);
    } catch (e) {
      var q =
          window.confirm(MSG.badXml.replace('%1', e));
      if (!q) {
        // Leave the user on the XML tab.
        return;
      }
    }
    if (xmlDom) {
      Blockly.core.mainWorkspace.clear();
      Blockly.core.Xml.domToWorkspace(Blockly.core.mainWorkspace, xmlDom);
    }
    Blockly.renderContent()
  }
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

function initWorkspace(window,Blockly) {
  (function(){
    var document = window.document
    var rtl = false;
    var toolbox = null;
    if (window.parent.document) {
      // document.dir fails in Mozilla, use document.body.parentNode.dir.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=151407
      rtl = window.parent.document.body.parentNode.dir == 'rtl';
      toolbox = window.parent.document.getElementById('toolbox');
    }
    Blockly.inject(document.body,
        {path: '../../',
         rtl: rtl,
         toolbox: toolbox});
  }).bind(window)()
}
