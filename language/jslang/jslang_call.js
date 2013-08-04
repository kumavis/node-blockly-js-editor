
// CallExpression

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===

  // ()
  Blockly.core.Language.jslang_call = {
    helpUrl: '',
    init: function() {
      this.appendValueInput("CHAIN")
          .setCheck("null")
          .appendTitle("call")
      this.appendValueInput("ARGS")
          .setCheck("Array")
          .appendTitle("with args");
      this.setOutput(true, "null");
      this.setTooltip('');
    }
  };

  // a.b()
  Blockly.core.Language.jslang_call_member = {
    helpUrl: '',
    init: function() {
      this.appendValueInput("CHAIN")
          .setCheck("null")
          .appendTitle("call")
          .appendTitle(new Blockly.core.FieldTextInput("func"), "FUNC");
      this.appendValueInput("ARGS")
          .setCheck("Array")
          .appendTitle("with args");
      this.setOutput(true, "null");
      this.setTooltip('');
    }
  };

  // a()
  Blockly.core.Language.jslang_call_identifier = {
    helpUrl: '',
    init: function() {
      this.setColour(240);
      this.appendValueInput("CHAIN")
          .setCheck("null")
          .appendTitle("call")
          .appendTitle(new Blockly.core.FieldTextInput("func"), "FUNC");
      this.appendValueInput("ARGS")
          .setCheck("Array")
          .appendTitle("with args");
      this.setOutput(true, "null");
      this.setTooltip('');
    }
  };

  // ===
  // = JS -> Blocks
  // ===

// <xml>
//   <block type="jslang_call_member">
//     <title name="FUNC">func</title>
//   </block>
// </xml> 

//   ├─ type: Program
// └─ body
//    └─ 0
//       ├─ type: ExpressionStatement
//       └─ expression
//          ├─ type: CallExpression
//          ├─ callee
//          │  ├─ type: MemberExpression
//          │  ├─ computed: false
//          │  ├─ object
//          │  │  ├─ type: MemberExpression
//          │  │  ├─ computed: false
//          │  │  ├─ object
//          │  │  │  ├─ type: Identifier
//          │  │  │  └─ name: a
//          │  │  └─ property
//          │  │     ├─ type: Identifier
//          │  │     └─ name: b
//          │  └─ property
//          │     ├─ type: Identifier
//          │     └─ name: c
//          └─ arguments
 
 // ()
 Blockly.util.registerBlockSignature({
    // Pattern
      type: 'CallExpression',
      arguments: patternMatch.var('arguments'),
      callee: patternMatch.var('callee'),
    },
    // XML generator
    function(node,matchedProps) {
      var callee = Blockly.util.convertAstNodeToBlocks(matchedProps.callee)
      var callBlock = ''
      callBlock += '<block type="jslang_call">'
      // Make an array block for args
      callBlock += '<value name="ARGS"><block type="lists_create_with" inline="true">'
      callBlock += '<mutation items="'+matchedProps.arguments.length+'"/>'
      matchedProps.arguments.forEach(function(arg,index) {
        callBlock += '<value name="ADD'+index+'">'+Blockly.util.convertAstNodeToBlocks(arg)+'</value>'
      })
      callBlock += '</block></value>'
      callBlock += '</block>'
      var output = Blockly.util.appendTagDeep(callee, callBlock, 'value', 'CHAIN')
      return output
    }
  )

  // a()
  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'CallExpression',
      arguments: patternMatch.var('arguments'),
      callee: {
        type: 'Identifier',
        name: patternMatch.var('callee_name'),
      },
    },
    // XML generator
    function(node,matchedProps) {
      var callBlock = ''
      callBlock += '<block type="jslang_call_identifier">'
      callBlock += '<title name="FUNC">'
      callBlock += matchedProps.callee_name
      callBlock += '</title>'
      // Make an array block for args
      callBlock += '<value name="ARGS"><block type="lists_create_with" inline="true">'
      callBlock += '<mutation items="'+matchedProps.arguments.length+'"/>'
      matchedProps.arguments.forEach(function(arg,index) {
        callBlock += '<value name="ADD'+index+'">'+Blockly.util.convertAstNodeToBlocks(arg)+'</value>'
      })
      callBlock += '</block></value>'
      callBlock += '</block>'
      return callBlock
    }
  )

  // a.b()
  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'CallExpression',
      arguments: patternMatch.var('arguments'),
      callee: {
        object: patternMatch.var('callee_obj'),
        property: patternMatch.var('callee_prop'),
      },
    },
    // XML generator
    function(node,matchedProps) {
      var callee = Blockly.util.convertAstNodeToBlocks(matchedProps.callee_obj)
      var callBlock = ''
      callBlock += '<block type="jslang_call_member">'
      callBlock += '<title name="FUNC">'
      callBlock += matchedProps.callee_prop.name || matchedProps.callee_prop.value
      callBlock += '</title>'
      // Make an array block for args
      callBlock += '<value name="ARGS"><block type="lists_create_with" inline="true">'
      callBlock += '<mutation items="'+matchedProps.arguments.length+'"/>'
      matchedProps.arguments.forEach(function(arg,index) {
        callBlock += '<value name="ADD'+index+'">'+Blockly.util.convertAstNodeToBlocks(arg)+'</value>'
      })
      callBlock += '</block></value>'
      callBlock += '</block>'
      var output = Blockly.util.appendTagDeep(callee, callBlock, 'value', 'CHAIN')
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
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var value_args = Blockly.core.JavaScript.valueToCode(this, 'ARGS', Blockly.core.JavaScript.ORDER_ATOMIC);
    // remove brackets
    if (value_args[0] == '[' && value_args[value_args.length-1] == ']') value_args = value_args.slice(1,-1)
    // Assemble JavaScript into code variable.
    var code = '('
    code += value_args
    code += ')'
    code += value_chain
    return [code, Blockly.core.JavaScript.ORDER_NONE];
  };

  Blockly.core.JavaScript.jslang_call_member = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var text_func = this.getTitleValue('FUNC');
    var value_args = Blockly.core.JavaScript.valueToCode(this, 'ARGS', Blockly.core.JavaScript.ORDER_ATOMIC);
    // remove brackets
    if (value_args[0] == '[' && value_args[value_args.length-1] == ']') value_args = value_args.slice(1,-1)
    // Assemble JavaScript into code variable.
    var code = '.'+text_func+'('
    code += value_args
    code += ')'
    code += value_chain
    return [code, Blockly.core.JavaScript.ORDER_NONE];
  };

  Blockly.core.JavaScript.jslang_call_identifier = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var text_func = this.getTitleValue('FUNC');
    var value_args = Blockly.core.JavaScript.valueToCode(this, 'ARGS', Blockly.core.JavaScript.ORDER_ATOMIC);
    // remove brackets
    if (value_args[0] == '[' && value_args[value_args.length-1] == ']') value_args = value_args.slice(1,-1)
    // Assemble JavaScript into code variable.
    var code = text_func+'('
    code += value_args
    code += ')'
    code += value_chain
    return [code, Blockly.core.JavaScript.ORDER_NONE];
  };

}
