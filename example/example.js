var Blockly = require('../index.js')

// determine environment
var localDev = (location.hostname.indexOf('github.io') === -1)

window.onload = function() {
  Blockly.injectWorkspace({
    assetPrefix: localDev ? '../../' : 'node-blockly-js-editor/',
    injectStyles: true,
  })
}
