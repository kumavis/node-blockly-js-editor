var code_app = module.exports = {}

/**
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * http://blockly.blockly.googlecode.com/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview JavaScript for Blockly code demo (language-neutral).
 * @author fraser@google.com (Neil Fraser)
 */

// document.write(codepage.start({}, null,
//     {MSG: MSG, frameSrc: frameSrc.join('&')}));

/**
 * List of tab names.
 * @private
 */
// var TABS_ = ['blocks', 'javascript', 'python', 'xml'];
var TABS_ = ['blocks', 'javascript'];

var selected = 'blocks';

/**
 * Switch the visible pane when a tab is clicked.
 * @param {string} id ID of tab clicked.
 */
var tabClick = code_app.tabClick = function tabClick(id) {
  // If the XML tab was open, save and render the content.
  // if (document.getElementById('tab_xml').className == 'tabon') {
  //   var xmlTextarea = document.getElementById('textarea_xml');
  //   var xmlText = xmlTextarea.value;
  //   var xmlDom = null;
  //   try {
  //     xmlDom = Blockly.blockly.Xml.textToDom(xmlText);
  //   } catch (e) {
  //     var q =
  //         window.confirm(MSG.badXml.replace('%1', e));
  //     if (!q) {
  //       // Leave the user on the XML tab.
  //       return;
  //     }
  //   }
  //   if (xmlDom) {
  //     Blockly.blockly.mainWorkspace.clear();
  //     Blockly.blockly.Xml.domToWorkspace(Blockly.blockly.mainWorkspace, xmlDom);
  //   }
  // }

  // Deselect all tabs and hide all panes.
  for (var x in TABS_) {
    document.getElementById('tab_' + TABS_[x]).className = 'taboff';
    document.getElementById('content_' + TABS_[x]).style.display = 'none';
  }

  // Select the active tab.
  selected = id.replace('tab_', '');
  document.getElementById(id).className = 'tabon';
  // Show the selected pane.
  var content = document.getElementById('content_' + selected);
  content.style.display = 'block';
  renderContent();
}

/**
 * Populate the currently selected pane with content generated from the blocks.
 */
var renderContent = code_app.renderContent = function renderContent() {
  var content = document.getElementById('content_' + selected);
  // Initialize the pane.
  if (content.id == 'content_blocks') {
    // If the workspace was changed by the XML tab, Firefox will have performed
    // an incomplete rendering due to Blockly being invisible.  Rerender.
    Blockly.blockly.mainWorkspace.render();
  } else if (content.id == 'content_xml') {
    var xmlTextarea = document.getElementById('textarea_xml');
    var xmlDom = Blockly.blockly.Xml.workspaceToDom(Blockly.blockly.mainWorkspace);
    var xmlText = Blockly.blockly.Xml.domToPrettyText(xmlDom);
    xmlTextarea.value = xmlText;
    xmlTextarea.focus();
  } else if (content.id == 'content_javascript') {
    content.innerHTML = Blockly.blockly.Generator.workspaceToCode('JavaScript');
  // } else if (content.id == 'content_python') {
  //   content.innerHTML = Blockly.blockly.Generator.workspaceToCode('Python');
  }
}

/**
 * Initialize Blockly.blockly.  Called on page load.
 * @param {!Blockly} blockly Instance of Blockly from iframe.
 */
var init = code_app.init = function init(blockly) {
 // window.Blockly = blockly;
 window.Blockly.blockly = blockly;

  // Add to reserved word list: Local variables in execution evironment (runJS)
  // and the infinite loop detection function.
  Blockly.blockly.JavaScript.addReservedWords('code,timeouts,checkTimeout');

  // Make the 'Blocks' tab line up with the toolbox.
  if (Blockly.blockly.Toolbox) {
    window.setTimeout(function() {
        document.getElementById('tab_blocks').style.minWidth =
            (Blockly.blockly.Toolbox.width - 38) + 'px';
            // Account for the 19 pixel margin and on each side.
    }, 1);
  }
  // removed for now - kumavis
  // if ('BlocklyStorage' in window) {
  //   // An href with #key trigers an AJAX call to retrieve saved blocks.
  //   if (window.location.hash.length > 1) {
  //     BlocklyStorage.retrieveXml(window.location.hash.substring(1));
  //   } else {
  //     // Restore saved blocks in a separate thread so that subsequent
  //     // initialization is not affected from a failed load.
  //     window.setTimeout(BlocklyStorage.restoreBlocks, 0);
  //   }
  //   // Hook a save function onto unload.
  //   BlocklyStorage.backupOnUnload();
  // } else {
  //   document.getElementById('linkButton').className = 'disabled';
  // }

  tabClick('tab_' + selected);
}

/**
 * Execute the user's code.
 * Just a quick and dirty eval.  Catch infinite loops.
 */
var runJS = code_app.runJS = function runJS() {
  Blockly.blockly.JavaScript.INFINITE_LOOP_TRAP = '  checkTimeout();\n';
  var timeouts = 0;
  var checkTimeout = function() {
    if (timeouts++ > 1000000) {
      throw MSG.timeout;
    }
  };
  var code = Blockly.blockly.Generator.workspaceToCode('JavaScript');
  Blockly.blockly.JavaScript.INFINITE_LOOP_TRAP = null;
  try {
    eval(code);
  } catch (e) {
    alert(MSG.badCode.replace('%1', e));
  }
}

/**
 * Discard all blocks from the workspace.
 */
var discard = code_app.discard = function discard() {
  var count = Blockly.blockly.mainWorkspace.getAllBlocks().length;
  if (count < 2 ||
      window.confirm(MSG.discard.replace('%1', count))) {
    Blockly.blockly.mainWorkspace.clear();
    window.location.hash = '';
  }
}
