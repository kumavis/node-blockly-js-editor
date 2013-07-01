
// CallExpression

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===

  Blockly.core.Language.jslang_call = {
    helpUrl: 'http://www.example.com/',
    init: function() {
      this.setColour(65);
      this.appendDummyInput()
          .appendTitle(new Blockly.core.FieldVariable("obj"), "CALLEE")
          .appendTitle(".")
          .appendTitle(new Blockly.core.FieldTextInput("func"), "FUNC");
      this.appendValueInput("ARGS")
          .setCheck("Array")
          .appendTitle("(");
      this.appendDummyInput()
          .appendTitle(")");
      this.setInputsInline(true);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip('');
    }
  };

  // ===
  // = JS -> Blocks
  // ===

  // <xml>
  //   <block type="jslang_call" inline="true" x="1" y="152">
  //     <title name="CALLEE">obj</title>
  //     <title name="FUNC">func</title>
  //     <value name="ARGS">
  //       <block type="lists_create_with" inline="true">
  //         <mutation items="1"></mutation>
  //         <value name="ADD0">
  //           <block type="text">
  //             <title name="TEXT">hey</title>
  //           </block>
  //         </value>
  //       </block>
  //     </value>
  //   </block>
  // </xml>

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'ExpressionStatement',
      expression: patternMatch.var('expression'),
    },
    // XML generator
    function(node,matchedProps) {
      if (matchedProps.expression.type !== "CallExpression") return false;
      var callee = matchedProps.expression.callee
      if (callee.type !== "MemberExpression") return false

      var arguments = matchedProps.expression.arguments
      var output = '<block type="jslang_call">'
      output += '<title name="CALLEE">'+callee.object.name+'</title>'
      output += '<title name="FUNC">'+callee.property.name+'</title>'
      output += '<value name="ARGS"><block type="lists_create_with" inline="true">'
      output += '<mutation items="'+arguments.length+'"/>'
      arguments.forEach(function(arg,index) {
        output += '<value name="ADD'+index+'">'+Blockly.util.convertAstNodeToBlocks(arg)+'</value>'
      })
      output += '</block></value>'
      output += '</block>'
      return output
    }
  )

  // ===
  // = Blocks -> JS
  // ===

  // <CALLEE>.<FUNC>()
  //
  // eg: "world.hello()"

  Blockly.core.JavaScript.jslang_call = function() {
    var variable_callee = Blockly.core.JavaScript.variableDB_.getName(this.getTitleValue('CALLEE'), Blockly.core.Variables.NAME_TYPE);
    var text_func = this.getTitleValue('FUNC');
    var value_args = Blockly.core.JavaScript.valueToCode(this, 'ARGS', Blockly.core.JavaScript.ORDER_ATOMIC);
    // remove parens and brackets
    value_args = value_args.slice(2,-2)
    // Assemble JavaScript into code variable.
    var code = variable_callee+'.'+text_func+'('
    code += value_args
    code += ')\n'
    return code;
  };

}
