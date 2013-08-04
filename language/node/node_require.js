
// VariableDeclaration

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===

  // For requiring a module
  Blockly.core.Language.node_require = {
    helpUrl: '',
    init: function() {
      this.appendValueInput("CHAIN")
          .appendTitle("require")
          .appendTitle(new Blockly.core.FieldTextInput("voxel-hello-world"), "MODULE");
      this.setOutput(true);
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
        name: 'require'
      },
      arguments: patternMatch.var('arguments'),
    },
    // XML generator
    function(node,matchedProps) {
      if (matchedProps.arguments.length>1) return false
      var output = ''
      output += '<block type="node_require">'
      output += '<title name="MODULE">'+matchedProps.arguments[0].value+'</title>'
      output += '</block>'
      return output
    }
  )

  // ===
  // = Blocks -> JS
  // ===

  // var <VariableDeclarator.id> = <VariableDeclarator.init>
  //
  // eg: "var world = hello()"

  Blockly.core.JavaScript.node_require = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var text_module = this.getTitleValue('MODULE');
    // Assemble JavaScript into code variable.
    var code = "require('"+text_module+"')"
    if (value_chain) code += value_chain
    return [code,Blockly.core.JavaScript.ORDER_NONE]
  };

}
