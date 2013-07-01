
// Other/etc.

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===



  // ===
  // = JS -> Blocks
  // ===

  // Program
  // 
  // <xml>{body[0]}</xml>

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'Program',
      body: patternMatch.var('body'),
    },
    // XML generator
    function(node,matchedProps) {
      var body, output = '<xml>\n'
      // Walk through the body backwards, appending each to the one before it's `next` tag
      // elem0
      // └─next:elem1
      //        └─next:elem2
      matchedProps.body.reverse().forEach(function(node,index) {
        nodeXml = Blockly.util.convertAstNodeToBlocks(node)+"\n"
        // Appending to a non-string just sets it to the append value
        body = Blockly.util.appendBlock(body,nodeXml)
      })
      output += body
      output += '</xml>'
      return output
    }
  )

  // Literal
  //
  // <block type="text">
  //   <title name="TEXT">hey</title>
  // </block>
  //
  //        - or -
  //
  // <block type="math_number">
  //   <title name="NUM">0</title>
  // </block>

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'Literal',
      value: patternMatch.var('value'),
    },
    // XML generator
    function(node,matchedProps) {
      var output = ''
      var type = typeof matchedProps.value
      if (type === 'string') {
        output += '<block type="text">\n'
        output += '<title name="TEXT">'+matchedProps.value+'</title>'
        output += '</block>'  
      } else if (type === 'number') {
        output += '<block type="math_number">\n'
        output += '<title name="NUM">'+matchedProps.value+'</title>'
        output += '</block>' 
      } else {
        // No Match
        return false
      }
      return output
    }
  )

  // ===
  // = Blocks -> JS
  // ===



}
