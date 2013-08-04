var patternMatch = require('pattern-match')

module.exports = function(Blockly) {

  // Define Blocks and Generators
  require('./node_require.js')(Blockly,patternMatch)
  require('./node_on.js')(Blockly,patternMatch)

}
