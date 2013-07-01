var patternMatch = require('pattern-match')

module.exports = function(Blockly) {

  // Free up some reserved words
  var rw = Blockly.core.JavaScript.RESERVED_WORDS_.split(',')
  var wordsToBeLiberated = ['console']
  wordsToBeLiberated.forEach(function(word){
    var index = rw.indexOf(word); // Find the index
    if(index!=-1) rw.splice(index, 1); // Remove it if really found!  
  })

  Blockly.core.JavaScript.RESERVED_WORDS_ = rw.join(',')

  // Define Blocks and Generators
  require('./jslang_etc.js')(Blockly,patternMatch)
  require('./jslang_try_catch.js')(Blockly,patternMatch)
  require('./jslang_call.js')(Blockly,patternMatch)

}
