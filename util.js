// Exports
module.exports = {
  registerBlockSignature: registerBlockSignature,
  convertAstNodeToBlocks: convertAstNodeToBlocks,
  jsToBlocklyXml: jsToBlocklyXml,
  appendBlock: appendBlock,
}

// Module Dependencies
var esprima = require('esprima')
var treeify = require('treeify')
var patternMatch = require('pattern-match')

// Initialization
var blockSignatures = {}

function jsToBlocklyXml(source) {
  var ast = esprima.parse(source)
  return convertAstNodeToBlocks(ast)
}

// Takes in an esprima syntax node, returns a string of xml Blockly Blocks
function convertAstNodeToBlocks(ast) {
  // Ensure valid input
  if (!ast.type) throw "bad ast node - no 'type' property"

  var result

  // Get registered syntaxes for this node type
  var signatures = blockSignatures[ast.type] || []

  // Find and return the first matching result
  signatures.some(function(sig) {
    result = checkMatch(ast, sig);
    // exit loop if result found 
    return !!result
  })

  // Return match if found
  if (result) return result

  // Match was not found
  throw 'matching signature NOT FOUND for "'+ast.type+'". registered block signatures:\n'+treeify.asTree(blockSignatures,true)
}

// return the match if found, or return false
function checkMatch(node, signature) {
  // build matcher function
  var matcherFn = function(when) { when(signature.pattern, function(when){ return signature.xmlGenerator(node,when) }) }
  try {
    // patternMatch throws an error if it does not find a match
    return patternMatch(node,matcherFn)
  } catch(err) {
    if (typeof err === 'string') {
      console.log(err)
    } else {
      console.log( treeify.asTree(err,true) )
    }
    console.log("non-matching pattern")
    return false
  }
}

// Add a block signature to the list of registered blocks
function registerBlockSignature(pattern, xmlGenerator) {
  // Ensure valid input
  if (!pattern.type) throw "bad block signature - pattern has no 'type' property"  
  // Initialize this type if necesary
  var signaturesForType = blockSignatures[pattern.type]
  if (!Array.isArray(signaturesForType)) blockSignatures[pattern.type] = signaturesForType = []
  // Add signature to registry
  signaturesForType.push({ pattern: pattern, xmlGenerator: xmlGenerator })
}

function appendBlock(parent, child) {
  var parentNewValue
  if (typeof parent === 'string') {
    // Before Closing Tag, Append 'next' tag with child embedded
    var closetagIndex = parent.lastIndexOf('<')
    parentNewValue = parent.slice(0,closetagIndex)+'<next>'+child+'</next>'+parent.slice(closetagIndex)
  } else {
    parentNewValue = child
  }
  return parentNewValue
}