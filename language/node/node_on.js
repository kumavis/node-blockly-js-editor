
// VariableDeclaration

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===

  // For requiring a module
  Blockly.core.Language.node_on = {
    helpUrl: '',
    init: function() {
      this.setColour(0);
      this.appendValueInput("CHAIN")
          .appendTitle("on")
          .appendTitle(new Blockly.core.FieldTextInput("event"), "EVENT");
      this.appendValueInput("FUNC")
          .setAlign(Blockly.core.ALIGN_RIGHT)
          .appendTitle("do");
      this.setOutput(true, "null");
      this.setTooltip('');
    }
  };

  // ===
  // = JS -> Blocks
  // ===

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'CallExpression',
      callee: {
        object: patternMatch.var('callee_obj'),
        property: {name: 'on'},
      },
      arguments: patternMatch.var('arguments',[
        {
          type: 'Literal',
          value: patternMatch.var('event'),
        },
        patternMatch.var('handler'),
      ])
    },
    // XML generator
    function(node,matchedProps) {
      // Ensure correct input
      if (matchedProps.arguments.length!==2) return false
      //if (typeof matchedProps.arguments[0].type !== 'Literal') return false
      // Build Blocks
      var callee = Blockly.util.convertAstNodeToBlocks(matchedProps.callee_obj)
      var onBlock = ''
      onBlock += '<block type="node_on">'
      onBlock += '<title name="EVENT">'+matchedProps.event+'</title>'
      onBlock += '<value name="FUNC">'
      onBlock += Blockly.util.convertAstNodeToBlocks(matchedProps.handler)
      onBlock += '</value>'
      onBlock += '</block>'
      var output = Blockly.util.appendTagDeep(callee, onBlock, 'value', 'CHAIN')
      return output
    }
  )

  // ===
  // = Blocks -> JS
  // ===

  // var <VariableDeclarator.id> = <VariableDeclarator.init>
  //
  // eg: "var world = hello()"

  Blockly.core.JavaScript.node_on = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var value_func = Blockly.core.JavaScript.valueToCode(this, 'FUNC', Blockly.core.JavaScript.ORDER_ATOMIC);
    var text_event = this.getTitleValue('EVENT');
    // Assemble JavaScript into code variable.
    var code = ".on('"+text_event+"',"+value_func+")"
    if (value_chain) code += value_chain
    return [code,Blockly.core.JavaScript.ORDER_NONE]
  };

}
