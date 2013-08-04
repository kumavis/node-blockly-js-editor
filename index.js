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
  // create left and right sections
  var editorContainer = document.querySelector('#content_javascript')
  var left = document.createElement('div')
  left.setAttribute("class","left")
  editorContainer.appendChild(left)
  // var right = document.createElement('div')
  // right.setAttribute("class","right")
  // editorContainer.appendChild(right)

  // inject editor
  Blockly.editor = createEditor({
    container: editorContainer,
  })

  // On JS-update, after error-checking
  Blockly.editor.on('valid', function(noErrors) {
    if (noErrors) {
      // Update Blocks from JS

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
  var triggerBlocklyChange = debounce(Blockly.onBlocklyChange, 500, false)
  wrapFunctionAtPath('Blockly.core.BlockSvg.prototype.render',function(){
    console.log('render -- debouncing')
    triggerBlocklyChange()
  })
  
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
  if (newCode != Blockly.getCode()) Blockly.editor.setValue(newCode)
}
Blockly.getCode = function() {
  return Blockly.editor.getValue()
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

Blockly.onBlocklyChange = function() {
  console.log('updating code from blocks')
  Blockly.setCode(Blockly.core.Generator.workspaceToCode('JavaScript'))
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

// debugging tool, wraps a method
// usage:     wrapForDebugging('Blockly.core.Xml.render',function(){...})
function wrapFunctionAtPath(targetPath,before,after) {
  var targetParent = window
  var targetSegments = targetPath.split('.')
  lastSegment = targetSegments.slice(-1)[0]
  targetSegments.slice(0,-1).forEach(function(pathSegment){
    targetParent = targetParent[pathSegment]
  })
  var target = targetParent[lastSegment]
  targetParent[lastSegment] = function(){
    if (before) before() //.bind(this)
    target.apply(this,arguments)
    if (after) after() //.bind(this)
  }
}

// debounce func from http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
function debounce(func, threshold, execAsap) {
    var timeout; // handle to setTimeout async task (detection period)
    // return the new debounced function which executes the original function only once
    // until the detection period expires
    return function debounced () {
        var obj = this, // reference to original context object
            args = arguments; // arguments at execution time
        // this is the detection function. it will be executed if/when the threshold expires
        function delayed () {
            // if we're executing at the end of the detection period
            if (!execAsap)
                func.apply(obj, args); // execute now
            // clear timeout handle
            timeout = null; 
        };
        // stop any current detection period
        if (timeout)
            clearTimeout(timeout);
        // otherwise, if we're not already waiting and we're executing at the beginning of the detection period
        else if (execAsap)
            func.apply(obj, args); // execute now
        // reset the detection period
        timeout = setTimeout(delayed, threshold || 100); 
    };
}