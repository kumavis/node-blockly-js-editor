;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function(process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

})(require("__browserify_process"))
},{"__browserify_process":1}],3:[function(require,module,exports){
// From a script tag in en.html for the code app

module.exports = {
  // Tooltips.
  trashTooltip: 'Discard all blocks.',
  linkTooltip: 'Save and link to blocks.',
  runTooltip: 'Run program.',
  // Toolbox categories.
  catControl: 'Control',
  catLogic: 'Logic',
  catMath: 'Math',
  catText: 'Text',
  catLists: 'Lists',
  catColour: 'Colour',
  catVariables: 'Variables',
  catProcedures: 'Procedures',
  // Initial variable names.
  listVariable: 'list',
  textVariable: 'text',
  // Misc text.
  blocks: 'Blocks',
  badXml: 'Error parsing XML:\n%1\n\nAbandon changes?',
  badCode: 'Program error:\n%1',
  timeout: 'Maximum execution iterations exceeded.',
  discard: 'Delete all "%1" blocks?',
  title: 'Code'
};
},{}],4:[function(require,module,exports){
// module.exports is an init function that takes in the frame context and the Blockly.core obj
module.exports = function(frameWindow,Blockly){
  return (function(){
// Start Source


// Do not edit this file; automatically generated by build.py.
"use strict";

Blockly.MSG_DUPLICATE_BLOCK="Duplicate";Blockly.MSG_REMOVE_COMMENT="Remove Comment";Blockly.MSG_ADD_COMMENT="Add Comment";Blockly.MSG_EXTERNAL_INPUTS="External Inputs";Blockly.MSG_INLINE_INPUTS="Inline Inputs";Blockly.MSG_DELETE_BLOCK="Delete Block";Blockly.MSG_DELETE_X_BLOCKS="Delete %1 Blocks";Blockly.MSG_COLLAPSE_BLOCK="Collapse Block";Blockly.MSG_EXPAND_BLOCK="Expand Block";Blockly.MSG_DISABLE_BLOCK="Disable Block";Blockly.MSG_ENABLE_BLOCK="Enable Block";Blockly.MSG_HELP="Help";
Blockly.MSG_COLLAPSE_ALL="Collapse Blocks";Blockly.MSG_EXPAND_ALL="Expand Blocks";Blockly.MSG_CHANGE_VALUE_TITLE="Change value:";Blockly.MSG_NEW_VARIABLE="New variable...";Blockly.MSG_NEW_VARIABLE_TITLE="New variable name:";Blockly.MSG_RENAME_VARIABLE="Rename variable...";Blockly.MSG_RENAME_VARIABLE_TITLE='Rename all "%1" variables to:';Blockly.LANG_COLOUR_PICKER_HELPURL="http://en.wikipedia.org/wiki/Color";Blockly.LANG_COLOUR_PICKER_TOOLTIP="Choose a colour from the palette.";
Blockly.LANG_COLOUR_RANDOM_HELPURL="http://randomcolour.com";Blockly.LANG_COLOUR_RANDOM_TITLE="random colour";Blockly.LANG_COLOUR_RANDOM_TOOLTIP="Choose a colour at random.";Blockly.LANG_COLOUR_RGB_HELPURL="http://www.december.com/html/spec/colorper.html";Blockly.LANG_COLOUR_RGB_TITLE="colour with";Blockly.LANG_COLOUR_RGB_RED="red";Blockly.LANG_COLOUR_RGB_GREEN="green";Blockly.LANG_COLOUR_RGB_BLUE="blue";Blockly.LANG_COLOUR_RGB_TOOLTIP="Create a colour with the specified amount of red, green,\nand blue.  All values must be between 0 and 100.";
Blockly.LANG_COLOUR_BLEND_HELPURL="http://meyerweb.com/eric/tools/color-blend/";Blockly.LANG_COLOUR_BLEND_TITLE="blend";Blockly.LANG_COLOUR_BLEND_COLOUR1="colour 1";Blockly.LANG_COLOUR_BLEND_COLOUR2="colour 2";Blockly.LANG_COLOUR_BLEND_RATIO="ratio";Blockly.LANG_COLOUR_BLEND_TOOLTIP="Blends two colours together with a given ratio (0.0 - 1.0).";Blockly.LANG_CONTROLS_IF_HELPURL="http://code.google.com/p/blockly/wiki/If_Then";Blockly.LANG_CONTROLS_IF_TOOLTIP_1="If a value is true, then do some statements.";
Blockly.LANG_CONTROLS_IF_TOOLTIP_2="If a value is true, then do the first block of statements.\nOtherwise, do the second block of statements.";Blockly.LANG_CONTROLS_IF_TOOLTIP_3="If the first value is true, then do the first block of statements.\nOtherwise, if the second value is true, do the second block of statements.";Blockly.LANG_CONTROLS_IF_TOOLTIP_4="If the first value is true, then do the first block of statements.\nOtherwise, if the second value is true, do the second block of statements.\nIf none of the values are true, do the last block of statements.";
Blockly.LANG_CONTROLS_IF_MSG_IF="if";Blockly.LANG_CONTROLS_IF_MSG_ELSEIF="else if";Blockly.LANG_CONTROLS_IF_MSG_ELSE="else";Blockly.LANG_CONTROLS_IF_MSG_THEN="do";Blockly.LANG_CONTROLS_IF_IF_TITLE_IF="if";Blockly.LANG_CONTROLS_IF_IF_TOOLTIP="Add, remove, or reorder sections\nto reconfigure this if block.";Blockly.LANG_CONTROLS_IF_ELSEIF_TITLE_ELSEIF="else if";Blockly.LANG_CONTROLS_IF_ELSEIF_TOOLTIP="Add a condition to the if block.";Blockly.LANG_CONTROLS_IF_ELSE_TITLE_ELSE="else";
Blockly.LANG_CONTROLS_IF_ELSE_TOOLTIP="Add a final, catch-all condition to the if block.";Blockly.LANG_CONTROLS_REPEAT_HELPURL="http://en.wikipedia.org/wiki/For_loop";Blockly.LANG_CONTROLS_REPEAT_TITLE_REPEAT="repeat";Blockly.LANG_CONTROLS_REPEAT_TITLE_TIMES="times";Blockly.LANG_CONTROLS_REPEAT_INPUT_DO="do";Blockly.LANG_CONTROLS_REPEAT_TOOLTIP="Do some statements several times.";Blockly.LANG_CONTROLS_WHILEUNTIL_HELPURL="http://code.google.com/p/blockly/wiki/Repeat";
Blockly.LANG_CONTROLS_WHILEUNTIL_INPUT_DO="do";Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_WHILE="repeat while";Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_UNTIL="repeat until";Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_WHILE="While a value is true, then do some statements.";Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_UNTIL="While a value is false, then do some statements.";Blockly.LANG_CONTROLS_FOR_HELPURL="http://en.wikipedia.org/wiki/For_loop";Blockly.LANG_CONTROLS_FOR_INPUT_WITH="count with";
Blockly.LANG_CONTROLS_FOR_INPUT_VAR="x";Blockly.LANG_CONTROLS_FOR_INPUT_FROM="from";Blockly.LANG_CONTROLS_FOR_INPUT_TO="to";Blockly.LANG_CONTROLS_FOR_INPUT_BY="by";Blockly.LANG_CONTROLS_FOR_INPUT_DO="do";Blockly.LANG_CONTROLS_FOR_TAIL="";Blockly.LANG_CONTROLS_FOR_TOOLTIP='Count from a start number to an end number by the specified interval.\nFor each count, set the current count number to\nvariable "%1", and then do some statements.';Blockly.LANG_CONTROLS_FOREACH_HELPURL="http://en.wikipedia.org/wiki/For_loop";
Blockly.LANG_CONTROLS_FOREACH_INPUT_ITEM="for each item";Blockly.LANG_CONTROLS_FOREACH_INPUT_VAR="x";Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST="in list";Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST_TAIL="";Blockly.LANG_CONTROLS_FOREACH_INPUT_DO="do";Blockly.LANG_CONTROLS_FOREACH_TOOLTIP='For each item in a list, set the item to\nvariable "%1", and then do some statements.';Blockly.LANG_CONTROLS_FLOW_STATEMENTS_HELPURL="http://en.wikipedia.org/wiki/Control_flow";
Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_BREAK="break out of loop";Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_CONTINUE="continue with next iteration of loop";Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_BREAK="Break out of the containing loop.";Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_CONTINUE="Skip the rest of this loop, and\ncontinue with the next iteration.";Blockly.LANG_CONTROLS_FLOW_STATEMENTS_WARNING="Warning:\nThis block may only\nbe used within a loop.";
Blockly.LANG_LOGIC_COMPARE_HELPURL="http://en.wikipedia.org/wiki/Inequality_(mathematics)";Blockly.LANG_LOGIC_COMPARE_TOOLTIP_EQ="Return true if both inputs equal each other.";Blockly.LANG_LOGIC_COMPARE_TOOLTIP_NEQ="Return true if both inputs are not equal to each other.";Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LT="Return true if the first input is smaller\nthan the second input.";Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LTE="Return true if the first input is smaller\nthan or equal to the second input.";
Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GT="Return true if the first input is greater\nthan the second input.";Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GTE="Return true if the first input is greater\nthan or equal to the second input.";Blockly.LANG_LOGIC_OPERATION_HELPURL="http://code.google.com/p/blockly/wiki/And_Or";Blockly.LANG_LOGIC_OPERATION_AND="and";Blockly.LANG_LOGIC_OPERATION_OR="or";Blockly.LANG_LOGIC_OPERATION_TOOLTIP_AND="Return true if both inputs are true.";
Blockly.LANG_LOGIC_OPERATION_TOOLTIP_OR="Return true if either inputs are true.";Blockly.LANG_LOGIC_NEGATE_HELPURL="http://code.google.com/p/blockly/wiki/Not";Blockly.LANG_LOGIC_NEGATE_INPUT_NOT="not";Blockly.LANG_LOGIC_NEGATE_TOOLTIP="Returns true if the input is false.\nReturns false if the input is true.";Blockly.LANG_LOGIC_BOOLEAN_HELPURL="http://code.google.com/p/blockly/wiki/True_False";Blockly.LANG_LOGIC_BOOLEAN_TRUE="true";Blockly.LANG_LOGIC_BOOLEAN_FALSE="false";
Blockly.LANG_LOGIC_BOOLEAN_TOOLTIP="Returns either true or false.";Blockly.LANG_LOGIC_NULL_HELPURL="http://en.wikipedia.org/wiki/Nullable_type";Blockly.LANG_LOGIC_NULL="null";Blockly.LANG_LOGIC_NULL_TOOLTIP="Returns null.";Blockly.LANG_LOGIC_TERNARY_HELPURL="http://en.wikipedia.org/wiki/%3F:";Blockly.LANG_LOGIC_TERNARY_CONDITION="test";Blockly.LANG_LOGIC_TERNARY_IF_TRUE="if true";Blockly.LANG_LOGIC_TERNARY_IF_FALSE="if false";Blockly.LANG_LOGIC_TERNARY_TOOLTIP='Check the condition in "test". If the condition is true\nreturns the "if true" value, otherwise returns the "if false" value.';
Blockly.LANG_MATH_NUMBER_HELPURL="http://en.wikipedia.org/wiki/Number";Blockly.LANG_MATH_NUMBER_TOOLTIP="A number.";Blockly.LANG_MATH_ARITHMETIC_HELPURL="http://en.wikipedia.org/wiki/Arithmetic";Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_ADD="Return the sum of the two numbers.";Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MINUS="Return the difference of the two numbers.";Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MULTIPLY="Return the product of the two numbers.";Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_DIVIDE="Return the quotient of the two numbers.";
Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_POWER="Return the first number raised to\nthe power of the second number.";Blockly.LANG_MATH_SINGLE_HELPURL="http://en.wikipedia.org/wiki/Square_root";Blockly.LANG_MATH_SINGLE_OP_ROOT="square root";Blockly.LANG_MATH_SINGLE_OP_ABSOLUTE="absolute";Blockly.LANG_MATH_SINGLE_TOOLTIP_ROOT="Return the square root of a number.";Blockly.LANG_MATH_SINGLE_TOOLTIP_ABS="Return the absolute value of a number.";Blockly.LANG_MATH_SINGLE_TOOLTIP_NEG="Return the negation of a number.";
Blockly.LANG_MATH_SINGLE_TOOLTIP_LN="Return the natural logarithm of a number.";Blockly.LANG_MATH_SINGLE_TOOLTIP_LOG10="Return the base 10 logarithm of a number.";Blockly.LANG_MATH_SINGLE_TOOLTIP_EXP="Return e to the power of a number.";Blockly.LANG_MATH_SINGLE_TOOLTIP_POW10="Return 10 to the power of a number.";Blockly.LANG_MATH_TRIG_HELPURL="http://en.wikipedia.org/wiki/Trigonometric_functions";Blockly.LANG_MATH_TRIG_TOOLTIP_SIN="Return the sine of a degree (not radian).";
Blockly.LANG_MATH_TRIG_TOOLTIP_COS="Return the cosine of a degree (not radian).";Blockly.LANG_MATH_TRIG_TOOLTIP_TAN="Return the tangent of a degree (not radian).";Blockly.LANG_MATH_TRIG_TOOLTIP_ASIN="Return the arcsine of a number.";Blockly.LANG_MATH_TRIG_TOOLTIP_ACOS="Return the arccosine of a number.";Blockly.LANG_MATH_TRIG_TOOLTIP_ATAN="Return the arctangent of a number.";Blockly.LANG_MATH_CONSTANT_HELPURL="http://en.wikipedia.org/wiki/Mathematical_constant";
Blockly.LANG_MATH_CONSTANT_TOOLTIP="Return one of the common constants: \u03c0 (3.141\u2026), e (2.718\u2026), \u03c6 (1.618\u2026),\nsqrt(2) (1.414\u2026), sqrt(\u00bd) (0.707\u2026), or \u221e (infinity).";Blockly.LANG_MATH_IS_EVEN="is even";Blockly.LANG_MATH_IS_ODD="is odd";Blockly.LANG_MATH_IS_PRIME="is prime";Blockly.LANG_MATH_IS_WHOLE="is whole";Blockly.LANG_MATH_IS_POSITIVE="is positive";Blockly.LANG_MATH_IS_NEGATIVE="is negative";Blockly.LANG_MATH_IS_DIVISIBLE_BY="is divisible by";
Blockly.LANG_MATH_IS_TOOLTIP="Check if a number is an even, odd, prime, whole, positive, negative,\nor if it is divisible by certain number.  Returns true or false.";Blockly.LANG_MATH_CHANGE_HELPURL="http://en.wikipedia.org/wiki/Programming_idiom#Incrementing_a_counter";Blockly.LANG_MATH_CHANGE_TITLE_CHANGE="change";Blockly.LANG_MATH_CHANGE_TITLE_ITEM="item";Blockly.LANG_MATH_CHANGE_INPUT_BY="by";Blockly.LANG_MATH_CHANGE_TOOLTIP='Add a number to variable "%1".';Blockly.LANG_MATH_ROUND_HELPURL="http://en.wikipedia.org/wiki/Rounding";
Blockly.LANG_MATH_ROUND_TOOLTIP="Round a number up or down.";Blockly.LANG_MATH_ROUND_OPERATOR_ROUND="round";Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDUP="round up";Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDDOWN="round down";Blockly.LANG_MATH_ONLIST_HELPURL="";Blockly.LANG_MATH_ONLIST_OPERATOR_SUM="sum of list";Blockly.LANG_MATH_ONLIST_OPERATOR_MIN="min of list";Blockly.LANG_MATH_ONLIST_OPERATOR_MAX="max of list";Blockly.LANG_MATH_ONLIST_OPERATOR_AVERAGE="average of list";
Blockly.LANG_MATH_ONLIST_OPERATOR_MEDIAN="median of list";Blockly.LANG_MATH_ONLIST_OPERATOR_MODE="modes of list";Blockly.LANG_MATH_ONLIST_OPERATOR_STD_DEV="standard deviation of list";Blockly.LANG_MATH_ONLIST_OPERATOR_RANDOM="random item of list";Blockly.LANG_MATH_ONLIST_TOOLTIP_SUM="Return the sum of all the numbers in the list.";Blockly.LANG_MATH_ONLIST_TOOLTIP_MIN="Return the smallest number in the list.";Blockly.LANG_MATH_ONLIST_TOOLTIP_MAX="Return the largest number in the list.";
Blockly.LANG_MATH_ONLIST_TOOLTIP_AVERAGE="Return the arithmetic mean of the list.";Blockly.LANG_MATH_ONLIST_TOOLTIP_MEDIAN="Return the median number in the list.";Blockly.LANG_MATH_ONLIST_TOOLTIP_MODE="Return a list of the most common item(s) in the list.";Blockly.LANG_MATH_ONLIST_TOOLTIP_STD_DEV="Return the standard deviation of the list.";Blockly.LANG_MATH_ONLIST_TOOLTIP_RANDOM="Return a random element from the list.";Blockly.LANG_MATH_MODULO_HELPURL="http://en.wikipedia.org/wiki/Modulo_operation";
Blockly.LANG_MATH_MODULO_INPUT_DIVIDEND="remainder of";Blockly.LANG_MATH_MODULO_TOOLTIP="Return the remainder from dividing the two numbers.";Blockly.LANG_MATH_CONSTRAIN_HELPURL="http://en.wikipedia.org/wiki/Clamping_%28graphics%29";Blockly.LANG_MATH_CONSTRAIN_INPUT_CONSTRAIN="constrain";Blockly.LANG_MATH_CONSTRAIN_INPUT_LOW="low";Blockly.LANG_MATH_CONSTRAIN_INPUT_HIGH="high";Blockly.LANG_MATH_CONSTRAIN_TOOLTIP="Constrain a number to be between the specified limits (inclusive).";
Blockly.LANG_MATH_RANDOM_INT_HELPURL="http://en.wikipedia.org/wiki/Random_number_generation";Blockly.LANG_MATH_RANDOM_INT_INPUT_FROM="random integer from";Blockly.LANG_MATH_RANDOM_INT_INPUT_TO="to";Blockly.LANG_MATH_RANDOM_INT_TOOLTIP="Return a random integer between the two\nspecified limits, inclusive.";Blockly.LANG_MATH_RANDOM_FLOAT_HELPURL="http://en.wikipedia.org/wiki/Random_number_generation";Blockly.LANG_MATH_RANDOM_FLOAT_TITLE_RANDOM="random fraction";
Blockly.LANG_MATH_RANDOM_FLOAT_TOOLTIP="Return a random fraction between\n0.0 (inclusive) and 1.0 (exclusive).";Blockly.LANG_TEXT_TEXT_HELPURL="http://en.wikipedia.org/wiki/String_(computer_science)";Blockly.LANG_TEXT_TEXT_TOOLTIP="A letter, word, or line of text.";Blockly.LANG_TEXT_JOIN_HELPURL="";Blockly.LANG_TEXT_JOIN_TITLE_CREATEWITH="create text with";Blockly.LANG_TEXT_JOIN_TOOLTIP="Create a piece of text by joining\ntogether any number of items.";Blockly.LANG_TEXT_CREATE_JOIN_TITLE_JOIN="join";
Blockly.LANG_TEXT_CREATE_JOIN_TOOLTIP="Add, remove, or reorder sections to reconfigure this text block.";Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TITLE_ITEM="item";Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TOOLTIP="Add an item to the text.";Blockly.LANG_TEXT_APPEND_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_TEXT_APPEND_TO="to";Blockly.LANG_TEXT_APPEND_APPENDTEXT="append text";Blockly.LANG_TEXT_APPEND_VARIABLE="item";Blockly.LANG_TEXT_APPEND_TOOLTIP='Append some text to variable "%1".';
Blockly.LANG_TEXT_LENGTH_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_TEXT_LENGTH_INPUT_LENGTH="length of";Blockly.LANG_TEXT_LENGTH_TOOLTIP="Returns number of letters (including spaces)\nin the provided text.";Blockly.LANG_TEXT_ISEMPTY_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_TEXT_ISEMPTY_INPUT_ISEMPTY="is empty";Blockly.LANG_TEXT_ISEMPTY_TOOLTIP="Returns true if the provided text is empty.";
Blockly.LANG_TEXT_INDEXOF_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_TEXT_INDEXOF_INPUT_INTEXT="in text";Blockly.LANG_TEXT_INDEXOF_OPERATOR_FIRST="find first occurrence of text";Blockly.LANG_TEXT_INDEXOF_OPERATOR_LAST="find last occurrence of text";Blockly.LANG_TEXT_INDEXOF_TOOLTIP="Returns the index of the first/last occurrence\nof first text in the second text.\nReturns 0 if text is not found.";
Blockly.LANG_TEXT_CHARAT_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_TEXT_CHARAT_INPUT_INTEXT="in text";Blockly.LANG_TEXT_CHARAT_FROM_START="get letter #";Blockly.LANG_TEXT_CHARAT_FROM_END="get letter # from end";Blockly.LANG_TEXT_CHARAT_FIRST="get first letter";Blockly.LANG_TEXT_CHARAT_LAST="get last letter";Blockly.LANG_TEXT_CHARAT_RANDOM="get random letter";
Blockly.LANG_TEXT_CHARAT_TOOLTIP="Returns the letter at the specified position.";Blockly.LANG_TEXT_SUBSTRING_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_TEXT_SUBSTRING_INPUT_IN_TEXT="in text";Blockly.LANG_TEXT_SUBSTRING_INPUT_AT1="get substring from";Blockly.LANG_TEXT_SUBSTRING_INPUT_AT2="to";Blockly.LANG_TEXT_SUBSTRING_FROM_START="letter #";Blockly.LANG_TEXT_SUBSTRING_FROM_END="letter # from end";
Blockly.LANG_TEXT_SUBSTRING_FIRST="first letter";Blockly.LANG_TEXT_SUBSTRING_LAST="last letter";Blockly.LANG_TEXT_SUBSTRING_TOOLTIP="Returns a specified portion of the text.";Blockly.LANG_TEXT_CHANGECASE_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_TEXT_CHANGECASE_OPERATOR_UPPERCASE="to UPPER CASE";Blockly.LANG_TEXT_CHANGECASE_OPERATOR_LOWERCASE="to lower case";Blockly.LANG_TEXT_CHANGECASE_OPERATOR_TITLECASE="to Title Case";
Blockly.LANG_TEXT_CHANGECASE_TOOLTIP="Return a copy of the text in a different case.";Blockly.LANG_TEXT_TRIM_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_TEXT_TRIM_OPERATOR_BOTH="trim spaces from both sides";Blockly.LANG_TEXT_TRIM_OPERATOR_LEFT="trim spaces from left side";Blockly.LANG_TEXT_TRIM_OPERATOR_RIGHT="trim spaces from right side";Blockly.LANG_TEXT_TRIM_TOOLTIP="Return a copy of the text with spaces\nremoved from one or both ends.";
Blockly.LANG_TEXT_PRINT_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_TEXT_PRINT_TITLE_PRINT="print";Blockly.LANG_TEXT_PRINT_TOOLTIP="Print the specified text, number or other value.";Blockly.LANG_TEXT_PROMPT_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode92.html";Blockly.LANG_TEXT_PROMPT_TYPE_TEXT="prompt for text with message";Blockly.LANG_TEXT_PROMPT_TYPE_NUMBER="prompt for number with message";
Blockly.LANG_TEXT_PROMPT_TOOLTIP_NUMBER="Prompt for user for a number.";Blockly.LANG_TEXT_PROMPT_TOOLTIP_TEXT="Prompt for user for some text.";Blockly.LANG_LISTS_CREATE_EMPTY_HELPURL="http://en.wikipedia.org/wiki/Linked_list#Empty_lists";Blockly.LANG_LISTS_CREATE_EMPTY_TITLE="create empty list";Blockly.LANG_LISTS_CREATE_EMPTY_TOOLTIP="Returns a list, of length 0, containing no data records";Blockly.LANG_LISTS_CREATE_WITH_INPUT_WITH="create list with";Blockly.LANG_LISTS_CREATE_WITH_TOOLTIP="Create a list with any number of items.";
Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TITLE_ADD="list";Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TOOLTIP="Add, remove, or reorder sections to reconfigure this list block.";Blockly.LANG_LISTS_CREATE_WITH_ITEM_TITLE="item";Blockly.LANG_LISTS_CREATE_WITH_ITEM_TOOLTIP="Add an item to the list.";Blockly.LANG_LISTS_REPEAT_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_LISTS_REPEAT_INPUT_WITH="create list with item";
Blockly.LANG_LISTS_REPEAT_INPUT_REPEATED="repeated";Blockly.LANG_LISTS_REPEAT_INPUT_TIMES="times";Blockly.LANG_LISTS_REPEAT_TOOLTIP="Creates a list consisting of the given value\nrepeated the specified number of times.";Blockly.LANG_LISTS_LENGTH_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";Blockly.LANG_LISTS_LENGTH_INPUT_LENGTH="length of";Blockly.LANG_LISTS_LENGTH_TOOLTIP="Returns the length of a list.";Blockly.LANG_LISTS_IS_EMPTY_HELPURL="http://www.liv.ac.uk/HPC/HTMLF90Course/HTMLF90CourseNotesnode91.html";
Blockly.LANG_LISTS_INPUT_IS_EMPTY="is empty";Blockly.LANG_LISTS_TOOLTIP="Returns true if the list is empty.";Blockly.LANG_LISTS_INDEX_OF_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_LISTS_INDEX_OF_INPUT_IN_LIST="in list";Blockly.LANG_LISTS_INDEX_OF_FIRST="find first occurrence of item";Blockly.LANG_LISTS_INDEX_OF_LAST="find last occurrence of item";Blockly.LANG_LISTS_INDEX_OF_TOOLTIP="Returns the index of the first/last occurrence\nof the item in the list.\nReturns 0 if text is not found.";
Blockly.LANG_LISTS_GET_INDEX_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_LISTS_GET_INDEX_GET="get";Blockly.LANG_LISTS_GET_INDEX_GET_REMOVE="get and remove";Blockly.LANG_LISTS_GET_INDEX_REMOVE="remove";Blockly.LANG_LISTS_GET_INDEX_FROM_START="#";Blockly.LANG_LISTS_GET_INDEX_FROM_END="# from end";Blockly.LANG_LISTS_GET_INDEX_FIRST="first";Blockly.LANG_LISTS_GET_INDEX_LAST="last";
Blockly.LANG_LISTS_GET_INDEX_RANDOM="random";Blockly.LANG_LISTS_GET_INDEX_INPUT_IN_LIST="in list";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_FROM_START="Returns the item at the specified position in a list.\n#1 is the first item.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_FROM_END="Returns the item at the specified position in a list.\n#1 is the last item.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_FIRST="Returns the first item in a list.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_LAST="Returns the last item in a list.";
Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_RANDOM="Returns a random item in a list.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_REMOVE_FROM_START="Removes and returns the item at the specified position\n in a list.  #1 is the first item.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_REMOVE_FROM_END="Removes and returns the item at the specified position\n in a list.  #1 is the last item.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_REMOVE_FIRST="Removes and returns the first item in a list.";
Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_REMOVE_LAST="Removes and returns the last item in a list.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_GET_REMOVE_RANDOM="Removes and returns a random item in a list.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_REMOVE_FROM_START="Removes the item at the specified position\n in a list.  #1 is the first item.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_REMOVE_FROM_END="Removes the item at the specified position\n in a list.  #1 is the last item.";
Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_REMOVE_FIRST="Removes the first item in a list.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_REMOVE_LAST="Removes the last item in a list.";Blockly.LANG_LISTS_GET_INDEX_TOOLTIP_REMOVE_RANDOM="Removes a random item in a list.";Blockly.LANG_LISTS_SET_INDEX_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_LISTS_SET_INDEX_INPUT_IN_LIST="in list";
Blockly.LANG_LISTS_SET_INDEX_SET="set";Blockly.LANG_LISTS_SET_INDEX_INSERT="insert at";Blockly.LANG_LISTS_SET_INDEX_INPUT_TO="as";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_SET_FROM_START="Sets the item at the specified position in a list.\n#1 is the first item.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_SET_FROM_END="Sets the item at the specified position in a list.\n#1 is the last item.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_SET_FIRST="Sets the first item in a list.";
Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_SET_LAST="Sets the last item in a list.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_SET_RANDOM="Sets a random item in a list.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_INSERT_FROM_START="Inserts the item at the specified position in a list.\n#1 is the first item.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_INSERT_FROM_END="Inserts the item at the specified position in a list.\n#1 is the last item.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_INSERT_FIRST="Inserts the item at the start of a list.";
Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_INSERT_LAST="Append the item to the end of a list.";Blockly.LANG_LISTS_SET_INDEX_TOOLTIP_INSERT_RANDOM="Inserts the item randomly in a list.";Blockly.LANG_LISTS_GET_SUBLIST_HELPURL="http://publib.boulder.ibm.com/infocenter/lnxpcomp/v8v101/index.jsp?topic=%2Fcom.ibm.xlcpp8l.doc%2Flanguage%2Fref%2Farsubex.htm";Blockly.LANG_LISTS_GET_SUBLIST_INPUT_IN_LIST="in list";Blockly.LANG_LISTS_GET_SUBLIST_INPUT_AT1="get sub-list from";
Blockly.LANG_LISTS_GET_SUBLIST_INPUT_AT2="to";Blockly.LANG_LISTS_GET_SUBLIST_TOOLTIP="Creates a copy of the specified portion of a list.";Blockly.LANG_VARIABLES_GET_HELPURL="http://en.wikipedia.org/wiki/Variable_(computer_science)";Blockly.LANG_VARIABLES_GET_TITLE="get";Blockly.LANG_VARIABLES_GET_ITEM="item";Blockly.LANG_VARIABLES_GET_TOOLTIP="Returns the value of this variable.";Blockly.LANG_VARIABLES_GET_CREATE_SET='Create "set %1"';Blockly.LANG_VARIABLES_SET_HELPURL="http://en.wikipedia.org/wiki/Variable_(computer_science)";
Blockly.LANG_VARIABLES_SET_TITLE="set";Blockly.LANG_VARIABLES_SET_ITEM="item";Blockly.LANG_VARIABLES_SET_TOOLTIP="Sets this variable to be equal to the input.";Blockly.LANG_VARIABLES_SET_CREATE_GET='Create "get %1"';Blockly.LANG_PROCEDURES_DEFNORETURN_HELPURL="http://en.wikipedia.org/wiki/Procedure_%28computer_science%29";Blockly.LANG_PROCEDURES_DEFNORETURN_PROCEDURE="procedure";Blockly.LANG_PROCEDURES_DEFNORETURN_DO="do";Blockly.LANG_PROCEDURES_DEFNORETURN_TOOLTIP="A procedure with no return value.";
Blockly.LANG_PROCEDURES_DEFRETURN_HELPURL="http://en.wikipedia.org/wiki/Procedure_%28computer_science%29";Blockly.LANG_PROCEDURES_DEFRETURN_PROCEDURE=Blockly.LANG_PROCEDURES_DEFNORETURN_PROCEDURE;Blockly.LANG_PROCEDURES_DEFRETURN_DO=Blockly.LANG_PROCEDURES_DEFNORETURN_DO;Blockly.LANG_PROCEDURES_DEFRETURN_RETURN="return";Blockly.LANG_PROCEDURES_DEFRETURN_TOOLTIP="A procedure with a return value.";Blockly.LANG_PROCEDURES_DEF_DUPLICATE_WARNING="Warning:\nThis procedure has\nduplicate parameters.";
Blockly.LANG_PROCEDURES_CALLNORETURN_HELPURL="http://en.wikipedia.org/wiki/Procedure_%28computer_science%29";Blockly.LANG_PROCEDURES_CALLNORETURN_CALL="do";Blockly.LANG_PROCEDURES_CALLNORETURN_PROCEDURE="procedure";Blockly.LANG_PROCEDURES_CALLNORETURN_TOOLTIP="Call a procedure with no return value.";Blockly.LANG_PROCEDURES_CALLRETURN_HELPURL="http://en.wikipedia.org/wiki/Procedure_%28computer_science%29";Blockly.LANG_PROCEDURES_CALLRETURN_CALL=Blockly.LANG_PROCEDURES_CALLNORETURN_CALL;
Blockly.LANG_PROCEDURES_CALLRETURN_PROCEDURE=Blockly.LANG_PROCEDURES_CALLNORETURN_PROCEDURE;Blockly.LANG_PROCEDURES_CALLRETURN_TOOLTIP="Call a procedure with a return value.";Blockly.LANG_PROCEDURES_MUTATORCONTAINER_TITLE="parameters";Blockly.LANG_PROCEDURES_MUTATORARG_TITLE="variable:";Blockly.LANG_PROCEDURES_HIGHLIGHT_DEF="Highlight Procedure";Blockly.LANG_PROCEDURES_CREATE_DO='Create "do %1"';Blockly.LANG_PROCEDURES_IFRETURN_TOOLTIP="If a value is true, then return a value.";
Blockly.LANG_PROCEDURES_IFRETURN_WARNING="Warning:\nThis block may only be\nused within a procedure.";Blockly.Language.colour_picker={helpUrl:Blockly.LANG_COLOUR_PICKER_HELPURL,init:function(){this.setColour(20);this.appendDummyInput().appendTitle(new Blockly.FieldColour("#ff0000"),"COLOUR");this.setOutput(!0,"Colour");this.setTooltip(Blockly.LANG_COLOUR_PICKER_TOOLTIP)}};Blockly.Language.colour_random={helpUrl:Blockly.LANG_COLOUR_RANDOM_HELPURL,init:function(){this.setColour(20);this.appendDummyInput().appendTitle(Blockly.LANG_COLOUR_RANDOM_TITLE);this.setOutput(!0,"Colour");this.setTooltip(Blockly.LANG_COLOUR_RANDOM_TOOLTIP)}};
Blockly.Language.colour_rgb={helpUrl:Blockly.LANG_COLOUR_RGB_HELPURL,init:function(){this.setColour(20);this.appendValueInput("RED").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_COLOUR_RGB_TITLE).appendTitle(Blockly.LANG_COLOUR_RGB_RED);this.appendValueInput("GREEN").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_COLOUR_RGB_GREEN);this.appendValueInput("BLUE").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_COLOUR_RGB_BLUE);
this.setOutput(!0,"Colour");this.setTooltip(Blockly.LANG_COLOUR_RGB_TOOLTIP)}};
Blockly.Language.colour_blend={helpUrl:Blockly.LANG_COLOUR_BLEND_HELPURL,init:function(){this.setColour(20);this.appendValueInput("COLOUR1").setCheck("Colour").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_COLOUR_BLEND_TITLE).appendTitle(Blockly.LANG_COLOUR_BLEND_COLOUR1);this.appendValueInput("COLOUR2").setCheck("Colour").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_COLOUR_BLEND_COLOUR2);this.appendValueInput("RATIO").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_COLOUR_BLEND_RATIO);this.setOutput(!0,
"Colour");this.setTooltip(Blockly.LANG_COLOUR_BLEND_TOOLTIP)}};Blockly.Language.text={helpUrl:Blockly.LANG_TEXT_TEXT_HELPURL,init:function(){this.setColour(160);this.appendDummyInput().appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote0.png",12,12)).appendTitle(new Blockly.FieldTextInput(""),"TEXT").appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote1.png",12,12));this.setOutput(!0,"String");this.setTooltip(Blockly.LANG_TEXT_TEXT_TOOLTIP)}};
Blockly.Language.text_join={helpUrl:Blockly.LANG_TEXT_JOIN_HELPURL,init:function(){this.setColour(160);this.appendValueInput("ADD0").appendTitle(Blockly.LANG_TEXT_JOIN_TITLE_CREATEWITH);this.appendValueInput("ADD1");this.setOutput(!0,"String");this.setMutator(new Blockly.Mutator(["text_create_join_item"]));this.setTooltip(Blockly.LANG_TEXT_JOIN_TOOLTIP);this.itemCount_=2},mutationToDom:function(){var a=document.createElement("mutation");a.setAttribute("items",this.itemCount_);return a},domToMutation:function(a){for(var b=
0;b<this.itemCount_;b++)this.removeInput("ADD"+b);this.itemCount_=window.parseInt(a.getAttribute("items"),10);for(b=0;b<this.itemCount_;b++)a=this.appendValueInput("ADD"+b),0==b&&a.appendTitle(Blockly.LANG_TEXT_JOIN_TITLE_CREATEWITH);0==this.itemCount_&&this.appendDummyInput("EMPTY").appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote0.png",12,12)).appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote1.png",12,12))},decompose:function(a){var b=new Blockly.Block(a,
"text_create_join_container");b.initSvg();for(var c=b.getInput("STACK").connection,d=0;d<this.itemCount_;d++){var e=new Blockly.Block(a,"text_create_join_item");e.initSvg();c.connect(e.previousConnection);c=e.nextConnection}return b},compose:function(a){if(0==this.itemCount_)this.removeInput("EMPTY");else for(var b=this.itemCount_-1;0<=b;b--)this.removeInput("ADD"+b);this.itemCount_=0;for(a=a.getInputTargetBlock("STACK");a;)b=this.appendValueInput("ADD"+this.itemCount_),0==this.itemCount_&&b.appendTitle(Blockly.LANG_TEXT_JOIN_TITLE_CREATEWITH),
a.valueConnection_&&b.connection.connect(a.valueConnection_),this.itemCount_++,a=a.nextConnection&&a.nextConnection.targetBlock();0==this.itemCount_&&this.appendDummyInput("EMPTY").appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote0.png",12,12)).appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote1.png",12,12))},saveConnections:function(a){a=a.getInputTargetBlock("STACK");for(var b=0;a;){var c=this.getInput("ADD"+b);a.valueConnection_=c&&c.connection.targetConnection;
b++;a=a.nextConnection&&a.nextConnection.targetBlock()}}};Blockly.Language.text_create_join_container={init:function(){this.setColour(160);this.appendDummyInput().appendTitle(Blockly.LANG_TEXT_CREATE_JOIN_TITLE_JOIN);this.appendStatementInput("STACK");this.setTooltip(Blockly.LANG_TEXT_CREATE_JOIN_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.text_create_join_item={init:function(){this.setColour(160);this.appendDummyInput().appendTitle(Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TITLE_ITEM);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_TEXT_CREATE_JOIN_ITEM_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.text_append={helpUrl:Blockly.LANG_TEXT_APPEND_HELPURL,init:function(){this.setColour(160);this.appendValueInput("TEXT").appendTitle(Blockly.LANG_TEXT_APPEND_TO).appendTitle(new Blockly.FieldVariable(Blockly.LANG_TEXT_APPEND_VARIABLE),"VAR").appendTitle(Blockly.LANG_TEXT_APPEND_APPENDTEXT);this.setPreviousStatement(!0);this.setNextStatement(!0);var a=this;this.setTooltip(function(){return Blockly.LANG_TEXT_APPEND_TOOLTIP.replace("%1",a.getTitleValue("VAR"))})},getVars:function(){return[this.getTitleValue("VAR")]},
renameVar:function(a,b){Blockly.Names.equals(a,this.getTitleValue("VAR"))&&this.setTitleValue(b,"VAR")}};Blockly.Language.text_length={helpUrl:Blockly.LANG_TEXT_LENGTH_HELPURL,init:function(){this.setColour(160);this.appendValueInput("VALUE").setCheck(["String","Array"]).appendTitle(Blockly.LANG_TEXT_LENGTH_INPUT_LENGTH);this.setOutput(!0,"Number");this.setTooltip(Blockly.LANG_TEXT_LENGTH_TOOLTIP)}};
Blockly.Language.text_isEmpty={helpUrl:Blockly.LANG_TEXT_ISEMPTY_HELPURL,init:function(){this.setColour(160);this.appendValueInput("VALUE").setCheck(["String","Array"]);this.appendDummyInput().appendTitle(Blockly.LANG_TEXT_ISEMPTY_INPUT_ISEMPTY);this.setInputsInline(!0);this.setOutput(!0,"Boolean");this.setTooltip(Blockly.LANG_TEXT_ISEMPTY_TOOLTIP)}};
Blockly.Language.text_indexOf={helpUrl:Blockly.LANG_TEXT_INDEXOF_HELPURL,init:function(){this.setColour(160);this.setOutput(!0,"Number");this.appendValueInput("VALUE").setCheck("String").appendTitle(Blockly.LANG_TEXT_INDEXOF_INPUT_INTEXT);this.appendValueInput("FIND").setCheck("String").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"END");this.setInputsInline(!0);this.setTooltip(Blockly.LANG_TEXT_INDEXOF_TOOLTIP)}};
Blockly.Language.text_indexOf.OPERATORS=[[Blockly.LANG_TEXT_INDEXOF_OPERATOR_FIRST,"FIRST"],[Blockly.LANG_TEXT_INDEXOF_OPERATOR_LAST,"LAST"]];
Blockly.Language.text_charAt={helpUrl:Blockly.LANG_TEXT_CHARAT_HELPURL,init:function(){this.setColour(160);this.setOutput(!0,"String");this.appendValueInput("VALUE").setCheck("String").appendTitle(Blockly.LANG_TEXT_CHARAT_INPUT_INTEXT);this.appendDummyInput("AT");this.setInputsInline(!0);this.updateAt(!0);this.setTooltip(Blockly.LANG_TEXT_CHARAT_TOOLTIP)},mutationToDom:function(){var a=document.createElement("mutation"),b=this.getInput("AT").type==Blockly.INPUT_VALUE;a.setAttribute("at",b);return a},
domToMutation:function(a){a="false"!=a.getAttribute("at");this.updateAt(a)},updateAt:function(a){this.removeInput("AT");a?this.appendValueInput("AT").setCheck("Number"):this.appendDummyInput("AT");var b=new Blockly.FieldDropdown(this.WHERE,function(b){var d="FROM_START"==b||"FROM_END"==b;if(d!=a){var e=this.sourceBlock_;e.updateAt(d);e.setTitleValue(b,"WHERE");return null}});this.getInput("AT").appendTitle(b,"WHERE")}};
Blockly.Language.text_charAt.WHERE=[[Blockly.LANG_TEXT_CHARAT_FROM_START,"FROM_START"],[Blockly.LANG_TEXT_CHARAT_FROM_END,"FROM_END"],[Blockly.LANG_TEXT_CHARAT_FIRST,"FIRST"],[Blockly.LANG_TEXT_CHARAT_LAST,"LAST"],[Blockly.LANG_TEXT_CHARAT_RANDOM,"RANDOM"]];
Blockly.Language.text_getSubstring={helpUrl:Blockly.LANG_TEXT_SUBSTRING_HELPURL,init:function(){this.setColour(160);this.appendValueInput("STRING").setCheck("String").appendTitle(Blockly.LANG_TEXT_SUBSTRING_INPUT_IN_TEXT);this.appendDummyInput("AT1");this.appendDummyInput("AT2");this.setInputsInline(!0);this.setOutput(!0,"String");this.updateAt(1,!0);this.updateAt(2,!0);this.setTooltip(Blockly.LANG_TEXT_SUBSTRING_TOOLTIP)},mutationToDom:function(){var a=document.createElement("mutation"),b=this.getInput("AT1").type==
Blockly.INPUT_VALUE;a.setAttribute("at1",b);b=this.getInput("AT2").type==Blockly.INPUT_VALUE;a.setAttribute("at2",b);return a},domToMutation:function(a){var b="true"==a.getAttribute("at1");a="true"==a.getAttribute("at1");this.updateAt(1,b);this.updateAt(2,a)},updateAt:function(a,b){this.removeInput("AT"+a);b?this.appendValueInput("AT"+a).setCheck("Number"):this.appendDummyInput("AT"+a);var c=new Blockly.FieldDropdown(this["WHERE"+a],function(c){var e="FROM_START"==c||"FROM_END"==c;if(e!=b){var f=
this.sourceBlock_;f.updateAt(a,e);f.setTitleValue(c,"WHERE"+a);return null}});this.getInput("AT"+a).appendTitle(Blockly["LANG_TEXT_SUBSTRING_INPUT_AT"+a]).appendTitle(c,"WHERE"+a);1==a&&this.moveInputBefore("AT1","AT2")}};Blockly.Language.text_getSubstring.WHERE1=[[Blockly.LANG_TEXT_SUBSTRING_FROM_START,"FROM_START"],[Blockly.LANG_TEXT_SUBSTRING_FROM_END,"FROM_END"],[Blockly.LANG_TEXT_SUBSTRING_FIRST,"FIRST"]];
Blockly.Language.text_getSubstring.WHERE2=[[Blockly.LANG_TEXT_SUBSTRING_FROM_START,"FROM_START"],[Blockly.LANG_TEXT_SUBSTRING_FROM_END,"FROM_END"],[Blockly.LANG_TEXT_SUBSTRING_LAST,"LAST"]];Blockly.Language.text_changeCase={helpUrl:Blockly.LANG_TEXT_CHANGECASE_HELPURL,init:function(){this.setColour(160);this.appendValueInput("TEXT").setCheck("String").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"CASE");this.setOutput(!0,"String");this.setTooltip(Blockly.LANG_TEXT_CHANGECASE_TOOLTIP)}};
Blockly.Language.text_changeCase.OPERATORS=[[Blockly.LANG_TEXT_CHANGECASE_OPERATOR_UPPERCASE,"UPPERCASE"],[Blockly.LANG_TEXT_CHANGECASE_OPERATOR_LOWERCASE,"LOWERCASE"],[Blockly.LANG_TEXT_CHANGECASE_OPERATOR_TITLECASE,"TITLECASE"]];Blockly.Language.text_trim={helpUrl:Blockly.LANG_TEXT_TRIM_HELPURL,init:function(){this.setColour(160);this.appendValueInput("TEXT").setCheck("String").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"MODE");this.setOutput(!0,"String");this.setTooltip(Blockly.LANG_TEXT_TRIM_TOOLTIP)}};
Blockly.Language.text_trim.OPERATORS=[[Blockly.LANG_TEXT_TRIM_OPERATOR_BOTH,"BOTH"],[Blockly.LANG_TEXT_TRIM_OPERATOR_LEFT,"LEFT"],[Blockly.LANG_TEXT_TRIM_OPERATOR_RIGHT,"RIGHT"]];Blockly.Language.text_print={helpUrl:Blockly.LANG_TEXT_PRINT_HELPURL,init:function(){this.setColour(160);this.appendValueInput("TEXT").appendTitle(Blockly.LANG_TEXT_PRINT_TITLE_PRINT);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_TEXT_PRINT_TOOLTIP)}};
Blockly.Language.text_prompt={helpUrl:Blockly.LANG_TEXT_PROMPT_HELPURL,init:function(){var a=this;this.setColour(160);var b=new Blockly.FieldDropdown(this.TYPES,function(b){"NUMBER"==b?a.outputConnection.setCheck("Number"):a.outputConnection.setCheck("String")});this.appendDummyInput().appendTitle(b,"TYPE").appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+"media/quote0.png",12,12)).appendTitle(new Blockly.FieldTextInput(""),"TEXT").appendTitle(new Blockly.FieldImage(Blockly.pathToBlockly+
"media/quote1.png",12,12));this.setOutput(!0,"String");a=this;this.setTooltip(function(){return"TEXT"==a.getTitleValue("TYPE")?Blockly.LANG_TEXT_PROMPT_TOOLTIP_TEXT:Blockly.LANG_TEXT_PROMPT_TOOLTIP_NUMBER})}};Blockly.Language.text_prompt.TYPES=[[Blockly.LANG_TEXT_PROMPT_TYPE_TEXT,"TEXT"],[Blockly.LANG_TEXT_PROMPT_TYPE_NUMBER,"NUMBER"]];Blockly.Language.variables_get={category:null,helpUrl:Blockly.LANG_VARIABLES_GET_HELPURL,init:function(){this.setColour(330);this.appendDummyInput().appendTitle(Blockly.LANG_VARIABLES_GET_TITLE).appendTitle(new Blockly.FieldVariable(Blockly.LANG_VARIABLES_GET_ITEM),"VAR");this.setOutput(!0);this.setTooltip(Blockly.LANG_VARIABLES_GET_TOOLTIP)},getVars:function(){return[this.getTitleValue("VAR")]},renameVar:function(a,b){Blockly.Names.equals(a,this.getTitleValue("VAR"))&&this.setTitleValue(b,"VAR")},
contextMenuMsg_:Blockly.LANG_VARIABLES_GET_CREATE_SET,contextMenuType_:"variables_set",customContextMenu:function(a){var b={enabled:!0},c=this.getTitleValue("VAR");b.text=this.contextMenuMsg_.replace("%1",c);c=goog.dom.createDom("title",null,c);c.setAttribute("name","VAR");c=goog.dom.createDom("block",null,c);c.setAttribute("type",this.contextMenuType_);b.callback=Blockly.ContextMenu.callbackFactory(this,c);a.push(b)}};
Blockly.Language.variables_set={category:null,helpUrl:Blockly.LANG_VARIABLES_SET_HELPURL,init:function(){this.setColour(330);this.appendValueInput("VALUE").appendTitle(Blockly.LANG_VARIABLES_SET_TITLE).appendTitle(new Blockly.FieldVariable(Blockly.LANG_VARIABLES_SET_ITEM),"VAR");this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_VARIABLES_SET_TOOLTIP)},getVars:function(){return[this.getTitleValue("VAR")]},renameVar:function(a,b){Blockly.Names.equals(a,this.getTitleValue("VAR"))&&
this.setTitleValue(b,"VAR")},contextMenuMsg_:Blockly.LANG_VARIABLES_SET_CREATE_GET,contextMenuType_:"variables_get",customContextMenu:Blockly.Language.variables_get.customContextMenu};Blockly.Language.math_number={helpUrl:Blockly.LANG_MATH_NUMBER_HELPURL,init:function(){this.setColour(230);this.appendDummyInput().appendTitle(new Blockly.FieldTextInput("0",Blockly.FieldTextInput.numberValidator),"NUM");this.setOutput(!0,"Number");this.setTooltip(Blockly.LANG_MATH_NUMBER_TOOLTIP)}};
Blockly.Language.math_arithmetic={helpUrl:Blockly.LANG_MATH_ARITHMETIC_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("A").setCheck("Number");this.appendValueInput("B").setCheck("Number").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"OP");this.setInputsInline(!0);var a=this;this.setTooltip(function(){var b=a.getTitleValue("OP");return a.TOOLTIPS[b]})}};
Blockly.Language.math_arithmetic.OPERATORS=[["+","ADD"],["-","MINUS"],["\u00d7","MULTIPLY"],["\u00f7","DIVIDE"],["^","POWER"]];Blockly.Language.math_arithmetic.TOOLTIPS={ADD:Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_ADD,MINUS:Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MINUS,MULTIPLY:Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_MULTIPLY,DIVIDE:Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_DIVIDE,POWER:Blockly.LANG_MATH_ARITHMETIC_TOOLTIP_POWER};
Blockly.Language.math_single={helpUrl:Blockly.LANG_MATH_SINGLE_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("NUM").setCheck("Number").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"OP");var a=this;this.setTooltip(function(){var b=a.getTitleValue("OP");return a.TOOLTIPS[b]})}};
Blockly.Language.math_single.OPERATORS=[[Blockly.LANG_MATH_SINGLE_OP_ROOT,"ROOT"],[Blockly.LANG_MATH_SINGLE_OP_ABSOLUTE,"ABS"],["-","NEG"],["ln","LN"],["log10","LOG10"],["e^","EXP"],["10^","POW10"]];Blockly.Language.math_single.TOOLTIPS={ROOT:Blockly.LANG_MATH_SINGLE_TOOLTIP_ROOT,ABS:Blockly.LANG_MATH_SINGLE_TOOLTIP_ABS,NEG:Blockly.LANG_MATH_SINGLE_TOOLTIP_NEG,LN:Blockly.LANG_MATH_SINGLE_TOOLTIP_LN,LOG10:Blockly.LANG_MATH_SINGLE_TOOLTIP_LOG10,EXP:Blockly.LANG_MATH_SINGLE_TOOLTIP_EXP,POW10:Blockly.LANG_MATH_SINGLE_TOOLTIP_POW10};
Blockly.Language.math_trig={helpUrl:Blockly.LANG_MATH_TRIG_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("NUM").setCheck("Number").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"OP");var a=this;this.setTooltip(function(){var b=a.getTitleValue("OP");return a.TOOLTIPS[b]})}};Blockly.Language.math_trig.OPERATORS=[["sin","SIN"],["cos","COS"],["tan","TAN"],["asin","ASIN"],["acos","ACOS"],["atan","ATAN"]];
Blockly.Language.math_trig.TOOLTIPS={SIN:Blockly.LANG_MATH_TRIG_TOOLTIP_SIN,COS:Blockly.LANG_MATH_TRIG_TOOLTIP_COS,TAN:Blockly.LANG_MATH_TRIG_TOOLTIP_TAN,ASIN:Blockly.LANG_MATH_TRIG_TOOLTIP_ASIN,ACOS:Blockly.LANG_MATH_TRIG_TOOLTIP_ACOS,ATAN:Blockly.LANG_MATH_TRIG_TOOLTIP_ATAN};
Blockly.Language.math_constant={helpUrl:Blockly.LANG_MATH_CONSTANT_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendDummyInput().appendTitle(new Blockly.FieldDropdown(this.CONSTANTS),"CONSTANT");this.setTooltip(Blockly.LANG_MATH_CONSTANT_TOOLTIP)}};Blockly.Language.math_constant.CONSTANTS=[["\u03c0","PI"],["e","E"],["\u03c6","GOLDEN_RATIO"],["sqrt(2)","SQRT2"],["sqrt(\u00bd)","SQRT1_2"],["\u221e","INFINITY"]];
Blockly.Language.math_number_property={helpUrl:"",init:function(){this.setColour(230);this.appendValueInput("NUMBER_TO_CHECK").setCheck("Number");var a=new Blockly.FieldDropdown(this.PROPERTIES,function(a){this.sourceBlock_.updateShape("DIVISIBLE_BY"==a)});this.appendDummyInput().appendTitle(a,"PROPERTY");this.setInputsInline(!0);this.setOutput(!0,"Boolean");this.setTooltip(Blockly.LANG_MATH_IS_TOOLTIP)},mutationToDom:function(){var a=document.createElement("mutation"),b="DIVISIBLE_BY"==this.getTitleValue("PROPERTY");
a.setAttribute("divisor_input",b);return a},domToMutation:function(a){a="true"==a.getAttribute("divisor_input");this.updateShape(a)},updateShape:function(a){var b=this.getInput("DIVISOR");a?b||this.appendValueInput("DIVISOR").setCheck("Number"):b&&this.removeInput("DIVISOR")}};
Blockly.Language.math_number_property.PROPERTIES=[[Blockly.LANG_MATH_IS_EVEN,"EVEN"],[Blockly.LANG_MATH_IS_ODD,"ODD"],[Blockly.LANG_MATH_IS_PRIME,"PRIME"],[Blockly.LANG_MATH_IS_WHOLE,"WHOLE"],[Blockly.LANG_MATH_IS_POSITIVE,"POSITIVE"],[Blockly.LANG_MATH_IS_NEGATIVE,"NEGATIVE"],[Blockly.LANG_MATH_IS_DIVISIBLE_BY,"DIVISIBLE_BY"]];
Blockly.Language.math_change={helpUrl:Blockly.LANG_MATH_CHANGE_HELPURL,init:function(){this.setColour(230);this.appendValueInput("DELTA").setCheck("Number").appendTitle(Blockly.LANG_MATH_CHANGE_TITLE_CHANGE).appendTitle(new Blockly.FieldVariable(Blockly.LANG_MATH_CHANGE_TITLE_ITEM),"VAR").appendTitle(Blockly.LANG_MATH_CHANGE_INPUT_BY);this.setPreviousStatement(!0);this.setNextStatement(!0);var a=this;this.setTooltip(function(){return Blockly.LANG_MATH_CHANGE_TOOLTIP.replace("%1",a.getTitleValue("VAR"))})},
getVars:function(){return[this.getTitleValue("VAR")]},renameVar:function(a,b){Blockly.Names.equals(a,this.getTitleValue("VAR"))&&this.setTitleValue(b,"VAR")}};Blockly.Language.math_round={helpUrl:Blockly.LANG_MATH_ROUND_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("NUM").setCheck("Number").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"OP");this.setTooltip(Blockly.LANG_MATH_ROUND_TOOLTIP)}};
Blockly.Language.math_round.OPERATORS=[[Blockly.LANG_MATH_ROUND_OPERATOR_ROUND,"ROUND"],[Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDUP,"ROUNDUP"],[Blockly.LANG_MATH_ROUND_OPERATOR_ROUNDDOWN,"ROUNDDOWN"]];
Blockly.Language.math_on_list={helpUrl:Blockly.LANG_MATH_ONLIST_HELPURL,init:function(){var a=this;this.setColour(230);this.setOutput(!0,"Number");var b=new Blockly.FieldDropdown(this.OPERATORS,function(b){"MODE"==b?a.outputConnection.setCheck("Array"):a.outputConnection.setCheck("Number")});this.appendValueInput("LIST").setCheck("Array").appendTitle(b,"OP");this.setTooltip(function(){var b=a.getTitleValue("OP");return a.TOOLTIPS[b]})}};
Blockly.Language.math_on_list.OPERATORS=[[Blockly.LANG_MATH_ONLIST_OPERATOR_SUM,"SUM"],[Blockly.LANG_MATH_ONLIST_OPERATOR_MIN,"MIN"],[Blockly.LANG_MATH_ONLIST_OPERATOR_MAX,"MAX"],[Blockly.LANG_MATH_ONLIST_OPERATOR_AVERAGE,"AVERAGE"],[Blockly.LANG_MATH_ONLIST_OPERATOR_MEDIAN,"MEDIAN"],[Blockly.LANG_MATH_ONLIST_OPERATOR_MODE,"MODE"],[Blockly.LANG_MATH_ONLIST_OPERATOR_STD_DEV,"STD_DEV"],[Blockly.LANG_MATH_ONLIST_OPERATOR_RANDOM,"RANDOM"]];
Blockly.Language.math_on_list.TOOLTIPS={SUM:Blockly.LANG_MATH_ONLIST_TOOLTIP_SUM,MIN:Blockly.LANG_MATH_ONLIST_TOOLTIP_MIN,MAX:Blockly.LANG_MATH_ONLIST_TOOLTIP_MAX,AVERAGE:Blockly.LANG_MATH_ONLIST_TOOLTIP_AVERAGE,MEDIAN:Blockly.LANG_MATH_ONLIST_TOOLTIP_MEDIAN,MODE:Blockly.LANG_MATH_ONLIST_TOOLTIP_MODE,STD_DEV:Blockly.LANG_MATH_ONLIST_TOOLTIP_STD_DEV,RANDOM:Blockly.LANG_MATH_ONLIST_TOOLTIP_RANDOM};
Blockly.Language.math_modulo={helpUrl:Blockly.LANG_MATH_MODULO_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("DIVIDEND").setCheck("Number").appendTitle(Blockly.LANG_MATH_MODULO_INPUT_DIVIDEND);this.appendValueInput("DIVISOR").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle("\u00f7");this.setInputsInline(!0);this.setTooltip(Blockly.LANG_MATH_MODULO_TOOLTIP)}};
Blockly.Language.math_constrain={helpUrl:Blockly.LANG_MATH_CONSTRAIN_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("VALUE").setCheck("Number").appendTitle(Blockly.LANG_MATH_CONSTRAIN_INPUT_CONSTRAIN);this.appendValueInput("LOW").setCheck("Number").appendTitle(Blockly.LANG_MATH_CONSTRAIN_INPUT_LOW);this.appendValueInput("HIGH").setCheck("Number").appendTitle(Blockly.LANG_MATH_CONSTRAIN_INPUT_HIGH);this.setInputsInline(!0);this.setTooltip(Blockly.LANG_MATH_CONSTRAIN_TOOLTIP)}};
Blockly.Language.math_random_int={helpUrl:Blockly.LANG_MATH_RANDOM_INT_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendValueInput("FROM").setCheck("Number").appendTitle(Blockly.LANG_MATH_RANDOM_INT_INPUT_FROM);this.appendValueInput("TO").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_MATH_RANDOM_INT_INPUT_TO);this.setInputsInline(!0);this.setTooltip(Blockly.LANG_MATH_RANDOM_INT_TOOLTIP)}};
Blockly.Language.math_random_float={helpUrl:Blockly.LANG_MATH_RANDOM_FLOAT_HELPURL,init:function(){this.setColour(230);this.setOutput(!0,"Number");this.appendDummyInput().appendTitle(Blockly.LANG_MATH_RANDOM_FLOAT_TITLE_RANDOM);this.setTooltip(Blockly.LANG_MATH_RANDOM_FLOAT_TOOLTIP)}};Blockly.Language.procedures_defnoreturn={category:null,helpUrl:Blockly.LANG_PROCEDURES_DEFNORETURN_HELPURL,init:function(){this.setColour(290);var a=Blockly.Procedures.findLegalName(Blockly.LANG_PROCEDURES_DEFNORETURN_PROCEDURE,this);this.appendDummyInput().appendTitle(new Blockly.FieldTextInput(a,Blockly.Procedures.rename),"NAME").appendTitle("","PARAMS");this.appendStatementInput("STACK").appendTitle(Blockly.LANG_PROCEDURES_DEFNORETURN_DO);this.setMutator(new Blockly.Mutator(["procedures_mutatorarg"]));
this.setTooltip(Blockly.LANG_PROCEDURES_DEFNORETURN_TOOLTIP);this.arguments_=[]},updateParams_:function(){for(var a=!1,b={},c=0;c<this.arguments_.length;c++){if(b["arg_"+this.arguments_[c].toLowerCase()]){a=!0;break}b["arg_"+this.arguments_[c].toLowerCase()]=!0}a?this.setWarningText(Blockly.LANG_PROCEDURES_DEF_DUPLICATE_WARNING):this.setWarningText(null);a=this.arguments_.join(", ");this.setTitleValue(a,"PARAMS")},mutationToDom:function(){for(var a=document.createElement("mutation"),b=0;b<this.arguments_.length;b++){var c=
document.createElement("arg");c.setAttribute("name",this.arguments_[b]);a.appendChild(c)}return a},domToMutation:function(a){this.arguments_=[];for(var b=0,c;c=a.childNodes[b];b++)"arg"==c.nodeName.toLowerCase()&&this.arguments_.push(c.getAttribute("name"));this.updateParams_()},decompose:function(a){var b=new Blockly.Block(a,"procedures_mutatorcontainer");b.initSvg();for(var c=b.getInput("STACK").connection,d=0;d<this.arguments_.length;d++){var e=new Blockly.Block(a,"procedures_mutatorarg");e.initSvg();
e.setTitleValue(this.arguments_[d],"NAME");e.oldLocation=d;c.connect(e.previousConnection);c=e.nextConnection}Blockly.Procedures.mutateCallers(this.getTitleValue("NAME"),this.workspace,this.arguments_,null);return b},compose:function(a){this.arguments_=[];this.paramIds_=[];for(a=a.getInputTargetBlock("STACK");a;)this.arguments_.push(a.getTitleValue("NAME")),this.paramIds_.push(a.id),a=a.nextConnection&&a.nextConnection.targetBlock();this.updateParams_();Blockly.Procedures.mutateCallers(this.getTitleValue("NAME"),
this.workspace,this.arguments_,this.paramIds_)},dispose:function(){var a=this.getTitleValue("NAME");Blockly.Procedures.disposeCallers(a,this.workspace);Blockly.Block.prototype.dispose.apply(this,arguments)},getProcedureDef:function(){return[this.getTitleValue("NAME"),this.arguments_,!1]},getVars:function(){return this.arguments_},renameVar:function(a,b){for(var c=!1,d=0;d<this.arguments_.length;d++)Blockly.Names.equals(a,this.arguments_[d])&&(this.arguments_[d]=b,c=!0);if(c&&(this.updateParams_(),
this.mutator.isVisible_()))for(var c=this.mutator.workspace_.getAllBlocks(),d=0,e;e=c[d];d++)"procedures_mutatorarg"==e.type&&Blockly.Names.equals(a,e.getTitleValue("NAME"))&&e.setTitleValue(b,"NAME")},customContextMenu:function(a){var b={enabled:!0},c=this.getTitleValue("NAME");b.text=Blockly.LANG_PROCEDURES_CREATE_DO.replace("%1",c);var d=goog.dom.createDom("mutation");d.setAttribute("name",c);for(var e=0;e<this.arguments_.length;e++)c=goog.dom.createDom("arg"),c.setAttribute("name",this.arguments_[e]),
d.appendChild(c);d=goog.dom.createDom("block",null,d);d.setAttribute("type",this.callType_);b.callback=Blockly.ContextMenu.callbackFactory(this,d);a.push(b);for(e=0;e<this.arguments_.length;e++)b={enabled:!0},c=this.arguments_[e],b.text=Blockly.LANG_VARIABLES_SET_CREATE_GET.replace("%1",c),d=goog.dom.createDom("title",null,c),d.setAttribute("name","VAR"),d=goog.dom.createDom("block",null,d),d.setAttribute("type","variables_get"),b.callback=Blockly.ContextMenu.callbackFactory(this,d),a.push(b)},callType_:"procedures_callnoreturn"};
Blockly.Language.procedures_defreturn={category:null,helpUrl:Blockly.LANG_PROCEDURES_DEFRETURN_HELPURL,init:function(){this.setColour(290);var a=Blockly.Procedures.findLegalName(Blockly.LANG_PROCEDURES_DEFRETURN_PROCEDURE,this);this.appendDummyInput().appendTitle(new Blockly.FieldTextInput(a,Blockly.Procedures.rename),"NAME").appendTitle("","PARAMS");this.appendStatementInput("STACK").appendTitle(Blockly.LANG_PROCEDURES_DEFRETURN_DO);this.appendValueInput("RETURN").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_PROCEDURES_DEFRETURN_RETURN);
this.setMutator(new Blockly.Mutator(["procedures_mutatorarg"]));this.setTooltip(Blockly.LANG_PROCEDURES_DEFRETURN_TOOLTIP);this.arguments_=[]},updateParams_:Blockly.Language.procedures_defnoreturn.updateParams_,mutationToDom:Blockly.Language.procedures_defnoreturn.mutationToDom,domToMutation:Blockly.Language.procedures_defnoreturn.domToMutation,decompose:Blockly.Language.procedures_defnoreturn.decompose,compose:Blockly.Language.procedures_defnoreturn.compose,dispose:Blockly.Language.procedures_defnoreturn.dispose,
getProcedureDef:function(){return[this.getTitleValue("NAME"),this.arguments_,!0]},getVars:Blockly.Language.procedures_defnoreturn.getVars,renameVar:Blockly.Language.procedures_defnoreturn.renameVar,customContextMenu:Blockly.Language.procedures_defnoreturn.customContextMenu,callType_:"procedures_callreturn"};
Blockly.Language.procedures_mutatorcontainer={init:function(){this.setColour(290);this.appendDummyInput().appendTitle(Blockly.LANG_PROCEDURES_MUTATORCONTAINER_TITLE);this.appendStatementInput("STACK");this.setTooltip("");this.contextMenu=!1}};
Blockly.Language.procedures_mutatorarg={init:function(){this.setColour(290);this.appendDummyInput().appendTitle(Blockly.LANG_PROCEDURES_MUTATORARG_TITLE).appendTitle(new Blockly.FieldTextInput("x",this.validator),"NAME");this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip("");this.contextMenu=!1}};Blockly.Language.procedures_mutatorarg.validator=function(a){return(a=a.replace(/[\s\xa0]+/g," ").replace(/^ | $/g,""))||null};
Blockly.Language.procedures_callnoreturn={category:null,helpUrl:Blockly.LANG_PROCEDURES_CALLNORETURN_HELPURL,init:function(){this.setColour(290);this.appendDummyInput().appendTitle(Blockly.LANG_PROCEDURES_CALLNORETURN_CALL).appendTitle(Blockly.LANG_PROCEDURES_CALLNORETURN_PROCEDURE,"NAME");this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_PROCEDURES_CALLNORETURN_TOOLTIP);this.arguments_=[];this.quarkArguments_=this.quarkConnections_=null},getProcedureCall:function(){return this.getTitleValue("NAME")},
renameProcedure:function(a,b){Blockly.Names.equals(a,this.getTitleValue("NAME"))&&this.setTitleValue(b,"NAME")},setProcedureParameters:function(a,b){if(b){if(b.length!=a.length)throw"Error: paramNames and paramIds must be the same length.";this.quarkArguments_||(this.quarkConnections_={},this.quarkArguments_=a.join("\n")==this.arguments_.join("\n")?b:[]);var c=this.rendered;this.rendered=!1;for(var d=this.arguments_.length-1;0<=d;d--){var e=this.getInput("ARG"+d);if(e){var f=e.connection.targetConnection;
this.quarkConnections_[this.quarkArguments_[d]]=f;this.removeInput("ARG"+d)}}this.arguments_=[].concat(a);this.quarkArguments_=b;for(d=0;d<this.arguments_.length;d++)if(e=this.appendValueInput("ARG"+d).setAlign(Blockly.ALIGN_RIGHT).appendTitle(this.arguments_[d]),this.quarkArguments_){var g=this.quarkArguments_[d];g in this.quarkConnections_&&(f=this.quarkConnections_[g],!f||f.targetConnection||f.sourceBlock_.workspace!=this.workspace?delete this.quarkConnections_[g]:e.connection.connect(f))}(this.rendered=
c)&&this.render()}else this.quarkConnections_={},this.quarkArguments_=null},mutationToDom:function(){var a=document.createElement("mutation");a.setAttribute("name",this.getTitleValue("NAME"));for(var b=0;b<this.arguments_.length;b++){var c=document.createElement("arg");c.setAttribute("name",this.arguments_[b]);a.appendChild(c)}return a},domToMutation:function(a){var b=a.getAttribute("name");this.setTitleValue(b,"NAME");if((b=Blockly.Procedures.getDefinition(b,this.workspace))&&b.mutator.isVisible())this.setProcedureParameters(b.arguments_,
b.paramIds_);else{this.arguments_=[];for(var b=0,c;c=a.childNodes[b];b++)"arg"==c.nodeName.toLowerCase()&&this.arguments_.push(c.getAttribute("name"));this.setProcedureParameters(this.arguments_,this.arguments_)}},renameVar:function(a,b){for(var c=0;c<this.arguments_.length;c++)Blockly.Names.equals(a,this.arguments_[c])&&(this.arguments_[c]=b,this.getInput("ARG"+c).titleRow[0].setText(b))},customContextMenu:function(a){var b={enabled:!0};b.text=Blockly.LANG_PROCEDURES_HIGHLIGHT_DEF;var c=this.getTitleValue("NAME"),
d=this.workspace;b.callback=function(){var a=Blockly.Procedures.getDefinition(c,d);a&&a.select()};a.push(b)}};
Blockly.Language.procedures_callreturn={category:null,helpUrl:Blockly.LANG_PROCEDURES_CALLRETURN_HELPURL,init:function(){this.setColour(290);this.appendDummyInput().appendTitle(Blockly.LANG_PROCEDURES_CALLRETURN_CALL).appendTitle(Blockly.LANG_PROCEDURES_CALLRETURN_PROCEDURE,"NAME");this.setOutput(!0);this.setTooltip(Blockly.LANG_PROCEDURES_CALLRETURN_TOOLTIP);this.arguments_=[];this.quarkArguments_=this.quarkConnections_=null},getProcedureCall:Blockly.Language.procedures_callnoreturn.getProcedureCall,
renameProcedure:Blockly.Language.procedures_callnoreturn.renameProcedure,setProcedureParameters:Blockly.Language.procedures_callnoreturn.setProcedureParameters,mutationToDom:Blockly.Language.procedures_callnoreturn.mutationToDom,domToMutation:Blockly.Language.procedures_callnoreturn.domToMutation,renameVar:Blockly.Language.procedures_callnoreturn.renameVar,customContextMenu:Blockly.Language.procedures_callnoreturn.customContextMenu};
Blockly.Language.procedures_ifreturn={helpUrl:"http://c2.com/cgi/wiki?GuardClause",init:function(){this.setColour(290);this.appendValueInput("CONDITION").setCheck("Boolean").appendTitle(Blockly.LANG_CONTROLS_IF_MSG_IF);this.appendValueInput("VALUE").appendTitle(Blockly.LANG_PROCEDURES_DEFRETURN_RETURN);this.setInputsInline(!0);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_PROCEDURES_IFRETURN_TOOLTIP);this.hasReturnValue_=!0},mutationToDom:function(){var a=document.createElement("mutation");
a.setAttribute("value",Number(this.hasReturnValue_));return a},domToMutation:function(a){this.hasReturnValue_=1==a.getAttribute("value");this.hasReturnValue_||(this.removeInput("VALUE"),this.appendDummyInput("VALUE").appendTitle(Blockly.LANG_PROCEDURES_DEFRETURN_RETURN))},onchange:function(){if(this.workspace){var a=!1,b=this;do{if("procedures_defnoreturn"==b.type||"procedures_defreturn"==b.type){a=!0;break}b=b.getSurroundParent()}while(b);a?("procedures_defnoreturn"==b.type&&this.hasReturnValue_?
(this.removeInput("VALUE"),this.appendDummyInput("VALUE").appendTitle(Blockly.LANG_PROCEDURES_DEFRETURN_RETURN),this.hasReturnValue_=!1):"procedures_defreturn"==b.type&&!this.hasReturnValue_&&(this.removeInput("VALUE"),this.appendValueInput("VALUE").appendTitle(Blockly.LANG_PROCEDURES_DEFRETURN_RETURN),this.hasReturnValue_=!0),this.setWarningText(null)):this.setWarningText(Blockly.LANG_PROCEDURES_IFRETURN_WARNING)}}};Blockly.Language.logic_compare={helpUrl:Blockly.LANG_LOGIC_COMPARE_HELPURL,init:function(){this.setColour(120);this.setOutput(!0,"Boolean");this.appendValueInput("A");this.appendValueInput("B").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"OP");this.setInputsInline(!0);var a=this;this.setTooltip(function(){var b=a.getTitleValue("OP");return a.TOOLTIPS[b]})}};Blockly.Language.logic_compare.OPERATORS=[["=","EQ"],["\u2260","NEQ"],["<","LT"],["\u2264","LTE"],[">","GT"],["\u2265","GTE"]];
Blockly.Language.logic_compare.TOOLTIPS={EQ:Blockly.LANG_LOGIC_COMPARE_TOOLTIP_EQ,NEQ:Blockly.LANG_LOGIC_COMPARE_TOOLTIP_NEQ,LT:Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LT,LTE:Blockly.LANG_LOGIC_COMPARE_TOOLTIP_LTE,GT:Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GT,GTE:Blockly.LANG_LOGIC_COMPARE_TOOLTIP_GTE};
Blockly.Language.logic_operation={helpUrl:Blockly.LANG_LOGIC_OPERATION_HELPURL,init:function(){this.setColour(120);this.setOutput(!0,"Boolean");this.appendValueInput("A").setCheck("Boolean");this.appendValueInput("B").setCheck("Boolean").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"OP");this.setInputsInline(!0);var a=this;this.setTooltip(function(){var b=a.getTitleValue("OP");return a.TOOLTIPS[b]})}};
Blockly.Language.logic_operation.OPERATORS=[[Blockly.LANG_LOGIC_OPERATION_AND,"AND"],[Blockly.LANG_LOGIC_OPERATION_OR,"OR"]];Blockly.Language.logic_operation.TOOLTIPS={AND:Blockly.LANG_LOGIC_OPERATION_TOOLTIP_AND,OR:Blockly.LANG_LOGIC_OPERATION_TOOLTIP_OR};Blockly.Language.logic_negate={helpUrl:Blockly.LANG_LOGIC_NEGATE_HELPURL,init:function(){this.setColour(120);this.setOutput(!0,"Boolean");this.appendValueInput("BOOL").setCheck("Boolean").appendTitle(Blockly.LANG_LOGIC_NEGATE_INPUT_NOT);this.setTooltip(Blockly.LANG_LOGIC_NEGATE_TOOLTIP)}};
Blockly.Language.logic_boolean={helpUrl:Blockly.LANG_LOGIC_BOOLEAN_HELPURL,init:function(){this.setColour(120);this.setOutput(!0,"Boolean");this.appendDummyInput().appendTitle(new Blockly.FieldDropdown(this.BOOLEANS),"BOOL");this.setTooltip(Blockly.LANG_LOGIC_BOOLEAN_TOOLTIP)}};Blockly.Language.logic_boolean.BOOLEANS=[[Blockly.LANG_LOGIC_BOOLEAN_TRUE,"TRUE"],[Blockly.LANG_LOGIC_BOOLEAN_FALSE,"FALSE"]];
Blockly.Language.logic_null={helpUrl:Blockly.LANG_LOGIC_NULL_HELPURL,init:function(){this.setColour(120);this.setOutput(!0);this.appendDummyInput().appendTitle(Blockly.LANG_LOGIC_NULL);this.setTooltip(Blockly.LANG_LOGIC_NULL_TOOLTIP)}};
Blockly.Language.logic_ternary={helpUrl:Blockly.LANG_LOGIC_TERNARY_HELPURL,init:function(){this.setColour(120);this.appendValueInput("IF").setCheck("Boolean").appendTitle(Blockly.LANG_LOGIC_TERNARY_CONDITION);this.appendValueInput("THEN").appendTitle(Blockly.LANG_LOGIC_TERNARY_IF_TRUE);this.appendValueInput("ELSE").appendTitle(Blockly.LANG_LOGIC_TERNARY_IF_FALSE);this.setOutput(!0);this.setTooltip(Blockly.LANG_LOGIC_TERNARY_TOOLTIP)}};Blockly.Language.lists_create_empty={helpUrl:Blockly.LANG_LISTS_CREATE_EMPTY_HELPURL,init:function(){this.setColour(210);this.setOutput(!0,"Array");this.appendDummyInput().appendTitle(Blockly.LANG_LISTS_CREATE_EMPTY_TITLE);this.setTooltip(Blockly.LANG_LISTS_CREATE_EMPTY_TOOLTIP)}};
Blockly.Language.lists_create_with={helpUrl:"",init:function(){this.setColour(210);this.appendValueInput("ADD0").appendTitle(Blockly.LANG_LISTS_CREATE_WITH_INPUT_WITH);this.appendValueInput("ADD1");this.appendValueInput("ADD2");this.setOutput(!0,"Array");this.setMutator(new Blockly.Mutator(["lists_create_with_item"]));this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_TOOLTIP);this.itemCount_=3},mutationToDom:function(){var a=document.createElement("mutation");a.setAttribute("items",this.itemCount_);
return a},domToMutation:function(a){for(var b=0;b<this.itemCount_;b++)this.removeInput("ADD"+b);this.itemCount_=window.parseInt(a.getAttribute("items"),10);for(b=0;b<this.itemCount_;b++)a=this.appendValueInput("ADD"+b),0==b&&a.appendTitle(Blockly.LANG_LISTS_CREATE_WITH_INPUT_WITH);0==this.itemCount_&&this.appendDummyInput("EMPTY").appendTitle(Blockly.LANG_LISTS_CREATE_EMPTY_TITLE)},decompose:function(a){var b=new Blockly.Block(a,"lists_create_with_container");b.initSvg();for(var c=b.getInput("STACK").connection,
d=0;d<this.itemCount_;d++){var e=new Blockly.Block(a,"lists_create_with_item");e.initSvg();c.connect(e.previousConnection);c=e.nextConnection}return b},compose:function(a){if(0==this.itemCount_)this.removeInput("EMPTY");else for(var b=this.itemCount_-1;0<=b;b--)this.removeInput("ADD"+b);this.itemCount_=0;for(a=a.getInputTargetBlock("STACK");a;)b=this.appendValueInput("ADD"+this.itemCount_),0==this.itemCount_&&b.appendTitle(Blockly.LANG_LISTS_CREATE_WITH_INPUT_WITH),a.valueConnection_&&b.connection.connect(a.valueConnection_),
this.itemCount_++,a=a.nextConnection&&a.nextConnection.targetBlock();0==this.itemCount_&&this.appendDummyInput("EMPTY").appendTitle(Blockly.LANG_LISTS_CREATE_EMPTY_TITLE)},saveConnections:function(a){a=a.getInputTargetBlock("STACK");for(var b=0;a;){var c=this.getInput("ADD"+b);a.valueConnection_=c&&c.connection.targetConnection;b++;a=a.nextConnection&&a.nextConnection.targetBlock()}}};
Blockly.Language.lists_create_with_container={init:function(){this.setColour(210);this.appendDummyInput().appendTitle(Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TITLE_ADD);this.appendStatementInput("STACK");this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_CONTAINER_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.lists_create_with_item={init:function(){this.setColour(210);this.appendDummyInput().appendTitle(Blockly.LANG_LISTS_CREATE_WITH_ITEM_TITLE);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_LISTS_CREATE_WITH_ITEM_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.lists_repeat={helpUrl:Blockly.LANG_LISTS_REPEAT_HELPURL,init:function(){this.setColour(210);this.setOutput(!0,"Array");this.appendValueInput("ITEM").appendTitle(Blockly.LANG_LISTS_REPEAT_INPUT_WITH);this.appendValueInput("NUM").setCheck("Number").appendTitle(Blockly.LANG_LISTS_REPEAT_INPUT_REPEATED);this.appendDummyInput().appendTitle(Blockly.LANG_LISTS_REPEAT_INPUT_TIMES);this.setInputsInline(!0);this.setTooltip(Blockly.LANG_LISTS_REPEAT_TOOLTIP)}};
Blockly.Language.lists_length={helpUrl:Blockly.LANG_LISTS_LENGTH_HELPURL,init:function(){this.setColour(210);this.appendValueInput("VALUE").setCheck(["Array","String"]).appendTitle(Blockly.LANG_LISTS_LENGTH_INPUT_LENGTH);this.setOutput(!0,"Number");this.setTooltip(Blockly.LANG_LISTS_LENGTH_TOOLTIP)}};
Blockly.Language.lists_isEmpty={helpUrl:Blockly.LANG_LISTS_IS_EMPTY_HELPURL,init:function(){this.setColour(210);this.appendValueInput("VALUE").setCheck(["Array","String"]);this.appendDummyInput().appendTitle(Blockly.LANG_LISTS_INPUT_IS_EMPTY);this.setInputsInline(!0);this.setOutput(!0,"Boolean");this.setTooltip(Blockly.LANG_LISTS_TOOLTIP)}};
Blockly.Language.lists_indexOf={helpUrl:Blockly.LANG_LISTS_INDEX_OF_HELPURL,init:function(){this.setColour(210);this.setOutput(!0,"Number");this.appendValueInput("VALUE").setCheck("Array").appendTitle(Blockly.LANG_LISTS_INDEX_OF_INPUT_IN_LIST);this.appendValueInput("FIND").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"END");this.setInputsInline(!0);this.setTooltip(Blockly.LANG_LISTS_INDEX_OF_TOOLTIP)}};
Blockly.Language.lists_indexOf.OPERATORS=[[Blockly.LANG_LISTS_INDEX_OF_FIRST,"FIRST"],[Blockly.LANG_LISTS_INDEX_OF_LAST,"LAST"]];
Blockly.Language.lists_getIndex={helpUrl:Blockly.LANG_LISTS_GET_INDEX_HELPURL,init:function(){this.setColour(210);var a=new Blockly.FieldDropdown(this.MODE,function(a){this.sourceBlock_.updateStatement("REMOVE"==a)});this.appendValueInput("VALUE").setCheck("Array").appendTitle(Blockly.LANG_LISTS_GET_INDEX_INPUT_IN_LIST);this.appendDummyInput().appendTitle(a,"MODE").appendTitle("");this.appendDummyInput("AT");this.setInputsInline(!0);this.setOutput(!0,"Number");this.updateAt(!0);var b=this;this.setTooltip(function(){var a=
b.getTitleValue("MODE")+"_"+b.getTitleValue("WHERE");return Blockly["LANG_LISTS_GET_INDEX_TOOLTIP_"+a]})},mutationToDom:function(){var a=document.createElement("mutation");a.setAttribute("statement",!this.outputConnection);var b=this.getInput("AT").type==Blockly.INPUT_VALUE;a.setAttribute("at",b);return a},domToMutation:function(a){var b="true"==a.getAttribute("statement");this.updateStatement(b);a="false"!=a.getAttribute("at");this.updateAt(a)},updateStatement:function(a){a!=!this.outputConnection&&
(this.unplug(!0,!0),a?(this.setOutput(!1),this.setPreviousStatement(!0),this.setNextStatement(!0)):(this.setPreviousStatement(!1),this.setNextStatement(!1),this.setOutput(!0)))},updateAt:function(a){this.removeInput("AT");a?this.appendValueInput("AT").setCheck("Number"):this.appendDummyInput("AT");var b=new Blockly.FieldDropdown(this.WHERE,function(b){var d="FROM_START"==b||"FROM_END"==b;if(d!=a){var e=this.sourceBlock_;e.updateAt(d);e.setTitleValue(b,"WHERE");return null}});this.getInput("AT").appendTitle(b,
"WHERE")}};Blockly.Language.lists_getIndex.MODE=[[Blockly.LANG_LISTS_GET_INDEX_GET,"GET"],[Blockly.LANG_LISTS_GET_INDEX_GET_REMOVE,"GET_REMOVE"],[Blockly.LANG_LISTS_GET_INDEX_REMOVE,"REMOVE"]];Blockly.Language.lists_getIndex.WHERE=[[Blockly.LANG_LISTS_GET_INDEX_FROM_START,"FROM_START"],[Blockly.LANG_LISTS_GET_INDEX_FROM_END,"FROM_END"],[Blockly.LANG_LISTS_GET_INDEX_FIRST,"FIRST"],[Blockly.LANG_LISTS_GET_INDEX_LAST,"LAST"],[Blockly.LANG_LISTS_GET_INDEX_RANDOM,"RANDOM"]];
Blockly.Language.lists_setIndex={helpUrl:Blockly.LANG_LISTS_SET_INDEX_HELPURL,init:function(){this.setColour(210);this.appendValueInput("LIST").setCheck("Array").appendTitle(Blockly.LANG_LISTS_SET_INDEX_INPUT_IN_LIST);this.appendDummyInput().appendTitle(new Blockly.FieldDropdown(this.MODE),"MODE").appendTitle("");this.appendDummyInput("AT");this.appendValueInput("TO").appendTitle(Blockly.LANG_LISTS_SET_INDEX_INPUT_TO);this.setInputsInline(!0);this.setPreviousStatement(!0);this.setNextStatement(!0);
this.setTooltip(Blockly.LANG_LISTS_SET_INDEX_TOOLTIP);this.updateAt(!0);var a=this;this.setTooltip(function(){var b=a.getTitleValue("MODE")+"_"+a.getTitleValue("WHERE");return Blockly["LANG_LISTS_SET_INDEX_TOOLTIP_"+b]})},mutationToDom:function(){var a=document.createElement("mutation"),b=this.getInput("AT").type==Blockly.INPUT_VALUE;a.setAttribute("at",b);return a},domToMutation:function(a){a="false"!=a.getAttribute("at");this.updateAt(a)},updateAt:function(a){this.removeInput("AT");a?this.appendValueInput("AT").setCheck("Number"):
this.appendDummyInput("AT");var b=new Blockly.FieldDropdown(this.WHERE,function(b){var d="FROM_START"==b||"FROM_END"==b;if(d!=a){var e=this.sourceBlock_;e.updateAt(d);e.setTitleValue(b,"WHERE");return null}});this.moveInputBefore("AT","TO");this.getInput("AT").appendTitle(b,"WHERE")}};Blockly.Language.lists_setIndex.MODE=[[Blockly.LANG_LISTS_SET_INDEX_SET,"SET"],[Blockly.LANG_LISTS_SET_INDEX_INSERT,"INSERT"]];Blockly.Language.lists_setIndex.WHERE=Blockly.Language.lists_getIndex.WHERE;
Blockly.Language.lists_getSublist={helpUrl:Blockly.LANG_LISTS_GET_SUBLIST_HELPURL,init:function(){this.setColour(210);this.appendValueInput("LIST").setCheck("Array").appendTitle(Blockly.LANG_LISTS_GET_SUBLIST_INPUT_IN_LIST);this.appendDummyInput("AT1");this.appendDummyInput("AT2");this.setInputsInline(!0);this.setOutput(!0,"Array");this.updateAt(1,!0);this.updateAt(2,!0);this.setTooltip(Blockly.LANG_LISTS_GET_SUBLIST_TOOLTIP)},mutationToDom:function(){var a=document.createElement("mutation"),b=this.getInput("AT1").type==
Blockly.INPUT_VALUE;a.setAttribute("at1",b);b=this.getInput("AT2").type==Blockly.INPUT_VALUE;a.setAttribute("at2",b);return a},domToMutation:function(a){var b="true"==a.getAttribute("at1");a="true"==a.getAttribute("at1");this.updateAt(1,b);this.updateAt(2,a)},updateAt:function(a,b){this.removeInput("AT"+a);b?this.appendValueInput("AT"+a).setCheck("Number"):this.appendDummyInput("AT"+a);var c=new Blockly.FieldDropdown(this["WHERE"+a],function(c){var e="FROM_START"==c||"FROM_END"==c;if(e!=b){var f=
this.sourceBlock_;f.updateAt(a,e);f.setTitleValue(c,"WHERE"+a);return null}});this.getInput("AT"+a).appendTitle(Blockly["LANG_LISTS_GET_SUBLIST_INPUT_AT"+a]).appendTitle(c,"WHERE"+a);1==a&&this.moveInputBefore("AT1","AT2")}};Blockly.Language.lists_getSublist.WHERE1=Blockly.Language.lists_getIndex.WHERE.filter(function(a){return"FROM_START"==a[1]||"FROM_END"==a[1]||"FIRST"==a[1]});
Blockly.Language.lists_getSublist.WHERE2=Blockly.Language.lists_getIndex.WHERE.filter(function(a){return"FROM_START"==a[1]||"FROM_END"==a[1]||"LAST"==a[1]});Blockly.Language.controls_if={helpUrl:Blockly.LANG_CONTROLS_IF_HELPURL,init:function(){this.setColour(120);this.appendValueInput("IF0").setCheck("Boolean").appendTitle(Blockly.LANG_CONTROLS_IF_MSG_IF);this.appendStatementInput("DO0").appendTitle(Blockly.LANG_CONTROLS_IF_MSG_THEN);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setMutator(new Blockly.Mutator(["controls_if_elseif","controls_if_else"]));var a=this;this.setTooltip(function(){return!a.elseifCount_&&!a.elseCount_?Blockly.LANG_CONTROLS_IF_TOOLTIP_1:
!a.elseifCount_&&a.elseCount_?Blockly.LANG_CONTROLS_IF_TOOLTIP_2:a.elseifCount_&&!a.elseCount_?Blockly.LANG_CONTROLS_IF_TOOLTIP_3:a.elseifCount_&&a.elseCount_?Blockly.LANG_CONTROLS_IF_TOOLTIP_4:""});this.elseCount_=this.elseifCount_=0},mutationToDom:function(){if(!this.elseifCount_&&!this.elseCount_)return null;var a=document.createElement("mutation");this.elseifCount_&&a.setAttribute("elseif",this.elseifCount_);this.elseCount_&&a.setAttribute("else",1);return a},domToMutation:function(a){this.elseifCount_=
window.parseInt(a.getAttribute("elseif"),10);this.elseCount_=window.parseInt(a.getAttribute("else"),10);for(a=1;a<=this.elseifCount_;a++)this.appendValueInput("IF"+a).setCheck("Boolean").appendTitle(Blockly.LANG_CONTROLS_IF_MSG_ELSEIF),this.appendStatementInput("DO"+a).appendTitle(Blockly.LANG_CONTROLS_IF_MSG_THEN);this.elseCount_&&this.appendStatementInput("ELSE").appendTitle(Blockly.LANG_CONTROLS_IF_MSG_ELSE)},decompose:function(a){var b=new Blockly.Block(a,"controls_if_if");b.initSvg();for(var c=
b.getInput("STACK").connection,d=1;d<=this.elseifCount_;d++){var e=new Blockly.Block(a,"controls_if_elseif");e.initSvg();c.connect(e.previousConnection);c=e.nextConnection}this.elseCount_&&(a=new Blockly.Block(a,"controls_if_else"),a.initSvg(),c.connect(a.previousConnection));return b},compose:function(a){this.elseCount_&&this.removeInput("ELSE");this.elseCount_=0;for(var b=this.elseifCount_;0<b;b--)this.removeInput("IF"+b),this.removeInput("DO"+b);this.elseifCount_=0;for(a=a.getInputTargetBlock("STACK");a;){switch(a.type){case "controls_if_elseif":this.elseifCount_++;
var b=this.appendValueInput("IF"+this.elseifCount_).setCheck("Boolean").appendTitle(Blockly.LANG_CONTROLS_IF_MSG_ELSEIF),c=this.appendStatementInput("DO"+this.elseifCount_);c.appendTitle(Blockly.LANG_CONTROLS_IF_MSG_THEN);a.valueConnection_&&b.connection.connect(a.valueConnection_);a.statementConnection_&&c.connection.connect(a.statementConnection_);break;case "controls_if_else":this.elseCount_++;b=this.appendStatementInput("ELSE");b.appendTitle(Blockly.LANG_CONTROLS_IF_MSG_ELSE);a.statementConnection_&&
b.connection.connect(a.statementConnection_);break;default:throw"Unknown block type.";}a=a.nextConnection&&a.nextConnection.targetBlock()}},saveConnections:function(a){a=a.getInputTargetBlock("STACK");for(var b=1;a;){switch(a.type){case "controls_if_elseif":var c=this.getInput("IF"+b),d=this.getInput("DO"+b);a.valueConnection_=c&&c.connection.targetConnection;a.statementConnection_=d&&d.connection.targetConnection;b++;break;case "controls_if_else":d=this.getInput("ELSE");a.statementConnection_=d&&
d.connection.targetConnection;break;default:throw"Unknown block type.";}a=a.nextConnection&&a.nextConnection.targetBlock()}}};Blockly.Language.controls_if_if={init:function(){this.setColour(120);this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_IF_IF_TITLE_IF);this.appendStatementInput("STACK");this.setTooltip(Blockly.LANG_CONTROLS_IF_IF_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.controls_if_elseif={init:function(){this.setColour(120);this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_IF_ELSEIF_TITLE_ELSEIF);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_CONTROLS_IF_ELSEIF_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.controls_if_else={init:function(){this.setColour(120);this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_IF_ELSE_TITLE_ELSE);this.setPreviousStatement(!0);this.setTooltip(Blockly.LANG_CONTROLS_IF_ELSE_TOOLTIP);this.contextMenu=!1}};
Blockly.Language.controls_repeat={helpUrl:Blockly.LANG_CONTROLS_REPEAT_HELPURL,init:function(){this.setColour(120);this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_REPEAT_TITLE_REPEAT).appendTitle(new Blockly.FieldTextInput("10",Blockly.FieldTextInput.nonnegativeIntegerValidator),"TIMES").appendTitle(Blockly.LANG_CONTROLS_REPEAT_TITLE_TIMES);this.appendStatementInput("DO").appendTitle(Blockly.LANG_CONTROLS_REPEAT_INPUT_DO);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setTooltip(Blockly.LANG_CONTROLS_REPEAT_TOOLTIP)}};
Blockly.Language.controls_repeat_ext={helpUrl:Blockly.LANG_CONTROLS_REPEAT_HELPURL,init:function(){this.setColour(120);this.appendValueInput("TIMES").setCheck("Number").appendTitle(Blockly.LANG_CONTROLS_REPEAT_TITLE_REPEAT);Blockly.LANG_CONTROLS_REPEAT_TITLE_TIMES&&this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_REPEAT_TITLE_TIMES);this.appendStatementInput("DO").appendTitle(Blockly.LANG_CONTROLS_REPEAT_INPUT_DO);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setInputsInline(!0);
this.setTooltip(Blockly.LANG_CONTROLS_REPEAT_TOOLTIP)}};
Blockly.Language.controls_whileUntil={helpUrl:Blockly.LANG_CONTROLS_WHILEUNTIL_HELPURL,init:function(){this.setColour(120);this.appendValueInput("BOOL").setCheck("Boolean").appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"MODE");this.appendStatementInput("DO").appendTitle(Blockly.LANG_CONTROLS_WHILEUNTIL_INPUT_DO);this.setPreviousStatement(!0);this.setNextStatement(!0);var a=this;this.setTooltip(function(){var b=a.getTitleValue("MODE");return a.TOOLTIPS[b]})}};
Blockly.Language.controls_whileUntil.OPERATORS=[[Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_WHILE,"WHILE"],[Blockly.LANG_CONTROLS_WHILEUNTIL_OPERATOR_UNTIL,"UNTIL"]];Blockly.Language.controls_whileUntil.TOOLTIPS={WHILE:Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_WHILE,UNTIL:Blockly.LANG_CONTROLS_WHILEUNTIL_TOOLTIP_UNTIL};
Blockly.Language.controls_for={helpUrl:Blockly.LANG_CONTROLS_FOR_HELPURL,init:function(){this.setColour(120);this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_FOR_INPUT_WITH).appendTitle(new Blockly.FieldVariable(null),"VAR");this.appendValueInput("FROM").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_CONTROLS_FOR_INPUT_FROM);this.appendValueInput("TO").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_CONTROLS_FOR_INPUT_TO);this.appendValueInput("BY").setCheck("Number").setAlign(Blockly.ALIGN_RIGHT).appendTitle(Blockly.LANG_CONTROLS_FOR_INPUT_BY);
Blockly.LANG_CONTROLS_FOR_TAIL&&this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_FOR_TAIL);this.appendStatementInput("DO").appendTitle(Blockly.LANG_CONTROLS_FOR_INPUT_DO);this.setPreviousStatement(!0);this.setNextStatement(!0);this.setInputsInline(!0);var a=this;this.setTooltip(function(){return Blockly.LANG_CONTROLS_FOR_TOOLTIP.replace("%1",a.getTitleValue("VAR"))})},getVars:function(){return[this.getTitleValue("VAR")]},renameVar:function(a,b){Blockly.Names.equals(a,this.getTitleValue("VAR"))&&
this.setTitleValue(b,"VAR")},customContextMenu:function(a){var b={enabled:!0},c=this.getTitleValue("VAR");b.text=Blockly.LANG_VARIABLES_SET_CREATE_GET.replace("%1",c);c=goog.dom.createDom("title",null,c);c.setAttribute("name","VAR");c=goog.dom.createDom("block",null,c);c.setAttribute("type","variables_get");b.callback=Blockly.ContextMenu.callbackFactory(this,c);a.push(b)}};
Blockly.Language.controls_forEach={helpUrl:Blockly.LANG_CONTROLS_FOREACH_HELPURL,init:function(){this.setColour(120);this.appendValueInput("LIST").setCheck("Array").appendTitle(Blockly.LANG_CONTROLS_FOREACH_INPUT_ITEM).appendTitle(new Blockly.FieldVariable(null),"VAR").appendTitle(Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST);Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST_TAIL&&(this.appendDummyInput().appendTitle(Blockly.LANG_CONTROLS_FOREACH_INPUT_INLIST_TAIL),this.setInputsInline(!0));this.appendStatementInput("DO").appendTitle(Blockly.LANG_CONTROLS_FOREACH_INPUT_DO);
this.setPreviousStatement(!0);this.setNextStatement(!0);var a=this;this.setTooltip(function(){return Blockly.LANG_CONTROLS_FOREACH_TOOLTIP.replace("%1",a.getTitleValue("VAR"))})},getVars:function(){return[this.getTitleValue("VAR")]},renameVar:function(a,b){Blockly.Names.equals(a,this.getTitleValue("VAR"))&&this.setTitleValue(b,"VAR")},customContextMenu:Blockly.Language.controls_for.customContextMenu};
Blockly.Language.controls_flow_statements={helpUrl:Blockly.LANG_CONTROLS_FLOW_STATEMENTS_HELPURL,init:function(){this.setColour(120);this.appendDummyInput().appendTitle(new Blockly.FieldDropdown(this.OPERATORS),"FLOW");this.setPreviousStatement(!0);var a=this;this.setTooltip(function(){var b=a.getTitleValue("FLOW");return a.TOOLTIPS[b]})},onchange:function(){if(this.workspace){var a=!1,b=this;do{if("controls_repeat"==b.type||"controls_forEach"==b.type||"controls_for"==b.type||"controls_whileUntil"==
b.type){a=!0;break}b=b.getSurroundParent()}while(b);a?this.setWarningText(null):this.setWarningText(Blockly.LANG_CONTROLS_FLOW_STATEMENTS_WARNING)}}};Blockly.Language.controls_flow_statements.OPERATORS=[[Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_BREAK,"BREAK"],[Blockly.LANG_CONTROLS_FLOW_STATEMENTS_OPERATOR_CONTINUE,"CONTINUE"]];Blockly.Language.controls_flow_statements.TOOLTIPS={BREAK:Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_BREAK,CONTINUE:Blockly.LANG_CONTROLS_FLOW_STATEMENTS_TOOLTIP_CONTINUE};


// End source
  }).bind(frameWindow)()
}
},{}],5:[function(require,module,exports){
(function(){// module.exports is an init function that takes in the frame context and returns the Blockly.core obj
module.exports = function(window){
  var document = window.document
  return (function(){
// Start Source


// Do not edit this file; automatically generated by build.py.
"use strict";

var COMPILED=!0,goog=goog||{};goog.global=this;goog.DEBUG=!0;goog.LOCALE="en";goog.provide=function(a){if(!COMPILED){if(goog.isProvided_(a))throw Error('Namespace "'+a+'" already declared.');delete goog.implicitNamespaces_[a];for(var b=a;(b=b.substring(0,b.lastIndexOf(".")))&&!goog.getObjectByName(b);)goog.implicitNamespaces_[b]=!0}goog.exportPath_(a)};goog.setTestOnly=function(a){if(COMPILED&&!goog.DEBUG)throw a=a||"",Error("Importing test-only code into non-debug environment"+a?": "+a:".");};
COMPILED||(goog.isProvided_=function(a){return!goog.implicitNamespaces_[a]&&!!goog.getObjectByName(a)},goog.implicitNamespaces_={});goog.exportPath_=function(a,b,c){a=a.split(".");c=c||goog.global;!(a[0]in c)&&c.execScript&&c.execScript("var "+a[0]);for(var d;a.length&&(d=a.shift());)!a.length&&goog.isDef(b)?c[d]=b:c=c[d]?c[d]:c[d]={}};goog.getObjectByName=function(a,b){for(var c=a.split("."),d=b||goog.global,e;e=c.shift();)if(goog.isDefAndNotNull(d[e]))d=d[e];else return null;return d};
goog.globalize=function(a,b){var c=b||goog.global,d;for(d in a)c[d]=a[d]};goog.addDependency=function(a,b,c){if(!COMPILED){var d;a=a.replace(/\\/g,"/");for(var e=goog.dependencies_,f=0;d=b[f];f++)e.nameToPath[d]=a,a in e.pathToNames||(e.pathToNames[a]={}),e.pathToNames[a][d]=!0;for(d=0;b=c[d];d++)a in e.requires||(e.requires[a]={}),e.requires[a][b]=!0}};goog.ENABLE_DEBUG_LOADER=!0;
goog.require=function(a){if(!COMPILED&&!goog.isProvided_(a)){if(goog.ENABLE_DEBUG_LOADER){var b=goog.getPathFromDeps_(a);if(b){goog.included_[b]=!0;goog.writeScripts_();return}}a="goog.require could not find: "+a;goog.global.console&&goog.global.console.error(a);throw Error(a);}};goog.basePath="";goog.nullFunction=function(){};goog.identityFunction=function(a){return a};goog.abstractMethod=function(){throw Error("unimplemented abstract method");};
goog.addSingletonGetter=function(a){a.getInstance=function(){if(a.instance_)return a.instance_;goog.DEBUG&&(goog.instantiatedSingletons_[goog.instantiatedSingletons_.length]=a);return a.instance_=new a}};goog.instantiatedSingletons_=[];
!COMPILED&&goog.ENABLE_DEBUG_LOADER&&(goog.included_={},goog.dependencies_={pathToNames:{},nameToPath:{},requires:{},visited:{},written:{}},goog.inHtmlDocument_=function(){var a=goog.global.document;return"undefined"!=typeof a&&"write"in a},goog.findBasePath_=function(){if(goog.global.CLOSURE_BASE_PATH)goog.basePath=goog.global.CLOSURE_BASE_PATH;else if(goog.inHtmlDocument_())for(var a=goog.global.document.getElementsByTagName("script"),b=a.length-1;0<=b;--b){var c=a[b].src,d=c.lastIndexOf("?"),d=
-1==d?c.length:d;if("base.js"==c.substr(d-7,7)){goog.basePath=c.substr(0,d-7);break}}},goog.importScript_=function(a){var b=goog.global.CLOSURE_IMPORT_SCRIPT||goog.writeScriptTag_;!goog.dependencies_.written[a]&&b(a)&&(goog.dependencies_.written[a]=!0)},goog.writeScriptTag_=function(a){if(goog.inHtmlDocument_()){var b=goog.global.document;if("complete"==b.readyState){if(/\bdeps.js$/.test(a))return!1;throw Error('Cannot write "'+a+'" after document load');}b.write('<script type="text/javascript" src="'+
a+'">\x3c/script>');return!0}return!1},goog.writeScripts_=function(){function a(e){if(!(e in d.written)){if(!(e in d.visited)&&(d.visited[e]=!0,e in d.requires))for(var g in d.requires[e])if(!goog.isProvided_(g))if(g in d.nameToPath)a(d.nameToPath[g]);else throw Error("Undefined nameToPath for "+g);e in c||(c[e]=!0,b.push(e))}}var b=[],c={},d=goog.dependencies_,e;for(e in goog.included_)d.written[e]||a(e);for(e=0;e<b.length;e++)if(b[e])goog.importScript_(goog.basePath+b[e]);else throw Error("Undefined script input");
},goog.getPathFromDeps_=function(a){return a in goog.dependencies_.nameToPath?goog.dependencies_.nameToPath[a]:null},goog.findBasePath_(),goog.global.CLOSURE_NO_DEPS||goog.importScript_(goog.basePath+"deps.js"));
goog.typeOf=function(a){var b=typeof a;if("object"==b)if(a){if(a instanceof Array)return"array";if(a instanceof Object)return b;var c=Object.prototype.toString.call(a);if("[object Window]"==c)return"object";if("[object Array]"==c||"number"==typeof a.length&&"undefined"!=typeof a.splice&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("splice"))return"array";if("[object Function]"==c||"undefined"!=typeof a.call&&"undefined"!=typeof a.propertyIsEnumerable&&!a.propertyIsEnumerable("call"))return"function"}else return"null";
else if("function"==b&&"undefined"==typeof a.call)return"object";return b};goog.isDef=function(a){return void 0!==a};goog.isNull=function(a){return null===a};goog.isDefAndNotNull=function(a){return null!=a};goog.isArray=function(a){return"array"==goog.typeOf(a)};goog.isArrayLike=function(a){var b=goog.typeOf(a);return"array"==b||"object"==b&&"number"==typeof a.length};goog.isDateLike=function(a){return goog.isObject(a)&&"function"==typeof a.getFullYear};goog.isString=function(a){return"string"==typeof a};
goog.isBoolean=function(a){return"boolean"==typeof a};goog.isNumber=function(a){return"number"==typeof a};goog.isFunction=function(a){return"function"==goog.typeOf(a)};goog.isObject=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b};goog.getUid=function(a){return a[goog.UID_PROPERTY_]||(a[goog.UID_PROPERTY_]=++goog.uidCounter_)};goog.removeUid=function(a){"removeAttribute"in a&&a.removeAttribute(goog.UID_PROPERTY_);try{delete a[goog.UID_PROPERTY_]}catch(b){}};
goog.UID_PROPERTY_="closure_uid_"+Math.floor(2147483648*Math.random()).toString(36);goog.uidCounter_=0;goog.getHashCode=goog.getUid;goog.removeHashCode=goog.removeUid;goog.cloneObject=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(a.clone)return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.cloneObject(a[c]);return b}return a};goog.bindNative_=function(a,b,c){return a.call.apply(a.bind,arguments)};
goog.bindJs_=function(a,b,c){if(!a)throw Error();if(2<arguments.length){var d=Array.prototype.slice.call(arguments,2);return function(){var c=Array.prototype.slice.call(arguments);Array.prototype.unshift.apply(c,d);return a.apply(b,c)}}return function(){return a.apply(b,arguments)}};goog.bind=function(a,b,c){goog.bind=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?goog.bindNative_:goog.bindJs_;return goog.bind.apply(null,arguments)};
goog.partial=function(a,b){var c=Array.prototype.slice.call(arguments,1);return function(){var b=Array.prototype.slice.call(arguments);b.unshift.apply(b,c);return a.apply(this,b)}};goog.mixin=function(a,b){for(var c in b)a[c]=b[c]};goog.now=Date.now||function(){return+new Date};
goog.globalEval=function(a){if(goog.global.execScript)goog.global.execScript(a,"JavaScript");else if(goog.global.eval)if(null==goog.evalWorksForGlobals_&&(goog.global.eval("var _et_ = 1;"),"undefined"!=typeof goog.global._et_?(delete goog.global._et_,goog.evalWorksForGlobals_=!0):goog.evalWorksForGlobals_=!1),goog.evalWorksForGlobals_)goog.global.eval(a);else{var b=goog.global.document,c=b.createElement("script");c.type="text/javascript";c.defer=!1;c.appendChild(b.createTextNode(a));b.body.appendChild(c);
b.body.removeChild(c)}else throw Error("goog.globalEval not available");};goog.evalWorksForGlobals_=null;goog.getCssName=function(a,b){var c=function(a){return goog.cssNameMapping_[a]||a},d=function(a){a=a.split("-");for(var b=[],d=0;d<a.length;d++)b.push(c(a[d]));return b.join("-")},d=goog.cssNameMapping_?"BY_WHOLE"==goog.cssNameMappingStyle_?c:d:function(a){return a};return b?a+"-"+d(b):d(a)};goog.setCssNameMapping=function(a,b){goog.cssNameMapping_=a;goog.cssNameMappingStyle_=b};
!COMPILED&&goog.global.CLOSURE_CSS_NAME_MAPPING&&(goog.cssNameMapping_=goog.global.CLOSURE_CSS_NAME_MAPPING);goog.getMsg=function(a,b){var c=b||{},d;for(d in c){var e=(""+c[d]).replace(/\$/g,"$$$$");a=a.replace(RegExp("\\{\\$"+d+"\\}","gi"),e)}return a};goog.getMsgWithFallback=function(a){return a};goog.exportSymbol=function(a,b,c){goog.exportPath_(a,b,c)};goog.exportProperty=function(a,b,c){a[b]=c};
goog.inherits=function(a,b){function c(){}c.prototype=b.prototype;a.superClass_=b.prototype;a.prototype=new c;a.prototype.constructor=a};
goog.base=function(a,b,c){var d=arguments.callee.caller;if(d.superClass_)return d.superClass_.constructor.apply(a,Array.prototype.slice.call(arguments,1));for(var e=Array.prototype.slice.call(arguments,2),f=!1,g=a.constructor;g;g=g.superClass_&&g.superClass_.constructor)if(g.prototype[b]===d)f=!0;else if(f)return g.prototype[b].apply(a,e);if(a[b]===d)return a.constructor.prototype[b].apply(a,e);throw Error("goog.base called from a method of one name to a method of a different name");};
goog.scope=function(a){a.call(goog.global)};goog.string={};goog.string.Unicode={NBSP:"\u00a0"};goog.string.startsWith=function(a,b){return 0==a.lastIndexOf(b,0)};goog.string.endsWith=function(a,b){var c=a.length-b.length;return 0<=c&&a.indexOf(b,c)==c};goog.string.caseInsensitiveStartsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(0,b.length))};goog.string.caseInsensitiveEndsWith=function(a,b){return 0==goog.string.caseInsensitiveCompare(b,a.substr(a.length-b.length,b.length))};
goog.string.subs=function(a,b){for(var c=1;c<arguments.length;c++){var d=String(arguments[c]).replace(/\$/g,"$$$$");a=a.replace(/\%s/,d)}return a};goog.string.collapseWhitespace=function(a){return a.replace(/[\s\xa0]+/g," ").replace(/^\s+|\s+$/g,"")};goog.string.isEmpty=function(a){return/^[\s\xa0]*$/.test(a)};goog.string.isEmptySafe=function(a){return goog.string.isEmpty(goog.string.makeSafe(a))};goog.string.isBreakingWhitespace=function(a){return!/[^\t\n\r ]/.test(a)};goog.string.isAlpha=function(a){return!/[^a-zA-Z]/.test(a)};
goog.string.isNumeric=function(a){return!/[^0-9]/.test(a)};goog.string.isAlphaNumeric=function(a){return!/[^a-zA-Z0-9]/.test(a)};goog.string.isSpace=function(a){return" "==a};goog.string.isUnicodeChar=function(a){return 1==a.length&&" "<=a&&"~">=a||"\u0080"<=a&&"\ufffd">=a};goog.string.stripNewlines=function(a){return a.replace(/(\r\n|\r|\n)+/g," ")};goog.string.canonicalizeNewlines=function(a){return a.replace(/(\r\n|\r|\n)/g,"\n")};
goog.string.normalizeWhitespace=function(a){return a.replace(/\xa0|\s/g," ")};goog.string.normalizeSpaces=function(a){return a.replace(/\xa0|[ \t]+/g," ")};goog.string.collapseBreakingSpaces=function(a){return a.replace(/[\t\r\n ]+/g," ").replace(/^[\t\r\n ]+|[\t\r\n ]+$/g,"")};goog.string.trim=function(a){return a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"")};goog.string.trimLeft=function(a){return a.replace(/^[\s\xa0]+/,"")};goog.string.trimRight=function(a){return a.replace(/[\s\xa0]+$/,"")};
goog.string.caseInsensitiveCompare=function(a,b){var c=String(a).toLowerCase(),d=String(b).toLowerCase();return c<d?-1:c==d?0:1};goog.string.numerateCompareRegExp_=/(\.\d+)|(\d+)|(\D+)/g;
goog.string.numerateCompare=function(a,b){if(a==b)return 0;if(!a)return-1;if(!b)return 1;for(var c=a.toLowerCase().match(goog.string.numerateCompareRegExp_),d=b.toLowerCase().match(goog.string.numerateCompareRegExp_),e=Math.min(c.length,d.length),f=0;f<e;f++){var g=c[f],h=d[f];if(g!=h)return c=parseInt(g,10),!isNaN(c)&&(d=parseInt(h,10),!isNaN(d)&&c-d)?c-d:g<h?-1:1}return c.length!=d.length?c.length-d.length:a<b?-1:1};goog.string.urlEncode=function(a){return encodeURIComponent(String(a))};
goog.string.urlDecode=function(a){return decodeURIComponent(a.replace(/\+/g," "))};goog.string.newLineToBr=function(a,b){return a.replace(/(\r\n|\r|\n)/g,b?"<br />":"<br>")};
goog.string.htmlEscape=function(a,b){if(b)return a.replace(goog.string.amperRe_,"&amp;").replace(goog.string.ltRe_,"&lt;").replace(goog.string.gtRe_,"&gt;").replace(goog.string.quotRe_,"&quot;");if(!goog.string.allRe_.test(a))return a;-1!=a.indexOf("&")&&(a=a.replace(goog.string.amperRe_,"&amp;"));-1!=a.indexOf("<")&&(a=a.replace(goog.string.ltRe_,"&lt;"));-1!=a.indexOf(">")&&(a=a.replace(goog.string.gtRe_,"&gt;"));-1!=a.indexOf('"')&&(a=a.replace(goog.string.quotRe_,"&quot;"));return a};
goog.string.amperRe_=/&/g;goog.string.ltRe_=/</g;goog.string.gtRe_=/>/g;goog.string.quotRe_=/\"/g;goog.string.allRe_=/[&<>\"]/;goog.string.unescapeEntities=function(a){return goog.string.contains(a,"&")?"document"in goog.global?goog.string.unescapeEntitiesUsingDom_(a):goog.string.unescapePureXmlEntities_(a):a};
goog.string.unescapeEntitiesUsingDom_=function(a){var b={"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"'},c=document.createElement("div");return a.replace(goog.string.HTML_ENTITY_PATTERN_,function(a,e){var f=b[a];if(f)return f;if("#"==e.charAt(0)){var g=Number("0"+e.substr(1));isNaN(g)||(f=String.fromCharCode(g))}f||(c.innerHTML=a+" ",f=c.firstChild.nodeValue.slice(0,-1));return b[a]=f})};
goog.string.unescapePureXmlEntities_=function(a){return a.replace(/&([^;]+);/g,function(a,c){switch(c){case "amp":return"&";case "lt":return"<";case "gt":return">";case "quot":return'"';default:if("#"==c.charAt(0)){var d=Number("0"+c.substr(1));if(!isNaN(d))return String.fromCharCode(d)}return a}})};goog.string.HTML_ENTITY_PATTERN_=/&([^;\s<&]+);?/g;goog.string.whitespaceEscape=function(a,b){return goog.string.newLineToBr(a.replace(/  /g," &#160;"),b)};
goog.string.stripQuotes=function(a,b){for(var c=b.length,d=0;d<c;d++){var e=1==c?b:b.charAt(d);if(a.charAt(0)==e&&a.charAt(a.length-1)==e)return a.substring(1,a.length-1)}return a};goog.string.truncate=function(a,b,c){c&&(a=goog.string.unescapeEntities(a));a.length>b&&(a=a.substring(0,b-3)+"...");c&&(a=goog.string.htmlEscape(a));return a};
goog.string.truncateMiddle=function(a,b,c,d){c&&(a=goog.string.unescapeEntities(a));if(d&&a.length>b){d>b&&(d=b);var e=a.length-d;a=a.substring(0,b-d)+"..."+a.substring(e)}else a.length>b&&(d=Math.floor(b/2),e=a.length-d,a=a.substring(0,d+b%2)+"..."+a.substring(e));c&&(a=goog.string.htmlEscape(a));return a};goog.string.specialEscapeChars_={"\x00":"\\0","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\x0B":"\\x0B",'"':'\\"',"\\":"\\\\"};goog.string.jsEscapeCache_={"'":"\\'"};
goog.string.quote=function(a){a=String(a);if(a.quote)return a.quote();for(var b=['"'],c=0;c<a.length;c++){var d=a.charAt(c),e=d.charCodeAt(0);b[c+1]=goog.string.specialEscapeChars_[d]||(31<e&&127>e?d:goog.string.escapeChar(d))}b.push('"');return b.join("")};goog.string.escapeString=function(a){for(var b=[],c=0;c<a.length;c++)b[c]=goog.string.escapeChar(a.charAt(c));return b.join("")};
goog.string.escapeChar=function(a){if(a in goog.string.jsEscapeCache_)return goog.string.jsEscapeCache_[a];if(a in goog.string.specialEscapeChars_)return goog.string.jsEscapeCache_[a]=goog.string.specialEscapeChars_[a];var b=a,c=a.charCodeAt(0);if(31<c&&127>c)b=a;else{if(256>c){if(b="\\x",16>c||256<c)b+="0"}else b="\\u",4096>c&&(b+="0");b+=c.toString(16).toUpperCase()}return goog.string.jsEscapeCache_[a]=b};goog.string.toMap=function(a){for(var b={},c=0;c<a.length;c++)b[a.charAt(c)]=!0;return b};
goog.string.contains=function(a,b){return-1!=a.indexOf(b)};goog.string.countOf=function(a,b){return a&&b?a.split(b).length-1:0};goog.string.removeAt=function(a,b,c){var d=a;0<=b&&(b<a.length&&0<c)&&(d=a.substr(0,b)+a.substr(b+c,a.length-b-c));return d};goog.string.remove=function(a,b){var c=RegExp(goog.string.regExpEscape(b),"");return a.replace(c,"")};goog.string.removeAll=function(a,b){var c=RegExp(goog.string.regExpEscape(b),"g");return a.replace(c,"")};
goog.string.regExpEscape=function(a){return String(a).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g,"\\$1").replace(/\x08/g,"\\x08")};goog.string.repeat=function(a,b){return Array(b+1).join(a)};goog.string.padNumber=function(a,b,c){a=goog.isDef(c)?a.toFixed(c):String(a);c=a.indexOf(".");-1==c&&(c=a.length);return goog.string.repeat("0",Math.max(0,b-c))+a};goog.string.makeSafe=function(a){return null==a?"":String(a)};goog.string.buildString=function(a){return Array.prototype.join.call(arguments,"")};
goog.string.getRandomString=function(){return Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^goog.now()).toString(36)};
goog.string.compareVersions=function(a,b){for(var c=0,d=goog.string.trim(String(a)).split("."),e=goog.string.trim(String(b)).split("."),f=Math.max(d.length,e.length),g=0;0==c&&g<f;g++){var h=d[g]||"",j=e[g]||"",k=RegExp("(\\d*)(\\D*)","g"),l=RegExp("(\\d*)(\\D*)","g");do{var m=k.exec(h)||["","",""],n=l.exec(j)||["","",""];if(0==m[0].length&&0==n[0].length)break;var c=0==m[1].length?0:parseInt(m[1],10),q=0==n[1].length?0:parseInt(n[1],10),c=goog.string.compareElements_(c,q)||goog.string.compareElements_(0==
m[2].length,0==n[2].length)||goog.string.compareElements_(m[2],n[2])}while(0==c)}return c};goog.string.compareElements_=function(a,b){return a<b?-1:a>b?1:0};goog.string.HASHCODE_MAX_=4294967296;goog.string.hashCode=function(a){for(var b=0,c=0;c<a.length;++c)b=31*b+a.charCodeAt(c),b%=goog.string.HASHCODE_MAX_;return b};goog.string.uniqueStringCounter_=2147483648*Math.random()|0;goog.string.createUniqueString=function(){return"goog_"+goog.string.uniqueStringCounter_++};
goog.string.toNumber=function(a){var b=Number(a);return 0==b&&goog.string.isEmpty(a)?NaN:b};goog.string.toCamelCase=function(a){return String(a).replace(/\-([a-z])/g,function(a,c){return c.toUpperCase()})};goog.string.toSelectorCase=function(a){return String(a).replace(/([A-Z])/g,"-$1").toLowerCase()};goog.string.toTitleCase=function(a,b){var c=goog.isString(b)?goog.string.regExpEscape(b):"\\s";return a.replace(RegExp("(^"+(c?"|["+c+"]+":"")+")([a-z])","g"),function(a,b,c){return b+c.toUpperCase()})};
goog.string.parseInt=function(a){isFinite(a)&&(a=String(a));return goog.isString(a)?/^\s*-?0x/i.test(a)?parseInt(a,16):parseInt(a,10):NaN};goog.userAgent={};goog.userAgent.ASSUME_IE=!1;goog.userAgent.ASSUME_GECKO=!1;goog.userAgent.ASSUME_WEBKIT=!1;goog.userAgent.ASSUME_MOBILE_WEBKIT=!1;goog.userAgent.ASSUME_OPERA=!1;goog.userAgent.ASSUME_ANY_VERSION=!1;goog.userAgent.BROWSER_KNOWN_=goog.userAgent.ASSUME_IE||goog.userAgent.ASSUME_GECKO||goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_OPERA;
goog.userAgent.getUserAgentString=function(){return goog.global.navigator?goog.global.navigator.userAgent:null};goog.userAgent.getNavigator=function(){return goog.global.navigator};
goog.userAgent.init_=function(){goog.userAgent.detectedOpera_=!1;goog.userAgent.detectedIe_=!1;goog.userAgent.detectedWebkit_=!1;goog.userAgent.detectedMobile_=!1;goog.userAgent.detectedGecko_=!1;var a;if(!goog.userAgent.BROWSER_KNOWN_&&(a=goog.userAgent.getUserAgentString())){var b=goog.userAgent.getNavigator();goog.userAgent.detectedOpera_=0==a.indexOf("Opera");goog.userAgent.detectedIe_=!goog.userAgent.detectedOpera_&&-1!=a.indexOf("MSIE");goog.userAgent.detectedWebkit_=!goog.userAgent.detectedOpera_&&
-1!=a.indexOf("WebKit");goog.userAgent.detectedMobile_=goog.userAgent.detectedWebkit_&&-1!=a.indexOf("Mobile");goog.userAgent.detectedGecko_=!goog.userAgent.detectedOpera_&&!goog.userAgent.detectedWebkit_&&"Gecko"==b.product}};goog.userAgent.BROWSER_KNOWN_||goog.userAgent.init_();goog.userAgent.OPERA=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_OPERA:goog.userAgent.detectedOpera_;goog.userAgent.IE=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_IE:goog.userAgent.detectedIe_;
goog.userAgent.GECKO=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_GECKO:goog.userAgent.detectedGecko_;goog.userAgent.WEBKIT=goog.userAgent.BROWSER_KNOWN_?goog.userAgent.ASSUME_WEBKIT||goog.userAgent.ASSUME_MOBILE_WEBKIT:goog.userAgent.detectedWebkit_;goog.userAgent.MOBILE=goog.userAgent.ASSUME_MOBILE_WEBKIT||goog.userAgent.detectedMobile_;goog.userAgent.SAFARI=goog.userAgent.WEBKIT;goog.userAgent.determinePlatform_=function(){var a=goog.userAgent.getNavigator();return a&&a.platform||""};
goog.userAgent.PLATFORM=goog.userAgent.determinePlatform_();goog.userAgent.ASSUME_MAC=!1;goog.userAgent.ASSUME_WINDOWS=!1;goog.userAgent.ASSUME_LINUX=!1;goog.userAgent.ASSUME_X11=!1;goog.userAgent.PLATFORM_KNOWN_=goog.userAgent.ASSUME_MAC||goog.userAgent.ASSUME_WINDOWS||goog.userAgent.ASSUME_LINUX||goog.userAgent.ASSUME_X11;
goog.userAgent.initPlatform_=function(){goog.userAgent.detectedMac_=goog.string.contains(goog.userAgent.PLATFORM,"Mac");goog.userAgent.detectedWindows_=goog.string.contains(goog.userAgent.PLATFORM,"Win");goog.userAgent.detectedLinux_=goog.string.contains(goog.userAgent.PLATFORM,"Linux");goog.userAgent.detectedX11_=!!goog.userAgent.getNavigator()&&goog.string.contains(goog.userAgent.getNavigator().appVersion||"","X11")};goog.userAgent.PLATFORM_KNOWN_||goog.userAgent.initPlatform_();
goog.userAgent.MAC=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_MAC:goog.userAgent.detectedMac_;goog.userAgent.WINDOWS=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_WINDOWS:goog.userAgent.detectedWindows_;goog.userAgent.LINUX=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_LINUX:goog.userAgent.detectedLinux_;goog.userAgent.X11=goog.userAgent.PLATFORM_KNOWN_?goog.userAgent.ASSUME_X11:goog.userAgent.detectedX11_;
goog.userAgent.determineVersion_=function(){var a="",b;goog.userAgent.OPERA&&goog.global.opera?(a=goog.global.opera.version,a="function"==typeof a?a():a):(goog.userAgent.GECKO?b=/rv\:([^\);]+)(\)|;)/:goog.userAgent.IE?b=/MSIE\s+([^\);]+)(\)|;)/:goog.userAgent.WEBKIT&&(b=/WebKit\/(\S+)/),b&&(a=(a=b.exec(goog.userAgent.getUserAgentString()))?a[1]:""));return goog.userAgent.IE&&(b=goog.userAgent.getDocumentMode_(),b>parseFloat(a))?String(b):a};
goog.userAgent.getDocumentMode_=function(){var a=goog.global.document;return a?a.documentMode:void 0};goog.userAgent.VERSION=goog.userAgent.determineVersion_();goog.userAgent.compare=function(a,b){return goog.string.compareVersions(a,b)};goog.userAgent.isVersionCache_={};goog.userAgent.isVersion=function(a){return goog.userAgent.ASSUME_ANY_VERSION||goog.userAgent.isVersionCache_[a]||(goog.userAgent.isVersionCache_[a]=0<=goog.string.compareVersions(goog.userAgent.VERSION,a))};
goog.userAgent.isDocumentMode=function(a){return goog.userAgent.IE&&goog.userAgent.DOCUMENT_MODE>=a};goog.userAgent.DOCUMENT_MODE=function(){var a=goog.global.document;return!a||!goog.userAgent.IE?void 0:goog.userAgent.getDocumentMode_()||("CSS1Compat"==a.compatMode?parseInt(goog.userAgent.VERSION,10):5)}();goog.disposable={};goog.disposable.IDisposable=function(){};goog.Disposable=function(){goog.Disposable.MONITORING_MODE!=goog.Disposable.MonitoringMode.OFF&&(this.creationStack=Error().stack,goog.Disposable.instances_[goog.getUid(this)]=this)};goog.Disposable.MonitoringMode={OFF:0,PERMANENT:1,INTERACTIVE:2};goog.Disposable.MONITORING_MODE=0;goog.Disposable.instances_={};goog.Disposable.getUndisposedObjects=function(){var a=[],b;for(b in goog.Disposable.instances_)goog.Disposable.instances_.hasOwnProperty(b)&&a.push(goog.Disposable.instances_[Number(b)]);return a};
goog.Disposable.clearUndisposedObjects=function(){goog.Disposable.instances_={}};goog.Disposable.prototype.disposed_=!1;goog.Disposable.prototype.isDisposed=function(){return this.disposed_};goog.Disposable.prototype.getDisposed=goog.Disposable.prototype.isDisposed;
goog.Disposable.prototype.dispose=function(){if(!this.disposed_&&(this.disposed_=!0,this.disposeInternal(),goog.Disposable.MONITORING_MODE!=goog.Disposable.MonitoringMode.OFF)){var a=goog.getUid(this);if(goog.Disposable.MONITORING_MODE==goog.Disposable.MonitoringMode.PERMANENT&&!goog.Disposable.instances_.hasOwnProperty(a))throw Error(this+" did not call the goog.Disposable base constructor or was disposed of after a clearUndisposedObjects call");delete goog.Disposable.instances_[a]}};
goog.Disposable.prototype.registerDisposable=function(a){this.dependentDisposables_||(this.dependentDisposables_=[]);this.dependentDisposables_.push(a)};goog.Disposable.prototype.addOnDisposeCallback=function(a,b){this.onDisposeCallbacks_||(this.onDisposeCallbacks_=[]);this.onDisposeCallbacks_.push(goog.bind(a,b))};goog.Disposable.prototype.disposeInternal=function(){this.dependentDisposables_&&goog.disposeAll.apply(null,this.dependentDisposables_);if(this.onDisposeCallbacks_)for(;this.onDisposeCallbacks_.length;)this.onDisposeCallbacks_.shift()()};
goog.Disposable.isDisposed=function(a){return a&&"function"==typeof a.isDisposed?a.isDisposed():!1};goog.dispose=function(a){a&&"function"==typeof a.dispose&&a.dispose()};goog.disposeAll=function(a){for(var b=0,c=arguments.length;b<c;++b){var d=arguments[b];goog.isArrayLike(d)?goog.disposeAll.apply(null,d):goog.dispose(d)}};goog.debug={};goog.debug.Error=function(a){Error.captureStackTrace?Error.captureStackTrace(this,goog.debug.Error):this.stack=Error().stack||"";a&&(this.message=String(a))};goog.inherits(goog.debug.Error,Error);goog.debug.Error.prototype.name="CustomError";goog.asserts={};goog.asserts.ENABLE_ASSERTS=goog.DEBUG;goog.asserts.AssertionError=function(a,b){b.unshift(a);goog.debug.Error.call(this,goog.string.subs.apply(null,b));b.shift();this.messagePattern=a};goog.inherits(goog.asserts.AssertionError,goog.debug.Error);goog.asserts.AssertionError.prototype.name="AssertionError";goog.asserts.doAssertFailure_=function(a,b,c,d){var e="Assertion failed";if(c)var e=e+(": "+c),f=d;else a&&(e+=": "+a,f=b);throw new goog.asserts.AssertionError(""+e,f||[]);};
goog.asserts.assert=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!a&&goog.asserts.doAssertFailure_("",null,b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.fail=function(a,b){if(goog.asserts.ENABLE_ASSERTS)throw new goog.asserts.AssertionError("Failure"+(a?": "+a:""),Array.prototype.slice.call(arguments,1));};
goog.asserts.assertNumber=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isNumber(a)&&goog.asserts.doAssertFailure_("Expected number but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertString=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isString(a)&&goog.asserts.doAssertFailure_("Expected string but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertFunction=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isFunction(a)&&goog.asserts.doAssertFailure_("Expected function but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertObject=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isObject(a)&&goog.asserts.doAssertFailure_("Expected object but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertArray=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isArray(a)&&goog.asserts.doAssertFailure_("Expected array but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};goog.asserts.assertBoolean=function(a,b,c){goog.asserts.ENABLE_ASSERTS&&!goog.isBoolean(a)&&goog.asserts.doAssertFailure_("Expected boolean but got %s: %s.",[goog.typeOf(a),a],b,Array.prototype.slice.call(arguments,2));return a};
goog.asserts.assertInstanceof=function(a,b,c,d){goog.asserts.ENABLE_ASSERTS&&!(a instanceof b)&&goog.asserts.doAssertFailure_("instanceof check failed.",null,c,Array.prototype.slice.call(arguments,3));return a};goog.array={};goog.NATIVE_ARRAY_PROTOTYPES=!0;goog.array.peek=function(a){return a[a.length-1]};goog.array.ARRAY_PROTOTYPE_=Array.prototype;
goog.array.indexOf=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.indexOf?function(a,b,c){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.indexOf.call(a,b,c)}:function(a,b,c){c=null==c?0:0>c?Math.max(0,a.length+c):c;if(goog.isString(a))return!goog.isString(b)||1!=b.length?-1:a.indexOf(b,c);for(;c<a.length;c++)if(c in a&&a[c]===b)return c;return-1};
goog.array.lastIndexOf=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.lastIndexOf?function(a,b,c){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.lastIndexOf.call(a,b,null==c?a.length-1:c)}:function(a,b,c){c=null==c?a.length-1:c;0>c&&(c=Math.max(0,a.length+c));if(goog.isString(a))return!goog.isString(b)||1!=b.length?-1:a.lastIndexOf(b,c);for(;0<=c;c--)if(c in a&&a[c]===b)return c;return-1};
goog.array.forEach=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.forEach?function(a,b,c){goog.asserts.assert(null!=a.length);goog.array.ARRAY_PROTOTYPE_.forEach.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)f in e&&b.call(c,e[f],f,a)};goog.array.forEachRight=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,d=d-1;0<=d;--d)d in e&&b.call(c,e[d],d,a)};
goog.array.filter=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.filter?function(a,b,c){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.filter.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=[],f=0,g=goog.isString(a)?a.split(""):a,h=0;h<d;h++)if(h in g){var j=g[h];b.call(c,j,h,a)&&(e[f++]=j)}return e};
goog.array.map=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.map?function(a,b,c){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.map.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=Array(d),f=goog.isString(a)?a.split(""):a,g=0;g<d;g++)g in f&&(e[g]=b.call(c,f[g],g,a));return e};goog.array.reduce=function(a,b,c,d){if(a.reduce)return d?a.reduce(goog.bind(b,d),c):a.reduce(b,c);var e=c;goog.array.forEach(a,function(c,g){e=b.call(d,e,c,g,a)});return e};
goog.array.reduceRight=function(a,b,c,d){if(a.reduceRight)return d?a.reduceRight(goog.bind(b,d),c):a.reduceRight(b,c);var e=c;goog.array.forEachRight(a,function(c,g){e=b.call(d,e,c,g,a)});return e};
goog.array.some=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.some?function(a,b,c){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.some.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return!0;return!1};
goog.array.every=goog.NATIVE_ARRAY_PROTOTYPES&&goog.array.ARRAY_PROTOTYPE_.every?function(a,b,c){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.every.call(a,b,c)}:function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&!b.call(c,e[f],f,a))return!1;return!0};goog.array.count=function(a,b,c){var d=0;goog.array.forEach(a,function(a,f,g){b.call(c,a,f,g)&&++d},c);return d};
goog.array.find=function(a,b,c){b=goog.array.findIndex(a,b,c);return 0>b?null:goog.isString(a)?a.charAt(b):a[b]};goog.array.findIndex=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,f=0;f<d;f++)if(f in e&&b.call(c,e[f],f,a))return f;return-1};goog.array.findRight=function(a,b,c){b=goog.array.findIndexRight(a,b,c);return 0>b?null:goog.isString(a)?a.charAt(b):a[b]};
goog.array.findIndexRight=function(a,b,c){for(var d=a.length,e=goog.isString(a)?a.split(""):a,d=d-1;0<=d;d--)if(d in e&&b.call(c,e[d],d,a))return d;return-1};goog.array.contains=function(a,b){return 0<=goog.array.indexOf(a,b)};goog.array.isEmpty=function(a){return 0==a.length};goog.array.clear=function(a){if(!goog.isArray(a))for(var b=a.length-1;0<=b;b--)delete a[b];a.length=0};goog.array.insert=function(a,b){goog.array.contains(a,b)||a.push(b)};
goog.array.insertAt=function(a,b,c){goog.array.splice(a,c,0,b)};goog.array.insertArrayAt=function(a,b,c){goog.partial(goog.array.splice,a,c,0).apply(null,b)};goog.array.insertBefore=function(a,b,c){var d;2==arguments.length||0>(d=goog.array.indexOf(a,c))?a.push(b):goog.array.insertAt(a,b,d)};goog.array.remove=function(a,b){var c=goog.array.indexOf(a,b),d;(d=0<=c)&&goog.array.removeAt(a,c);return d};
goog.array.removeAt=function(a,b){goog.asserts.assert(null!=a.length);return 1==goog.array.ARRAY_PROTOTYPE_.splice.call(a,b,1).length};goog.array.removeIf=function(a,b,c){b=goog.array.findIndex(a,b,c);return 0<=b?(goog.array.removeAt(a,b),!0):!1};goog.array.concat=function(a){return goog.array.ARRAY_PROTOTYPE_.concat.apply(goog.array.ARRAY_PROTOTYPE_,arguments)};goog.array.toArray=function(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]};goog.array.clone=goog.array.toArray;
goog.array.extend=function(a,b){for(var c=1;c<arguments.length;c++){var d=arguments[c],e;if(goog.isArray(d)||(e=goog.isArrayLike(d))&&d.hasOwnProperty("callee"))a.push.apply(a,d);else if(e)for(var f=a.length,g=d.length,h=0;h<g;h++)a[f+h]=d[h];else a.push(d)}};goog.array.splice=function(a,b,c,d){goog.asserts.assert(null!=a.length);return goog.array.ARRAY_PROTOTYPE_.splice.apply(a,goog.array.slice(arguments,1))};
goog.array.slice=function(a,b,c){goog.asserts.assert(null!=a.length);return 2>=arguments.length?goog.array.ARRAY_PROTOTYPE_.slice.call(a,b):goog.array.ARRAY_PROTOTYPE_.slice.call(a,b,c)};goog.array.removeDuplicates=function(a,b){for(var c=b||a,d={},e=0,f=0;f<a.length;){var g=a[f++],h=goog.isObject(g)?"o"+goog.getUid(g):(typeof g).charAt(0)+g;Object.prototype.hasOwnProperty.call(d,h)||(d[h]=!0,c[e++]=g)}c.length=e};
goog.array.binarySearch=function(a,b,c){return goog.array.binarySearch_(a,c||goog.array.defaultCompare,!1,b)};goog.array.binarySelect=function(a,b,c){return goog.array.binarySearch_(a,b,!0,void 0,c)};goog.array.binarySearch_=function(a,b,c,d,e){for(var f=0,g=a.length,h;f<g;){var j=f+g>>1,k;k=c?b.call(e,a[j],j,a):b(d,a[j]);0<k?f=j+1:(g=j,h=!k)}return h?f:~f};goog.array.sort=function(a,b){goog.asserts.assert(null!=a.length);goog.array.ARRAY_PROTOTYPE_.sort.call(a,b||goog.array.defaultCompare)};
goog.array.stableSort=function(a,b){for(var c=0;c<a.length;c++)a[c]={index:c,value:a[c]};var d=b||goog.array.defaultCompare;goog.array.sort(a,function(a,b){return d(a.value,b.value)||a.index-b.index});for(c=0;c<a.length;c++)a[c]=a[c].value};goog.array.sortObjectsByKey=function(a,b,c){var d=c||goog.array.defaultCompare;goog.array.sort(a,function(a,c){return d(a[b],c[b])})};
goog.array.isSorted=function(a,b,c){b=b||goog.array.defaultCompare;for(var d=1;d<a.length;d++){var e=b(a[d-1],a[d]);if(0<e||0==e&&c)return!1}return!0};goog.array.equals=function(a,b,c){if(!goog.isArrayLike(a)||!goog.isArrayLike(b)||a.length!=b.length)return!1;var d=a.length;c=c||goog.array.defaultCompareEquality;for(var e=0;e<d;e++)if(!c(a[e],b[e]))return!1;return!0};goog.array.compare=function(a,b,c){return goog.array.equals(a,b,c)};
goog.array.compare3=function(a,b,c){c=c||goog.array.defaultCompare;for(var d=Math.min(a.length,b.length),e=0;e<d;e++){var f=c(a[e],b[e]);if(0!=f)return f}return goog.array.defaultCompare(a.length,b.length)};goog.array.defaultCompare=function(a,b){return a>b?1:a<b?-1:0};goog.array.defaultCompareEquality=function(a,b){return a===b};goog.array.binaryInsert=function(a,b,c){c=goog.array.binarySearch(a,b,c);return 0>c?(goog.array.insertAt(a,b,-(c+1)),!0):!1};
goog.array.binaryRemove=function(a,b,c){b=goog.array.binarySearch(a,b,c);return 0<=b?goog.array.removeAt(a,b):!1};goog.array.bucket=function(a,b){for(var c={},d=0;d<a.length;d++){var e=a[d],f=b(e,d,a);goog.isDef(f)&&(c[f]||(c[f]=[])).push(e)}return c};goog.array.toObject=function(a,b,c){var d={};goog.array.forEach(a,function(e,f){d[b.call(c,e,f,a)]=e});return d};goog.array.repeat=function(a,b){for(var c=[],d=0;d<b;d++)c[d]=a;return c};
goog.array.flatten=function(a){for(var b=[],c=0;c<arguments.length;c++){var d=arguments[c];goog.isArray(d)?b.push.apply(b,goog.array.flatten.apply(null,d)):b.push(d)}return b};goog.array.rotate=function(a,b){goog.asserts.assert(null!=a.length);a.length&&(b%=a.length,0<b?goog.array.ARRAY_PROTOTYPE_.unshift.apply(a,a.splice(-b,b)):0>b&&goog.array.ARRAY_PROTOTYPE_.push.apply(a,a.splice(0,-b)));return a};
goog.array.zip=function(a){if(!arguments.length)return[];for(var b=[],c=0;;c++){for(var d=[],e=0;e<arguments.length;e++){var f=arguments[e];if(c>=f.length)return b;d.push(f[c])}b.push(d)}};goog.array.shuffle=function(a,b){for(var c=b||Math.random,d=a.length-1;0<d;d--){var e=Math.floor(c()*(d+1)),f=a[d];a[d]=a[e];a[e]=f}};goog.debug.entryPointRegistry={};goog.debug.EntryPointMonitor=function(){};goog.debug.entryPointRegistry.refList_=[];goog.debug.entryPointRegistry.monitors_=[];goog.debug.entryPointRegistry.monitorsMayExist_=!1;goog.debug.entryPointRegistry.register=function(a){goog.debug.entryPointRegistry.refList_[goog.debug.entryPointRegistry.refList_.length]=a;if(goog.debug.entryPointRegistry.monitorsMayExist_)for(var b=goog.debug.entryPointRegistry.monitors_,c=0;c<b.length;c++)a(goog.bind(b[c].wrap,b[c]))};
goog.debug.entryPointRegistry.monitorAll=function(a){goog.debug.entryPointRegistry.monitorsMayExist_=!0;for(var b=goog.bind(a.wrap,a),c=0;c<goog.debug.entryPointRegistry.refList_.length;c++)goog.debug.entryPointRegistry.refList_[c](b);goog.debug.entryPointRegistry.monitors_.push(a)};
goog.debug.entryPointRegistry.unmonitorAllIfPossible=function(a){var b=goog.debug.entryPointRegistry.monitors_;goog.asserts.assert(a==b[b.length-1],"Only the most recent monitor can be unwrapped.");a=goog.bind(a.unwrap,a);for(var c=0;c<goog.debug.entryPointRegistry.refList_.length;c++)goog.debug.entryPointRegistry.refList_[c](a);b.length--};goog.debug.errorHandlerWeakDep={protectEntryPoint:function(a){return a}};goog.events={};
goog.events.BrowserFeature={HAS_W3C_BUTTON:!goog.userAgent.IE||goog.userAgent.isDocumentMode(9),HAS_W3C_EVENT_SUPPORT:!goog.userAgent.IE||goog.userAgent.isDocumentMode(9),SET_KEY_CODE_TO_PREVENT_DEFAULT:goog.userAgent.IE&&!goog.userAgent.isVersion("9"),HAS_NAVIGATOR_ONLINE_PROPERTY:!goog.userAgent.WEBKIT||goog.userAgent.isVersion("528"),HAS_HTML5_NETWORK_EVENT_SUPPORT:goog.userAgent.GECKO&&goog.userAgent.isVersion("1.9b")||goog.userAgent.IE&&goog.userAgent.isVersion("8")||goog.userAgent.OPERA&&goog.userAgent.isVersion("9.5")||
goog.userAgent.WEBKIT&&goog.userAgent.isVersion("528"),HTML5_NETWORK_EVENTS_FIRE_ON_BODY:goog.userAgent.GECKO&&!goog.userAgent.isVersion("8")||goog.userAgent.IE&&!goog.userAgent.isVersion("9"),TOUCH_ENABLED:"ontouchstart"in goog.global||!(!goog.global.document||!(document.documentElement&&"ontouchstart"in document.documentElement))||!(!goog.global.navigator||!goog.global.navigator.msMaxTouchPoints)};goog.events.Event=function(a,b){this.type=a;this.currentTarget=this.target=b};goog.events.Event.prototype.disposeInternal=function(){};goog.events.Event.prototype.dispose=function(){};goog.events.Event.prototype.propagationStopped_=!1;goog.events.Event.prototype.defaultPrevented=!1;goog.events.Event.prototype.returnValue_=!0;goog.events.Event.prototype.stopPropagation=function(){this.propagationStopped_=!0};
goog.events.Event.prototype.preventDefault=function(){this.defaultPrevented=!0;this.returnValue_=!1};goog.events.Event.stopPropagation=function(a){a.stopPropagation()};goog.events.Event.preventDefault=function(a){a.preventDefault()};goog.events.EventType={CLICK:"click",DBLCLICK:"dblclick",MOUSEDOWN:"mousedown",MOUSEUP:"mouseup",MOUSEOVER:"mouseover",MOUSEOUT:"mouseout",MOUSEMOVE:"mousemove",SELECTSTART:"selectstart",KEYPRESS:"keypress",KEYDOWN:"keydown",KEYUP:"keyup",BLUR:"blur",FOCUS:"focus",DEACTIVATE:"deactivate",FOCUSIN:goog.userAgent.IE?"focusin":"DOMFocusIn",FOCUSOUT:goog.userAgent.IE?"focusout":"DOMFocusOut",CHANGE:"change",SELECT:"select",SUBMIT:"submit",INPUT:"input",PROPERTYCHANGE:"propertychange",DRAGSTART:"dragstart",
DRAG:"drag",DRAGENTER:"dragenter",DRAGOVER:"dragover",DRAGLEAVE:"dragleave",DROP:"drop",DRAGEND:"dragend",TOUCHSTART:"touchstart",TOUCHMOVE:"touchmove",TOUCHEND:"touchend",TOUCHCANCEL:"touchcancel",BEFOREUNLOAD:"beforeunload",CONTEXTMENU:"contextmenu",ERROR:"error",HELP:"help",LOAD:"load",LOSECAPTURE:"losecapture",READYSTATECHANGE:"readystatechange",RESIZE:"resize",SCROLL:"scroll",UNLOAD:"unload",HASHCHANGE:"hashchange",PAGEHIDE:"pagehide",PAGESHOW:"pageshow",POPSTATE:"popstate",COPY:"copy",PASTE:"paste",
CUT:"cut",BEFORECOPY:"beforecopy",BEFORECUT:"beforecut",BEFOREPASTE:"beforepaste",ONLINE:"online",OFFLINE:"offline",MESSAGE:"message",CONNECT:"connect",TRANSITIONEND:goog.userAgent.WEBKIT?"webkitTransitionEnd":goog.userAgent.OPERA?"oTransitionEnd":"transitionend",MSGESTURECHANGE:"MSGestureChange",MSGESTUREEND:"MSGestureEnd",MSGESTUREHOLD:"MSGestureHold",MSGESTURESTART:"MSGestureStart",MSGESTURETAP:"MSGestureTap",MSGOTPOINTERCAPTURE:"MSGotPointerCapture",MSINERTIASTART:"MSInertiaStart",MSLOSTPOINTERCAPTURE:"MSLostPointerCapture",
MSPOINTERCANCEL:"MSPointerCancel",MSPOINTERDOWN:"MSPointerDown",MSPOINTERMOVE:"MSPointerMove",MSPOINTEROVER:"MSPointerOver",MSPOINTEROUT:"MSPointerOut",MSPOINTERUP:"MSPointerUp"};goog.reflect={};goog.reflect.object=function(a,b){return b};goog.reflect.sinkValue=function(a){goog.reflect.sinkValue[" "](a);return a};goog.reflect.sinkValue[" "]=goog.nullFunction;goog.reflect.canAccessProperty=function(a,b){try{return goog.reflect.sinkValue(a[b]),!0}catch(c){}return!1};goog.events.BrowserEvent=function(a,b){a&&this.init(a,b)};goog.inherits(goog.events.BrowserEvent,goog.events.Event);goog.events.BrowserEvent.MouseButton={LEFT:0,MIDDLE:1,RIGHT:2};goog.events.BrowserEvent.IEButtonMap=[1,4,2];goog.events.BrowserEvent.prototype.target=null;goog.events.BrowserEvent.prototype.relatedTarget=null;goog.events.BrowserEvent.prototype.offsetX=0;goog.events.BrowserEvent.prototype.offsetY=0;goog.events.BrowserEvent.prototype.clientX=0;
goog.events.BrowserEvent.prototype.clientY=0;goog.events.BrowserEvent.prototype.screenX=0;goog.events.BrowserEvent.prototype.screenY=0;goog.events.BrowserEvent.prototype.button=0;goog.events.BrowserEvent.prototype.keyCode=0;goog.events.BrowserEvent.prototype.charCode=0;goog.events.BrowserEvent.prototype.ctrlKey=!1;goog.events.BrowserEvent.prototype.altKey=!1;goog.events.BrowserEvent.prototype.shiftKey=!1;goog.events.BrowserEvent.prototype.metaKey=!1;
goog.events.BrowserEvent.prototype.platformModifierKey=!1;goog.events.BrowserEvent.prototype.event_=null;
goog.events.BrowserEvent.prototype.init=function(a,b){var c=this.type=a.type;goog.events.Event.call(this,c);this.target=a.target||a.srcElement;this.currentTarget=b;var d=a.relatedTarget;d?goog.userAgent.GECKO&&(goog.reflect.canAccessProperty(d,"nodeName")||(d=null)):c==goog.events.EventType.MOUSEOVER?d=a.fromElement:c==goog.events.EventType.MOUSEOUT&&(d=a.toElement);this.relatedTarget=d;this.offsetX=goog.userAgent.WEBKIT||void 0!==a.offsetX?a.offsetX:a.layerX;this.offsetY=goog.userAgent.WEBKIT||void 0!==
a.offsetY?a.offsetY:a.layerY;this.clientX=void 0!==a.clientX?a.clientX:a.pageX;this.clientY=void 0!==a.clientY?a.clientY:a.pageY;this.screenX=a.screenX||0;this.screenY=a.screenY||0;this.button=a.button;this.keyCode=a.keyCode||0;this.charCode=a.charCode||("keypress"==c?a.keyCode:0);this.ctrlKey=a.ctrlKey;this.altKey=a.altKey;this.shiftKey=a.shiftKey;this.metaKey=a.metaKey;this.platformModifierKey=goog.userAgent.MAC?a.metaKey:a.ctrlKey;this.state=a.state;this.event_=a;a.defaultPrevented&&this.preventDefault();
delete this.propagationStopped_};goog.events.BrowserEvent.prototype.isButton=function(a){return goog.events.BrowserFeature.HAS_W3C_BUTTON?this.event_.button==a:"click"==this.type?a==goog.events.BrowserEvent.MouseButton.LEFT:!!(this.event_.button&goog.events.BrowserEvent.IEButtonMap[a])};goog.events.BrowserEvent.prototype.isMouseActionButton=function(){return this.isButton(goog.events.BrowserEvent.MouseButton.LEFT)&&!(goog.userAgent.WEBKIT&&goog.userAgent.MAC&&this.ctrlKey)};
goog.events.BrowserEvent.prototype.stopPropagation=function(){goog.events.BrowserEvent.superClass_.stopPropagation.call(this);this.event_.stopPropagation?this.event_.stopPropagation():this.event_.cancelBubble=!0};
goog.events.BrowserEvent.prototype.preventDefault=function(){goog.events.BrowserEvent.superClass_.preventDefault.call(this);var a=this.event_;if(a.preventDefault)a.preventDefault();else if(a.returnValue=!1,goog.events.BrowserFeature.SET_KEY_CODE_TO_PREVENT_DEFAULT)try{if(a.ctrlKey||112<=a.keyCode&&123>=a.keyCode)a.keyCode=-1}catch(b){}};goog.events.BrowserEvent.prototype.getBrowserEvent=function(){return this.event_};goog.events.BrowserEvent.prototype.disposeInternal=function(){};goog.events.EventWrapper=function(){};goog.events.EventWrapper.prototype.listen=function(){};goog.events.EventWrapper.prototype.unlisten=function(){};goog.events.Listener=function(){goog.events.Listener.ENABLE_MONITORING&&(this.creationStack=Error().stack)};goog.events.Listener.counter_=0;goog.events.Listener.ENABLE_MONITORING=!1;goog.events.Listener.prototype.key=0;goog.events.Listener.prototype.removed=!1;goog.events.Listener.prototype.callOnce=!1;
goog.events.Listener.prototype.init=function(a,b,c,d,e,f){if(goog.isFunction(a))this.isFunctionListener_=!0;else if(a&&a.handleEvent&&goog.isFunction(a.handleEvent))this.isFunctionListener_=!1;else throw Error("Invalid listener argument");this.listener=a;this.proxy=b;this.src=c;this.type=d;this.capture=!!e;this.handler=f;this.callOnce=!1;this.key=++goog.events.Listener.counter_;this.removed=!1};
goog.events.Listener.prototype.handleEvent=function(a){return this.isFunctionListener_?this.listener.call(this.handler||this.src,a):this.listener.handleEvent.call(this.listener,a)};goog.object={};goog.object.forEach=function(a,b,c){for(var d in a)b.call(c,a[d],d,a)};goog.object.filter=function(a,b,c){var d={},e;for(e in a)b.call(c,a[e],e,a)&&(d[e]=a[e]);return d};goog.object.map=function(a,b,c){var d={},e;for(e in a)d[e]=b.call(c,a[e],e,a);return d};goog.object.some=function(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return!0;return!1};goog.object.every=function(a,b,c){for(var d in a)if(!b.call(c,a[d],d,a))return!1;return!0};
goog.object.getCount=function(a){var b=0,c;for(c in a)b++;return b};goog.object.getAnyKey=function(a){for(var b in a)return b};goog.object.getAnyValue=function(a){for(var b in a)return a[b]};goog.object.contains=function(a,b){return goog.object.containsValue(a,b)};goog.object.getValues=function(a){var b=[],c=0,d;for(d in a)b[c++]=a[d];return b};goog.object.getKeys=function(a){var b=[],c=0,d;for(d in a)b[c++]=d;return b};
goog.object.getValueByKeys=function(a,b){for(var c=goog.isArrayLike(b),d=c?b:arguments,c=c?0:1;c<d.length&&!(a=a[d[c]],!goog.isDef(a));c++);return a};goog.object.containsKey=function(a,b){return b in a};goog.object.containsValue=function(a,b){for(var c in a)if(a[c]==b)return!0;return!1};goog.object.findKey=function(a,b,c){for(var d in a)if(b.call(c,a[d],d,a))return d};goog.object.findValue=function(a,b,c){return(b=goog.object.findKey(a,b,c))&&a[b]};
goog.object.isEmpty=function(a){for(var b in a)return!1;return!0};goog.object.clear=function(a){for(var b in a)delete a[b]};goog.object.remove=function(a,b){var c;(c=b in a)&&delete a[b];return c};goog.object.add=function(a,b,c){if(b in a)throw Error('The object already contains the key "'+b+'"');goog.object.set(a,b,c)};goog.object.get=function(a,b,c){return b in a?a[b]:c};goog.object.set=function(a,b,c){a[b]=c};goog.object.setIfUndefined=function(a,b,c){return b in a?a[b]:a[b]=c};
goog.object.clone=function(a){var b={},c;for(c in a)b[c]=a[c];return b};goog.object.unsafeClone=function(a){var b=goog.typeOf(a);if("object"==b||"array"==b){if(a.clone)return a.clone();var b="array"==b?[]:{},c;for(c in a)b[c]=goog.object.unsafeClone(a[c]);return b}return a};goog.object.transpose=function(a){var b={},c;for(c in a)b[a[c]]=c;return b};goog.object.PROTOTYPE_FIELDS_="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");
goog.object.extend=function(a,b){for(var c,d,e=1;e<arguments.length;e++){d=arguments[e];for(c in d)a[c]=d[c];for(var f=0;f<goog.object.PROTOTYPE_FIELDS_.length;f++)c=goog.object.PROTOTYPE_FIELDS_[f],Object.prototype.hasOwnProperty.call(d,c)&&(a[c]=d[c])}};
goog.object.create=function(a){var b=arguments.length;if(1==b&&goog.isArray(arguments[0]))return goog.object.create.apply(null,arguments[0]);if(b%2)throw Error("Uneven number of arguments");for(var c={},d=0;d<b;d+=2)c[arguments[d]]=arguments[d+1];return c};goog.object.createSet=function(a){var b=arguments.length;if(1==b&&goog.isArray(arguments[0]))return goog.object.createSet.apply(null,arguments[0]);for(var c={},d=0;d<b;d++)c[arguments[d]]=!0;return c};
goog.object.createImmutableView=function(a){var b=a;Object.isFrozen&&!Object.isFrozen(a)&&(b=Object.create(a),Object.freeze(b));return b};goog.object.isImmutableView=function(a){return!!Object.isFrozen&&Object.isFrozen(a)};goog.events.listeners_={};goog.events.listenerTree_={};goog.events.sources_={};goog.events.onString_="on";goog.events.onStringMap_={};goog.events.keySeparator_="_";goog.events.listen=function(a,b,c,d,e){if(goog.isArray(b)){for(var f=0;f<b.length;f++)goog.events.listen(a,b[f],c,d,e);return null}return goog.events.listen_(a,b,c,!1,d,e)};
goog.events.listen_=function(a,b,c,d,e,f){if(!b)throw Error("Invalid event type");e=!!e;var g=goog.events.listenerTree_;b in g||(g[b]={count_:0,remaining_:0});g=g[b];e in g||(g[e]={count_:0,remaining_:0},g.count_++);var g=g[e],h=goog.getUid(a),j;g.remaining_++;if(g[h]){j=g[h];for(var k=0;k<j.length;k++)if(g=j[k],g.listener==c&&g.handler==f){if(g.removed)break;d||(j[k].callOnce=!1);return j[k].key}}else j=g[h]=[],g.count_++;k=goog.events.getProxy();k.src=a;g=new goog.events.Listener;g.init(c,k,a,b,
e,f);g.callOnce=d;c=g.key;k.key=c;j.push(g);goog.events.listeners_[c]=g;goog.events.sources_[h]||(goog.events.sources_[h]=[]);goog.events.sources_[h].push(g);a.addEventListener?(a==goog.global||!a.customEvent_)&&a.addEventListener(b,k,e):a.attachEvent(goog.events.getOnString_(b),k);return c};
goog.events.getProxy=function(){var a=goog.events.handleBrowserEvent_,b=goog.events.BrowserFeature.HAS_W3C_EVENT_SUPPORT?function(c){return a.call(b.src,b.key,c)}:function(c){c=a.call(b.src,b.key,c);if(!c)return c};return b};goog.events.listenOnce=function(a,b,c,d,e){if(goog.isArray(b)){for(var f=0;f<b.length;f++)goog.events.listenOnce(a,b[f],c,d,e);return null}return goog.events.listen_(a,b,c,!0,d,e)};goog.events.listenWithWrapper=function(a,b,c,d,e){b.listen(a,c,d,e)};
goog.events.unlisten=function(a,b,c,d,e){if(goog.isArray(b)){for(var f=0;f<b.length;f++)goog.events.unlisten(a,b[f],c,d,e);return null}d=!!d;a=goog.events.getListeners_(a,b,d);if(!a)return!1;for(f=0;f<a.length;f++)if(a[f].listener==c&&a[f].capture==d&&a[f].handler==e)return goog.events.unlistenByKey(a[f].key);return!1};
goog.events.unlistenByKey=function(a){if(!goog.events.listeners_[a])return!1;var b=goog.events.listeners_[a];if(b.removed)return!1;var c=b.src,d=b.type,e=b.proxy,f=b.capture;c.removeEventListener?(c==goog.global||!c.customEvent_)&&c.removeEventListener(d,e,f):c.detachEvent&&c.detachEvent(goog.events.getOnString_(d),e);c=goog.getUid(c);goog.events.sources_[c]&&(e=goog.events.sources_[c],goog.array.remove(e,b),0==e.length&&delete goog.events.sources_[c]);b.removed=!0;if(b=goog.events.listenerTree_[d][f][c])b.needsCleanup_=
!0,goog.events.cleanUp_(d,f,c,b);delete goog.events.listeners_[a];return!0};goog.events.unlistenWithWrapper=function(a,b,c,d,e){b.unlisten(a,c,d,e)};
goog.events.cleanUp_=function(a,b,c,d){if(!d.locked_&&d.needsCleanup_){for(var e=0,f=0;e<d.length;e++)d[e].removed?d[e].proxy.src=null:(e!=f&&(d[f]=d[e]),f++);d.length=f;d.needsCleanup_=!1;0==f&&(delete goog.events.listenerTree_[a][b][c],goog.events.listenerTree_[a][b].count_--,0==goog.events.listenerTree_[a][b].count_&&(delete goog.events.listenerTree_[a][b],goog.events.listenerTree_[a].count_--),0==goog.events.listenerTree_[a].count_&&delete goog.events.listenerTree_[a])}};
goog.events.removeAll=function(a,b,c){var d=0,e=null==b,f=null==c;c=!!c;if(null==a)goog.object.forEach(goog.events.sources_,function(a){for(var g=a.length-1;0<=g;g--){var h=a[g];if((e||b==h.type)&&(f||c==h.capture))goog.events.unlistenByKey(h.key),d++}});else if(a=goog.getUid(a),goog.events.sources_[a]){a=goog.events.sources_[a];for(var g=a.length-1;0<=g;g--){var h=a[g];if((e||b==h.type)&&(f||c==h.capture))goog.events.unlistenByKey(h.key),d++}}return d};
goog.events.getListeners=function(a,b,c){return goog.events.getListeners_(a,b,c)||[]};goog.events.getListeners_=function(a,b,c){var d=goog.events.listenerTree_;return b in d&&(d=d[b],c in d&&(d=d[c],a=goog.getUid(a),d[a]))?d[a]:null};goog.events.getListener=function(a,b,c,d,e){d=!!d;if(a=goog.events.getListeners_(a,b,d))for(b=0;b<a.length;b++)if(!a[b].removed&&a[b].listener==c&&a[b].capture==d&&a[b].handler==e)return a[b];return null};
goog.events.hasListener=function(a,b,c){a=goog.getUid(a);var d=goog.events.sources_[a];if(d){var e=goog.isDef(b),f=goog.isDef(c);return e&&f?(d=goog.events.listenerTree_[b],!!d&&!!d[c]&&a in d[c]):!e&&!f?!0:goog.array.some(d,function(a){return e&&a.type==b||f&&a.capture==c})}return!1};goog.events.expose=function(a){var b=[],c;for(c in a)a[c]&&a[c].id?b.push(c+" = "+a[c]+" ("+a[c].id+")"):b.push(c+" = "+a[c]);return b.join("\n")};
goog.events.getOnString_=function(a){return a in goog.events.onStringMap_?goog.events.onStringMap_[a]:goog.events.onStringMap_[a]=goog.events.onString_+a};goog.events.fireListeners=function(a,b,c,d){var e=goog.events.listenerTree_;return b in e&&(e=e[b],c in e)?goog.events.fireListeners_(e[c],a,b,c,d):!0};
goog.events.fireListeners_=function(a,b,c,d,e){var f=1;b=goog.getUid(b);if(a[b]){a.remaining_--;a=a[b];a.locked_?a.locked_++:a.locked_=1;try{for(var g=a.length,h=0;h<g;h++){var j=a[h];j&&!j.removed&&(f&=!1!==goog.events.fireListener(j,e))}}finally{a.locked_--,goog.events.cleanUp_(c,d,b,a)}}return Boolean(f)};goog.events.fireListener=function(a,b){a.callOnce&&goog.events.unlistenByKey(a.key);return a.handleEvent(b)};goog.events.getTotalListenerCount=function(){return goog.object.getCount(goog.events.listeners_)};
goog.events.dispatchEvent=function(a,b){var c=b.type||b,d=goog.events.listenerTree_;if(!(c in d))return!0;if(goog.isString(b))b=new goog.events.Event(b,a);else if(b instanceof goog.events.Event)b.target=b.target||a;else{var e=b;b=new goog.events.Event(c,a);goog.object.extend(b,e)}var e=1,f,d=d[c],c=!0 in d,g;if(c){f=[];for(g=a;g;g=g.getParentEventTarget())f.push(g);g=d[!0];g.remaining_=g.count_;for(var h=f.length-1;!b.propagationStopped_&&0<=h&&g.remaining_;h--)b.currentTarget=f[h],e&=goog.events.fireListeners_(g,
f[h],b.type,!0,b)&&!1!=b.returnValue_}if(!1 in d)if(g=d[!1],g.remaining_=g.count_,c)for(h=0;!b.propagationStopped_&&h<f.length&&g.remaining_;h++)b.currentTarget=f[h],e&=goog.events.fireListeners_(g,f[h],b.type,!1,b)&&!1!=b.returnValue_;else for(d=a;!b.propagationStopped_&&d&&g.remaining_;d=d.getParentEventTarget())b.currentTarget=d,e&=goog.events.fireListeners_(g,d,b.type,!1,b)&&!1!=b.returnValue_;return Boolean(e)};
goog.events.protectBrowserEventEntryPoint=function(a){goog.events.handleBrowserEvent_=a.protectEntryPoint(goog.events.handleBrowserEvent_)};
goog.events.handleBrowserEvent_=function(a,b){if(!goog.events.listeners_[a])return!0;var c=goog.events.listeners_[a],d=c.type,e=goog.events.listenerTree_;if(!(d in e))return!0;var e=e[d],f,g;if(!goog.events.BrowserFeature.HAS_W3C_EVENT_SUPPORT){f=b||goog.getObjectByName("window.event");var h=!0 in e,j=!1 in e;if(h){if(goog.events.isMarkedIeEvent_(f))return!0;goog.events.markIeEvent_(f)}var k=new goog.events.BrowserEvent;k.init(f,this);f=!0;try{if(h){for(var l=[],m=k.currentTarget;m;m=m.parentNode)l.push(m);
g=e[!0];g.remaining_=g.count_;for(var n=l.length-1;!k.propagationStopped_&&0<=n&&g.remaining_;n--)k.currentTarget=l[n],f&=goog.events.fireListeners_(g,l[n],d,!0,k);if(j){g=e[!1];g.remaining_=g.count_;for(n=0;!k.propagationStopped_&&n<l.length&&g.remaining_;n++)k.currentTarget=l[n],f&=goog.events.fireListeners_(g,l[n],d,!1,k)}}else f=goog.events.fireListener(c,k)}finally{l&&(l.length=0)}return f}d=new goog.events.BrowserEvent(b,this);return f=goog.events.fireListener(c,d)};
goog.events.markIeEvent_=function(a){var b=!1;if(0==a.keyCode)try{a.keyCode=-1;return}catch(c){b=!0}if(b||void 0==a.returnValue)a.returnValue=!0};goog.events.isMarkedIeEvent_=function(a){return 0>a.keyCode||void 0!=a.returnValue};goog.events.uniqueIdCounter_=0;goog.events.getUniqueId=function(a){return a+"_"+goog.events.uniqueIdCounter_++};goog.debug.entryPointRegistry.register(function(a){goog.events.handleBrowserEvent_=a(goog.events.handleBrowserEvent_)});goog.events.EventTarget=function(){goog.Disposable.call(this)};goog.inherits(goog.events.EventTarget,goog.Disposable);goog.events.EventTarget.prototype.customEvent_=!0;goog.events.EventTarget.prototype.parentEventTarget_=null;goog.events.EventTarget.prototype.getParentEventTarget=function(){return this.parentEventTarget_};goog.events.EventTarget.prototype.setParentEventTarget=function(a){this.parentEventTarget_=a};
goog.events.EventTarget.prototype.addEventListener=function(a,b,c,d){goog.events.listen(this,a,b,c,d)};goog.events.EventTarget.prototype.removeEventListener=function(a,b,c,d){goog.events.unlisten(this,a,b,c,d)};goog.events.EventTarget.prototype.dispatchEvent=function(a){return goog.events.dispatchEvent(this,a)};goog.events.EventTarget.prototype.disposeInternal=function(){goog.events.EventTarget.superClass_.disposeInternal.call(this);goog.events.removeAll(this);this.parentEventTarget_=null};goog.Timer=function(a,b){goog.events.EventTarget.call(this);this.interval_=a||1;this.timerObject_=b||goog.Timer.defaultTimerObject;this.boundTick_=goog.bind(this.tick_,this);this.last_=goog.now()};goog.inherits(goog.Timer,goog.events.EventTarget);goog.Timer.MAX_TIMEOUT_=2147483647;goog.Timer.prototype.enabled=!1;goog.Timer.defaultTimerObject=goog.global.window;goog.Timer.intervalScale=0.8;goog.Timer.prototype.timer_=null;goog.Timer.prototype.getInterval=function(){return this.interval_};
goog.Timer.prototype.setInterval=function(a){this.interval_=a;this.timer_&&this.enabled?(this.stop(),this.start()):this.timer_&&this.stop()};goog.Timer.prototype.tick_=function(){if(this.enabled){var a=goog.now()-this.last_;0<a&&a<this.interval_*goog.Timer.intervalScale?this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_-a):(this.dispatchTick(),this.enabled&&(this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_),this.last_=goog.now()))}};
goog.Timer.prototype.dispatchTick=function(){this.dispatchEvent(goog.Timer.TICK)};goog.Timer.prototype.start=function(){this.enabled=!0;this.timer_||(this.timer_=this.timerObject_.setTimeout(this.boundTick_,this.interval_),this.last_=goog.now())};goog.Timer.prototype.stop=function(){this.enabled=!1;this.timer_&&(this.timerObject_.clearTimeout(this.timer_),this.timer_=null)};goog.Timer.prototype.disposeInternal=function(){goog.Timer.superClass_.disposeInternal.call(this);this.stop();delete this.timerObject_};
goog.Timer.TICK="tick";goog.Timer.callOnce=function(a,b,c){if(goog.isFunction(a))c&&(a=goog.bind(a,c));else if(a&&"function"==typeof a.handleEvent)a=goog.bind(a.handleEvent,a);else throw Error("Invalid listener argument");return b>goog.Timer.MAX_TIMEOUT_?-1:goog.Timer.defaultTimerObject.setTimeout(a,b||0)};goog.Timer.clear=function(a){goog.Timer.defaultTimerObject.clearTimeout(a)};goog.dom={};goog.dom.BrowserFeature={CAN_ADD_NAME_OR_TYPE_ATTRIBUTES:!goog.userAgent.IE||goog.userAgent.isDocumentMode(9),CAN_USE_CHILDREN_ATTRIBUTE:!goog.userAgent.GECKO&&!goog.userAgent.IE||goog.userAgent.IE&&goog.userAgent.isDocumentMode(9)||goog.userAgent.GECKO&&goog.userAgent.isVersion("1.9.1"),CAN_USE_INNER_TEXT:goog.userAgent.IE&&!goog.userAgent.isVersion("9"),CAN_USE_PARENT_ELEMENT_PROPERTY:goog.userAgent.IE||goog.userAgent.OPERA||goog.userAgent.WEBKIT,INNER_HTML_NEEDS_SCOPED_ELEMENT:goog.userAgent.IE};goog.dom.TagName={A:"A",ABBR:"ABBR",ACRONYM:"ACRONYM",ADDRESS:"ADDRESS",APPLET:"APPLET",AREA:"AREA",ARTICLE:"ARTICLE",ASIDE:"ASIDE",AUDIO:"AUDIO",B:"B",BASE:"BASE",BASEFONT:"BASEFONT",BDI:"BDI",BDO:"BDO",BIG:"BIG",BLOCKQUOTE:"BLOCKQUOTE",BODY:"BODY",BR:"BR",BUTTON:"BUTTON",CANVAS:"CANVAS",CAPTION:"CAPTION",CENTER:"CENTER",CITE:"CITE",CODE:"CODE",COL:"COL",COLGROUP:"COLGROUP",COMMAND:"COMMAND",DATA:"DATA",DATALIST:"DATALIST",DD:"DD",DEL:"DEL",DETAILS:"DETAILS",DFN:"DFN",DIALOG:"DIALOG",DIR:"DIR",DIV:"DIV",
DL:"DL",DT:"DT",EM:"EM",EMBED:"EMBED",FIELDSET:"FIELDSET",FIGCAPTION:"FIGCAPTION",FIGURE:"FIGURE",FONT:"FONT",FOOTER:"FOOTER",FORM:"FORM",FRAME:"FRAME",FRAMESET:"FRAMESET",H1:"H1",H2:"H2",H3:"H3",H4:"H4",H5:"H5",H6:"H6",HEAD:"HEAD",HEADER:"HEADER",HGROUP:"HGROUP",HR:"HR",HTML:"HTML",I:"I",IFRAME:"IFRAME",IMG:"IMG",INPUT:"INPUT",INS:"INS",ISINDEX:"ISINDEX",KBD:"KBD",KEYGEN:"KEYGEN",LABEL:"LABEL",LEGEND:"LEGEND",LI:"LI",LINK:"LINK",MAP:"MAP",MARK:"MARK",MATH:"MATH",MENU:"MENU",META:"META",METER:"METER",
NAV:"NAV",NOFRAMES:"NOFRAMES",NOSCRIPT:"NOSCRIPT",OBJECT:"OBJECT",OL:"OL",OPTGROUP:"OPTGROUP",OPTION:"OPTION",OUTPUT:"OUTPUT",P:"P",PARAM:"PARAM",PRE:"PRE",PROGRESS:"PROGRESS",Q:"Q",RP:"RP",RT:"RT",RUBY:"RUBY",S:"S",SAMP:"SAMP",SCRIPT:"SCRIPT",SECTION:"SECTION",SELECT:"SELECT",SMALL:"SMALL",SOURCE:"SOURCE",SPAN:"SPAN",STRIKE:"STRIKE",STRONG:"STRONG",STYLE:"STYLE",SUB:"SUB",SUMMARY:"SUMMARY",SUP:"SUP",SVG:"SVG",TABLE:"TABLE",TBODY:"TBODY",TD:"TD",TEXTAREA:"TEXTAREA",TFOOT:"TFOOT",TH:"TH",THEAD:"THEAD",
TIME:"TIME",TITLE:"TITLE",TR:"TR",TRACK:"TRACK",TT:"TT",U:"U",UL:"UL",VAR:"VAR",VIDEO:"VIDEO",WBR:"WBR"};goog.dom.classes={};goog.dom.classes.set=function(a,b){a.className=b};goog.dom.classes.get=function(a){a=a.className;return goog.isString(a)&&a.match(/\S+/g)||[]};goog.dom.classes.add=function(a,b){var c=goog.dom.classes.get(a),d=goog.array.slice(arguments,1),e=c.length+d.length;goog.dom.classes.add_(c,d);a.className=c.join(" ");return c.length==e};
goog.dom.classes.remove=function(a,b){var c=goog.dom.classes.get(a),d=goog.array.slice(arguments,1),e=goog.dom.classes.getDifference_(c,d);a.className=e.join(" ");return e.length==c.length-d.length};goog.dom.classes.add_=function(a,b){for(var c=0;c<b.length;c++)goog.array.contains(a,b[c])||a.push(b[c])};goog.dom.classes.getDifference_=function(a,b){return goog.array.filter(a,function(a){return!goog.array.contains(b,a)})};
goog.dom.classes.swap=function(a,b,c){for(var d=goog.dom.classes.get(a),e=!1,f=0;f<d.length;f++)d[f]==b&&(goog.array.splice(d,f--,1),e=!0);e&&(d.push(c),a.className=d.join(" "));return e};goog.dom.classes.addRemove=function(a,b,c){var d=goog.dom.classes.get(a);goog.isString(b)?goog.array.remove(d,b):goog.isArray(b)&&(d=goog.dom.classes.getDifference_(d,b));goog.isString(c)&&!goog.array.contains(d,c)?d.push(c):goog.isArray(c)&&goog.dom.classes.add_(d,c);a.className=d.join(" ")};
goog.dom.classes.has=function(a,b){return goog.array.contains(goog.dom.classes.get(a),b)};goog.dom.classes.enable=function(a,b,c){c?goog.dom.classes.add(a,b):goog.dom.classes.remove(a,b)};goog.dom.classes.toggle=function(a,b){var c=!goog.dom.classes.has(a,b);goog.dom.classes.enable(a,b,c);return c};goog.math={};goog.math.randomInt=function(a){return Math.floor(Math.random()*a)};goog.math.uniformRandom=function(a,b){return a+Math.random()*(b-a)};goog.math.clamp=function(a,b,c){return Math.min(Math.max(a,b),c)};goog.math.modulo=function(a,b){var c=a%b;return 0>c*b?c+b:c};goog.math.lerp=function(a,b,c){return a+c*(b-a)};goog.math.nearlyEquals=function(a,b,c){return Math.abs(a-b)<=(c||1E-6)};goog.math.standardAngle=function(a){return goog.math.modulo(a,360)};
goog.math.toRadians=function(a){return a*Math.PI/180};goog.math.toDegrees=function(a){return 180*a/Math.PI};goog.math.angleDx=function(a,b){return b*Math.cos(goog.math.toRadians(a))};goog.math.angleDy=function(a,b){return b*Math.sin(goog.math.toRadians(a))};goog.math.angle=function(a,b,c,d){return goog.math.standardAngle(goog.math.toDegrees(Math.atan2(d-b,c-a)))};goog.math.angleDifference=function(a,b){var c=goog.math.standardAngle(b)-goog.math.standardAngle(a);180<c?c-=360:-180>=c&&(c=360+c);return c};
goog.math.sign=function(a){return 0==a?0:0>a?-1:1};goog.math.longestCommonSubsequence=function(a,b,c,d){c=c||function(a,b){return a==b};d=d||function(b){return a[b]};for(var e=a.length,f=b.length,g=[],h=0;h<e+1;h++)g[h]=[],g[h][0]=0;for(var j=0;j<f+1;j++)g[0][j]=0;for(h=1;h<=e;h++)for(j=1;j<=e;j++)g[h][j]=c(a[h-1],b[j-1])?g[h-1][j-1]+1:Math.max(g[h-1][j],g[h][j-1]);for(var k=[],h=e,j=f;0<h&&0<j;)c(a[h-1],b[j-1])?(k.unshift(d(h-1,j-1)),h--,j--):g[h-1][j]>g[h][j-1]?h--:j--;return k};
goog.math.sum=function(a){return goog.array.reduce(arguments,function(a,c){return a+c},0)};goog.math.average=function(a){return goog.math.sum.apply(null,arguments)/arguments.length};goog.math.standardDeviation=function(a){var b=arguments.length;if(2>b)return 0;var c=goog.math.average.apply(null,arguments),b=goog.math.sum.apply(null,goog.array.map(arguments,function(a){return Math.pow(a-c,2)}))/(b-1);return Math.sqrt(b)};goog.math.isInt=function(a){return isFinite(a)&&0==a%1};
goog.math.isFiniteNumber=function(a){return isFinite(a)&&!isNaN(a)};goog.math.Coordinate=function(a,b){this.x=goog.isDef(a)?a:0;this.y=goog.isDef(b)?b:0};goog.math.Coordinate.prototype.clone=function(){return new goog.math.Coordinate(this.x,this.y)};goog.DEBUG&&(goog.math.Coordinate.prototype.toString=function(){return"("+this.x+", "+this.y+")"});goog.math.Coordinate.equals=function(a,b){return a==b?!0:!a||!b?!1:a.x==b.x&&a.y==b.y};goog.math.Coordinate.distance=function(a,b){var c=a.x-b.x,d=a.y-b.y;return Math.sqrt(c*c+d*d)};
goog.math.Coordinate.magnitude=function(a){return Math.sqrt(a.x*a.x+a.y*a.y)};goog.math.Coordinate.azimuth=function(a){return goog.math.angle(0,0,a.x,a.y)};goog.math.Coordinate.squaredDistance=function(a,b){var c=a.x-b.x,d=a.y-b.y;return c*c+d*d};goog.math.Coordinate.difference=function(a,b){return new goog.math.Coordinate(a.x-b.x,a.y-b.y)};goog.math.Coordinate.sum=function(a,b){return new goog.math.Coordinate(a.x+b.x,a.y+b.y)};goog.math.Size=function(a,b){this.width=a;this.height=b};goog.math.Size.equals=function(a,b){return a==b?!0:!a||!b?!1:a.width==b.width&&a.height==b.height};goog.math.Size.prototype.clone=function(){return new goog.math.Size(this.width,this.height)};goog.DEBUG&&(goog.math.Size.prototype.toString=function(){return"("+this.width+" x "+this.height+")"});goog.math.Size.prototype.getLongest=function(){return Math.max(this.width,this.height)};
goog.math.Size.prototype.getShortest=function(){return Math.min(this.width,this.height)};goog.math.Size.prototype.area=function(){return this.width*this.height};goog.math.Size.prototype.perimeter=function(){return 2*(this.width+this.height)};goog.math.Size.prototype.aspectRatio=function(){return this.width/this.height};goog.math.Size.prototype.isEmpty=function(){return!this.area()};goog.math.Size.prototype.ceil=function(){this.width=Math.ceil(this.width);this.height=Math.ceil(this.height);return this};
goog.math.Size.prototype.fitsInside=function(a){return this.width<=a.width&&this.height<=a.height};goog.math.Size.prototype.floor=function(){this.width=Math.floor(this.width);this.height=Math.floor(this.height);return this};goog.math.Size.prototype.round=function(){this.width=Math.round(this.width);this.height=Math.round(this.height);return this};goog.math.Size.prototype.scale=function(a){this.width*=a;this.height*=a;return this};
goog.math.Size.prototype.scaleToFit=function(a){a=this.aspectRatio()>a.aspectRatio()?a.width/this.width:a.height/this.height;return this.scale(a)};goog.dom.ASSUME_QUIRKS_MODE=!1;goog.dom.ASSUME_STANDARDS_MODE=!1;goog.dom.COMPAT_MODE_KNOWN_=goog.dom.ASSUME_QUIRKS_MODE||goog.dom.ASSUME_STANDARDS_MODE;goog.dom.NodeType={ELEMENT:1,ATTRIBUTE:2,TEXT:3,CDATA_SECTION:4,ENTITY_REFERENCE:5,ENTITY:6,PROCESSING_INSTRUCTION:7,COMMENT:8,DOCUMENT:9,DOCUMENT_TYPE:10,DOCUMENT_FRAGMENT:11,NOTATION:12};goog.dom.getDomHelper=function(a){return a?new goog.dom.DomHelper(goog.dom.getOwnerDocument(a)):goog.dom.defaultDomHelper_||(goog.dom.defaultDomHelper_=new goog.dom.DomHelper)};
goog.dom.getDocument=function(){return document};goog.dom.getElement=function(a){return goog.isString(a)?document.getElementById(a):a};goog.dom.$=goog.dom.getElement;goog.dom.getElementsByTagNameAndClass=function(a,b,c){return goog.dom.getElementsByTagNameAndClass_(document,a,b,c)};
goog.dom.getElementsByClass=function(a,b){var c=b||document;return goog.dom.canUseQuerySelector_(c)?c.querySelectorAll("."+a):c.getElementsByClassName?c.getElementsByClassName(a):goog.dom.getElementsByTagNameAndClass_(document,"*",a,b)};goog.dom.getElementByClass=function(a,b){var c=b||document,d=null;return(d=goog.dom.canUseQuerySelector_(c)?c.querySelector("."+a):goog.dom.getElementsByClass(a,b)[0])||null};goog.dom.canUseQuerySelector_=function(a){return!(!a.querySelectorAll||!a.querySelector)};
goog.dom.getElementsByTagNameAndClass_=function(a,b,c,d){a=d||a;b=b&&"*"!=b?b.toUpperCase():"";if(goog.dom.canUseQuerySelector_(a)&&(b||c))return a.querySelectorAll(b+(c?"."+c:""));if(c&&a.getElementsByClassName){a=a.getElementsByClassName(c);if(b){d={};for(var e=0,f=0,g;g=a[f];f++)b==g.nodeName&&(d[e++]=g);d.length=e;return d}return a}a=a.getElementsByTagName(b||"*");if(c){d={};for(f=e=0;g=a[f];f++)b=g.className,"function"==typeof b.split&&goog.array.contains(b.split(/\s+/),c)&&(d[e++]=g);d.length=
e;return d}return a};goog.dom.$$=goog.dom.getElementsByTagNameAndClass;goog.dom.setProperties=function(a,b){goog.object.forEach(b,function(b,d){"style"==d?a.style.cssText=b:"class"==d?a.className=b:"for"==d?a.htmlFor=b:d in goog.dom.DIRECT_ATTRIBUTE_MAP_?a.setAttribute(goog.dom.DIRECT_ATTRIBUTE_MAP_[d],b):goog.string.startsWith(d,"aria-")||goog.string.startsWith(d,"data-")?a.setAttribute(d,b):a[d]=b})};
goog.dom.DIRECT_ATTRIBUTE_MAP_={cellpadding:"cellPadding",cellspacing:"cellSpacing",colspan:"colSpan",frameborder:"frameBorder",height:"height",maxlength:"maxLength",role:"role",rowspan:"rowSpan",type:"type",usemap:"useMap",valign:"vAlign",width:"width"};goog.dom.getViewportSize=function(a){return goog.dom.getViewportSize_(a||window)};goog.dom.getViewportSize_=function(a){a=a.document;a=goog.dom.isCss1CompatMode_(a)?a.documentElement:a.body;return new goog.math.Size(a.clientWidth,a.clientHeight)};
goog.dom.getDocumentHeight=function(){return goog.dom.getDocumentHeight_(window)};goog.dom.getDocumentHeight_=function(a){var b=a.document,c=0;if(b){a=goog.dom.getViewportSize_(a).height;var c=b.body,d=b.documentElement;if(goog.dom.isCss1CompatMode_(b)&&d.scrollHeight)c=d.scrollHeight!=a?d.scrollHeight:d.offsetHeight;else{var b=d.scrollHeight,e=d.offsetHeight;d.clientHeight!=e&&(b=c.scrollHeight,e=c.offsetHeight);c=b>a?b>e?b:e:b<e?b:e}}return c};
goog.dom.getPageScroll=function(a){return goog.dom.getDomHelper((a||goog.global||window).document).getDocumentScroll()};goog.dom.getDocumentScroll=function(){return goog.dom.getDocumentScroll_(document)};goog.dom.getDocumentScroll_=function(a){var b=goog.dom.getDocumentScrollElement_(a);a=goog.dom.getWindow_(a);return new goog.math.Coordinate(a.pageXOffset||b.scrollLeft,a.pageYOffset||b.scrollTop)};goog.dom.getDocumentScrollElement=function(){return goog.dom.getDocumentScrollElement_(document)};
goog.dom.getDocumentScrollElement_=function(a){return!goog.userAgent.WEBKIT&&goog.dom.isCss1CompatMode_(a)?a.documentElement:a.body};goog.dom.getWindow=function(a){return a?goog.dom.getWindow_(a):window};goog.dom.getWindow_=function(a){return a.parentWindow||a.defaultView};goog.dom.createDom=function(a,b,c){return goog.dom.createDom_(document,arguments)};
goog.dom.createDom_=function(a,b){var c=b[0],d=b[1];if(!goog.dom.BrowserFeature.CAN_ADD_NAME_OR_TYPE_ATTRIBUTES&&d&&(d.name||d.type)){c=["<",c];d.name&&c.push(' name="',goog.string.htmlEscape(d.name),'"');if(d.type){c.push(' type="',goog.string.htmlEscape(d.type),'"');var e={};goog.object.extend(e,d);delete e.type;d=e}c.push(">");c=c.join("")}c=a.createElement(c);d&&(goog.isString(d)?c.className=d:goog.isArray(d)?goog.dom.classes.add.apply(null,[c].concat(d)):goog.dom.setProperties(c,d));2<b.length&&
goog.dom.append_(a,c,b,2);return c};goog.dom.append_=function(a,b,c,d){function e(c){c&&b.appendChild(goog.isString(c)?a.createTextNode(c):c)}for(;d<c.length;d++){var f=c[d];goog.isArrayLike(f)&&!goog.dom.isNodeLike(f)?goog.array.forEach(goog.dom.isNodeList(f)?goog.array.toArray(f):f,e):e(f)}};goog.dom.$dom=goog.dom.createDom;goog.dom.createElement=function(a){return document.createElement(a)};goog.dom.createTextNode=function(a){return document.createTextNode(a)};
goog.dom.createTable=function(a,b,c){return goog.dom.createTable_(document,a,b,!!c)};goog.dom.createTable_=function(a,b,c,d){for(var e=["<tr>"],f=0;f<c;f++)e.push(d?"<td>&nbsp;</td>":"<td></td>");e.push("</tr>");e=e.join("");c=["<table>"];for(f=0;f<b;f++)c.push(e);c.push("</table>");a=a.createElement(goog.dom.TagName.DIV);a.innerHTML=c.join("");return a.removeChild(a.firstChild)};goog.dom.htmlToDocumentFragment=function(a){return goog.dom.htmlToDocumentFragment_(document,a)};
goog.dom.htmlToDocumentFragment_=function(a,b){var c=a.createElement("div");goog.dom.BrowserFeature.INNER_HTML_NEEDS_SCOPED_ELEMENT?(c.innerHTML="<br>"+b,c.removeChild(c.firstChild)):c.innerHTML=b;if(1==c.childNodes.length)return c.removeChild(c.firstChild);for(var d=a.createDocumentFragment();c.firstChild;)d.appendChild(c.firstChild);return d};goog.dom.getCompatMode=function(){return goog.dom.isCss1CompatMode()?"CSS1Compat":"BackCompat"};goog.dom.isCss1CompatMode=function(){return goog.dom.isCss1CompatMode_(document)};
goog.dom.isCss1CompatMode_=function(a){return goog.dom.COMPAT_MODE_KNOWN_?goog.dom.ASSUME_STANDARDS_MODE:"CSS1Compat"==a.compatMode};goog.dom.canHaveChildren=function(a){if(a.nodeType!=goog.dom.NodeType.ELEMENT)return!1;switch(a.tagName){case goog.dom.TagName.APPLET:case goog.dom.TagName.AREA:case goog.dom.TagName.BASE:case goog.dom.TagName.BR:case goog.dom.TagName.COL:case goog.dom.TagName.COMMAND:case goog.dom.TagName.EMBED:case goog.dom.TagName.FRAME:case goog.dom.TagName.HR:case goog.dom.TagName.IMG:case goog.dom.TagName.INPUT:case goog.dom.TagName.IFRAME:case goog.dom.TagName.ISINDEX:case goog.dom.TagName.KEYGEN:case goog.dom.TagName.LINK:case goog.dom.TagName.NOFRAMES:case goog.dom.TagName.NOSCRIPT:case goog.dom.TagName.META:case goog.dom.TagName.OBJECT:case goog.dom.TagName.PARAM:case goog.dom.TagName.SCRIPT:case goog.dom.TagName.SOURCE:case goog.dom.TagName.STYLE:case goog.dom.TagName.TRACK:case goog.dom.TagName.WBR:return!1}return!0};
goog.dom.appendChild=function(a,b){a.appendChild(b)};goog.dom.append=function(a,b){goog.dom.append_(goog.dom.getOwnerDocument(a),a,arguments,1)};goog.dom.removeChildren=function(a){for(var b;b=a.firstChild;)a.removeChild(b)};goog.dom.insertSiblingBefore=function(a,b){b.parentNode&&b.parentNode.insertBefore(a,b)};goog.dom.insertSiblingAfter=function(a,b){b.parentNode&&b.parentNode.insertBefore(a,b.nextSibling)};goog.dom.insertChildAt=function(a,b,c){a.insertBefore(b,a.childNodes[c]||null)};
goog.dom.removeNode=function(a){return a&&a.parentNode?a.parentNode.removeChild(a):null};goog.dom.replaceNode=function(a,b){var c=b.parentNode;c&&c.replaceChild(a,b)};goog.dom.flattenElement=function(a){var b,c=a.parentNode;if(c&&c.nodeType!=goog.dom.NodeType.DOCUMENT_FRAGMENT){if(a.removeNode)return a.removeNode(!1);for(;b=a.firstChild;)c.insertBefore(b,a);return goog.dom.removeNode(a)}};
goog.dom.getChildren=function(a){return goog.dom.BrowserFeature.CAN_USE_CHILDREN_ATTRIBUTE&&void 0!=a.children?a.children:goog.array.filter(a.childNodes,function(a){return a.nodeType==goog.dom.NodeType.ELEMENT})};goog.dom.getFirstElementChild=function(a){return void 0!=a.firstElementChild?a.firstElementChild:goog.dom.getNextElementNode_(a.firstChild,!0)};goog.dom.getLastElementChild=function(a){return void 0!=a.lastElementChild?a.lastElementChild:goog.dom.getNextElementNode_(a.lastChild,!1)};
goog.dom.getNextElementSibling=function(a){return void 0!=a.nextElementSibling?a.nextElementSibling:goog.dom.getNextElementNode_(a.nextSibling,!0)};goog.dom.getPreviousElementSibling=function(a){return void 0!=a.previousElementSibling?a.previousElementSibling:goog.dom.getNextElementNode_(a.previousSibling,!1)};goog.dom.getNextElementNode_=function(a,b){for(;a&&a.nodeType!=goog.dom.NodeType.ELEMENT;)a=b?a.nextSibling:a.previousSibling;return a};
goog.dom.getNextNode=function(a){if(!a)return null;if(a.firstChild)return a.firstChild;for(;a&&!a.nextSibling;)a=a.parentNode;return a?a.nextSibling:null};goog.dom.getPreviousNode=function(a){if(!a)return null;if(!a.previousSibling)return a.parentNode;for(a=a.previousSibling;a&&a.lastChild;)a=a.lastChild;return a};goog.dom.isNodeLike=function(a){return goog.isObject(a)&&0<a.nodeType};goog.dom.isElement=function(a){return goog.isObject(a)&&a.nodeType==goog.dom.NodeType.ELEMENT};
goog.dom.isWindow=function(a){return goog.isObject(a)&&a.window==a};goog.dom.getParentElement=function(a){if(goog.dom.BrowserFeature.CAN_USE_PARENT_ELEMENT_PROPERTY)return a.parentElement;a=a.parentNode;return goog.dom.isElement(a)?a:null};goog.dom.contains=function(a,b){if(a.contains&&b.nodeType==goog.dom.NodeType.ELEMENT)return a==b||a.contains(b);if("undefined"!=typeof a.compareDocumentPosition)return a==b||Boolean(a.compareDocumentPosition(b)&16);for(;b&&a!=b;)b=b.parentNode;return b==a};
goog.dom.compareNodeOrder=function(a,b){if(a==b)return 0;if(a.compareDocumentPosition)return a.compareDocumentPosition(b)&2?1:-1;if(goog.userAgent.IE&&!goog.userAgent.isDocumentMode(9)){if(a.nodeType==goog.dom.NodeType.DOCUMENT)return-1;if(b.nodeType==goog.dom.NodeType.DOCUMENT)return 1}if("sourceIndex"in a||a.parentNode&&"sourceIndex"in a.parentNode){var c=a.nodeType==goog.dom.NodeType.ELEMENT,d=b.nodeType==goog.dom.NodeType.ELEMENT;if(c&&d)return a.sourceIndex-b.sourceIndex;var e=a.parentNode,f=
b.parentNode;return e==f?goog.dom.compareSiblingOrder_(a,b):!c&&goog.dom.contains(e,b)?-1*goog.dom.compareParentsDescendantNodeIe_(a,b):!d&&goog.dom.contains(f,a)?goog.dom.compareParentsDescendantNodeIe_(b,a):(c?a.sourceIndex:e.sourceIndex)-(d?b.sourceIndex:f.sourceIndex)}d=goog.dom.getOwnerDocument(a);c=d.createRange();c.selectNode(a);c.collapse(!0);d=d.createRange();d.selectNode(b);d.collapse(!0);return c.compareBoundaryPoints(goog.global.Range.START_TO_END,d)};
goog.dom.compareParentsDescendantNodeIe_=function(a,b){var c=a.parentNode;if(c==b)return-1;for(var d=b;d.parentNode!=c;)d=d.parentNode;return goog.dom.compareSiblingOrder_(d,a)};goog.dom.compareSiblingOrder_=function(a,b){for(var c=b;c=c.previousSibling;)if(c==a)return-1;return 1};
goog.dom.findCommonAncestor=function(a){var b,c=arguments.length;if(c){if(1==c)return arguments[0]}else return null;var d=[],e=Infinity;for(b=0;b<c;b++){for(var f=[],g=arguments[b];g;)f.unshift(g),g=g.parentNode;d.push(f);e=Math.min(e,f.length)}f=null;for(b=0;b<e;b++){for(var g=d[0][b],h=1;h<c;h++)if(g!=d[h][b])return f;f=g}return f};goog.dom.getOwnerDocument=function(a){return a.nodeType==goog.dom.NodeType.DOCUMENT?a:a.ownerDocument||a.document};
goog.dom.getFrameContentDocument=function(a){return a.contentDocument||a.contentWindow.document};goog.dom.getFrameContentWindow=function(a){return a.contentWindow||goog.dom.getWindow_(goog.dom.getFrameContentDocument(a))};
goog.dom.setTextContent=function(a,b){if("textContent"in a)a.textContent=b;else if(a.firstChild&&a.firstChild.nodeType==goog.dom.NodeType.TEXT){for(;a.lastChild!=a.firstChild;)a.removeChild(a.lastChild);a.firstChild.data=b}else{goog.dom.removeChildren(a);var c=goog.dom.getOwnerDocument(a);a.appendChild(c.createTextNode(b))}};goog.dom.getOuterHtml=function(a){if("outerHTML"in a)return a.outerHTML;var b=goog.dom.getOwnerDocument(a).createElement("div");b.appendChild(a.cloneNode(!0));return b.innerHTML};
goog.dom.findNode=function(a,b){var c=[];return goog.dom.findNodes_(a,b,c,!0)?c[0]:void 0};goog.dom.findNodes=function(a,b){var c=[];goog.dom.findNodes_(a,b,c,!1);return c};goog.dom.findNodes_=function(a,b,c,d){if(null!=a)for(a=a.firstChild;a;){if(b(a)&&(c.push(a),d)||goog.dom.findNodes_(a,b,c,d))return!0;a=a.nextSibling}return!1};goog.dom.TAGS_TO_IGNORE_={SCRIPT:1,STYLE:1,HEAD:1,IFRAME:1,OBJECT:1};goog.dom.PREDEFINED_TAG_VALUES_={IMG:" ",BR:"\n"};
goog.dom.isFocusableTabIndex=function(a){var b=a.getAttributeNode("tabindex");return b&&b.specified?(a=a.tabIndex,goog.isNumber(a)&&0<=a&&32768>a):!1};goog.dom.setFocusableTabIndex=function(a,b){b?a.tabIndex=0:(a.tabIndex=-1,a.removeAttribute("tabIndex"))};
goog.dom.getTextContent=function(a){if(goog.dom.BrowserFeature.CAN_USE_INNER_TEXT&&"innerText"in a)a=goog.string.canonicalizeNewlines(a.innerText);else{var b=[];goog.dom.getTextContent_(a,b,!0);a=b.join("")}a=a.replace(/ \xAD /g," ").replace(/\xAD/g,"");a=a.replace(/\u200B/g,"");goog.dom.BrowserFeature.CAN_USE_INNER_TEXT||(a=a.replace(/ +/g," "));" "!=a&&(a=a.replace(/^\s*/,""));return a};goog.dom.getRawTextContent=function(a){var b=[];goog.dom.getTextContent_(a,b,!1);return b.join("")};
goog.dom.getTextContent_=function(a,b,c){if(!(a.nodeName in goog.dom.TAGS_TO_IGNORE_))if(a.nodeType==goog.dom.NodeType.TEXT)c?b.push(String(a.nodeValue).replace(/(\r\n|\r|\n)/g,"")):b.push(a.nodeValue);else if(a.nodeName in goog.dom.PREDEFINED_TAG_VALUES_)b.push(goog.dom.PREDEFINED_TAG_VALUES_[a.nodeName]);else for(a=a.firstChild;a;)goog.dom.getTextContent_(a,b,c),a=a.nextSibling};goog.dom.getNodeTextLength=function(a){return goog.dom.getTextContent(a).length};
goog.dom.getNodeTextOffset=function(a,b){for(var c=b||goog.dom.getOwnerDocument(a).body,d=[];a&&a!=c;){for(var e=a;e=e.previousSibling;)d.unshift(goog.dom.getTextContent(e));a=a.parentNode}return goog.string.trimLeft(d.join("")).replace(/ +/g," ").length};
goog.dom.getNodeAtOffset=function(a,b,c){a=[a];for(var d=0,e=null;0<a.length&&d<b;)if(e=a.pop(),!(e.nodeName in goog.dom.TAGS_TO_IGNORE_))if(e.nodeType==goog.dom.NodeType.TEXT)var f=e.nodeValue.replace(/(\r\n|\r|\n)/g,"").replace(/ +/g," "),d=d+f.length;else if(e.nodeName in goog.dom.PREDEFINED_TAG_VALUES_)d+=goog.dom.PREDEFINED_TAG_VALUES_[e.nodeName].length;else for(f=e.childNodes.length-1;0<=f;f--)a.push(e.childNodes[f]);goog.isObject(c)&&(c.remainder=e?e.nodeValue.length+b-d-1:0,c.node=e);return e};
goog.dom.isNodeList=function(a){if(a&&"number"==typeof a.length){if(goog.isObject(a))return"function"==typeof a.item||"string"==typeof a.item;if(goog.isFunction(a))return"function"==typeof a.item}return!1};goog.dom.getAncestorByTagNameAndClass=function(a,b,c){if(!b&&!c)return null;var d=b?b.toUpperCase():null;return goog.dom.getAncestor(a,function(a){return(!d||a.nodeName==d)&&(!c||goog.dom.classes.has(a,c))},!0)};
goog.dom.getAncestorByClass=function(a,b){return goog.dom.getAncestorByTagNameAndClass(a,null,b)};goog.dom.getAncestor=function(a,b,c,d){c||(a=a.parentNode);c=null==d;for(var e=0;a&&(c||e<=d);){if(b(a))return a;a=a.parentNode;e++}return null};goog.dom.getActiveElement=function(a){try{return a&&a.activeElement}catch(b){}return null};goog.dom.DomHelper=function(a){this.document_=a||goog.global.document||document};goog.dom.DomHelper.prototype.getDomHelper=goog.dom.getDomHelper;
goog.dom.DomHelper.prototype.setDocument=function(a){this.document_=a};goog.dom.DomHelper.prototype.getDocument=function(){return this.document_};goog.dom.DomHelper.prototype.getElement=function(a){return goog.isString(a)?this.document_.getElementById(a):a};goog.dom.DomHelper.prototype.$=goog.dom.DomHelper.prototype.getElement;goog.dom.DomHelper.prototype.getElementsByTagNameAndClass=function(a,b,c){return goog.dom.getElementsByTagNameAndClass_(this.document_,a,b,c)};
goog.dom.DomHelper.prototype.getElementsByClass=function(a,b){return goog.dom.getElementsByClass(a,b||this.document_)};goog.dom.DomHelper.prototype.getElementByClass=function(a,b){return goog.dom.getElementByClass(a,b||this.document_)};goog.dom.DomHelper.prototype.$$=goog.dom.DomHelper.prototype.getElementsByTagNameAndClass;goog.dom.DomHelper.prototype.setProperties=goog.dom.setProperties;goog.dom.DomHelper.prototype.getViewportSize=function(a){return goog.dom.getViewportSize(a||this.getWindow())};
goog.dom.DomHelper.prototype.getDocumentHeight=function(){return goog.dom.getDocumentHeight_(this.getWindow())};goog.dom.DomHelper.prototype.createDom=function(a,b,c){return goog.dom.createDom_(this.document_,arguments)};goog.dom.DomHelper.prototype.$dom=goog.dom.DomHelper.prototype.createDom;goog.dom.DomHelper.prototype.createElement=function(a){return this.document_.createElement(a)};goog.dom.DomHelper.prototype.createTextNode=function(a){return this.document_.createTextNode(a)};
goog.dom.DomHelper.prototype.createTable=function(a,b,c){return goog.dom.createTable_(this.document_,a,b,!!c)};goog.dom.DomHelper.prototype.htmlToDocumentFragment=function(a){return goog.dom.htmlToDocumentFragment_(this.document_,a)};goog.dom.DomHelper.prototype.getCompatMode=function(){return this.isCss1CompatMode()?"CSS1Compat":"BackCompat"};goog.dom.DomHelper.prototype.isCss1CompatMode=function(){return goog.dom.isCss1CompatMode_(this.document_)};goog.dom.DomHelper.prototype.getWindow=function(){return goog.dom.getWindow_(this.document_)};
goog.dom.DomHelper.prototype.getDocumentScrollElement=function(){return goog.dom.getDocumentScrollElement_(this.document_)};goog.dom.DomHelper.prototype.getDocumentScroll=function(){return goog.dom.getDocumentScroll_(this.document_)};goog.dom.DomHelper.prototype.getActiveElement=function(a){return goog.dom.getActiveElement(a||this.document_)};goog.dom.DomHelper.prototype.appendChild=goog.dom.appendChild;goog.dom.DomHelper.prototype.append=goog.dom.append;
goog.dom.DomHelper.prototype.canHaveChildren=goog.dom.canHaveChildren;goog.dom.DomHelper.prototype.removeChildren=goog.dom.removeChildren;goog.dom.DomHelper.prototype.insertSiblingBefore=goog.dom.insertSiblingBefore;goog.dom.DomHelper.prototype.insertSiblingAfter=goog.dom.insertSiblingAfter;goog.dom.DomHelper.prototype.insertChildAt=goog.dom.insertChildAt;goog.dom.DomHelper.prototype.removeNode=goog.dom.removeNode;goog.dom.DomHelper.prototype.replaceNode=goog.dom.replaceNode;
goog.dom.DomHelper.prototype.flattenElement=goog.dom.flattenElement;goog.dom.DomHelper.prototype.getChildren=goog.dom.getChildren;goog.dom.DomHelper.prototype.getFirstElementChild=goog.dom.getFirstElementChild;goog.dom.DomHelper.prototype.getLastElementChild=goog.dom.getLastElementChild;goog.dom.DomHelper.prototype.getNextElementSibling=goog.dom.getNextElementSibling;goog.dom.DomHelper.prototype.getPreviousElementSibling=goog.dom.getPreviousElementSibling;
goog.dom.DomHelper.prototype.getNextNode=goog.dom.getNextNode;goog.dom.DomHelper.prototype.getPreviousNode=goog.dom.getPreviousNode;goog.dom.DomHelper.prototype.isNodeLike=goog.dom.isNodeLike;goog.dom.DomHelper.prototype.isElement=goog.dom.isElement;goog.dom.DomHelper.prototype.isWindow=goog.dom.isWindow;goog.dom.DomHelper.prototype.getParentElement=goog.dom.getParentElement;goog.dom.DomHelper.prototype.contains=goog.dom.contains;goog.dom.DomHelper.prototype.compareNodeOrder=goog.dom.compareNodeOrder;
goog.dom.DomHelper.prototype.findCommonAncestor=goog.dom.findCommonAncestor;goog.dom.DomHelper.prototype.getOwnerDocument=goog.dom.getOwnerDocument;goog.dom.DomHelper.prototype.getFrameContentDocument=goog.dom.getFrameContentDocument;goog.dom.DomHelper.prototype.getFrameContentWindow=goog.dom.getFrameContentWindow;goog.dom.DomHelper.prototype.setTextContent=goog.dom.setTextContent;goog.dom.DomHelper.prototype.getOuterHtml=goog.dom.getOuterHtml;goog.dom.DomHelper.prototype.findNode=goog.dom.findNode;
goog.dom.DomHelper.prototype.findNodes=goog.dom.findNodes;goog.dom.DomHelper.prototype.isFocusableTabIndex=goog.dom.isFocusableTabIndex;goog.dom.DomHelper.prototype.setFocusableTabIndex=goog.dom.setFocusableTabIndex;goog.dom.DomHelper.prototype.getTextContent=goog.dom.getTextContent;goog.dom.DomHelper.prototype.getNodeTextLength=goog.dom.getNodeTextLength;goog.dom.DomHelper.prototype.getNodeTextOffset=goog.dom.getNodeTextOffset;goog.dom.DomHelper.prototype.getNodeAtOffset=goog.dom.getNodeAtOffset;
goog.dom.DomHelper.prototype.isNodeList=goog.dom.isNodeList;goog.dom.DomHelper.prototype.getAncestorByTagNameAndClass=goog.dom.getAncestorByTagNameAndClass;goog.dom.DomHelper.prototype.getAncestorByClass=goog.dom.getAncestorByClass;goog.dom.DomHelper.prototype.getAncestor=goog.dom.getAncestor;goog.cssom={};goog.cssom.CssRuleType={STYLE:1,IMPORT:3,MEDIA:4,FONT_FACE:5,PAGE:6,NAMESPACE:7};goog.cssom.getAllCssText=function(a){return goog.cssom.getAllCss_(a||document.styleSheets,!0)};goog.cssom.getAllCssStyleRules=function(a){return goog.cssom.getAllCss_(a||document.styleSheets,!1)};goog.cssom.getCssRulesFromStyleSheet=function(a){var b=null;try{b=a.rules||a.cssRules}catch(c){if(15==c.code)throw c.styleSheet=a,c;}return b};
goog.cssom.getAllCssStyleSheets=function(a,b){var c=[],d=a||document.styleSheets,e=goog.isDef(b)?b:!1;if(d.imports&&d.imports.length)for(var f=0,g=d.imports.length;f<g;f++)goog.array.extend(c,goog.cssom.getAllCssStyleSheets(d.imports[f]));else if(d.length){f=0;for(g=d.length;f<g;f++)goog.array.extend(c,goog.cssom.getAllCssStyleSheets(d[f]))}else{var h=goog.cssom.getCssRulesFromStyleSheet(d);if(h&&h.length)for(var f=0,g=h.length,j;f<g;f++)j=h[f],j.styleSheet&&goog.array.extend(c,goog.cssom.getAllCssStyleSheets(j.styleSheet))}(d.type||
d.rules||d.cssRules)&&(!d.disabled||e)&&c.push(d);return c};goog.cssom.getCssTextFromCssRule=function(a){var b="";a.cssText?b=a.cssText:a.style&&(a.style.cssText&&a.selectorText)&&(b=a.style.cssText.replace(/\s*-closure-parent-stylesheet:\s*\[object\];?\s*/gi,"").replace(/\s*-closure-rule-index:\s*[\d]+;?\s*/gi,""),b=a.selectorText+" { "+b+" }");return b};
goog.cssom.getCssRuleIndexInParentStyleSheet=function(a,b){if(a.style&&a.style["-closure-rule-index"])return a.style["-closure-rule-index"];var c=b||goog.cssom.getParentStyleSheet(a);if(!c)throw Error("Cannot find a parentStyleSheet.");if((c=goog.cssom.getCssRulesFromStyleSheet(c))&&c.length)for(var d=0,e=c.length,f;d<e;d++)if(f=c[d],f==a)return d;return-1};goog.cssom.getParentStyleSheet=function(a){return a.parentStyleSheet||a.style["-closure-parent-stylesheet"]};
goog.cssom.replaceCssRule=function(a,b,c,d){if(c=c||goog.cssom.getParentStyleSheet(a))if(a=0<=d?d:goog.cssom.getCssRuleIndexInParentStyleSheet(a,c),0<=a)goog.cssom.removeCssRule(c,a),goog.cssom.addCssRule(c,b,a);else throw Error("Cannot proceed without the index of the cssRule.");else throw Error("Cannot proceed without the parentStyleSheet.");};
goog.cssom.addCssRule=function(a,b,c){if(0>c||void 0==c)c=(a.rules||a.cssRules).length;if(a.insertRule)a.insertRule(b,c);else if(b=/^([^\{]+)\{([^\{]+)\}/.exec(b),3==b.length)a.addRule(b[1],b[2],c);else throw Error("Your CSSRule appears to be ill-formatted.");};goog.cssom.removeCssRule=function(a,b){a.deleteRule?a.deleteRule(b):a.removeRule(b)};
goog.cssom.addCssText=function(a,b){var c=b?b.getDocument():goog.dom.getDocument(),d=c.createElement("style");d.type="text/css";c.getElementsByTagName("head")[0].appendChild(d);d.styleSheet?d.styleSheet.cssText=a:(c=c.createTextNode(a),d.appendChild(c));return d};goog.cssom.getFileNameFromStyleSheet=function(a){a=a.href;return!a?null:/([^\/\?]+)[^\/]*$/.exec(a)[1]};
goog.cssom.getAllCss_=function(a,b){for(var c=[],d=goog.cssom.getAllCssStyleSheets(a),e=0;a=d[e];e++){var f=goog.cssom.getCssRulesFromStyleSheet(a);if(f&&f.length){if(!b)var g=0;for(var h=0,j=f.length,k;h<j;h++)k=f[h],b&&!k.href?(k=goog.cssom.getCssTextFromCssRule(k),c.push(k)):k.href||(k.style&&(k.parentStyleSheet||(k.style["-closure-parent-stylesheet"]=a),k.style["-closure-rule-index"]=g),c.push(k)),b||g++}}return b?c.join(" "):c};goog.color={};
goog.color.names={aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000000",blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",
darkgrey:"#a9a9a9",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#ff00ff",gainsboro:"#dcdcdc",
ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",greenyellow:"#adff2f",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",
lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#778899",lightslategrey:"#778899",lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370d8",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",
moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#d87093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",red:"#ff0000",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",
seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",slategray:"#708090",slategrey:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#ffffff",whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32"};goog.color.parse=function(a){var b={};a=String(a);var c=goog.color.prependHashIfNecessaryHelper(a);if(goog.color.isValidHexColor_(c))return b.hex=goog.color.normalizeHex(c),b.type="hex",b;c=goog.color.isValidRgbColor_(a);if(c.length)return b.hex=goog.color.rgbArrayToHex(c),b.type="rgb",b;if(goog.color.names&&(c=goog.color.names[a.toLowerCase()]))return b.hex=c,b.type="named",b;throw Error(a+" is not a valid color string");};
goog.color.isValidColor=function(a){var b=goog.color.prependHashIfNecessaryHelper(a);return!(!goog.color.isValidHexColor_(b)&&!(goog.color.isValidRgbColor_(a).length||goog.color.names&&goog.color.names[a.toLowerCase()]))};goog.color.parseRgb=function(a){var b=goog.color.isValidRgbColor_(a);if(!b.length)throw Error(a+" is not a valid RGB color");return b};goog.color.hexToRgbStyle=function(a){return goog.color.rgbStyle_(goog.color.hexToRgb(a))};goog.color.hexTripletRe_=/#(.)(.)(.)/;
goog.color.normalizeHex=function(a){if(!goog.color.isValidHexColor_(a))throw Error("'"+a+"' is not a valid hex color");4==a.length&&(a=a.replace(goog.color.hexTripletRe_,"#$1$1$2$2$3$3"));return a.toLowerCase()};goog.color.hexToRgb=function(a){a=goog.color.normalizeHex(a);var b=parseInt(a.substr(1,2),16),c=parseInt(a.substr(3,2),16);a=parseInt(a.substr(5,2),16);return[b,c,a]};
goog.color.rgbToHex=function(a,b,c){a=Number(a);b=Number(b);c=Number(c);if(isNaN(a)||0>a||255<a||isNaN(b)||0>b||255<b||isNaN(c)||0>c||255<c)throw Error('"('+a+","+b+","+c+'") is not a valid RGB color');a=goog.color.prependZeroIfNecessaryHelper(a.toString(16));b=goog.color.prependZeroIfNecessaryHelper(b.toString(16));c=goog.color.prependZeroIfNecessaryHelper(c.toString(16));return"#"+a+b+c};goog.color.rgbArrayToHex=function(a){return goog.color.rgbToHex(a[0],a[1],a[2])};
goog.color.rgbToHsl=function(a,b,c){a/=255;b/=255;c/=255;var d=Math.max(a,b,c),e=Math.min(a,b,c),f=0,g=0,h=0.5*(d+e);d!=e&&(d==a?f=60*(b-c)/(d-e):d==b?f=60*(c-a)/(d-e)+120:d==c&&(f=60*(a-b)/(d-e)+240),g=0<h&&0.5>=h?(d-e)/(2*h):(d-e)/(2-2*h));return[Math.round(f+360)%360,g,h]};goog.color.rgbArrayToHsl=function(a){return goog.color.rgbToHsl(a[0],a[1],a[2])};goog.color.hueToRgb_=function(a,b,c){0>c?c+=1:1<c&&(c-=1);return 1>6*c?a+6*(b-a)*c:1>2*c?b:2>3*c?a+6*(b-a)*(2/3-c):a};
goog.color.hslToRgb=function(a,b,c){var d=0,e=0,f=0;a/=360;if(0==b)d=e=f=255*c;else var g=f=0,g=0.5>c?c*(1+b):c+b-b*c,f=2*c-g,d=255*goog.color.hueToRgb_(f,g,a+1/3),e=255*goog.color.hueToRgb_(f,g,a),f=255*goog.color.hueToRgb_(f,g,a-1/3);return[Math.round(d),Math.round(e),Math.round(f)]};goog.color.hslArrayToRgb=function(a){return goog.color.hslToRgb(a[0],a[1],a[2])};goog.color.validHexColorRe_=/^#(?:[0-9a-f]{3}){1,2}$/i;goog.color.isValidHexColor_=function(a){return goog.color.validHexColorRe_.test(a)};
goog.color.normalizedHexColorRe_=/^#[0-9a-f]{6}$/;goog.color.isNormalizedHexColor_=function(a){return goog.color.normalizedHexColorRe_.test(a)};goog.color.rgbColorRe_=/^(?:rgb)?\((0|[1-9]\d{0,2}),\s?(0|[1-9]\d{0,2}),\s?(0|[1-9]\d{0,2})\)$/i;goog.color.isValidRgbColor_=function(a){var b=a.match(goog.color.rgbColorRe_);if(b){a=Number(b[1]);var c=Number(b[2]),b=Number(b[3]);if(0<=a&&255>=a&&0<=c&&255>=c&&0<=b&&255>=b)return[a,c,b]}return[]};
goog.color.prependZeroIfNecessaryHelper=function(a){return 1==a.length?"0"+a:a};goog.color.prependHashIfNecessaryHelper=function(a){return"#"==a.charAt(0)?a:"#"+a};goog.color.rgbStyle_=function(a){return"rgb("+a.join(",")+")"};
goog.color.hsvToRgb=function(a,b,c){var d=0,e=0,f=0;if(0==b)f=e=d=c;else{var g=Math.floor(a/60),h=a/60-g;a=c*(1-b);var j=c*(1-b*h);b=c*(1-b*(1-h));switch(g){case 1:d=j;e=c;f=a;break;case 2:d=a;e=c;f=b;break;case 3:d=a;e=j;f=c;break;case 4:d=b;e=a;f=c;break;case 5:d=c;e=a;f=j;break;case 6:case 0:d=c,e=b,f=a}}return[Math.floor(d),Math.floor(e),Math.floor(f)]};
goog.color.rgbToHsv=function(a,b,c){var d=Math.max(Math.max(a,b),c),e=Math.min(Math.min(a,b),c);if(e==d)e=a=0;else{var f=d-e,e=f/d;a=60*(a==d?(b-c)/f:b==d?2+(c-a)/f:4+(a-b)/f);0>a&&(a+=360);360<a&&(a-=360)}return[a,e,d]};goog.color.rgbArrayToHsv=function(a){return goog.color.rgbToHsv(a[0],a[1],a[2])};goog.color.hsvArrayToRgb=function(a){return goog.color.hsvToRgb(a[0],a[1],a[2])};goog.color.hexToHsl=function(a){a=goog.color.hexToRgb(a);return goog.color.rgbToHsl(a[0],a[1],a[2])};
goog.color.hslToHex=function(a,b,c){return goog.color.rgbArrayToHex(goog.color.hslToRgb(a,b,c))};goog.color.hslArrayToHex=function(a){return goog.color.rgbArrayToHex(goog.color.hslToRgb(a[0],a[1],a[2]))};goog.color.hexToHsv=function(a){return goog.color.rgbArrayToHsv(goog.color.hexToRgb(a))};goog.color.hsvToHex=function(a,b,c){return goog.color.rgbArrayToHex(goog.color.hsvToRgb(a,b,c))};goog.color.hsvArrayToHex=function(a){return goog.color.hsvToHex(a[0],a[1],a[2])};
goog.color.hslDistance=function(a,b){var c,d;c=0.5>=a[2]?a[1]*a[2]:a[1]*(1-a[2]);d=0.5>=b[2]?b[1]*b[2]:b[1]*(1-b[2]);return(a[2]-b[2])*(a[2]-b[2])+c*c+d*d-2*c*d*Math.cos(2*(a[0]/360-b[0]/360)*Math.PI)};goog.color.blend=function(a,b,c){c=goog.math.clamp(c,0,1);return[Math.round(c*a[0]+(1-c)*b[0]),Math.round(c*a[1]+(1-c)*b[1]),Math.round(c*a[2]+(1-c)*b[2])]};goog.color.darken=function(a,b){return goog.color.blend([0,0,0],a,b)};
goog.color.lighten=function(a,b){return goog.color.blend([255,255,255],a,b)};goog.color.highContrast=function(a,b){for(var c=[],d=0;d<b.length;d++)c.push({color:b[d],diff:goog.color.yiqBrightnessDiff_(b[d],a)+goog.color.colorDiff_(b[d],a)});c.sort(function(a,b){return b.diff-a.diff});return c[0].color};goog.color.yiqBrightness_=function(a){return Math.round((299*a[0]+587*a[1]+114*a[2])/1E3)};goog.color.yiqBrightnessDiff_=function(a,b){return Math.abs(goog.color.yiqBrightness_(a)-goog.color.yiqBrightness_(b))};
goog.color.colorDiff_=function(a,b){return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])+Math.abs(a[2]-b[2])};goog.dom.vendor={};goog.dom.vendor.getVendorJsPrefix=function(){return goog.userAgent.WEBKIT?"Webkit":goog.userAgent.GECKO?"Moz":goog.userAgent.IE?"ms":goog.userAgent.OPERA?"O":null};goog.dom.vendor.getVendorPrefix=function(){return goog.userAgent.WEBKIT?"-webkit":goog.userAgent.GECKO?"-moz":goog.userAgent.IE?"-ms":goog.userAgent.OPERA?"-o":null};goog.math.Box=function(a,b,c,d){this.top=a;this.right=b;this.bottom=c;this.left=d};goog.math.Box.boundingBox=function(a){for(var b=new goog.math.Box(arguments[0].y,arguments[0].x,arguments[0].y,arguments[0].x),c=1;c<arguments.length;c++){var d=arguments[c];b.top=Math.min(b.top,d.y);b.right=Math.max(b.right,d.x);b.bottom=Math.max(b.bottom,d.y);b.left=Math.min(b.left,d.x)}return b};goog.math.Box.prototype.clone=function(){return new goog.math.Box(this.top,this.right,this.bottom,this.left)};
goog.DEBUG&&(goog.math.Box.prototype.toString=function(){return"("+this.top+"t, "+this.right+"r, "+this.bottom+"b, "+this.left+"l)"});goog.math.Box.prototype.contains=function(a){return goog.math.Box.contains(this,a)};goog.math.Box.prototype.expand=function(a,b,c,d){goog.isObject(a)?(this.top-=a.top,this.right+=a.right,this.bottom+=a.bottom,this.left-=a.left):(this.top-=a,this.right+=b,this.bottom+=c,this.left-=d);return this};
goog.math.Box.prototype.expandToInclude=function(a){this.left=Math.min(this.left,a.left);this.top=Math.min(this.top,a.top);this.right=Math.max(this.right,a.right);this.bottom=Math.max(this.bottom,a.bottom)};goog.math.Box.equals=function(a,b){return a==b?!0:!a||!b?!1:a.top==b.top&&a.right==b.right&&a.bottom==b.bottom&&a.left==b.left};
goog.math.Box.contains=function(a,b){return!a||!b?!1:b instanceof goog.math.Box?b.left>=a.left&&b.right<=a.right&&b.top>=a.top&&b.bottom<=a.bottom:b.x>=a.left&&b.x<=a.right&&b.y>=a.top&&b.y<=a.bottom};goog.math.Box.relativePositionX=function(a,b){return b.x<a.left?b.x-a.left:b.x>a.right?b.x-a.right:0};goog.math.Box.relativePositionY=function(a,b){return b.y<a.top?b.y-a.top:b.y>a.bottom?b.y-a.bottom:0};
goog.math.Box.distance=function(a,b){var c=goog.math.Box.relativePositionX(a,b),d=goog.math.Box.relativePositionY(a,b);return Math.sqrt(c*c+d*d)};goog.math.Box.intersects=function(a,b){return a.left<=b.right&&b.left<=a.right&&a.top<=b.bottom&&b.top<=a.bottom};goog.math.Box.intersectsWithPadding=function(a,b,c){return a.left<=b.right+c&&b.left<=a.right+c&&a.top<=b.bottom+c&&b.top<=a.bottom+c};goog.math.Rect=function(a,b,c,d){this.left=a;this.top=b;this.width=c;this.height=d};goog.math.Rect.prototype.clone=function(){return new goog.math.Rect(this.left,this.top,this.width,this.height)};goog.math.Rect.prototype.toBox=function(){return new goog.math.Box(this.top,this.left+this.width,this.top+this.height,this.left)};goog.math.Rect.createFromBox=function(a){return new goog.math.Rect(a.left,a.top,a.right-a.left,a.bottom-a.top)};
goog.DEBUG&&(goog.math.Rect.prototype.toString=function(){return"("+this.left+", "+this.top+" - "+this.width+"w x "+this.height+"h)"});goog.math.Rect.equals=function(a,b){return a==b?!0:!a||!b?!1:a.left==b.left&&a.width==b.width&&a.top==b.top&&a.height==b.height};
goog.math.Rect.prototype.intersection=function(a){var b=Math.max(this.left,a.left),c=Math.min(this.left+this.width,a.left+a.width);if(b<=c){var d=Math.max(this.top,a.top);a=Math.min(this.top+this.height,a.top+a.height);if(d<=a)return this.left=b,this.top=d,this.width=c-b,this.height=a-d,!0}return!1};
goog.math.Rect.intersection=function(a,b){var c=Math.max(a.left,b.left),d=Math.min(a.left+a.width,b.left+b.width);if(c<=d){var e=Math.max(a.top,b.top),f=Math.min(a.top+a.height,b.top+b.height);if(e<=f)return new goog.math.Rect(c,e,d-c,f-e)}return null};goog.math.Rect.intersects=function(a,b){return a.left<=b.left+b.width&&b.left<=a.left+a.width&&a.top<=b.top+b.height&&b.top<=a.top+a.height};goog.math.Rect.prototype.intersects=function(a){return goog.math.Rect.intersects(this,a)};
goog.math.Rect.difference=function(a,b){var c=goog.math.Rect.intersection(a,b);if(!c||!c.height||!c.width)return[a.clone()];var c=[],d=a.top,e=a.height,f=a.left+a.width,g=a.top+a.height,h=b.left+b.width,j=b.top+b.height;b.top>a.top&&(c.push(new goog.math.Rect(a.left,a.top,a.width,b.top-a.top)),d=b.top,e-=b.top-a.top);j<g&&(c.push(new goog.math.Rect(a.left,j,a.width,g-j)),e=j-d);b.left>a.left&&c.push(new goog.math.Rect(a.left,d,b.left-a.left,e));h<f&&c.push(new goog.math.Rect(h,d,f-h,e));return c};
goog.math.Rect.prototype.difference=function(a){return goog.math.Rect.difference(this,a)};goog.math.Rect.prototype.boundingRect=function(a){var b=Math.max(this.left+this.width,a.left+a.width),c=Math.max(this.top+this.height,a.top+a.height);this.left=Math.min(this.left,a.left);this.top=Math.min(this.top,a.top);this.width=b-this.left;this.height=c-this.top};goog.math.Rect.boundingRect=function(a,b){if(!a||!b)return null;var c=a.clone();c.boundingRect(b);return c};
goog.math.Rect.prototype.contains=function(a){return a instanceof goog.math.Rect?this.left<=a.left&&this.left+this.width>=a.left+a.width&&this.top<=a.top&&this.top+this.height>=a.top+a.height:a.x>=this.left&&a.x<=this.left+this.width&&a.y>=this.top&&a.y<=this.top+this.height};goog.math.Rect.prototype.getSize=function(){return new goog.math.Size(this.width,this.height)};goog.style={};goog.style.setStyle=function(a,b,c){goog.isString(b)?goog.style.setStyle_(a,c,b):goog.object.forEach(b,goog.partial(goog.style.setStyle_,a))};goog.style.setStyle_=function(a,b,c){(c=goog.style.getVendorJsStyleName_(a,c))&&(a.style[c]=b)};goog.style.getVendorJsStyleName_=function(a,b){var c=goog.string.toCamelCase(b);if(void 0===a.style[c]){var d=goog.dom.vendor.getVendorJsPrefix()+goog.string.toTitleCase(b);if(void 0!==a.style[d])return d}return c};
goog.style.getVendorStyleName_=function(a,b){var c=goog.string.toCamelCase(b);return void 0===a.style[c]&&(c=goog.dom.vendor.getVendorJsPrefix()+goog.string.toTitleCase(b),void 0!==a.style[c])?goog.dom.vendor.getVendorPrefix()+"-"+b:b};goog.style.getStyle=function(a,b){var c=a.style[goog.string.toCamelCase(b)];return"undefined"!==typeof c?c:a.style[goog.style.getVendorJsStyleName_(a,b)]||""};
goog.style.getComputedStyle=function(a,b){var c=goog.dom.getOwnerDocument(a);return c.defaultView&&c.defaultView.getComputedStyle&&(c=c.defaultView.getComputedStyle(a,null))?c[b]||c.getPropertyValue(b)||"":""};goog.style.getCascadedStyle=function(a,b){return a.currentStyle?a.currentStyle[b]:null};goog.style.getStyle_=function(a,b){return goog.style.getComputedStyle(a,b)||goog.style.getCascadedStyle(a,b)||a.style&&a.style[b]};
goog.style.getComputedPosition=function(a){return goog.style.getStyle_(a,"position")};goog.style.getBackgroundColor=function(a){return goog.style.getStyle_(a,"backgroundColor")};goog.style.getComputedOverflowX=function(a){return goog.style.getStyle_(a,"overflowX")};goog.style.getComputedOverflowY=function(a){return goog.style.getStyle_(a,"overflowY")};goog.style.getComputedZIndex=function(a){return goog.style.getStyle_(a,"zIndex")};
goog.style.getComputedTextAlign=function(a){return goog.style.getStyle_(a,"textAlign")};goog.style.getComputedCursor=function(a){return goog.style.getStyle_(a,"cursor")};goog.style.setPosition=function(a,b,c){var d,e=goog.userAgent.GECKO&&(goog.userAgent.MAC||goog.userAgent.X11)&&goog.userAgent.isVersion("1.9");b instanceof goog.math.Coordinate?(d=b.x,b=b.y):(d=b,b=c);a.style.left=goog.style.getPixelStyleValue_(d,e);a.style.top=goog.style.getPixelStyleValue_(b,e)};
goog.style.getPosition=function(a){return new goog.math.Coordinate(a.offsetLeft,a.offsetTop)};goog.style.getClientViewportElement=function(a){a=a?goog.dom.getOwnerDocument(a):goog.dom.getDocument();return goog.userAgent.IE&&!goog.userAgent.isDocumentMode(9)&&!goog.dom.getDomHelper(a).isCss1CompatMode()?a.body:a.documentElement};goog.style.getViewportPageOffset=function(a){var b=a.body;a=a.documentElement;return new goog.math.Coordinate(b.scrollLeft||a.scrollLeft,b.scrollTop||a.scrollTop)};
goog.style.getBoundingClientRect_=function(a){var b=a.getBoundingClientRect();goog.userAgent.IE&&(a=a.ownerDocument,b.left-=a.documentElement.clientLeft+a.body.clientLeft,b.top-=a.documentElement.clientTop+a.body.clientTop);return b};
goog.style.getOffsetParent=function(a){if(goog.userAgent.IE&&!goog.userAgent.isDocumentMode(8))return a.offsetParent;var b=goog.dom.getOwnerDocument(a),c=goog.style.getStyle_(a,"position"),d="fixed"==c||"absolute"==c;for(a=a.parentNode;a&&a!=b;a=a.parentNode)if(c=goog.style.getStyle_(a,"position"),d=d&&"static"==c&&a!=b.documentElement&&a!=b.body,!d&&(a.scrollWidth>a.clientWidth||a.scrollHeight>a.clientHeight||"fixed"==c||"absolute"==c||"relative"==c))return a;return null};
goog.style.getVisibleRectForElement=function(a){for(var b=new goog.math.Box(0,Infinity,Infinity,0),c=goog.dom.getDomHelper(a),d=c.getDocument().body,e=c.getDocument().documentElement,f=c.getDocumentScrollElement();a=goog.style.getOffsetParent(a);)if((!goog.userAgent.IE||0!=a.clientWidth)&&(!goog.userAgent.WEBKIT||0!=a.clientHeight||a!=d)&&a!=d&&a!=e&&"visible"!=goog.style.getStyle_(a,"overflow")){var g=goog.style.getPageOffset(a),h=goog.style.getClientLeftTop(a);g.x+=h.x;g.y+=h.y;b.top=Math.max(b.top,
g.y);b.right=Math.min(b.right,g.x+a.clientWidth);b.bottom=Math.min(b.bottom,g.y+a.clientHeight);b.left=Math.max(b.left,g.x)}d=f.scrollLeft;f=f.scrollTop;b.left=Math.max(b.left,d);b.top=Math.max(b.top,f);c=c.getViewportSize();b.right=Math.min(b.right,d+c.width);b.bottom=Math.min(b.bottom,f+c.height);return 0<=b.top&&0<=b.left&&b.bottom>b.top&&b.right>b.left?b:null};
goog.style.getContainerOffsetToScrollInto=function(a,b,c){var d=goog.style.getPageOffset(a),e=goog.style.getPageOffset(b),f=goog.style.getBorderBox(b),g=d.x-e.x-f.left,d=d.y-e.y-f.top,e=b.clientWidth-a.offsetWidth;a=b.clientHeight-a.offsetHeight;f=b.scrollLeft;b=b.scrollTop;c?(f+=g-e/2,b+=d-a/2):(f+=Math.min(g,Math.max(g-e,0)),b+=Math.min(d,Math.max(d-a,0)));return new goog.math.Coordinate(f,b)};
goog.style.scrollIntoContainerView=function(a,b,c){a=goog.style.getContainerOffsetToScrollInto(a,b,c);b.scrollLeft=a.x;b.scrollTop=a.y};
goog.style.getClientLeftTop=function(a){if(goog.userAgent.GECKO&&!goog.userAgent.isVersion("1.9")){var b=parseFloat(goog.style.getComputedStyle(a,"borderLeftWidth"));if(goog.style.isRightToLeft(a))var c=a.offsetWidth-a.clientWidth-b-parseFloat(goog.style.getComputedStyle(a,"borderRightWidth")),b=b+c;return new goog.math.Coordinate(b,parseFloat(goog.style.getComputedStyle(a,"borderTopWidth")))}return new goog.math.Coordinate(a.clientLeft,a.clientTop)};
goog.style.getPageOffset=function(a){var b,c=goog.dom.getOwnerDocument(a),d=goog.style.getStyle_(a,"position");goog.asserts.assertObject(a,"Parameter is required");var e=goog.userAgent.GECKO&&c.getBoxObjectFor&&!a.getBoundingClientRect&&"absolute"==d&&(b=c.getBoxObjectFor(a))&&(0>b.screenX||0>b.screenY),f=new goog.math.Coordinate(0,0),g=goog.style.getClientViewportElement(c);if(a==g)return f;if(a.getBoundingClientRect)b=goog.style.getBoundingClientRect_(a),a=goog.dom.getDomHelper(c).getDocumentScroll(),
f.x=b.left+a.x,f.y=b.top+a.y;else if(c.getBoxObjectFor&&!e)b=c.getBoxObjectFor(a),a=c.getBoxObjectFor(g),f.x=b.screenX-a.screenX,f.y=b.screenY-a.screenY;else{b=a;do{f.x+=b.offsetLeft;f.y+=b.offsetTop;b!=a&&(f.x+=b.clientLeft||0,f.y+=b.clientTop||0);if(goog.userAgent.WEBKIT&&"fixed"==goog.style.getComputedPosition(b)){f.x+=c.body.scrollLeft;f.y+=c.body.scrollTop;break}b=b.offsetParent}while(b&&b!=a);if(goog.userAgent.OPERA||goog.userAgent.WEBKIT&&"absolute"==d)f.y-=c.body.offsetTop;for(b=a;(b=goog.style.getOffsetParent(b))&&
b!=c.body&&b!=g;)if(f.x-=b.scrollLeft,!goog.userAgent.OPERA||"TR"!=b.tagName)f.y-=b.scrollTop}return f};goog.style.getPageOffsetLeft=function(a){return goog.style.getPageOffset(a).x};goog.style.getPageOffsetTop=function(a){return goog.style.getPageOffset(a).y};
goog.style.getFramedPageOffset=function(a,b){var c=new goog.math.Coordinate(0,0),d=goog.dom.getWindow(goog.dom.getOwnerDocument(a)),e=a;do{var f=d==b?goog.style.getPageOffset(e):goog.style.getClientPosition(e);c.x+=f.x;c.y+=f.y}while(d&&d!=b&&(e=d.frameElement)&&(d=d.parent));return c};
goog.style.translateRectForAnotherFrame=function(a,b,c){if(b.getDocument()!=c.getDocument()){var d=b.getDocument().body;c=goog.style.getFramedPageOffset(d,c.getWindow());c=goog.math.Coordinate.difference(c,goog.style.getPageOffset(d));goog.userAgent.IE&&!b.isCss1CompatMode()&&(c=goog.math.Coordinate.difference(c,b.getDocumentScroll()));a.left+=c.x;a.top+=c.y}};
goog.style.getRelativePosition=function(a,b){var c=goog.style.getClientPosition(a),d=goog.style.getClientPosition(b);return new goog.math.Coordinate(c.x-d.x,c.y-d.y)};
goog.style.getClientPosition=function(a){var b=new goog.math.Coordinate;if(a.nodeType==goog.dom.NodeType.ELEMENT){if(a.getBoundingClientRect){var c=goog.style.getBoundingClientRect_(a);b.x=c.left;b.y=c.top}else{var c=goog.dom.getDomHelper(a).getDocumentScroll(),d=goog.style.getPageOffset(a);b.x=d.x-c.x;b.y=d.y-c.y}goog.userAgent.GECKO&&!goog.userAgent.isVersion(12)&&(b=goog.math.Coordinate.sum(b,goog.style.getCssTranslation(a)))}else c=goog.isFunction(a.getBrowserEvent),d=a,a.targetTouches?d=a.targetTouches[0]:
c&&a.getBrowserEvent().targetTouches&&(d=a.getBrowserEvent().targetTouches[0]),b.x=d.clientX,b.y=d.clientY;return b};goog.style.setPageOffset=function(a,b,c){var d=goog.style.getPageOffset(a);b instanceof goog.math.Coordinate&&(c=b.y,b=b.x);goog.style.setPosition(a,a.offsetLeft+(b-d.x),a.offsetTop+(c-d.y))};
goog.style.setSize=function(a,b,c){if(b instanceof goog.math.Size)c=b.height,b=b.width;else if(void 0==c)throw Error("missing height argument");goog.style.setWidth(a,b);goog.style.setHeight(a,c)};goog.style.getPixelStyleValue_=function(a,b){"number"==typeof a&&(a=(b?Math.round(a):a)+"px");return a};goog.style.setHeight=function(a,b){a.style.height=goog.style.getPixelStyleValue_(b,!0)};goog.style.setWidth=function(a,b){a.style.width=goog.style.getPixelStyleValue_(b,!0)};
goog.style.getSize=function(a){if("none"!=goog.style.getStyle_(a,"display"))return goog.style.getSizeWithDisplay_(a);var b=a.style,c=b.display,d=b.visibility,e=b.position;b.visibility="hidden";b.position="absolute";b.display="inline";a=goog.style.getSizeWithDisplay_(a);b.display=c;b.position=e;b.visibility=d;return a};
goog.style.getSizeWithDisplay_=function(a){var b=a.offsetWidth,c=a.offsetHeight,d=goog.userAgent.WEBKIT&&!b&&!c;return(!goog.isDef(b)||d)&&a.getBoundingClientRect?(a=goog.style.getBoundingClientRect_(a),new goog.math.Size(a.right-a.left,a.bottom-a.top)):new goog.math.Size(b,c)};goog.style.getBounds=function(a){var b=goog.style.getPageOffset(a);a=goog.style.getSize(a);return new goog.math.Rect(b.x,b.y,a.width,a.height)};goog.style.toCamelCase=function(a){return goog.string.toCamelCase(String(a))};
goog.style.toSelectorCase=function(a){return goog.string.toSelectorCase(a)};goog.style.getOpacity=function(a){var b=a.style;a="";"opacity"in b?a=b.opacity:"MozOpacity"in b?a=b.MozOpacity:"filter"in b&&(b=b.filter.match(/alpha\(opacity=([\d.]+)\)/))&&(a=String(b[1]/100));return""==a?a:Number(a)};goog.style.setOpacity=function(a,b){var c=a.style;"opacity"in c?c.opacity=b:"MozOpacity"in c?c.MozOpacity=b:"filter"in c&&(c.filter=""===b?"":"alpha(opacity="+100*b+")")};
goog.style.setTransparentBackgroundImage=function(a,b){var c=a.style;goog.userAgent.IE&&!goog.userAgent.isVersion("8")?c.filter='progid:DXImageTransform.Microsoft.AlphaImageLoader(src="'+b+'", sizingMethod="crop")':(c.backgroundImage="url("+b+")",c.backgroundPosition="top left",c.backgroundRepeat="no-repeat")};goog.style.clearTransparentBackgroundImage=function(a){a=a.style;"filter"in a?a.filter="":a.backgroundImage="none"};goog.style.showElement=function(a,b){a.style.display=b?"":"none"};
goog.style.isElementShown=function(a){return"none"!=a.style.display};goog.style.installStyles=function(a,b){var c=goog.dom.getDomHelper(b),d=null;if(goog.userAgent.IE)d=c.getDocument().createStyleSheet(),goog.style.setStyles(d,a);else{var e=c.getElementsByTagNameAndClass("head")[0];e||(d=c.getElementsByTagNameAndClass("body")[0],e=c.createDom("head"),d.parentNode.insertBefore(e,d));d=c.createDom("style");goog.style.setStyles(d,a);c.appendChild(e,d)}return d};
goog.style.uninstallStyles=function(a){goog.dom.removeNode(a.ownerNode||a.owningElement||a)};goog.style.setStyles=function(a,b){goog.userAgent.IE?a.cssText=b:a.innerHTML=b};goog.style.setPreWrap=function(a){a=a.style;goog.userAgent.IE&&!goog.userAgent.isVersion("8")?(a.whiteSpace="pre",a.wordWrap="break-word"):a.whiteSpace=goog.userAgent.GECKO?"-moz-pre-wrap":"pre-wrap"};
goog.style.setInlineBlock=function(a){a=a.style;a.position="relative";goog.userAgent.IE&&!goog.userAgent.isVersion("8")?(a.zoom="1",a.display="inline"):a.display=goog.userAgent.GECKO?goog.userAgent.isVersion("1.9a")?"inline-block":"-moz-inline-box":"inline-block"};goog.style.isRightToLeft=function(a){return"rtl"==goog.style.getStyle_(a,"direction")};goog.style.unselectableStyle_=goog.userAgent.GECKO?"MozUserSelect":goog.userAgent.WEBKIT?"WebkitUserSelect":null;
goog.style.isUnselectable=function(a){return goog.style.unselectableStyle_?"none"==a.style[goog.style.unselectableStyle_].toLowerCase():goog.userAgent.IE||goog.userAgent.OPERA?"on"==a.getAttribute("unselectable"):!1};
goog.style.setUnselectable=function(a,b,c){c=!c?a.getElementsByTagName("*"):null;var d=goog.style.unselectableStyle_;if(d){if(b=b?"none":"",a.style[d]=b,c){a=0;for(var e;e=c[a];a++)e.style[d]=b}}else if(goog.userAgent.IE||goog.userAgent.OPERA)if(b=b?"on":"",a.setAttribute("unselectable",b),c)for(a=0;e=c[a];a++)e.setAttribute("unselectable",b)};goog.style.getBorderBoxSize=function(a){return new goog.math.Size(a.offsetWidth,a.offsetHeight)};
goog.style.setBorderBoxSize=function(a,b){var c=goog.dom.getOwnerDocument(a),d=goog.dom.getDomHelper(c).isCss1CompatMode();if(goog.userAgent.IE&&(!d||!goog.userAgent.isVersion("8")))if(c=a.style,d){var d=goog.style.getPaddingBox(a),e=goog.style.getBorderBox(a);c.pixelWidth=b.width-e.left-d.left-d.right-e.right;c.pixelHeight=b.height-e.top-d.top-d.bottom-e.bottom}else c.pixelWidth=b.width,c.pixelHeight=b.height;else goog.style.setBoxSizingSize_(a,b,"border-box")};
goog.style.getContentBoxSize=function(a){var b=goog.dom.getOwnerDocument(a),c=goog.userAgent.IE&&a.currentStyle;if(c&&goog.dom.getDomHelper(b).isCss1CompatMode()&&"auto"!=c.width&&"auto"!=c.height&&!c.boxSizing)return b=goog.style.getIePixelValue_(a,c.width,"width","pixelWidth"),a=goog.style.getIePixelValue_(a,c.height,"height","pixelHeight"),new goog.math.Size(b,a);c=goog.style.getBorderBoxSize(a);b=goog.style.getPaddingBox(a);a=goog.style.getBorderBox(a);return new goog.math.Size(c.width-a.left-
b.left-b.right-a.right,c.height-a.top-b.top-b.bottom-a.bottom)};
goog.style.setContentBoxSize=function(a,b){var c=goog.dom.getOwnerDocument(a),d=goog.dom.getDomHelper(c).isCss1CompatMode();if(goog.userAgent.IE&&(!d||!goog.userAgent.isVersion("8")))if(c=a.style,d)c.pixelWidth=b.width,c.pixelHeight=b.height;else{var d=goog.style.getPaddingBox(a),e=goog.style.getBorderBox(a);c.pixelWidth=b.width+e.left+d.left+d.right+e.right;c.pixelHeight=b.height+e.top+d.top+d.bottom+e.bottom}else goog.style.setBoxSizingSize_(a,b,"content-box")};
goog.style.setBoxSizingSize_=function(a,b,c){a=a.style;goog.userAgent.GECKO?a.MozBoxSizing=c:goog.userAgent.WEBKIT?a.WebkitBoxSizing=c:a.boxSizing=c;a.width=Math.max(b.width,0)+"px";a.height=Math.max(b.height,0)+"px"};goog.style.getIePixelValue_=function(a,b,c,d){if(/^\d+px?$/.test(b))return parseInt(b,10);var e=a.style[c],f=a.runtimeStyle[c];a.runtimeStyle[c]=a.currentStyle[c];a.style[c]=b;b=a.style[d];a.style[c]=e;a.runtimeStyle[c]=f;return b};
goog.style.getIePixelDistance_=function(a,b){var c=goog.style.getCascadedStyle(a,b);return c?goog.style.getIePixelValue_(a,c,"left","pixelLeft"):0};
goog.style.getBox_=function(a,b){if(goog.userAgent.IE){var c=goog.style.getIePixelDistance_(a,b+"Left"),d=goog.style.getIePixelDistance_(a,b+"Right"),e=goog.style.getIePixelDistance_(a,b+"Top"),f=goog.style.getIePixelDistance_(a,b+"Bottom");return new goog.math.Box(e,d,f,c)}c=goog.style.getComputedStyle(a,b+"Left");d=goog.style.getComputedStyle(a,b+"Right");e=goog.style.getComputedStyle(a,b+"Top");f=goog.style.getComputedStyle(a,b+"Bottom");return new goog.math.Box(parseFloat(e),parseFloat(d),parseFloat(f),
parseFloat(c))};goog.style.getPaddingBox=function(a){return goog.style.getBox_(a,"padding")};goog.style.getMarginBox=function(a){return goog.style.getBox_(a,"margin")};goog.style.ieBorderWidthKeywords_={thin:2,medium:4,thick:6};
goog.style.getIePixelBorder_=function(a,b){if("none"==goog.style.getCascadedStyle(a,b+"Style"))return 0;var c=goog.style.getCascadedStyle(a,b+"Width");return c in goog.style.ieBorderWidthKeywords_?goog.style.ieBorderWidthKeywords_[c]:goog.style.getIePixelValue_(a,c,"left","pixelLeft")};
goog.style.getBorderBox=function(a){if(goog.userAgent.IE){var b=goog.style.getIePixelBorder_(a,"borderLeft"),c=goog.style.getIePixelBorder_(a,"borderRight"),d=goog.style.getIePixelBorder_(a,"borderTop");a=goog.style.getIePixelBorder_(a,"borderBottom");return new goog.math.Box(d,c,a,b)}b=goog.style.getComputedStyle(a,"borderLeftWidth");c=goog.style.getComputedStyle(a,"borderRightWidth");d=goog.style.getComputedStyle(a,"borderTopWidth");a=goog.style.getComputedStyle(a,"borderBottomWidth");return new goog.math.Box(parseFloat(d),
parseFloat(c),parseFloat(a),parseFloat(b))};goog.style.getFontFamily=function(a){var b=goog.dom.getOwnerDocument(a),c="";if(b.body.createTextRange){b=b.body.createTextRange();b.moveToElementText(a);try{c=b.queryCommandValue("FontName")}catch(d){c=""}}c||(c=goog.style.getStyle_(a,"fontFamily"));a=c.split(",");1<a.length&&(c=a[0]);return goog.string.stripQuotes(c,"\"'")};goog.style.lengthUnitRegex_=/[^\d]+$/;
goog.style.getLengthUnits=function(a){return(a=a.match(goog.style.lengthUnitRegex_))&&a[0]||null};goog.style.ABSOLUTE_CSS_LENGTH_UNITS_={cm:1,"in":1,mm:1,pc:1,pt:1};goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_={em:1,ex:1};
goog.style.getFontSize=function(a){var b=goog.style.getStyle_(a,"fontSize"),c=goog.style.getLengthUnits(b);if(b&&"px"==c)return parseInt(b,10);if(goog.userAgent.IE){if(c in goog.style.ABSOLUTE_CSS_LENGTH_UNITS_)return goog.style.getIePixelValue_(a,b,"left","pixelLeft");if(a.parentNode&&a.parentNode.nodeType==goog.dom.NodeType.ELEMENT&&c in goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_)return a=a.parentNode,c=goog.style.getStyle_(a,"fontSize"),goog.style.getIePixelValue_(a,b==c?"1em":b,"left","pixelLeft")}c=
goog.dom.createDom("span",{style:"visibility:hidden;position:absolute;line-height:0;padding:0;margin:0;border:0;height:1em;"});goog.dom.appendChild(a,c);b=c.offsetHeight;goog.dom.removeNode(c);return b};goog.style.parseStyleAttribute=function(a){var b={};goog.array.forEach(a.split(/\s*;\s*/),function(a){a=a.split(/\s*:\s*/);2==a.length&&(b[goog.string.toCamelCase(a[0].toLowerCase())]=a[1])});return b};
goog.style.toStyleAttribute=function(a){var b=[];goog.object.forEach(a,function(a,d){b.push(goog.string.toSelectorCase(d),":",a,";")});return b.join("")};goog.style.setFloat=function(a,b){a.style[goog.userAgent.IE?"styleFloat":"cssFloat"]=b};goog.style.getFloat=function(a){return a.style[goog.userAgent.IE?"styleFloat":"cssFloat"]||""};
goog.style.getScrollbarWidth=function(a){var b=goog.dom.createElement("div");a&&(b.className=a);b.style.cssText="overflow:auto;position:absolute;top:0;width:100px;height:100px";a=goog.dom.createElement("div");goog.style.setSize(a,"200px","200px");b.appendChild(a);goog.dom.appendChild(goog.dom.getDocument().body,b);a=b.offsetWidth-b.clientWidth;goog.dom.removeNode(b);return a};goog.style.MATRIX_TRANSLATION_REGEX_=/matrix\([0-9\.\-]+, [0-9\.\-]+, [0-9\.\-]+, [0-9\.\-]+, ([0-9\.\-]+)p?x?, ([0-9\.\-]+)p?x?\)/;
goog.style.getCssTranslation=function(a){var b;goog.userAgent.IE?b="-ms-transform":goog.userAgent.WEBKIT?b="-webkit-transform":goog.userAgent.OPERA?b="-o-transform":goog.userAgent.GECKO&&(b="-moz-transform");var c;b&&(c=goog.style.getStyle_(a,b));c||(c=goog.style.getStyle_(a,"transform"));if(!c)return new goog.math.Coordinate(0,0);a=c.match(goog.style.MATRIX_TRANSLATION_REGEX_);return!a?new goog.math.Coordinate(0,0):new goog.math.Coordinate(parseFloat(a[1]),parseFloat(a[2]))};goog.events.KeyCodes={WIN_KEY_FF_LINUX:0,MAC_ENTER:3,BACKSPACE:8,TAB:9,NUM_CENTER:12,ENTER:13,SHIFT:16,CTRL:17,ALT:18,PAUSE:19,CAPS_LOCK:20,ESC:27,SPACE:32,PAGE_UP:33,PAGE_DOWN:34,END:35,HOME:36,LEFT:37,UP:38,RIGHT:39,DOWN:40,PRINT_SCREEN:44,INSERT:45,DELETE:46,ZERO:48,ONE:49,TWO:50,THREE:51,FOUR:52,FIVE:53,SIX:54,SEVEN:55,EIGHT:56,NINE:57,FF_SEMICOLON:59,FF_EQUALS:61,QUESTION_MARK:63,A:65,B:66,C:67,D:68,E:69,F:70,G:71,H:72,I:73,J:74,K:75,L:76,M:77,N:78,O:79,P:80,Q:81,R:82,S:83,T:84,U:85,V:86,W:87,
X:88,Y:89,Z:90,META:91,WIN_KEY_RIGHT:92,CONTEXT_MENU:93,NUM_ZERO:96,NUM_ONE:97,NUM_TWO:98,NUM_THREE:99,NUM_FOUR:100,NUM_FIVE:101,NUM_SIX:102,NUM_SEVEN:103,NUM_EIGHT:104,NUM_NINE:105,NUM_MULTIPLY:106,NUM_PLUS:107,NUM_MINUS:109,NUM_PERIOD:110,NUM_DIVISION:111,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123,NUMLOCK:144,SCROLL_LOCK:145,FIRST_MEDIA_KEY:166,LAST_MEDIA_KEY:183,SEMICOLON:186,DASH:189,EQUALS:187,COMMA:188,PERIOD:190,SLASH:191,APOSTROPHE:192,TILDE:192,
SINGLE_QUOTE:222,OPEN_SQUARE_BRACKET:219,BACKSLASH:220,CLOSE_SQUARE_BRACKET:221,WIN_KEY:224,MAC_FF_META:224,WIN_IME:229,PHANTOM:255};
goog.events.KeyCodes.isTextModifyingKeyEvent=function(a){if(a.altKey&&!a.ctrlKey||a.metaKey||a.keyCode>=goog.events.KeyCodes.F1&&a.keyCode<=goog.events.KeyCodes.F12)return!1;switch(a.keyCode){case goog.events.KeyCodes.ALT:case goog.events.KeyCodes.CAPS_LOCK:case goog.events.KeyCodes.CONTEXT_MENU:case goog.events.KeyCodes.CTRL:case goog.events.KeyCodes.DOWN:case goog.events.KeyCodes.END:case goog.events.KeyCodes.ESC:case goog.events.KeyCodes.HOME:case goog.events.KeyCodes.INSERT:case goog.events.KeyCodes.LEFT:case goog.events.KeyCodes.MAC_FF_META:case goog.events.KeyCodes.META:case goog.events.KeyCodes.NUMLOCK:case goog.events.KeyCodes.NUM_CENTER:case goog.events.KeyCodes.PAGE_DOWN:case goog.events.KeyCodes.PAGE_UP:case goog.events.KeyCodes.PAUSE:case goog.events.KeyCodes.PHANTOM:case goog.events.KeyCodes.PRINT_SCREEN:case goog.events.KeyCodes.RIGHT:case goog.events.KeyCodes.SCROLL_LOCK:case goog.events.KeyCodes.SHIFT:case goog.events.KeyCodes.UP:case goog.events.KeyCodes.WIN_KEY:case goog.events.KeyCodes.WIN_KEY_RIGHT:return!1;case goog.events.KeyCodes.WIN_KEY_FF_LINUX:return!goog.userAgent.GECKO;
default:return a.keyCode<goog.events.KeyCodes.FIRST_MEDIA_KEY||a.keyCode>goog.events.KeyCodes.LAST_MEDIA_KEY}};
goog.events.KeyCodes.firesKeyPressEvent=function(a,b,c,d,e){if(!goog.userAgent.IE&&(!goog.userAgent.WEBKIT||!goog.userAgent.isVersion("525")))return!0;if(goog.userAgent.MAC&&e)return goog.events.KeyCodes.isCharacterKey(a);if(e&&!d||!c&&(b==goog.events.KeyCodes.CTRL||b==goog.events.KeyCodes.ALT||goog.userAgent.MAC&&b==goog.events.KeyCodes.META))return!1;if(goog.userAgent.WEBKIT&&d&&c)switch(a){case goog.events.KeyCodes.BACKSLASH:case goog.events.KeyCodes.OPEN_SQUARE_BRACKET:case goog.events.KeyCodes.CLOSE_SQUARE_BRACKET:case goog.events.KeyCodes.TILDE:case goog.events.KeyCodes.SEMICOLON:case goog.events.KeyCodes.DASH:case goog.events.KeyCodes.EQUALS:case goog.events.KeyCodes.COMMA:case goog.events.KeyCodes.PERIOD:case goog.events.KeyCodes.SLASH:case goog.events.KeyCodes.APOSTROPHE:case goog.events.KeyCodes.SINGLE_QUOTE:return!1}if(goog.userAgent.IE&&d&&
b==a)return!1;switch(a){case goog.events.KeyCodes.ENTER:return!(goog.userAgent.IE&&goog.userAgent.isDocumentMode(9));case goog.events.KeyCodes.ESC:return!goog.userAgent.WEBKIT}return goog.events.KeyCodes.isCharacterKey(a)};
goog.events.KeyCodes.isCharacterKey=function(a){if(a>=goog.events.KeyCodes.ZERO&&a<=goog.events.KeyCodes.NINE||a>=goog.events.KeyCodes.NUM_ZERO&&a<=goog.events.KeyCodes.NUM_MULTIPLY||a>=goog.events.KeyCodes.A&&a<=goog.events.KeyCodes.Z||goog.userAgent.WEBKIT&&0==a)return!0;switch(a){case goog.events.KeyCodes.SPACE:case goog.events.KeyCodes.QUESTION_MARK:case goog.events.KeyCodes.NUM_PLUS:case goog.events.KeyCodes.NUM_MINUS:case goog.events.KeyCodes.NUM_PERIOD:case goog.events.KeyCodes.NUM_DIVISION:case goog.events.KeyCodes.SEMICOLON:case goog.events.KeyCodes.FF_SEMICOLON:case goog.events.KeyCodes.DASH:case goog.events.KeyCodes.EQUALS:case goog.events.KeyCodes.FF_EQUALS:case goog.events.KeyCodes.COMMA:case goog.events.KeyCodes.PERIOD:case goog.events.KeyCodes.SLASH:case goog.events.KeyCodes.APOSTROPHE:case goog.events.KeyCodes.SINGLE_QUOTE:case goog.events.KeyCodes.OPEN_SQUARE_BRACKET:case goog.events.KeyCodes.BACKSLASH:case goog.events.KeyCodes.CLOSE_SQUARE_BRACKET:return!0;default:return!1}};
goog.events.KeyCodes.normalizeGeckoKeyCode=function(a){switch(a){case goog.events.KeyCodes.FF_EQUALS:return goog.events.KeyCodes.EQUALS;case goog.events.KeyCodes.FF_SEMICOLON:return goog.events.KeyCodes.SEMICOLON;case goog.events.KeyCodes.MAC_FF_META:return goog.events.KeyCodes.META;case goog.events.KeyCodes.WIN_KEY_FF_LINUX:return goog.events.KeyCodes.WIN_KEY;default:return a}};goog.events.EventHandler=function(a){goog.Disposable.call(this);this.handler_=a;this.keys_=[]};goog.inherits(goog.events.EventHandler,goog.Disposable);goog.events.EventHandler.typeArray_=[];goog.events.EventHandler.prototype.listen=function(a,b,c,d,e){goog.isArray(b)||(goog.events.EventHandler.typeArray_[0]=b,b=goog.events.EventHandler.typeArray_);for(var f=0;f<b.length;f++){var g=goog.events.listen(a,b[f],c||this,d||!1,e||this.handler_||this);this.keys_.push(g)}return this};
goog.events.EventHandler.prototype.listenOnce=function(a,b,c,d,e){if(goog.isArray(b))for(var f=0;f<b.length;f++)this.listenOnce(a,b[f],c,d,e);else a=goog.events.listenOnce(a,b,c||this,d,e||this.handler_||this),this.keys_.push(a);return this};goog.events.EventHandler.prototype.listenWithWrapper=function(a,b,c,d,e){b.listen(a,c,d,e||this.handler_||this,this);return this};goog.events.EventHandler.prototype.getListenerCount=function(){return this.keys_.length};
goog.events.EventHandler.prototype.unlisten=function(a,b,c,d,e){if(goog.isArray(b))for(var f=0;f<b.length;f++)this.unlisten(a,b[f],c,d,e);else if(a=goog.events.getListener(a,b,c||this,d,e||this.handler_||this))a=a.key,goog.events.unlistenByKey(a),goog.array.remove(this.keys_,a);return this};goog.events.EventHandler.prototype.unlistenWithWrapper=function(a,b,c,d,e){b.unlisten(a,c,d,e||this.handler_||this,this);return this};
goog.events.EventHandler.prototype.removeAll=function(){goog.array.forEach(this.keys_,goog.events.unlistenByKey);this.keys_.length=0};goog.events.EventHandler.prototype.disposeInternal=function(){goog.events.EventHandler.superClass_.disposeInternal.call(this);this.removeAll()};goog.events.EventHandler.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented");};goog.ui={};goog.ui.IdGenerator=function(){};goog.addSingletonGetter(goog.ui.IdGenerator);goog.ui.IdGenerator.prototype.nextId_=0;goog.ui.IdGenerator.prototype.getNextUniqueId=function(){return":"+(this.nextId_++).toString(36)};goog.ui.IdGenerator.instance=goog.ui.IdGenerator.getInstance();goog.ui.Component=function(a){goog.events.EventTarget.call(this);this.dom_=a||goog.dom.getDomHelper();this.rightToLeft_=goog.ui.Component.defaultRightToLeft_};goog.inherits(goog.ui.Component,goog.events.EventTarget);goog.ui.Component.prototype.idGenerator_=goog.ui.IdGenerator.getInstance();goog.ui.Component.defaultRightToLeft_=null;
goog.ui.Component.EventType={BEFORE_SHOW:"beforeshow",SHOW:"show",HIDE:"hide",DISABLE:"disable",ENABLE:"enable",HIGHLIGHT:"highlight",UNHIGHLIGHT:"unhighlight",ACTIVATE:"activate",DEACTIVATE:"deactivate",SELECT:"select",UNSELECT:"unselect",CHECK:"check",UNCHECK:"uncheck",FOCUS:"focus",BLUR:"blur",OPEN:"open",CLOSE:"close",ENTER:"enter",LEAVE:"leave",ACTION:"action",CHANGE:"change"};
goog.ui.Component.Error={NOT_SUPPORTED:"Method not supported",DECORATE_INVALID:"Invalid element to decorate",ALREADY_RENDERED:"Component already rendered",PARENT_UNABLE_TO_BE_SET:"Unable to set parent component",CHILD_INDEX_OUT_OF_BOUNDS:"Child component index out of bounds",NOT_OUR_CHILD:"Child is not in parent component",NOT_IN_DOCUMENT:"Operation not supported while component is not in document",STATE_INVALID:"Invalid component state"};
goog.ui.Component.State={ALL:255,DISABLED:1,HOVER:2,ACTIVE:4,SELECTED:8,CHECKED:16,FOCUSED:32,OPENED:64};
goog.ui.Component.getStateTransitionEvent=function(a,b){switch(a){case goog.ui.Component.State.DISABLED:return b?goog.ui.Component.EventType.DISABLE:goog.ui.Component.EventType.ENABLE;case goog.ui.Component.State.HOVER:return b?goog.ui.Component.EventType.HIGHLIGHT:goog.ui.Component.EventType.UNHIGHLIGHT;case goog.ui.Component.State.ACTIVE:return b?goog.ui.Component.EventType.ACTIVATE:goog.ui.Component.EventType.DEACTIVATE;case goog.ui.Component.State.SELECTED:return b?goog.ui.Component.EventType.SELECT:
goog.ui.Component.EventType.UNSELECT;case goog.ui.Component.State.CHECKED:return b?goog.ui.Component.EventType.CHECK:goog.ui.Component.EventType.UNCHECK;case goog.ui.Component.State.FOCUSED:return b?goog.ui.Component.EventType.FOCUS:goog.ui.Component.EventType.BLUR;case goog.ui.Component.State.OPENED:return b?goog.ui.Component.EventType.OPEN:goog.ui.Component.EventType.CLOSE}throw Error(goog.ui.Component.Error.STATE_INVALID);};
goog.ui.Component.setDefaultRightToLeft=function(a){goog.ui.Component.defaultRightToLeft_=a};goog.ui.Component.prototype.id_=null;goog.ui.Component.prototype.inDocument_=!1;goog.ui.Component.prototype.element_=null;goog.ui.Component.prototype.rightToLeft_=null;goog.ui.Component.prototype.model_=null;goog.ui.Component.prototype.parent_=null;goog.ui.Component.prototype.children_=null;goog.ui.Component.prototype.childIndex_=null;goog.ui.Component.prototype.wasDecorated_=!1;
goog.ui.Component.prototype.getId=function(){return this.id_||(this.id_=this.idGenerator_.getNextUniqueId())};goog.ui.Component.prototype.setId=function(a){this.parent_&&this.parent_.childIndex_&&(goog.object.remove(this.parent_.childIndex_,this.id_),goog.object.add(this.parent_.childIndex_,a,this));this.id_=a};goog.ui.Component.prototype.getElement=function(){return this.element_};goog.ui.Component.prototype.setElementInternal=function(a){this.element_=a};
goog.ui.Component.prototype.getElementsByClass=function(a){return this.element_?this.dom_.getElementsByClass(a,this.element_):[]};goog.ui.Component.prototype.getElementByClass=function(a){return this.element_?this.dom_.getElementByClass(a,this.element_):null};goog.ui.Component.prototype.getHandler=function(){return this.googUiComponentHandler_||(this.googUiComponentHandler_=new goog.events.EventHandler(this))};
goog.ui.Component.prototype.setParent=function(a){if(this==a)throw Error(goog.ui.Component.Error.PARENT_UNABLE_TO_BE_SET);if(a&&this.parent_&&this.id_&&this.parent_.getChild(this.id_)&&this.parent_!=a)throw Error(goog.ui.Component.Error.PARENT_UNABLE_TO_BE_SET);this.parent_=a;goog.ui.Component.superClass_.setParentEventTarget.call(this,a)};goog.ui.Component.prototype.getParent=function(){return this.parent_};
goog.ui.Component.prototype.setParentEventTarget=function(a){if(this.parent_&&this.parent_!=a)throw Error(goog.ui.Component.Error.NOT_SUPPORTED);goog.ui.Component.superClass_.setParentEventTarget.call(this,a)};goog.ui.Component.prototype.getDomHelper=function(){return this.dom_};goog.ui.Component.prototype.isInDocument=function(){return this.inDocument_};goog.ui.Component.prototype.createDom=function(){this.element_=this.dom_.createElement("div")};goog.ui.Component.prototype.render=function(a){this.render_(a)};
goog.ui.Component.prototype.renderBefore=function(a){this.render_(a.parentNode,a)};goog.ui.Component.prototype.render_=function(a,b){if(this.inDocument_)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.element_||this.createDom();a?a.insertBefore(this.element_,b||null):this.dom_.getDocument().body.appendChild(this.element_);(!this.parent_||this.parent_.isInDocument())&&this.enterDocument()};
goog.ui.Component.prototype.decorate=function(a){if(this.inDocument_)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);if(a&&this.canDecorate(a)){this.wasDecorated_=!0;if(!this.dom_||this.dom_.getDocument()!=goog.dom.getOwnerDocument(a))this.dom_=goog.dom.getDomHelper(a);this.decorateInternal(a);this.enterDocument()}else throw Error(goog.ui.Component.Error.DECORATE_INVALID);};goog.ui.Component.prototype.canDecorate=function(){return!0};goog.ui.Component.prototype.wasDecorated=function(){return this.wasDecorated_};
goog.ui.Component.prototype.decorateInternal=function(a){this.element_=a};goog.ui.Component.prototype.enterDocument=function(){this.inDocument_=!0;this.forEachChild(function(a){!a.isInDocument()&&a.getElement()&&a.enterDocument()})};goog.ui.Component.prototype.exitDocument=function(){this.forEachChild(function(a){a.isInDocument()&&a.exitDocument()});this.googUiComponentHandler_&&this.googUiComponentHandler_.removeAll();this.inDocument_=!1};
goog.ui.Component.prototype.disposeInternal=function(){goog.ui.Component.superClass_.disposeInternal.call(this);this.inDocument_&&this.exitDocument();this.googUiComponentHandler_&&(this.googUiComponentHandler_.dispose(),delete this.googUiComponentHandler_);this.forEachChild(function(a){a.dispose()});!this.wasDecorated_&&this.element_&&goog.dom.removeNode(this.element_);this.parent_=this.model_=this.element_=this.childIndex_=this.children_=null};
goog.ui.Component.prototype.makeId=function(a){return this.getId()+"."+a};goog.ui.Component.prototype.makeIds=function(a){var b={},c;for(c in a)b[c]=this.makeId(a[c]);return b};goog.ui.Component.prototype.getModel=function(){return this.model_};goog.ui.Component.prototype.setModel=function(a){this.model_=a};goog.ui.Component.prototype.getFragmentFromId=function(a){return a.substring(this.getId().length+1)};
goog.ui.Component.prototype.getElementByFragment=function(a){if(!this.inDocument_)throw Error(goog.ui.Component.Error.NOT_IN_DOCUMENT);return this.dom_.getElement(this.makeId(a))};goog.ui.Component.prototype.addChild=function(a,b){this.addChildAt(a,this.getChildCount(),b)};
goog.ui.Component.prototype.addChildAt=function(a,b,c){if(a.inDocument_&&(c||!this.inDocument_))throw Error(goog.ui.Component.Error.ALREADY_RENDERED);if(0>b||b>this.getChildCount())throw Error(goog.ui.Component.Error.CHILD_INDEX_OUT_OF_BOUNDS);if(!this.childIndex_||!this.children_)this.childIndex_={},this.children_=[];a.getParent()==this?(goog.object.set(this.childIndex_,a.getId(),a),goog.array.remove(this.children_,a)):goog.object.add(this.childIndex_,a.getId(),a);a.setParent(this);goog.array.insertAt(this.children_,
a,b);a.inDocument_&&this.inDocument_&&a.getParent()==this?(c=this.getContentElement(),c.insertBefore(a.getElement(),c.childNodes[b]||null)):c?(this.element_||this.createDom(),b=this.getChildAt(b+1),a.render_(this.getContentElement(),b?b.element_:null)):this.inDocument_&&(!a.inDocument_&&a.element_&&a.element_.parentNode&&a.element_.parentNode.nodeType==goog.dom.NodeType.ELEMENT)&&a.enterDocument()};goog.ui.Component.prototype.getContentElement=function(){return this.element_};
goog.ui.Component.prototype.isRightToLeft=function(){null==this.rightToLeft_&&(this.rightToLeft_=goog.style.isRightToLeft(this.inDocument_?this.element_:this.dom_.getDocument().body));return this.rightToLeft_};goog.ui.Component.prototype.setRightToLeft=function(a){if(this.inDocument_)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.rightToLeft_=a};goog.ui.Component.prototype.hasChildren=function(){return!!this.children_&&0!=this.children_.length};
goog.ui.Component.prototype.getChildCount=function(){return this.children_?this.children_.length:0};goog.ui.Component.prototype.getChildIds=function(){var a=[];this.forEachChild(function(b){a.push(b.getId())});return a};goog.ui.Component.prototype.getChild=function(a){return this.childIndex_&&a?goog.object.get(this.childIndex_,a)||null:null};goog.ui.Component.prototype.getChildAt=function(a){return this.children_?this.children_[a]||null:null};
goog.ui.Component.prototype.forEachChild=function(a,b){this.children_&&goog.array.forEach(this.children_,a,b)};goog.ui.Component.prototype.indexOfChild=function(a){return this.children_&&a?goog.array.indexOf(this.children_,a):-1};
goog.ui.Component.prototype.removeChild=function(a,b){if(a){var c=goog.isString(a)?a:a.getId();a=this.getChild(c);c&&a&&(goog.object.remove(this.childIndex_,c),goog.array.remove(this.children_,a),b&&(a.exitDocument(),a.element_&&goog.dom.removeNode(a.element_)),a.setParent(null))}if(!a)throw Error(goog.ui.Component.Error.NOT_OUR_CHILD);return a};goog.ui.Component.prototype.removeChildAt=function(a,b){return this.removeChild(this.getChildAt(a),b)};
goog.ui.Component.prototype.removeChildren=function(a){for(var b=[];this.hasChildren();)b.push(this.removeChildAt(0,a));return b};goog.events.KeyHandler=function(a,b){goog.events.EventTarget.call(this);a&&this.attach(a,b)};goog.inherits(goog.events.KeyHandler,goog.events.EventTarget);goog.events.KeyHandler.prototype.element_=null;goog.events.KeyHandler.prototype.keyPressKey_=null;goog.events.KeyHandler.prototype.keyDownKey_=null;goog.events.KeyHandler.prototype.keyUpKey_=null;goog.events.KeyHandler.prototype.lastKey_=-1;goog.events.KeyHandler.prototype.keyCode_=-1;goog.events.KeyHandler.prototype.altKey_=!1;
goog.events.KeyHandler.EventType={KEY:"key"};
goog.events.KeyHandler.safariKey_={3:goog.events.KeyCodes.ENTER,12:goog.events.KeyCodes.NUMLOCK,63232:goog.events.KeyCodes.UP,63233:goog.events.KeyCodes.DOWN,63234:goog.events.KeyCodes.LEFT,63235:goog.events.KeyCodes.RIGHT,63236:goog.events.KeyCodes.F1,63237:goog.events.KeyCodes.F2,63238:goog.events.KeyCodes.F3,63239:goog.events.KeyCodes.F4,63240:goog.events.KeyCodes.F5,63241:goog.events.KeyCodes.F6,63242:goog.events.KeyCodes.F7,63243:goog.events.KeyCodes.F8,63244:goog.events.KeyCodes.F9,63245:goog.events.KeyCodes.F10,
63246:goog.events.KeyCodes.F11,63247:goog.events.KeyCodes.F12,63248:goog.events.KeyCodes.PRINT_SCREEN,63272:goog.events.KeyCodes.DELETE,63273:goog.events.KeyCodes.HOME,63275:goog.events.KeyCodes.END,63276:goog.events.KeyCodes.PAGE_UP,63277:goog.events.KeyCodes.PAGE_DOWN,63289:goog.events.KeyCodes.NUMLOCK,63302:goog.events.KeyCodes.INSERT};
goog.events.KeyHandler.keyIdentifier_={Up:goog.events.KeyCodes.UP,Down:goog.events.KeyCodes.DOWN,Left:goog.events.KeyCodes.LEFT,Right:goog.events.KeyCodes.RIGHT,Enter:goog.events.KeyCodes.ENTER,F1:goog.events.KeyCodes.F1,F2:goog.events.KeyCodes.F2,F3:goog.events.KeyCodes.F3,F4:goog.events.KeyCodes.F4,F5:goog.events.KeyCodes.F5,F6:goog.events.KeyCodes.F6,F7:goog.events.KeyCodes.F7,F8:goog.events.KeyCodes.F8,F9:goog.events.KeyCodes.F9,F10:goog.events.KeyCodes.F10,F11:goog.events.KeyCodes.F11,F12:goog.events.KeyCodes.F12,
"U+007F":goog.events.KeyCodes.DELETE,Home:goog.events.KeyCodes.HOME,End:goog.events.KeyCodes.END,PageUp:goog.events.KeyCodes.PAGE_UP,PageDown:goog.events.KeyCodes.PAGE_DOWN,Insert:goog.events.KeyCodes.INSERT};goog.events.KeyHandler.USES_KEYDOWN_=goog.userAgent.IE||goog.userAgent.WEBKIT&&goog.userAgent.isVersion("525");goog.events.KeyHandler.SAVE_ALT_FOR_KEYPRESS_=goog.userAgent.MAC&&goog.userAgent.GECKO;
goog.events.KeyHandler.prototype.handleKeyDown_=function(a){if(goog.userAgent.WEBKIT&&(this.lastKey_==goog.events.KeyCodes.CTRL&&!a.ctrlKey||this.lastKey_==goog.events.KeyCodes.ALT&&!a.altKey||goog.userAgent.MAC&&this.lastKey_==goog.events.KeyCodes.META&&!a.metaKey))this.keyCode_=this.lastKey_=-1;-1==this.lastKey_&&(a.ctrlKey&&a.keyCode!=goog.events.KeyCodes.CTRL?this.lastKey_=goog.events.KeyCodes.CTRL:a.altKey&&a.keyCode!=goog.events.KeyCodes.ALT?this.lastKey_=goog.events.KeyCodes.ALT:a.metaKey&&
a.keyCode!=goog.events.KeyCodes.META&&(this.lastKey_=goog.events.KeyCodes.META));goog.events.KeyHandler.USES_KEYDOWN_&&!goog.events.KeyCodes.firesKeyPressEvent(a.keyCode,this.lastKey_,a.shiftKey,a.ctrlKey,a.altKey)?this.handleEvent(a):(this.keyCode_=goog.userAgent.GECKO?goog.events.KeyCodes.normalizeGeckoKeyCode(a.keyCode):a.keyCode,goog.events.KeyHandler.SAVE_ALT_FOR_KEYPRESS_&&(this.altKey_=a.altKey))};goog.events.KeyHandler.prototype.resetState=function(){this.keyCode_=this.lastKey_=-1};
goog.events.KeyHandler.prototype.handleKeyup_=function(a){this.resetState();this.altKey_=a.altKey};
goog.events.KeyHandler.prototype.handleEvent=function(a){var b=a.getBrowserEvent(),c,d,e=b.altKey;goog.userAgent.IE&&a.type==goog.events.EventType.KEYPRESS?(c=this.keyCode_,d=c!=goog.events.KeyCodes.ENTER&&c!=goog.events.KeyCodes.ESC?b.keyCode:0):goog.userAgent.WEBKIT&&a.type==goog.events.EventType.KEYPRESS?(c=this.keyCode_,d=0<=b.charCode&&63232>b.charCode&&goog.events.KeyCodes.isCharacterKey(c)?b.charCode:0):goog.userAgent.OPERA?(c=this.keyCode_,d=goog.events.KeyCodes.isCharacterKey(c)?b.keyCode:
0):(c=b.keyCode||this.keyCode_,d=b.charCode||0,goog.events.KeyHandler.SAVE_ALT_FOR_KEYPRESS_&&(e=this.altKey_),goog.userAgent.MAC&&(d==goog.events.KeyCodes.QUESTION_MARK&&c==goog.events.KeyCodes.WIN_KEY)&&(c=goog.events.KeyCodes.SLASH));var f=c,g=b.keyIdentifier;c?63232<=c&&c in goog.events.KeyHandler.safariKey_?f=goog.events.KeyHandler.safariKey_[c]:25==c&&a.shiftKey&&(f=9):g&&g in goog.events.KeyHandler.keyIdentifier_&&(f=goog.events.KeyHandler.keyIdentifier_[g]);a=f==this.lastKey_;this.lastKey_=
f;b=new goog.events.KeyEvent(f,d,a,b);b.altKey=e;this.dispatchEvent(b)};goog.events.KeyHandler.prototype.getElement=function(){return this.element_};
goog.events.KeyHandler.prototype.attach=function(a,b){this.keyUpKey_&&this.detach();this.element_=a;this.keyPressKey_=goog.events.listen(this.element_,goog.events.EventType.KEYPRESS,this,b);this.keyDownKey_=goog.events.listen(this.element_,goog.events.EventType.KEYDOWN,this.handleKeyDown_,b,this);this.keyUpKey_=goog.events.listen(this.element_,goog.events.EventType.KEYUP,this.handleKeyup_,b,this)};
goog.events.KeyHandler.prototype.detach=function(){this.keyPressKey_&&(goog.events.unlistenByKey(this.keyPressKey_),goog.events.unlistenByKey(this.keyDownKey_),goog.events.unlistenByKey(this.keyUpKey_),this.keyUpKey_=this.keyDownKey_=this.keyPressKey_=null);this.element_=null;this.keyCode_=this.lastKey_=-1};goog.events.KeyHandler.prototype.disposeInternal=function(){goog.events.KeyHandler.superClass_.disposeInternal.call(this);this.detach()};
goog.events.KeyEvent=function(a,b,c,d){goog.events.BrowserEvent.call(this,d);this.type=goog.events.KeyHandler.EventType.KEY;this.keyCode=a;this.charCode=b;this.repeat=c};goog.inherits(goog.events.KeyEvent,goog.events.BrowserEvent);goog.a11y={};goog.a11y.aria={};
goog.a11y.aria.State={ACTIVEDESCENDANT:"activedescendant",ATOMIC:"atomic",AUTOCOMPLETE:"autocomplete",BUSY:"busy",CHECKED:"checked",CONTROLS:"controls",DESCRIBEDBY:"describedby",DISABLED:"disabled",DROPEFFECT:"dropeffect",EXPANDED:"expanded",FLOWTO:"flowto",GRABBED:"grabbed",HASPOPUP:"haspopup",HIDDEN:"hidden",INVALID:"invalid",LABEL:"label",LABELLEDBY:"labelledby",LEVEL:"level",LIVE:"live",MULTILINE:"multiline",MULTISELECTABLE:"multiselectable",ORIENTATION:"orientation",OWNS:"owns",POSINSET:"posinset",
PRESSED:"pressed",READONLY:"readonly",RELEVANT:"relevant",REQUIRED:"required",SELECTED:"selected",SETSIZE:"setsize",SORT:"sort",VALUEMAX:"valuemax",VALUEMIN:"valuemin",VALUENOW:"valuenow",VALUETEXT:"valuetext"};
goog.a11y.aria.Role={ALERT:"alert",ALERTDIALOG:"alertdialog",APPLICATION:"application",ARTICLE:"article",BANNER:"banner",BUTTON:"button",CHECKBOX:"checkbox",COLUMNHEADER:"columnheader",COMBOBOX:"combobox",COMPLEMENTARY:"complementary",DIALOG:"dialog",DIRECTORY:"directory",DOCUMENT:"document",FORM:"form",GRID:"grid",GRIDCELL:"gridcell",GROUP:"group",HEADING:"heading",IMG:"img",LINK:"link",LIST:"list",LISTBOX:"listbox",LISTITEM:"listitem",LOG:"log",MAIN:"main",MARQUEE:"marquee",MATH:"math",MENU:"menu",
MENUBAR:"menubar",MENU_ITEM:"menuitem",MENU_ITEM_CHECKBOX:"menuitemcheckbox",MENU_ITEM_RADIO:"menuitemradio",NAVIGATION:"navigation",NOTE:"note",OPTION:"option",PRESENTATION:"presentation",PROGRESSBAR:"progressbar",RADIO:"radio",RADIOGROUP:"radiogroup",REGION:"region",ROW:"row",ROWGROUP:"rowgroup",ROWHEADER:"rowheader",SCROLLBAR:"scrollbar",SEARCH:"search",SEPARATOR:"separator",SLIDER:"slider",SPINBUTTON:"spinbutton",STATUS:"status",TAB:"tab",TAB_LIST:"tablist",TAB_PANEL:"tabpanel",TEXTBOX:"textbox",
TIMER:"timer",TOOLBAR:"toolbar",TOOLTIP:"tooltip",TREE:"tree",TREEGRID:"treegrid",TREEITEM:"treeitem"};goog.a11y.aria.LivePriority={OFF:"off",POLITE:"polite",ASSERTIVE:"assertive"};goog.a11y.aria.setRole=function(a,b){a.setAttribute("role",b)};goog.a11y.aria.getRole=function(a){return a.getAttribute("role")||""};goog.a11y.aria.setState=function(a,b,c){a.setAttribute("aria-"+b,c)};
goog.a11y.aria.getState=function(a,b){var c=a.getAttribute("aria-"+b);return!0===c||!1===c?c?"true":"false":c?String(c):""};goog.a11y.aria.getActiveDescendant=function(a){var b=goog.a11y.aria.getState(a,goog.a11y.aria.State.ACTIVEDESCENDANT);return goog.dom.getOwnerDocument(a).getElementById(b)};goog.a11y.aria.setActiveDescendant=function(a,b){goog.a11y.aria.setState(a,goog.a11y.aria.State.ACTIVEDESCENDANT,b?b.id:"")};goog.a11y.aria.Announcer=function(a){goog.Disposable.call(this);this.domHelper_=a||goog.dom.getDomHelper();this.liveRegions_={}};goog.inherits(goog.a11y.aria.Announcer,goog.Disposable);goog.a11y.aria.Announcer.prototype.disposeInternal=function(){goog.object.forEach(this.liveRegions_,this.domHelper_.removeNode,this.domHelper_);this.domHelper_=this.liveRegions_=null;goog.a11y.aria.Announcer.superClass_.disposeInternal.call(this)};
goog.a11y.aria.Announcer.prototype.say=function(a,b){goog.dom.setTextContent(this.getLiveRegion_(b||goog.a11y.aria.LivePriority.POLITE),a)};
goog.a11y.aria.Announcer.prototype.getLiveRegion_=function(a){if(this.liveRegions_[a])return this.liveRegions_[a];var b;b=this.domHelper_.createElement("div");b.style.position="absolute";b.style.top="-1000px";goog.a11y.aria.setState(b,goog.a11y.aria.State.LIVE,a);goog.a11y.aria.setState(b,goog.a11y.aria.State.ATOMIC,"true");this.domHelper_.getDocument().body.appendChild(b);return this.liveRegions_[a]=b};goog.dom.a11y={};goog.dom.a11y.State=goog.a11y.aria.State;goog.dom.a11y.Role=goog.a11y.aria.Role;goog.dom.a11y.LivePriority=goog.a11y.aria.LivePriority;goog.dom.a11y.setRole=function(a,b){goog.a11y.aria.setRole(a,b)};goog.dom.a11y.getRole=function(a){return goog.a11y.aria.getRole(a)};goog.dom.a11y.setState=function(a,b,c){goog.a11y.aria.setState(a,b,c)};goog.dom.a11y.getState=function(a,b){return goog.a11y.aria.getState(a,b)};goog.dom.a11y.getActiveDescendant=function(a){return goog.a11y.aria.getActiveDescendant(a)};
goog.dom.a11y.setActiveDescendant=function(a,b){goog.a11y.aria.setActiveDescendant(a,b)};goog.dom.a11y.Announcer=goog.a11y.aria.Announcer;goog.ui.ControlRenderer=function(){};goog.addSingletonGetter(goog.ui.ControlRenderer);goog.ui.ControlRenderer.getCustomRenderer=function(a,b){var c=new a;c.getCssClass=function(){return b};return c};goog.ui.ControlRenderer.CSS_CLASS="goog-control";goog.ui.ControlRenderer.IE6_CLASS_COMBINATIONS=[];goog.ui.ControlRenderer.prototype.getAriaRole=function(){};
goog.ui.ControlRenderer.prototype.createDom=function(a){var b=a.getDomHelper().createDom("div",this.getClassNames(a).join(" "),a.getContent());this.setAriaStates(a,b);return b};goog.ui.ControlRenderer.prototype.getContentElement=function(a){return a};
goog.ui.ControlRenderer.prototype.enableClassName=function(a,b,c){if(a=a.getElement?a.getElement():a)if(goog.userAgent.IE&&!goog.userAgent.isVersion("7")){var d=this.getAppliedCombinedClassNames_(goog.dom.classes.get(a),b);d.push(b);goog.partial(c?goog.dom.classes.add:goog.dom.classes.remove,a).apply(null,d)}else goog.dom.classes.enable(a,b,c)};goog.ui.ControlRenderer.prototype.enableExtraClassName=function(a,b,c){this.enableClassName(a,b,c)};goog.ui.ControlRenderer.prototype.canDecorate=function(){return!0};
goog.ui.ControlRenderer.prototype.decorate=function(a,b){b.id&&a.setId(b.id);var c=this.getContentElement(b);c&&c.firstChild?a.setContentInternal(c.firstChild.nextSibling?goog.array.clone(c.childNodes):c.firstChild):a.setContentInternal(null);var d=0,e=this.getCssClass(),f=this.getStructuralCssClass(),g=!1,h=!1,c=!1,j=goog.dom.classes.get(b);goog.array.forEach(j,function(a){!g&&a==e?(g=!0,f==e&&(h=!0)):!h&&a==f?h=!0:d|=this.getStateFromClass(a)},this);a.setStateInternal(d);g||(j.push(e),f==e&&(h=
!0));h||j.push(f);var k=a.getExtraClassNames();k&&j.push.apply(j,k);if(goog.userAgent.IE&&!goog.userAgent.isVersion("7")){var l=this.getAppliedCombinedClassNames_(j);0<l.length&&(j.push.apply(j,l),c=!0)}(!g||!h||k||c)&&goog.dom.classes.set(b,j.join(" "));this.setAriaStates(a,b);return b};goog.ui.ControlRenderer.prototype.initializeDom=function(a){a.isRightToLeft()&&this.setRightToLeft(a.getElement(),!0);a.isEnabled()&&this.setFocusable(a,a.isVisible())};
goog.ui.ControlRenderer.prototype.setAriaRole=function(a,b){var c=b||this.getAriaRole();c&&goog.dom.a11y.setRole(a,c)};
goog.ui.ControlRenderer.prototype.setAriaStates=function(a,b){goog.asserts.assert(a);goog.asserts.assert(b);a.isEnabled()||this.updateAriaState(b,goog.ui.Component.State.DISABLED,!0);a.isSelected()&&this.updateAriaState(b,goog.ui.Component.State.SELECTED,!0);a.isSupportedState(goog.ui.Component.State.CHECKED)&&this.updateAriaState(b,goog.ui.Component.State.CHECKED,a.isChecked());a.isSupportedState(goog.ui.Component.State.OPENED)&&this.updateAriaState(b,goog.ui.Component.State.OPENED,a.isOpen())};
goog.ui.ControlRenderer.prototype.setAllowTextSelection=function(a,b){goog.style.setUnselectable(a,!b,!goog.userAgent.IE&&!goog.userAgent.OPERA)};goog.ui.ControlRenderer.prototype.setRightToLeft=function(a,b){this.enableClassName(a,this.getStructuralCssClass()+"-rtl",b)};goog.ui.ControlRenderer.prototype.isFocusable=function(a){var b;return a.isSupportedState(goog.ui.Component.State.FOCUSED)&&(b=a.getKeyEventTarget())?goog.dom.isFocusableTabIndex(b):!1};
goog.ui.ControlRenderer.prototype.setFocusable=function(a,b){var c;if(a.isSupportedState(goog.ui.Component.State.FOCUSED)&&(c=a.getKeyEventTarget())){if(!b&&a.isFocused()){try{c.blur()}catch(d){}a.isFocused()&&a.handleBlur(null)}goog.dom.isFocusableTabIndex(c)!=b&&goog.dom.setFocusableTabIndex(c,b)}};goog.ui.ControlRenderer.prototype.setVisible=function(a,b){goog.style.showElement(a,b)};
goog.ui.ControlRenderer.prototype.setState=function(a,b,c){var d=a.getElement();if(d){var e=this.getClassForState(b);e&&this.enableClassName(a,e,c);this.updateAriaState(d,b,c)}};
goog.ui.ControlRenderer.prototype.updateAriaState=function(a,b,c){goog.ui.ControlRenderer.ARIA_STATE_MAP_||(goog.ui.ControlRenderer.ARIA_STATE_MAP_=goog.object.create(goog.ui.Component.State.DISABLED,goog.dom.a11y.State.DISABLED,goog.ui.Component.State.SELECTED,goog.dom.a11y.State.SELECTED,goog.ui.Component.State.CHECKED,goog.dom.a11y.State.CHECKED,goog.ui.Component.State.OPENED,goog.dom.a11y.State.EXPANDED));(b=goog.ui.ControlRenderer.ARIA_STATE_MAP_[b])&&goog.dom.a11y.setState(a,b,c)};
goog.ui.ControlRenderer.prototype.setContent=function(a,b){var c=this.getContentElement(a);if(c&&(goog.dom.removeChildren(c),b))if(goog.isString(b))goog.dom.setTextContent(c,b);else{var d=function(a){if(a){var b=goog.dom.getOwnerDocument(c);c.appendChild(goog.isString(a)?b.createTextNode(a):a)}};goog.isArray(b)?goog.array.forEach(b,d):goog.isArrayLike(b)&&!("nodeType"in b)?goog.array.forEach(goog.array.clone(b),d):d(b)}};goog.ui.ControlRenderer.prototype.getKeyEventTarget=function(a){return a.getElement()};
goog.ui.ControlRenderer.prototype.getCssClass=function(){return goog.ui.ControlRenderer.CSS_CLASS};goog.ui.ControlRenderer.prototype.getIe6ClassCombinations=function(){return[]};goog.ui.ControlRenderer.prototype.getStructuralCssClass=function(){return this.getCssClass()};
goog.ui.ControlRenderer.prototype.getClassNames=function(a){var b=this.getCssClass(),c=[b],d=this.getStructuralCssClass();d!=b&&c.push(d);b=this.getClassNamesForState(a.getState());c.push.apply(c,b);(a=a.getExtraClassNames())&&c.push.apply(c,a);goog.userAgent.IE&&!goog.userAgent.isVersion("7")&&c.push.apply(c,this.getAppliedCombinedClassNames_(c));return c};
goog.ui.ControlRenderer.prototype.getAppliedCombinedClassNames_=function(a,b){var c=[];b&&(a=a.concat([b]));goog.array.forEach(this.getIe6ClassCombinations(),function(d){goog.array.every(d,goog.partial(goog.array.contains,a))&&(!b||goog.array.contains(d,b))&&c.push(d.join("_"))});return c};goog.ui.ControlRenderer.prototype.getClassNamesForState=function(a){for(var b=[];a;){var c=a&-a;b.push(this.getClassForState(c));a&=~c}return b};
goog.ui.ControlRenderer.prototype.getClassForState=function(a){this.classByState_||this.createClassByStateMap_();return this.classByState_[a]};goog.ui.ControlRenderer.prototype.getStateFromClass=function(a){this.stateByClass_||this.createStateByClassMap_();a=parseInt(this.stateByClass_[a],10);return isNaN(a)?0:a};
goog.ui.ControlRenderer.prototype.createClassByStateMap_=function(){var a=this.getStructuralCssClass();this.classByState_=goog.object.create(goog.ui.Component.State.DISABLED,a+"-disabled",goog.ui.Component.State.HOVER,a+"-hover",goog.ui.Component.State.ACTIVE,a+"-active",goog.ui.Component.State.SELECTED,a+"-selected",goog.ui.Component.State.CHECKED,a+"-checked",goog.ui.Component.State.FOCUSED,a+"-focused",goog.ui.Component.State.OPENED,a+"-open")};
goog.ui.ControlRenderer.prototype.createStateByClassMap_=function(){this.classByState_||this.createClassByStateMap_();this.stateByClass_=goog.object.transpose(this.classByState_)};goog.ui.registry={};goog.ui.registry.getDefaultRenderer=function(a){for(var b;a;){b=goog.getUid(a);if(b=goog.ui.registry.defaultRenderers_[b])break;a=a.superClass_?a.superClass_.constructor:null}return b?goog.isFunction(b.getInstance)?b.getInstance():new b:null};
goog.ui.registry.setDefaultRenderer=function(a,b){if(!goog.isFunction(a))throw Error("Invalid component class "+a);if(!goog.isFunction(b))throw Error("Invalid renderer class "+b);var c=goog.getUid(a);goog.ui.registry.defaultRenderers_[c]=b};goog.ui.registry.getDecoratorByClassName=function(a){return a in goog.ui.registry.decoratorFunctions_?goog.ui.registry.decoratorFunctions_[a]():null};
goog.ui.registry.setDecoratorByClassName=function(a,b){if(!a)throw Error("Invalid class name "+a);if(!goog.isFunction(b))throw Error("Invalid decorator function "+b);goog.ui.registry.decoratorFunctions_[a]=b};goog.ui.registry.getDecorator=function(a){for(var b=goog.dom.classes.get(a),c=0,d=b.length;c<d;c++)if(a=goog.ui.registry.getDecoratorByClassName(b[c]))return a;return null};goog.ui.registry.reset=function(){goog.ui.registry.defaultRenderers_={};goog.ui.registry.decoratorFunctions_={}};
goog.ui.registry.defaultRenderers_={};goog.ui.registry.decoratorFunctions_={};goog.ui.decorate=function(a){var b=goog.ui.registry.getDecorator(a);b&&b.decorate(a);return b};goog.ui.Control=function(a,b,c){goog.ui.Component.call(this,c);this.renderer_=b||goog.ui.registry.getDefaultRenderer(this.constructor);this.setContentInternal(a)};goog.inherits(goog.ui.Control,goog.ui.Component);goog.ui.Control.registerDecorator=goog.ui.registry.setDecoratorByClassName;goog.ui.Control.getDecorator=goog.ui.registry.getDecorator;goog.ui.Control.decorate=goog.ui.decorate;goog.ui.Control.prototype.content_=null;goog.ui.Control.prototype.state_=0;
goog.ui.Control.prototype.supportedStates_=goog.ui.Component.State.DISABLED|goog.ui.Component.State.HOVER|goog.ui.Component.State.ACTIVE|goog.ui.Component.State.FOCUSED;goog.ui.Control.prototype.autoStates_=goog.ui.Component.State.ALL;goog.ui.Control.prototype.statesWithTransitionEvents_=0;goog.ui.Control.prototype.visible_=!0;goog.ui.Control.prototype.extraClassNames_=null;goog.ui.Control.prototype.handleMouseEvents_=!0;goog.ui.Control.prototype.allowTextSelection_=!1;
goog.ui.Control.prototype.preferredAriaRole_=null;goog.ui.Control.prototype.isHandleMouseEvents=function(){return this.handleMouseEvents_};goog.ui.Control.prototype.setHandleMouseEvents=function(a){this.isInDocument()&&a!=this.handleMouseEvents_&&this.enableMouseEventHandling_(a);this.handleMouseEvents_=a};goog.ui.Control.prototype.getKeyEventTarget=function(){return this.renderer_.getKeyEventTarget(this)};
goog.ui.Control.prototype.getKeyHandler=function(){return this.keyHandler_||(this.keyHandler_=new goog.events.KeyHandler)};goog.ui.Control.prototype.getRenderer=function(){return this.renderer_};goog.ui.Control.prototype.setRenderer=function(a){if(this.isInDocument())throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.getElement()&&this.setElementInternal(null);this.renderer_=a};goog.ui.Control.prototype.getExtraClassNames=function(){return this.extraClassNames_};
goog.ui.Control.prototype.addClassName=function(a){a&&(this.extraClassNames_?goog.array.contains(this.extraClassNames_,a)||this.extraClassNames_.push(a):this.extraClassNames_=[a],this.renderer_.enableExtraClassName(this,a,!0))};goog.ui.Control.prototype.removeClassName=function(a){a&&this.extraClassNames_&&(goog.array.remove(this.extraClassNames_,a),0==this.extraClassNames_.length&&(this.extraClassNames_=null),this.renderer_.enableExtraClassName(this,a,!1))};
goog.ui.Control.prototype.enableClassName=function(a,b){b?this.addClassName(a):this.removeClassName(a)};goog.ui.Control.prototype.createDom=function(){var a=this.renderer_.createDom(this);this.setElementInternal(a);this.renderer_.setAriaRole(a,this.getPreferredAriaRole());this.isAllowTextSelection()||this.renderer_.setAllowTextSelection(a,!1);this.isVisible()||this.renderer_.setVisible(a,!1)};goog.ui.Control.prototype.getPreferredAriaRole=function(){return this.preferredAriaRole_};
goog.ui.Control.prototype.setPreferredAriaRole=function(a){this.preferredAriaRole_=a};goog.ui.Control.prototype.getContentElement=function(){return this.renderer_.getContentElement(this.getElement())};goog.ui.Control.prototype.canDecorate=function(a){return this.renderer_.canDecorate(a)};
goog.ui.Control.prototype.decorateInternal=function(a){a=this.renderer_.decorate(this,a);this.setElementInternal(a);this.renderer_.setAriaRole(a,this.getPreferredAriaRole());this.isAllowTextSelection()||this.renderer_.setAllowTextSelection(a,!1);this.visible_="none"!=a.style.display};
goog.ui.Control.prototype.enterDocument=function(){goog.ui.Control.superClass_.enterDocument.call(this);this.renderer_.initializeDom(this);if(this.supportedStates_&~goog.ui.Component.State.DISABLED&&(this.isHandleMouseEvents()&&this.enableMouseEventHandling_(!0),this.isSupportedState(goog.ui.Component.State.FOCUSED))){var a=this.getKeyEventTarget();if(a){var b=this.getKeyHandler();b.attach(a);this.getHandler().listen(b,goog.events.KeyHandler.EventType.KEY,this.handleKeyEvent).listen(a,goog.events.EventType.FOCUS,
this.handleFocus).listen(a,goog.events.EventType.BLUR,this.handleBlur)}}};
goog.ui.Control.prototype.enableMouseEventHandling_=function(a){var b=this.getHandler(),c=this.getElement();a?(b.listen(c,goog.events.EventType.MOUSEOVER,this.handleMouseOver).listen(c,goog.events.EventType.MOUSEDOWN,this.handleMouseDown).listen(c,goog.events.EventType.MOUSEUP,this.handleMouseUp).listen(c,goog.events.EventType.MOUSEOUT,this.handleMouseOut),this.handleContextMenu!=goog.nullFunction&&b.listen(c,goog.events.EventType.CONTEXTMENU,this.handleContextMenu),goog.userAgent.IE&&b.listen(c,
goog.events.EventType.DBLCLICK,this.handleDblClick)):(b.unlisten(c,goog.events.EventType.MOUSEOVER,this.handleMouseOver).unlisten(c,goog.events.EventType.MOUSEDOWN,this.handleMouseDown).unlisten(c,goog.events.EventType.MOUSEUP,this.handleMouseUp).unlisten(c,goog.events.EventType.MOUSEOUT,this.handleMouseOut),this.handleContextMenu!=goog.nullFunction&&b.unlisten(c,goog.events.EventType.CONTEXTMENU,this.handleContextMenu),goog.userAgent.IE&&b.unlisten(c,goog.events.EventType.DBLCLICK,this.handleDblClick))};
goog.ui.Control.prototype.exitDocument=function(){goog.ui.Control.superClass_.exitDocument.call(this);this.keyHandler_&&this.keyHandler_.detach();this.isVisible()&&this.isEnabled()&&this.renderer_.setFocusable(this,!1)};goog.ui.Control.prototype.disposeInternal=function(){goog.ui.Control.superClass_.disposeInternal.call(this);this.keyHandler_&&(this.keyHandler_.dispose(),delete this.keyHandler_);delete this.renderer_;this.extraClassNames_=this.content_=null};goog.ui.Control.prototype.getContent=function(){return this.content_};
goog.ui.Control.prototype.setContent=function(a){this.renderer_.setContent(this.getElement(),a);this.setContentInternal(a)};goog.ui.Control.prototype.setContentInternal=function(a){this.content_=a};goog.ui.Control.prototype.getCaption=function(){var a=this.getContent();if(!a)return"";a=goog.isString(a)?a:goog.isArray(a)?goog.array.map(a,goog.dom.getRawTextContent).join(""):goog.dom.getTextContent(a);return goog.string.collapseBreakingSpaces(a)};goog.ui.Control.prototype.setCaption=function(a){this.setContent(a)};
goog.ui.Control.prototype.setRightToLeft=function(a){goog.ui.Control.superClass_.setRightToLeft.call(this,a);var b=this.getElement();b&&this.renderer_.setRightToLeft(b,a)};goog.ui.Control.prototype.isAllowTextSelection=function(){return this.allowTextSelection_};goog.ui.Control.prototype.setAllowTextSelection=function(a){this.allowTextSelection_=a;var b=this.getElement();b&&this.renderer_.setAllowTextSelection(b,a)};goog.ui.Control.prototype.isVisible=function(){return this.visible_};
goog.ui.Control.prototype.setVisible=function(a,b){if(b||this.visible_!=a&&this.dispatchEvent(a?goog.ui.Component.EventType.SHOW:goog.ui.Component.EventType.HIDE)){var c=this.getElement();c&&this.renderer_.setVisible(c,a);this.isEnabled()&&this.renderer_.setFocusable(this,a);this.visible_=a;return!0}return!1};goog.ui.Control.prototype.isEnabled=function(){return!this.hasState(goog.ui.Component.State.DISABLED)};
goog.ui.Control.prototype.isParentDisabled_=function(){var a=this.getParent();return!!a&&"function"==typeof a.isEnabled&&!a.isEnabled()};goog.ui.Control.prototype.setEnabled=function(a){!this.isParentDisabled_()&&this.isTransitionAllowed(goog.ui.Component.State.DISABLED,!a)&&(a||(this.setActive(!1),this.setHighlighted(!1)),this.isVisible()&&this.renderer_.setFocusable(this,a),this.setState(goog.ui.Component.State.DISABLED,!a))};goog.ui.Control.prototype.isHighlighted=function(){return this.hasState(goog.ui.Component.State.HOVER)};
goog.ui.Control.prototype.setHighlighted=function(a){this.isTransitionAllowed(goog.ui.Component.State.HOVER,a)&&this.setState(goog.ui.Component.State.HOVER,a)};goog.ui.Control.prototype.isActive=function(){return this.hasState(goog.ui.Component.State.ACTIVE)};goog.ui.Control.prototype.setActive=function(a){this.isTransitionAllowed(goog.ui.Component.State.ACTIVE,a)&&this.setState(goog.ui.Component.State.ACTIVE,a)};goog.ui.Control.prototype.isSelected=function(){return this.hasState(goog.ui.Component.State.SELECTED)};
goog.ui.Control.prototype.setSelected=function(a){this.isTransitionAllowed(goog.ui.Component.State.SELECTED,a)&&this.setState(goog.ui.Component.State.SELECTED,a)};goog.ui.Control.prototype.isChecked=function(){return this.hasState(goog.ui.Component.State.CHECKED)};goog.ui.Control.prototype.setChecked=function(a){this.isTransitionAllowed(goog.ui.Component.State.CHECKED,a)&&this.setState(goog.ui.Component.State.CHECKED,a)};goog.ui.Control.prototype.isFocused=function(){return this.hasState(goog.ui.Component.State.FOCUSED)};
goog.ui.Control.prototype.setFocused=function(a){this.isTransitionAllowed(goog.ui.Component.State.FOCUSED,a)&&this.setState(goog.ui.Component.State.FOCUSED,a)};goog.ui.Control.prototype.isOpen=function(){return this.hasState(goog.ui.Component.State.OPENED)};goog.ui.Control.prototype.setOpen=function(a){this.isTransitionAllowed(goog.ui.Component.State.OPENED,a)&&this.setState(goog.ui.Component.State.OPENED,a)};goog.ui.Control.prototype.getState=function(){return this.state_};
goog.ui.Control.prototype.hasState=function(a){return!!(this.state_&a)};goog.ui.Control.prototype.setState=function(a,b){this.isSupportedState(a)&&b!=this.hasState(a)&&(this.renderer_.setState(this,a,b),this.state_=b?this.state_|a:this.state_&~a)};goog.ui.Control.prototype.setStateInternal=function(a){this.state_=a};goog.ui.Control.prototype.isSupportedState=function(a){return!!(this.supportedStates_&a)};
goog.ui.Control.prototype.setSupportedState=function(a,b){if(this.isInDocument()&&this.hasState(a)&&!b)throw Error(goog.ui.Component.Error.ALREADY_RENDERED);!b&&this.hasState(a)&&this.setState(a,!1);this.supportedStates_=b?this.supportedStates_|a:this.supportedStates_&~a};goog.ui.Control.prototype.isAutoState=function(a){return!!(this.autoStates_&a)&&this.isSupportedState(a)};goog.ui.Control.prototype.setAutoStates=function(a,b){this.autoStates_=b?this.autoStates_|a:this.autoStates_&~a};
goog.ui.Control.prototype.isDispatchTransitionEvents=function(a){return!!(this.statesWithTransitionEvents_&a)&&this.isSupportedState(a)};goog.ui.Control.prototype.setDispatchTransitionEvents=function(a,b){this.statesWithTransitionEvents_=b?this.statesWithTransitionEvents_|a:this.statesWithTransitionEvents_&~a};
goog.ui.Control.prototype.isTransitionAllowed=function(a,b){return this.isSupportedState(a)&&this.hasState(a)!=b&&(!(this.statesWithTransitionEvents_&a)||this.dispatchEvent(goog.ui.Component.getStateTransitionEvent(a,b)))&&!this.isDisposed()};goog.ui.Control.prototype.handleMouseOver=function(a){!goog.ui.Control.isMouseEventWithinElement_(a,this.getElement())&&(this.dispatchEvent(goog.ui.Component.EventType.ENTER)&&this.isEnabled()&&this.isAutoState(goog.ui.Component.State.HOVER))&&this.setHighlighted(!0)};
goog.ui.Control.prototype.handleMouseOut=function(a){!goog.ui.Control.isMouseEventWithinElement_(a,this.getElement())&&this.dispatchEvent(goog.ui.Component.EventType.LEAVE)&&(this.isAutoState(goog.ui.Component.State.ACTIVE)&&this.setActive(!1),this.isAutoState(goog.ui.Component.State.HOVER)&&this.setHighlighted(!1))};goog.ui.Control.prototype.handleContextMenu=goog.nullFunction;goog.ui.Control.isMouseEventWithinElement_=function(a,b){return!!a.relatedTarget&&goog.dom.contains(b,a.relatedTarget)};
goog.ui.Control.prototype.handleMouseDown=function(a){this.isEnabled()&&(this.isAutoState(goog.ui.Component.State.HOVER)&&this.setHighlighted(!0),a.isMouseActionButton()&&(this.isAutoState(goog.ui.Component.State.ACTIVE)&&this.setActive(!0),this.renderer_.isFocusable(this)&&this.getKeyEventTarget().focus()));!this.isAllowTextSelection()&&a.isMouseActionButton()&&a.preventDefault()};
goog.ui.Control.prototype.handleMouseUp=function(a){this.isEnabled()&&(this.isAutoState(goog.ui.Component.State.HOVER)&&this.setHighlighted(!0),this.isActive()&&(this.performActionInternal(a)&&this.isAutoState(goog.ui.Component.State.ACTIVE))&&this.setActive(!1))};goog.ui.Control.prototype.handleDblClick=function(a){this.isEnabled()&&this.performActionInternal(a)};
goog.ui.Control.prototype.performActionInternal=function(a){this.isAutoState(goog.ui.Component.State.CHECKED)&&this.setChecked(!this.isChecked());this.isAutoState(goog.ui.Component.State.SELECTED)&&this.setSelected(!0);this.isAutoState(goog.ui.Component.State.OPENED)&&this.setOpen(!this.isOpen());var b=new goog.events.Event(goog.ui.Component.EventType.ACTION,this);a&&(b.altKey=a.altKey,b.ctrlKey=a.ctrlKey,b.metaKey=a.metaKey,b.shiftKey=a.shiftKey,b.platformModifierKey=a.platformModifierKey);return this.dispatchEvent(b)};
goog.ui.Control.prototype.handleFocus=function(){this.isAutoState(goog.ui.Component.State.FOCUSED)&&this.setFocused(!0)};goog.ui.Control.prototype.handleBlur=function(){this.isAutoState(goog.ui.Component.State.ACTIVE)&&this.setActive(!1);this.isAutoState(goog.ui.Component.State.FOCUSED)&&this.setFocused(!1)};goog.ui.Control.prototype.handleKeyEvent=function(a){return this.isVisible()&&this.isEnabled()&&this.handleKeyEventInternal(a)?(a.preventDefault(),a.stopPropagation(),!0):!1};
goog.ui.Control.prototype.handleKeyEventInternal=function(a){return a.keyCode==goog.events.KeyCodes.ENTER&&this.performActionInternal(a)};goog.ui.registry.setDefaultRenderer(goog.ui.Control,goog.ui.ControlRenderer);goog.ui.registry.setDecoratorByClassName(goog.ui.ControlRenderer.CSS_CLASS,function(){return new goog.ui.Control(null)});goog.ui.PaletteRenderer=function(){goog.ui.ControlRenderer.call(this)};goog.inherits(goog.ui.PaletteRenderer,goog.ui.ControlRenderer);goog.addSingletonGetter(goog.ui.PaletteRenderer);goog.ui.PaletteRenderer.cellId_=0;goog.ui.PaletteRenderer.CSS_CLASS="goog-palette";goog.ui.PaletteRenderer.prototype.createDom=function(a){var b=this.getClassNames(a);return a.getDomHelper().createDom("div",b?b.join(" "):null,this.createGrid(a.getContent(),a.getSize(),a.getDomHelper()))};
goog.ui.PaletteRenderer.prototype.createGrid=function(a,b,c){for(var d=[],e=0,f=0;e<b.height;e++){for(var g=[],h=0;h<b.width;h++){var j=a&&a[f++];g.push(this.createCell(j,c))}d.push(this.createRow(g,c))}return this.createTable(d,c)};goog.ui.PaletteRenderer.prototype.createTable=function(a,b){var c=b.createDom("table",this.getCssClass()+"-table",b.createDom("tbody",this.getCssClass()+"-body",a));c.cellSpacing=0;c.cellPadding=0;goog.dom.a11y.setRole(c,"grid");return c};
goog.ui.PaletteRenderer.prototype.createRow=function(a,b){return b.createDom("tr",this.getCssClass()+"-row",a)};goog.ui.PaletteRenderer.prototype.createCell=function(a,b){var c=b.createDom("td",{"class":this.getCssClass()+"-cell",id:this.getCssClass()+"-cell-"+goog.ui.PaletteRenderer.cellId_++},a);goog.dom.a11y.setRole(c,"gridcell");return c};goog.ui.PaletteRenderer.prototype.canDecorate=function(){return!1};goog.ui.PaletteRenderer.prototype.decorate=function(){return null};
goog.ui.PaletteRenderer.prototype.setContent=function(a,b){if(a){var c=goog.dom.getElementsByTagNameAndClass("tbody",this.getCssClass()+"-body",a)[0];if(c){var d=0;goog.array.forEach(c.rows,function(a){goog.array.forEach(a.cells,function(a){goog.dom.removeChildren(a);if(b){var c=b[d++];c&&goog.dom.appendChild(a,c)}})});if(d<b.length){for(var e=[],f=goog.dom.getDomHelper(a),g=c.rows[0].cells.length;d<b.length;){var h=b[d++];e.push(this.createCell(h,f));e.length==g&&(h=this.createRow(e,f),goog.dom.appendChild(c,
h),e.length=0)}if(0<e.length){for(;e.length<g;)e.push(this.createCell("",f));h=this.createRow(e,f);goog.dom.appendChild(c,h)}}}goog.style.setUnselectable(a,!0,goog.userAgent.GECKO)}};goog.ui.PaletteRenderer.prototype.getContainingItem=function(a,b){for(var c=a.getElement();b&&b.nodeType==goog.dom.NodeType.ELEMENT&&b!=c;){if("TD"==b.tagName&&goog.dom.classes.has(b,this.getCssClass()+"-cell"))return b.firstChild;b=b.parentNode}return null};
goog.ui.PaletteRenderer.prototype.highlightCell=function(a,b,c){b&&(b=b.parentNode,goog.dom.classes.enable(b,this.getCssClass()+"-cell-hover",c),a=a.getElement().firstChild,goog.dom.a11y.setState(a,"activedescendent",b.id))};goog.ui.PaletteRenderer.prototype.selectCell=function(a,b,c){b&&goog.dom.classes.enable(b.parentNode,this.getCssClass()+"-cell-selected",c)};goog.ui.PaletteRenderer.prototype.getCssClass=function(){return goog.ui.PaletteRenderer.CSS_CLASS};goog.ui.SelectionModel=function(a){goog.events.EventTarget.call(this);this.items_=[];this.addItems(a)};goog.inherits(goog.ui.SelectionModel,goog.events.EventTarget);goog.ui.SelectionModel.prototype.selectedItem_=null;goog.ui.SelectionModel.prototype.selectionHandler_=null;goog.ui.SelectionModel.prototype.getSelectionHandler=function(){return this.selectionHandler_};goog.ui.SelectionModel.prototype.setSelectionHandler=function(a){this.selectionHandler_=a};
goog.ui.SelectionModel.prototype.getItemCount=function(){return this.items_.length};goog.ui.SelectionModel.prototype.indexOfItem=function(a){return a?goog.array.indexOf(this.items_,a):-1};goog.ui.SelectionModel.prototype.getFirst=function(){return this.items_[0]};goog.ui.SelectionModel.prototype.getLast=function(){return this.items_[this.items_.length-1]};goog.ui.SelectionModel.prototype.getItemAt=function(a){return this.items_[a]||null};
goog.ui.SelectionModel.prototype.addItems=function(a){a&&(goog.array.forEach(a,function(a){this.selectItem_(a,!1)},this),goog.array.extend(this.items_,a))};goog.ui.SelectionModel.prototype.addItem=function(a){this.addItemAt(a,this.getItemCount())};goog.ui.SelectionModel.prototype.addItemAt=function(a,b){a&&(this.selectItem_(a,!1),goog.array.insertAt(this.items_,a,b))};
goog.ui.SelectionModel.prototype.removeItem=function(a){a&&goog.array.remove(this.items_,a)&&a==this.selectedItem_&&(this.selectedItem_=null,this.dispatchEvent(goog.events.EventType.SELECT))};goog.ui.SelectionModel.prototype.removeItemAt=function(a){this.removeItem(this.getItemAt(a))};goog.ui.SelectionModel.prototype.getSelectedItem=function(){return this.selectedItem_};goog.ui.SelectionModel.prototype.getItems=function(){return goog.array.clone(this.items_)};
goog.ui.SelectionModel.prototype.setSelectedItem=function(a){a!=this.selectedItem_&&(this.selectItem_(this.selectedItem_,!1),this.selectedItem_=a,this.selectItem_(a,!0));this.dispatchEvent(goog.events.EventType.SELECT)};goog.ui.SelectionModel.prototype.getSelectedIndex=function(){return this.indexOfItem(this.selectedItem_)};goog.ui.SelectionModel.prototype.setSelectedIndex=function(a){this.setSelectedItem(this.getItemAt(a))};
goog.ui.SelectionModel.prototype.clear=function(){goog.array.clear(this.items_);this.selectedItem_=null};goog.ui.SelectionModel.prototype.disposeInternal=function(){goog.ui.SelectionModel.superClass_.disposeInternal.call(this);delete this.items_;this.selectedItem_=null};goog.ui.SelectionModel.prototype.selectItem_=function(a,b){a&&("function"==typeof this.selectionHandler_?this.selectionHandler_(a,b):"function"==typeof a.setSelected&&a.setSelected(b))};goog.ui.Palette=function(a,b,c){goog.ui.Control.call(this,a,b||goog.ui.PaletteRenderer.getInstance(),c);this.setAutoStates(goog.ui.Component.State.CHECKED|goog.ui.Component.State.SELECTED|goog.ui.Component.State.OPENED,!1)};goog.inherits(goog.ui.Palette,goog.ui.Control);goog.ui.Palette.prototype.size_=null;goog.ui.Palette.prototype.highlightedIndex_=-1;goog.ui.Palette.prototype.selectionModel_=null;
goog.ui.Palette.prototype.disposeInternal=function(){goog.ui.Palette.superClass_.disposeInternal.call(this);this.selectionModel_&&(this.selectionModel_.dispose(),this.selectionModel_=null);this.size_=null};
goog.ui.Palette.prototype.setContentInternal=function(a){goog.ui.Palette.superClass_.setContentInternal.call(this,a);this.adjustSize_();this.selectionModel_?(this.selectionModel_.clear(),this.selectionModel_.addItems(a)):(this.selectionModel_=new goog.ui.SelectionModel(a),this.selectionModel_.setSelectionHandler(goog.bind(this.selectItem_,this)),this.getHandler().listen(this.selectionModel_,goog.events.EventType.SELECT,this.handleSelectionChange));this.highlightedIndex_=-1};
goog.ui.Palette.prototype.getCaption=function(){return""};goog.ui.Palette.prototype.setCaption=function(){};goog.ui.Palette.prototype.handleMouseOver=function(a){goog.ui.Palette.superClass_.handleMouseOver.call(this,a);var b=this.getRenderer().getContainingItem(this,a.target);(!b||!a.relatedTarget||!goog.dom.contains(b,a.relatedTarget))&&b!=this.getHighlightedItem()&&this.setHighlightedItem(b)};
goog.ui.Palette.prototype.handleMouseOut=function(a){goog.ui.Palette.superClass_.handleMouseOut.call(this,a);var b=this.getRenderer().getContainingItem(this,a.target);(!b||!a.relatedTarget||!goog.dom.contains(b,a.relatedTarget))&&b==this.getHighlightedItem()&&this.getRenderer().highlightCell(this,b,!1)};
goog.ui.Palette.prototype.handleMouseDown=function(a){goog.ui.Palette.superClass_.handleMouseDown.call(this,a);this.isActive()&&(a=this.getRenderer().getContainingItem(this,a.target),a!=this.getHighlightedItem()&&this.setHighlightedItem(a))};goog.ui.Palette.prototype.performActionInternal=function(a){var b=this.getHighlightedItem();return b?(this.setSelectedItem(b),goog.ui.Palette.superClass_.performActionInternal.call(this,a)):!1};
goog.ui.Palette.prototype.handleKeyEvent=function(a){var b=this.getContent(),b=b?b.length:0,c=this.size_.width;if(0==b||!this.isEnabled())return!1;if(a.keyCode==goog.events.KeyCodes.ENTER||a.keyCode==goog.events.KeyCodes.SPACE)return this.performActionInternal(a);if(a.keyCode==goog.events.KeyCodes.HOME)return this.setHighlightedIndex(0),!0;if(a.keyCode==goog.events.KeyCodes.END)return this.setHighlightedIndex(b-1),!0;var d=0>this.highlightedIndex_?this.getSelectedIndex():this.highlightedIndex_;switch(a.keyCode){case goog.events.KeyCodes.LEFT:-1==
d&&(d=b);if(0<d)return this.setHighlightedIndex(d-1),a.preventDefault(),!0;break;case goog.events.KeyCodes.RIGHT:if(d<b-1)return this.setHighlightedIndex(d+1),a.preventDefault(),!0;break;case goog.events.KeyCodes.UP:-1==d&&(d=b+c-1);if(d>=c)return this.setHighlightedIndex(d-c),a.preventDefault(),!0;break;case goog.events.KeyCodes.DOWN:if(-1==d&&(d=-c),d<b-c)return this.setHighlightedIndex(d+c),a.preventDefault(),!0}return!1};goog.ui.Palette.prototype.handleSelectionChange=function(){};
goog.ui.Palette.prototype.getSize=function(){return this.size_};goog.ui.Palette.prototype.setSize=function(a,b){if(this.getElement())throw Error(goog.ui.Component.Error.ALREADY_RENDERED);this.size_=goog.isNumber(a)?new goog.math.Size(a,b):a;this.adjustSize_()};goog.ui.Palette.prototype.getHighlightedIndex=function(){return this.highlightedIndex_};goog.ui.Palette.prototype.getHighlightedItem=function(){var a=this.getContent();return a&&a[this.highlightedIndex_]};
goog.ui.Palette.prototype.setHighlightedIndex=function(a){a!=this.highlightedIndex_&&(this.highlightIndex_(this.highlightedIndex_,!1),this.highlightedIndex_=a,this.highlightIndex_(a,!0))};goog.ui.Palette.prototype.setHighlightedItem=function(a){var b=this.getContent();this.setHighlightedIndex(b?goog.array.indexOf(b,a):-1)};goog.ui.Palette.prototype.getSelectedIndex=function(){return this.selectionModel_?this.selectionModel_.getSelectedIndex():-1};
goog.ui.Palette.prototype.getSelectedItem=function(){return this.selectionModel_?this.selectionModel_.getSelectedItem():null};goog.ui.Palette.prototype.setSelectedIndex=function(a){this.selectionModel_&&this.selectionModel_.setSelectedIndex(a)};goog.ui.Palette.prototype.setSelectedItem=function(a){this.selectionModel_&&this.selectionModel_.setSelectedItem(a)};
goog.ui.Palette.prototype.highlightIndex_=function(a,b){if(this.getElement()){var c=this.getContent();c&&(0<=a&&a<c.length)&&this.getRenderer().highlightCell(this,c[a],b)}};goog.ui.Palette.prototype.selectItem_=function(a,b){this.getElement()&&this.getRenderer().selectCell(this,a,b)};
goog.ui.Palette.prototype.adjustSize_=function(){var a=this.getContent();if(a)if(this.size_&&this.size_.width){if(a=Math.ceil(a.length/this.size_.width),!goog.isNumber(this.size_.height)||this.size_.height<a)this.size_.height=a}else a=Math.ceil(Math.sqrt(a.length)),this.size_=new goog.math.Size(a,a);else this.size_=new goog.math.Size(0,0)};goog.ui.ColorPalette=function(a,b,c){this.colors_=a||[];goog.ui.Palette.call(this,null,b||goog.ui.PaletteRenderer.getInstance(),c);this.setColors(this.colors_)};goog.inherits(goog.ui.ColorPalette,goog.ui.Palette);goog.ui.ColorPalette.prototype.normalizedColors_=null;goog.ui.ColorPalette.prototype.getColors=function(){return this.colors_};goog.ui.ColorPalette.prototype.setColors=function(a){this.colors_=a;this.normalizedColors_=null;this.setContent(this.createColorNodes())};
goog.ui.ColorPalette.prototype.getSelectedColor=function(){var a=this.getSelectedItem();return a?(a=goog.style.getStyle(a,"background-color"),goog.ui.ColorPalette.parseColor_(a)):null};goog.ui.ColorPalette.prototype.setSelectedColor=function(a){a=goog.ui.ColorPalette.parseColor_(a);this.normalizedColors_||(this.normalizedColors_=goog.array.map(this.colors_,function(a){return goog.ui.ColorPalette.parseColor_(a)}));this.setSelectedIndex(a?goog.array.indexOf(this.normalizedColors_,a):-1)};
goog.ui.ColorPalette.prototype.createColorNodes=function(){return goog.array.map(this.colors_,function(a){var b=this.getDomHelper().createDom("div",{"class":this.getRenderer().getCssClass()+"-colorswatch",style:"background-color:"+a});b.title="#"==a.charAt(0)?"RGB ("+goog.color.hexToRgb(a).join(", ")+")":a;return b},this)};goog.ui.ColorPalette.parseColor_=function(a){if(a)try{return goog.color.parse(a).hex}catch(b){}return null};goog.ui.ColorPicker=function(a,b){goog.ui.Component.call(this,a);this.colorPalette_=b||null;this.getHandler().listen(this,goog.ui.Component.EventType.ACTION,this.onColorPaletteAction_)};goog.inherits(goog.ui.ColorPicker,goog.ui.Component);goog.ui.ColorPicker.DEFAULT_NUM_COLS=5;goog.ui.ColorPicker.EventType={CHANGE:"change"};goog.ui.ColorPicker.prototype.focusable_=!0;goog.ui.ColorPicker.prototype.getColors=function(){return this.colorPalette_?this.colorPalette_.getColors():null};
goog.ui.ColorPicker.prototype.setColors=function(a){this.colorPalette_?this.colorPalette_.setColors(a):this.createColorPalette_(a)};goog.ui.ColorPicker.prototype.addColors=function(a){this.setColors(a)};goog.ui.ColorPicker.prototype.setSize=function(a){this.colorPalette_||this.createColorPalette_([]);this.colorPalette_.setSize(a)};goog.ui.ColorPicker.prototype.getSize=function(){return this.colorPalette_?this.colorPalette_.getSize():null};goog.ui.ColorPicker.prototype.setColumnCount=function(a){this.setSize(a)};
goog.ui.ColorPicker.prototype.getSelectedIndex=function(){return this.colorPalette_?this.colorPalette_.getSelectedIndex():-1};goog.ui.ColorPicker.prototype.setSelectedIndex=function(a){this.colorPalette_&&this.colorPalette_.setSelectedIndex(a)};goog.ui.ColorPicker.prototype.getSelectedColor=function(){return this.colorPalette_?this.colorPalette_.getSelectedColor():null};goog.ui.ColorPicker.prototype.setSelectedColor=function(a){this.colorPalette_&&this.colorPalette_.setSelectedColor(a)};
goog.ui.ColorPicker.prototype.isFocusable=function(){return this.focusable_};goog.ui.ColorPicker.prototype.setFocusable=function(a){this.focusable_=a;this.colorPalette_&&this.colorPalette_.setSupportedState(goog.ui.Component.State.FOCUSED,a)};goog.ui.ColorPicker.prototype.canDecorate=function(){return!1};
goog.ui.ColorPicker.prototype.enterDocument=function(){goog.ui.ColorPicker.superClass_.enterDocument.call(this);this.colorPalette_&&this.colorPalette_.render(this.getElement());this.getElement().unselectable="on"};goog.ui.ColorPicker.prototype.disposeInternal=function(){goog.ui.ColorPicker.superClass_.disposeInternal.call(this);this.colorPalette_&&(this.colorPalette_.dispose(),this.colorPalette_=null)};goog.ui.ColorPicker.prototype.focus=function(){this.colorPalette_&&this.colorPalette_.getElement().focus()};
goog.ui.ColorPicker.prototype.onColorPaletteAction_=function(a){a.stopPropagation();this.dispatchEvent(goog.ui.ColorPicker.EventType.CHANGE)};goog.ui.ColorPicker.prototype.createColorPalette_=function(a){a=new goog.ui.ColorPalette(a,null,this.getDomHelper());a.setSize(goog.ui.ColorPicker.DEFAULT_NUM_COLS);a.setSupportedState(goog.ui.Component.State.FOCUSED,this.focusable_);this.addChild(a);this.colorPalette_=a;this.isInDocument()&&this.colorPalette_.render(this.getElement())};
goog.ui.ColorPicker.createSimpleColorGrid=function(a){a=new goog.ui.ColorPicker(a);a.setSize(7);a.setColors(goog.ui.ColorPicker.SIMPLE_GRID_COLORS);return a};goog.ui.ColorPicker.SIMPLE_GRID_COLORS="#ffffff #cccccc #c0c0c0 #999999 #666666 #333333 #000000 #ffcccc #ff6666 #ff0000 #cc0000 #990000 #660000 #330000 #ffcc99 #ff9966 #ff9900 #ff6600 #cc6600 #993300 #663300 #ffff99 #ffff66 #ffcc66 #ffcc33 #cc9933 #996633 #663333 #ffffcc #ffff33 #ffff00 #ffcc00 #999900 #666600 #333300 #99ff99 #66ff99 #33ff33 #33cc00 #009900 #006600 #003300 #99ffff #33ffff #66cccc #00cccc #339999 #336666 #003333 #ccffff #66ffff #33ccff #3366ff #3333ff #000099 #000066 #ccccff #9999ff #6666cc #6633ff #6600cc #333399 #330099 #ffccff #ff99ff #cc66cc #cc33cc #993399 #663366 #330033".split(" ");goog.structs={};goog.structs.getCount=function(a){return"function"==typeof a.getCount?a.getCount():goog.isArrayLike(a)||goog.isString(a)?a.length:goog.object.getCount(a)};goog.structs.getValues=function(a){if("function"==typeof a.getValues)return a.getValues();if(goog.isString(a))return a.split("");if(goog.isArrayLike(a)){for(var b=[],c=a.length,d=0;d<c;d++)b.push(a[d]);return b}return goog.object.getValues(a)};
goog.structs.getKeys=function(a){if("function"==typeof a.getKeys)return a.getKeys();if("function"!=typeof a.getValues){if(goog.isArrayLike(a)||goog.isString(a)){var b=[];a=a.length;for(var c=0;c<a;c++)b.push(c);return b}return goog.object.getKeys(a)}};goog.structs.contains=function(a,b){return"function"==typeof a.contains?a.contains(b):"function"==typeof a.containsValue?a.containsValue(b):goog.isArrayLike(a)||goog.isString(a)?goog.array.contains(a,b):goog.object.containsValue(a,b)};
goog.structs.isEmpty=function(a){return"function"==typeof a.isEmpty?a.isEmpty():goog.isArrayLike(a)||goog.isString(a)?goog.array.isEmpty(a):goog.object.isEmpty(a)};goog.structs.clear=function(a){"function"==typeof a.clear?a.clear():goog.isArrayLike(a)?goog.array.clear(a):goog.object.clear(a)};
goog.structs.forEach=function(a,b,c){if("function"==typeof a.forEach)a.forEach(b,c);else if(goog.isArrayLike(a)||goog.isString(a))goog.array.forEach(a,b,c);else for(var d=goog.structs.getKeys(a),e=goog.structs.getValues(a),f=e.length,g=0;g<f;g++)b.call(c,e[g],d&&d[g],a)};
goog.structs.filter=function(a,b,c){if("function"==typeof a.filter)return a.filter(b,c);if(goog.isArrayLike(a)||goog.isString(a))return goog.array.filter(a,b,c);var d,e=goog.structs.getKeys(a),f=goog.structs.getValues(a),g=f.length;if(e){d={};for(var h=0;h<g;h++)b.call(c,f[h],e[h],a)&&(d[e[h]]=f[h])}else{d=[];for(h=0;h<g;h++)b.call(c,f[h],void 0,a)&&d.push(f[h])}return d};
goog.structs.map=function(a,b,c){if("function"==typeof a.map)return a.map(b,c);if(goog.isArrayLike(a)||goog.isString(a))return goog.array.map(a,b,c);var d,e=goog.structs.getKeys(a),f=goog.structs.getValues(a),g=f.length;if(e){d={};for(var h=0;h<g;h++)d[e[h]]=b.call(c,f[h],e[h],a)}else{d=[];for(h=0;h<g;h++)d[h]=b.call(c,f[h],void 0,a)}return d};
goog.structs.some=function(a,b,c){if("function"==typeof a.some)return a.some(b,c);if(goog.isArrayLike(a)||goog.isString(a))return goog.array.some(a,b,c);for(var d=goog.structs.getKeys(a),e=goog.structs.getValues(a),f=e.length,g=0;g<f;g++)if(b.call(c,e[g],d&&d[g],a))return!0;return!1};
goog.structs.every=function(a,b,c){if("function"==typeof a.every)return a.every(b,c);if(goog.isArrayLike(a)||goog.isString(a))return goog.array.every(a,b,c);for(var d=goog.structs.getKeys(a),e=goog.structs.getValues(a),f=e.length,g=0;g<f;g++)if(!b.call(c,e[g],d&&d[g],a))return!1;return!0};goog.structs.Collection=function(){};goog.iter={};goog.iter.StopIteration="StopIteration"in goog.global?goog.global.StopIteration:Error("StopIteration");goog.iter.Iterator=function(){};goog.iter.Iterator.prototype.next=function(){throw goog.iter.StopIteration;};goog.iter.Iterator.prototype.__iterator__=function(){return this};
goog.iter.toIterator=function(a){if(a instanceof goog.iter.Iterator)return a;if("function"==typeof a.__iterator__)return a.__iterator__(!1);if(goog.isArrayLike(a)){var b=0,c=new goog.iter.Iterator;c.next=function(){for(;;){if(b>=a.length)throw goog.iter.StopIteration;if(b in a)return a[b++];b++}};return c}throw Error("Not implemented");};
goog.iter.forEach=function(a,b,c){if(goog.isArrayLike(a))try{goog.array.forEach(a,b,c)}catch(d){if(d!==goog.iter.StopIteration)throw d;}else{a=goog.iter.toIterator(a);try{for(;;)b.call(c,a.next(),void 0,a)}catch(e){if(e!==goog.iter.StopIteration)throw e;}}};goog.iter.filter=function(a,b,c){var d=goog.iter.toIterator(a);a=new goog.iter.Iterator;a.next=function(){for(;;){var a=d.next();if(b.call(c,a,void 0,d))return a}};return a};
goog.iter.range=function(a,b,c){var d=0,e=a,f=c||1;1<arguments.length&&(d=a,e=b);if(0==f)throw Error("Range step argument must not be zero");var g=new goog.iter.Iterator;g.next=function(){if(0<f&&d>=e||0>f&&d<=e)throw goog.iter.StopIteration;var a=d;d+=f;return a};return g};goog.iter.join=function(a,b){return goog.iter.toArray(a).join(b)};goog.iter.map=function(a,b,c){var d=goog.iter.toIterator(a);a=new goog.iter.Iterator;a.next=function(){for(;;){var a=d.next();return b.call(c,a,void 0,d)}};return a};
goog.iter.reduce=function(a,b,c,d){var e=c;goog.iter.forEach(a,function(a){e=b.call(d,e,a)});return e};goog.iter.some=function(a,b,c){a=goog.iter.toIterator(a);try{for(;;)if(b.call(c,a.next(),void 0,a))return!0}catch(d){if(d!==goog.iter.StopIteration)throw d;}return!1};goog.iter.every=function(a,b,c){a=goog.iter.toIterator(a);try{for(;;)if(!b.call(c,a.next(),void 0,a))return!1}catch(d){if(d!==goog.iter.StopIteration)throw d;}return!0};
goog.iter.chain=function(a){var b=arguments,c=b.length,d=0,e=new goog.iter.Iterator;e.next=function(){try{if(d>=c)throw goog.iter.StopIteration;return goog.iter.toIterator(b[d]).next()}catch(a){if(a!==goog.iter.StopIteration||d>=c)throw a;d++;return this.next()}};return e};goog.iter.dropWhile=function(a,b,c){var d=goog.iter.toIterator(a);a=new goog.iter.Iterator;var e=!0;a.next=function(){for(;;){var a=d.next();if(!e||!b.call(c,a,void 0,d))return e=!1,a}};return a};
goog.iter.takeWhile=function(a,b,c){var d=goog.iter.toIterator(a);a=new goog.iter.Iterator;var e=!0;a.next=function(){for(;;)if(e){var a=d.next();if(b.call(c,a,void 0,d))return a;e=!1}else throw goog.iter.StopIteration;};return a};goog.iter.toArray=function(a){if(goog.isArrayLike(a))return goog.array.toArray(a);a=goog.iter.toIterator(a);var b=[];goog.iter.forEach(a,function(a){b.push(a)});return b};
goog.iter.equals=function(a,b){a=goog.iter.toIterator(a);b=goog.iter.toIterator(b);var c,d;try{for(;;){c=d=!1;var e=a.next();c=!0;var f=b.next();d=!0;if(e!=f)break}}catch(g){if(g!==goog.iter.StopIteration)throw g;if(c&&!d)return!1;if(!d)try{b.next()}catch(h){if(h!==goog.iter.StopIteration)throw h;return!0}}return!1};goog.iter.nextOrValue=function(a,b){try{return goog.iter.toIterator(a).next()}catch(c){if(c!=goog.iter.StopIteration)throw c;return b}};
goog.iter.product=function(a){if(goog.array.some(arguments,function(a){return!a.length})||!arguments.length)return new goog.iter.Iterator;var b=new goog.iter.Iterator,c=arguments,d=goog.array.repeat(0,c.length);b.next=function(){if(d){for(var a=goog.array.map(d,function(a,b){return c[b][a]}),b=d.length-1;0<=b;b--){goog.asserts.assert(d);if(d[b]<c[b].length-1){d[b]++;break}if(0==b){d=null;break}d[b]=0}return a}throw goog.iter.StopIteration;};return b};
goog.iter.cycle=function(a){var b=goog.iter.toIterator(a),c=[],d=0;a=new goog.iter.Iterator;var e=!1;a.next=function(){var a=null;if(!e)try{return a=b.next(),c.push(a),a}catch(g){if(g!=goog.iter.StopIteration||goog.array.isEmpty(c))throw g;e=!0}a=c[d];d=(d+1)%c.length;return a};return a};goog.structs.Map=function(a,b){this.map_={};this.keys_=[];var c=arguments.length;if(1<c){if(c%2)throw Error("Uneven number of arguments");for(var d=0;d<c;d+=2)this.set(arguments[d],arguments[d+1])}else a&&this.addAll(a)};goog.structs.Map.prototype.count_=0;goog.structs.Map.prototype.version_=0;goog.structs.Map.prototype.getCount=function(){return this.count_};
goog.structs.Map.prototype.getValues=function(){this.cleanupKeysArray_();for(var a=[],b=0;b<this.keys_.length;b++)a.push(this.map_[this.keys_[b]]);return a};goog.structs.Map.prototype.getKeys=function(){this.cleanupKeysArray_();return this.keys_.concat()};goog.structs.Map.prototype.containsKey=function(a){return goog.structs.Map.hasKey_(this.map_,a)};
goog.structs.Map.prototype.containsValue=function(a){for(var b=0;b<this.keys_.length;b++){var c=this.keys_[b];if(goog.structs.Map.hasKey_(this.map_,c)&&this.map_[c]==a)return!0}return!1};goog.structs.Map.prototype.equals=function(a,b){if(this===a)return!0;if(this.count_!=a.getCount())return!1;var c=b||goog.structs.Map.defaultEquals;this.cleanupKeysArray_();for(var d,e=0;d=this.keys_[e];e++)if(!c(this.get(d),a.get(d)))return!1;return!0};goog.structs.Map.defaultEquals=function(a,b){return a===b};
goog.structs.Map.prototype.isEmpty=function(){return 0==this.count_};goog.structs.Map.prototype.clear=function(){this.map_={};this.version_=this.count_=this.keys_.length=0};goog.structs.Map.prototype.remove=function(a){return goog.structs.Map.hasKey_(this.map_,a)?(delete this.map_[a],this.count_--,this.version_++,this.keys_.length>2*this.count_&&this.cleanupKeysArray_(),!0):!1};
goog.structs.Map.prototype.cleanupKeysArray_=function(){if(this.count_!=this.keys_.length){for(var a=0,b=0;a<this.keys_.length;){var c=this.keys_[a];goog.structs.Map.hasKey_(this.map_,c)&&(this.keys_[b++]=c);a++}this.keys_.length=b}if(this.count_!=this.keys_.length){for(var d={},b=a=0;a<this.keys_.length;)c=this.keys_[a],goog.structs.Map.hasKey_(d,c)||(this.keys_[b++]=c,d[c]=1),a++;this.keys_.length=b}};
goog.structs.Map.prototype.get=function(a,b){return goog.structs.Map.hasKey_(this.map_,a)?this.map_[a]:b};goog.structs.Map.prototype.set=function(a,b){goog.structs.Map.hasKey_(this.map_,a)||(this.count_++,this.keys_.push(a),this.version_++);this.map_[a]=b};goog.structs.Map.prototype.addAll=function(a){var b;a instanceof goog.structs.Map?(b=a.getKeys(),a=a.getValues()):(b=goog.object.getKeys(a),a=goog.object.getValues(a));for(var c=0;c<b.length;c++)this.set(b[c],a[c])};
goog.structs.Map.prototype.clone=function(){return new goog.structs.Map(this)};goog.structs.Map.prototype.transpose=function(){for(var a=new goog.structs.Map,b=0;b<this.keys_.length;b++){var c=this.keys_[b];a.set(this.map_[c],c)}return a};goog.structs.Map.prototype.toObject=function(){this.cleanupKeysArray_();for(var a={},b=0;b<this.keys_.length;b++){var c=this.keys_[b];a[c]=this.map_[c]}return a};goog.structs.Map.prototype.getKeyIterator=function(){return this.__iterator__(!0)};
goog.structs.Map.prototype.getValueIterator=function(){return this.__iterator__(!1)};goog.structs.Map.prototype.__iterator__=function(a){this.cleanupKeysArray_();var b=0,c=this.keys_,d=this.map_,e=this.version_,f=this,g=new goog.iter.Iterator;g.next=function(){for(;;){if(e!=f.version_)throw Error("The map has changed since the iterator was created");if(b>=c.length)throw goog.iter.StopIteration;var g=c[b++];return a?g:d[g]}};return g};
goog.structs.Map.hasKey_=function(a,b){return Object.prototype.hasOwnProperty.call(a,b)};goog.structs.Set=function(a){this.map_=new goog.structs.Map;a&&this.addAll(a)};goog.structs.Set.getKey_=function(a){var b=typeof a;return"object"==b&&a||"function"==b?"o"+goog.getUid(a):b.substr(0,1)+a};goog.structs.Set.prototype.getCount=function(){return this.map_.getCount()};goog.structs.Set.prototype.add=function(a){this.map_.set(goog.structs.Set.getKey_(a),a)};goog.structs.Set.prototype.addAll=function(a){a=goog.structs.getValues(a);for(var b=a.length,c=0;c<b;c++)this.add(a[c])};
goog.structs.Set.prototype.removeAll=function(a){a=goog.structs.getValues(a);for(var b=a.length,c=0;c<b;c++)this.remove(a[c])};goog.structs.Set.prototype.remove=function(a){return this.map_.remove(goog.structs.Set.getKey_(a))};goog.structs.Set.prototype.clear=function(){this.map_.clear()};goog.structs.Set.prototype.isEmpty=function(){return this.map_.isEmpty()};goog.structs.Set.prototype.contains=function(a){return this.map_.containsKey(goog.structs.Set.getKey_(a))};
goog.structs.Set.prototype.containsAll=function(a){return goog.structs.every(a,this.contains,this)};goog.structs.Set.prototype.intersection=function(a){var b=new goog.structs.Set;a=goog.structs.getValues(a);for(var c=0;c<a.length;c++){var d=a[c];this.contains(d)&&b.add(d)}return b};goog.structs.Set.prototype.difference=function(a){var b=this.clone();b.removeAll(a);return b};goog.structs.Set.prototype.getValues=function(){return this.map_.getValues()};goog.structs.Set.prototype.clone=function(){return new goog.structs.Set(this)};
goog.structs.Set.prototype.equals=function(a){return this.getCount()==goog.structs.getCount(a)&&this.isSubsetOf(a)};goog.structs.Set.prototype.isSubsetOf=function(a){var b=goog.structs.getCount(a);if(this.getCount()>b)return!1;!(a instanceof goog.structs.Set)&&5<b&&(a=new goog.structs.Set(a));return goog.structs.every(this,function(b){return goog.structs.contains(a,b)})};goog.structs.Set.prototype.__iterator__=function(){return this.map_.__iterator__(!1)};goog.debug.catchErrors=function(a,b,c){c=c||goog.global;var d=c.onerror,e=!!b;goog.userAgent.WEBKIT&&!goog.userAgent.isVersion("535.3")&&(e=!e);c.onerror=function(b,c,h){d&&d(b,c,h);a({message:b,fileName:c,line:h});return e}};goog.debug.expose=function(a,b){if("undefined"==typeof a)return"undefined";if(null==a)return"NULL";var c=[],d;for(d in a)if(b||!goog.isFunction(a[d])){var e=d+" = ";try{e+=a[d]}catch(f){e+="*** "+f+" ***"}c.push(e)}return c.join("\n")};
goog.debug.deepExpose=function(a,b){var c=new goog.structs.Set,d=[],e=function(a,g){var h=g+"  ";try{if(goog.isDef(a))if(goog.isNull(a))d.push("NULL");else if(goog.isString(a))d.push('"'+a.replace(/\n/g,"\n"+g)+'"');else if(goog.isFunction(a))d.push(String(a).replace(/\n/g,"\n"+g));else if(goog.isObject(a))if(c.contains(a))d.push("*** reference loop detected ***");else{c.add(a);d.push("{");for(var j in a)if(b||!goog.isFunction(a[j]))d.push("\n"),d.push(h),d.push(j+" = "),e(a[j],h);d.push("\n"+g+"}")}else d.push(a);
else d.push("undefined")}catch(k){d.push("*** "+k+" ***")}};e(a,"");return d.join("")};goog.debug.exposeArray=function(a){for(var b=[],c=0;c<a.length;c++)goog.isArray(a[c])?b.push(goog.debug.exposeArray(a[c])):b.push(a[c]);return"[ "+b.join(", ")+" ]"};
goog.debug.exposeException=function(a,b){try{var c=goog.debug.normalizeErrorObject(a);return"Message: "+goog.string.htmlEscape(c.message)+'\nUrl: <a href="view-source:'+c.fileName+'" target="_new">'+c.fileName+"</a>\nLine: "+c.lineNumber+"\n\nBrowser stack:\n"+goog.string.htmlEscape(c.stack+"-> ")+"[end]\n\nJS stack traversal:\n"+goog.string.htmlEscape(goog.debug.getStacktrace(b)+"-> ")}catch(d){return"Exception trying to expose exception! You win, we lose. "+d}};
goog.debug.normalizeErrorObject=function(a){var b=goog.getObjectByName("window.location.href");if(goog.isString(a))return{message:a,name:"Unknown error",lineNumber:"Not available",fileName:b,stack:"Not available"};var c,d,e=!1;try{c=a.lineNumber||a.line||"Not available"}catch(f){c="Not available",e=!0}try{d=a.fileName||a.filename||a.sourceURL||b}catch(g){d="Not available",e=!0}return e||!a.lineNumber||!a.fileName||!a.stack?{message:a.message,name:a.name,lineNumber:c,fileName:d,stack:a.stack||"Not available"}:
a};goog.debug.enhanceError=function(a,b){var c="string"==typeof a?Error(a):a;c.stack||(c.stack=goog.debug.getStacktrace(arguments.callee.caller));if(b){for(var d=0;c["message"+d];)++d;c["message"+d]=String(b)}return c};
goog.debug.getStacktraceSimple=function(a){for(var b=[],c=arguments.callee.caller,d=0;c&&(!a||d<a);){b.push(goog.debug.getFunctionName(c));b.push("()\n");try{c=c.caller}catch(e){b.push("[exception trying to get caller]\n");break}d++;if(d>=goog.debug.MAX_STACK_DEPTH){b.push("[...long stack...]");break}}a&&d>=a?b.push("[...reached max depth limit...]"):b.push("[end]");return b.join("")};goog.debug.MAX_STACK_DEPTH=50;
goog.debug.getStacktrace=function(a){return goog.debug.getStacktraceHelper_(a||arguments.callee.caller,[])};
goog.debug.getStacktraceHelper_=function(a,b){var c=[];if(goog.array.contains(b,a))c.push("[...circular reference...]");else if(a&&b.length<goog.debug.MAX_STACK_DEPTH){c.push(goog.debug.getFunctionName(a)+"(");for(var d=a.arguments,e=0;e<d.length;e++){0<e&&c.push(", ");var f;f=d[e];switch(typeof f){case "object":f=f?"object":"null";break;case "string":break;case "number":f=String(f);break;case "boolean":f=f?"true":"false";break;case "function":f=(f=goog.debug.getFunctionName(f))?f:"[fn]";break;default:f=
typeof f}40<f.length&&(f=f.substr(0,40)+"...");c.push(f)}b.push(a);c.push(")\n");try{c.push(goog.debug.getStacktraceHelper_(a.caller,b))}catch(g){c.push("[exception trying to get caller]\n")}}else a?c.push("[...long stack...]"):c.push("[end]");return c.join("")};goog.debug.setFunctionResolver=function(a){goog.debug.fnNameResolver_=a};
goog.debug.getFunctionName=function(a){if(goog.debug.fnNameCache_[a])return goog.debug.fnNameCache_[a];if(goog.debug.fnNameResolver_){var b=goog.debug.fnNameResolver_(a);if(b)return goog.debug.fnNameCache_[a]=b}a=String(a);goog.debug.fnNameCache_[a]||(b=/function ([^\(]+)/.exec(a),goog.debug.fnNameCache_[a]=b?b[1]:"[Anonymous]");return goog.debug.fnNameCache_[a]};
goog.debug.makeWhitespaceVisible=function(a){return a.replace(/ /g,"[_]").replace(/\f/g,"[f]").replace(/\n/g,"[n]\n").replace(/\r/g,"[r]").replace(/\t/g,"[t]")};goog.debug.fnNameCache_={};goog.debug.LogRecord=function(a,b,c,d,e){this.reset(a,b,c,d,e)};goog.debug.LogRecord.prototype.sequenceNumber_=0;goog.debug.LogRecord.prototype.exception_=null;goog.debug.LogRecord.prototype.exceptionText_=null;goog.debug.LogRecord.ENABLE_SEQUENCE_NUMBERS=!0;goog.debug.LogRecord.nextSequenceNumber_=0;
goog.debug.LogRecord.prototype.reset=function(a,b,c,d,e){goog.debug.LogRecord.ENABLE_SEQUENCE_NUMBERS&&(this.sequenceNumber_="number"==typeof e?e:goog.debug.LogRecord.nextSequenceNumber_++);this.time_=d||goog.now();this.level_=a;this.msg_=b;this.loggerName_=c;delete this.exception_;delete this.exceptionText_};goog.debug.LogRecord.prototype.getLoggerName=function(){return this.loggerName_};goog.debug.LogRecord.prototype.getException=function(){return this.exception_};
goog.debug.LogRecord.prototype.setException=function(a){this.exception_=a};goog.debug.LogRecord.prototype.getExceptionText=function(){return this.exceptionText_};goog.debug.LogRecord.prototype.setExceptionText=function(a){this.exceptionText_=a};goog.debug.LogRecord.prototype.setLoggerName=function(a){this.loggerName_=a};goog.debug.LogRecord.prototype.getLevel=function(){return this.level_};goog.debug.LogRecord.prototype.setLevel=function(a){this.level_=a};
goog.debug.LogRecord.prototype.getMessage=function(){return this.msg_};goog.debug.LogRecord.prototype.setMessage=function(a){this.msg_=a};goog.debug.LogRecord.prototype.getMillis=function(){return this.time_};goog.debug.LogRecord.prototype.setMillis=function(a){this.time_=a};goog.debug.LogRecord.prototype.getSequenceNumber=function(){return this.sequenceNumber_};goog.debug.LogBuffer=function(){goog.asserts.assert(goog.debug.LogBuffer.isBufferingEnabled(),"Cannot use goog.debug.LogBuffer without defining goog.debug.LogBuffer.CAPACITY.");this.clear()};goog.debug.LogBuffer.getInstance=function(){goog.debug.LogBuffer.instance_||(goog.debug.LogBuffer.instance_=new goog.debug.LogBuffer);return goog.debug.LogBuffer.instance_};goog.debug.LogBuffer.CAPACITY=0;
goog.debug.LogBuffer.prototype.addRecord=function(a,b,c){var d=(this.curIndex_+1)%goog.debug.LogBuffer.CAPACITY;this.curIndex_=d;if(this.isFull_)return d=this.buffer_[d],d.reset(a,b,c),d;this.isFull_=d==goog.debug.LogBuffer.CAPACITY-1;return this.buffer_[d]=new goog.debug.LogRecord(a,b,c)};goog.debug.LogBuffer.isBufferingEnabled=function(){return 0<goog.debug.LogBuffer.CAPACITY};
goog.debug.LogBuffer.prototype.clear=function(){this.buffer_=Array(goog.debug.LogBuffer.CAPACITY);this.curIndex_=-1;this.isFull_=!1};goog.debug.LogBuffer.prototype.forEachRecord=function(a){var b=this.buffer_;if(b[0]){var c=this.curIndex_,d=this.isFull_?c:-1;do d=(d+1)%goog.debug.LogBuffer.CAPACITY,a(b[d]);while(d!=c)}};goog.debug.Logger=function(a){this.name_=a};goog.debug.Logger.prototype.parent_=null;goog.debug.Logger.prototype.level_=null;goog.debug.Logger.prototype.children_=null;goog.debug.Logger.prototype.handlers_=null;goog.debug.Logger.ENABLE_HIERARCHY=!0;goog.debug.Logger.ENABLE_HIERARCHY||(goog.debug.Logger.rootHandlers_=[]);goog.debug.Logger.Level=function(a,b){this.name=a;this.value=b};goog.debug.Logger.Level.prototype.toString=function(){return this.name};
goog.debug.Logger.Level.OFF=new goog.debug.Logger.Level("OFF",Infinity);goog.debug.Logger.Level.SHOUT=new goog.debug.Logger.Level("SHOUT",1200);goog.debug.Logger.Level.SEVERE=new goog.debug.Logger.Level("SEVERE",1E3);goog.debug.Logger.Level.WARNING=new goog.debug.Logger.Level("WARNING",900);goog.debug.Logger.Level.INFO=new goog.debug.Logger.Level("INFO",800);goog.debug.Logger.Level.CONFIG=new goog.debug.Logger.Level("CONFIG",700);goog.debug.Logger.Level.FINE=new goog.debug.Logger.Level("FINE",500);
goog.debug.Logger.Level.FINER=new goog.debug.Logger.Level("FINER",400);goog.debug.Logger.Level.FINEST=new goog.debug.Logger.Level("FINEST",300);goog.debug.Logger.Level.ALL=new goog.debug.Logger.Level("ALL",0);
goog.debug.Logger.Level.PREDEFINED_LEVELS=[goog.debug.Logger.Level.OFF,goog.debug.Logger.Level.SHOUT,goog.debug.Logger.Level.SEVERE,goog.debug.Logger.Level.WARNING,goog.debug.Logger.Level.INFO,goog.debug.Logger.Level.CONFIG,goog.debug.Logger.Level.FINE,goog.debug.Logger.Level.FINER,goog.debug.Logger.Level.FINEST,goog.debug.Logger.Level.ALL];goog.debug.Logger.Level.predefinedLevelsCache_=null;
goog.debug.Logger.Level.createPredefinedLevelsCache_=function(){goog.debug.Logger.Level.predefinedLevelsCache_={};for(var a=0,b;b=goog.debug.Logger.Level.PREDEFINED_LEVELS[a];a++)goog.debug.Logger.Level.predefinedLevelsCache_[b.value]=b,goog.debug.Logger.Level.predefinedLevelsCache_[b.name]=b};
goog.debug.Logger.Level.getPredefinedLevel=function(a){goog.debug.Logger.Level.predefinedLevelsCache_||goog.debug.Logger.Level.createPredefinedLevelsCache_();return goog.debug.Logger.Level.predefinedLevelsCache_[a]||null};
goog.debug.Logger.Level.getPredefinedLevelByValue=function(a){goog.debug.Logger.Level.predefinedLevelsCache_||goog.debug.Logger.Level.createPredefinedLevelsCache_();if(a in goog.debug.Logger.Level.predefinedLevelsCache_)return goog.debug.Logger.Level.predefinedLevelsCache_[a];for(var b=0;b<goog.debug.Logger.Level.PREDEFINED_LEVELS.length;++b){var c=goog.debug.Logger.Level.PREDEFINED_LEVELS[b];if(c.value<=a)return c}return null};goog.debug.Logger.getLogger=function(a){return goog.debug.LogManager.getLogger(a)};
goog.debug.Logger.logToProfilers=function(a){goog.global.console&&(goog.global.console.timeStamp?goog.global.console.timeStamp(a):goog.global.console.markTimeline&&goog.global.console.markTimeline(a));goog.global.msWriteProfilerMark&&goog.global.msWriteProfilerMark(a)};goog.debug.Logger.prototype.getName=function(){return this.name_};
goog.debug.Logger.prototype.addHandler=function(a){goog.debug.Logger.ENABLE_HIERARCHY?(this.handlers_||(this.handlers_=[]),this.handlers_.push(a)):(goog.asserts.assert(!this.name_,"Cannot call addHandler on a non-root logger when goog.debug.Logger.ENABLE_HIERARCHY is false."),goog.debug.Logger.rootHandlers_.push(a))};goog.debug.Logger.prototype.removeHandler=function(a){var b=goog.debug.Logger.ENABLE_HIERARCHY?this.handlers_:goog.debug.Logger.rootHandlers_;return!!b&&goog.array.remove(b,a)};
goog.debug.Logger.prototype.getParent=function(){return this.parent_};goog.debug.Logger.prototype.getChildren=function(){this.children_||(this.children_={});return this.children_};goog.debug.Logger.prototype.setLevel=function(a){goog.debug.Logger.ENABLE_HIERARCHY?this.level_=a:(goog.asserts.assert(!this.name_,"Cannot call setLevel() on a non-root logger when goog.debug.Logger.ENABLE_HIERARCHY is false."),goog.debug.Logger.rootLevel_=a)};goog.debug.Logger.prototype.getLevel=function(){return this.level_};
goog.debug.Logger.prototype.getEffectiveLevel=function(){if(!goog.debug.Logger.ENABLE_HIERARCHY)return goog.debug.Logger.rootLevel_;if(this.level_)return this.level_;if(this.parent_)return this.parent_.getEffectiveLevel();goog.asserts.fail("Root logger has no level set.");return null};goog.debug.Logger.prototype.isLoggable=function(a){return a.value>=this.getEffectiveLevel().value};goog.debug.Logger.prototype.log=function(a,b,c){this.isLoggable(a)&&this.doLogRecord_(this.getLogRecord(a,b,c))};
goog.debug.Logger.prototype.getLogRecord=function(a,b,c){var d=goog.debug.LogBuffer.isBufferingEnabled()?goog.debug.LogBuffer.getInstance().addRecord(a,b,this.name_):new goog.debug.LogRecord(a,String(b),this.name_);c&&(d.setException(c),d.setExceptionText(goog.debug.exposeException(c,arguments.callee.caller)));return d};goog.debug.Logger.prototype.shout=function(a,b){this.log(goog.debug.Logger.Level.SHOUT,a,b)};
goog.debug.Logger.prototype.severe=function(a,b){this.log(goog.debug.Logger.Level.SEVERE,a,b)};goog.debug.Logger.prototype.warning=function(a,b){this.log(goog.debug.Logger.Level.WARNING,a,b)};goog.debug.Logger.prototype.info=function(a,b){this.log(goog.debug.Logger.Level.INFO,a,b)};goog.debug.Logger.prototype.config=function(a,b){this.log(goog.debug.Logger.Level.CONFIG,a,b)};goog.debug.Logger.prototype.fine=function(a,b){this.log(goog.debug.Logger.Level.FINE,a,b)};
goog.debug.Logger.prototype.finer=function(a,b){this.log(goog.debug.Logger.Level.FINER,a,b)};goog.debug.Logger.prototype.finest=function(a,b){this.log(goog.debug.Logger.Level.FINEST,a,b)};goog.debug.Logger.prototype.logRecord=function(a){this.isLoggable(a.getLevel())&&this.doLogRecord_(a)};
goog.debug.Logger.prototype.doLogRecord_=function(a){goog.debug.Logger.logToProfilers("log:"+a.getMessage());if(goog.debug.Logger.ENABLE_HIERARCHY)for(var b=this;b;)b.callPublish_(a),b=b.getParent();else for(var b=0,c;c=goog.debug.Logger.rootHandlers_[b++];)c(a)};goog.debug.Logger.prototype.callPublish_=function(a){if(this.handlers_)for(var b=0,c;c=this.handlers_[b];b++)c(a)};goog.debug.Logger.prototype.setParent_=function(a){this.parent_=a};
goog.debug.Logger.prototype.addChild_=function(a,b){this.getChildren()[a]=b};goog.debug.LogManager={};goog.debug.LogManager.loggers_={};goog.debug.LogManager.rootLogger_=null;goog.debug.LogManager.initialize=function(){goog.debug.LogManager.rootLogger_||(goog.debug.LogManager.rootLogger_=new goog.debug.Logger(""),goog.debug.LogManager.loggers_[""]=goog.debug.LogManager.rootLogger_,goog.debug.LogManager.rootLogger_.setLevel(goog.debug.Logger.Level.CONFIG))};goog.debug.LogManager.getLoggers=function(){return goog.debug.LogManager.loggers_};
goog.debug.LogManager.getRoot=function(){goog.debug.LogManager.initialize();return goog.debug.LogManager.rootLogger_};goog.debug.LogManager.getLogger=function(a){goog.debug.LogManager.initialize();return goog.debug.LogManager.loggers_[a]||goog.debug.LogManager.createLogger_(a)};goog.debug.LogManager.createFunctionForCatchErrors=function(a){return function(b){(a||goog.debug.LogManager.getRoot()).severe("Error: "+b.message+" ("+b.fileName+" @ Line: "+b.line+")")}};
goog.debug.LogManager.createLogger_=function(a){var b=new goog.debug.Logger(a);if(goog.debug.Logger.ENABLE_HIERARCHY){var c=a.lastIndexOf("."),d=a.substr(0,c),c=a.substr(c+1),d=goog.debug.LogManager.getLogger(d);d.addChild_(c,b);b.setParent_(d)}return goog.debug.LogManager.loggers_[a]=b};goog.events.FocusHandler=function(a){goog.events.EventTarget.call(this);this.element_=a;a=goog.userAgent.IE?"focusout":"blur";this.listenKeyIn_=goog.events.listen(this.element_,goog.userAgent.IE?"focusin":"focus",this,!goog.userAgent.IE);this.listenKeyOut_=goog.events.listen(this.element_,a,this,!goog.userAgent.IE)};goog.inherits(goog.events.FocusHandler,goog.events.EventTarget);goog.events.FocusHandler.EventType={FOCUSIN:"focusin",FOCUSOUT:"focusout"};
goog.events.FocusHandler.prototype.handleEvent=function(a){var b=a.getBrowserEvent(),b=new goog.events.BrowserEvent(b);b.type="focusin"==a.type||"focus"==a.type?goog.events.FocusHandler.EventType.FOCUSIN:goog.events.FocusHandler.EventType.FOCUSOUT;this.dispatchEvent(b)};goog.events.FocusHandler.prototype.disposeInternal=function(){goog.events.FocusHandler.superClass_.disposeInternal.call(this);goog.events.unlistenByKey(this.listenKeyIn_);goog.events.unlistenByKey(this.listenKeyOut_);delete this.element_};goog.string.StringBuffer=function(a,b){null!=a&&this.append.apply(this,arguments)};goog.string.StringBuffer.prototype.buffer_="";goog.string.StringBuffer.prototype.set=function(a){this.buffer_=""+a};goog.string.StringBuffer.prototype.append=function(a,b,c){this.buffer_+=a;if(null!=b)for(var d=1;d<arguments.length;d++)this.buffer_+=arguments[d];return this};goog.string.StringBuffer.prototype.clear=function(){this.buffer_=""};goog.string.StringBuffer.prototype.getLength=function(){return this.buffer_.length};
goog.string.StringBuffer.prototype.toString=function(){return this.buffer_};goog.ui.tree={};goog.ui.tree.BaseNode=function(a,b,c){goog.ui.Component.call(this,c);this.config_=b||goog.ui.tree.TreeControl.defaultConfig;this.html_=a};goog.inherits(goog.ui.tree.BaseNode,goog.ui.Component);goog.ui.tree.BaseNode.EventType={BEFORE_EXPAND:"beforeexpand",EXPAND:"expand",BEFORE_COLLAPSE:"beforecollapse",COLLAPSE:"collapse"};goog.ui.tree.BaseNode.allNodes={};goog.ui.tree.BaseNode.prototype.selected_=!1;goog.ui.tree.BaseNode.prototype.expanded_=!1;
goog.ui.tree.BaseNode.prototype.toolTip_=null;goog.ui.tree.BaseNode.prototype.afterLabelHtml_="";goog.ui.tree.BaseNode.prototype.isUserCollapsible_=!0;goog.ui.tree.BaseNode.prototype.depth_=-1;goog.ui.tree.BaseNode.prototype.disposeInternal=function(){goog.ui.tree.BaseNode.superClass_.disposeInternal.call(this);this.tree_&&(this.tree_.removeNode(this),this.tree_=null);this.setElementInternal(null)};
goog.ui.tree.BaseNode.prototype.initAccessibility=function(){var a=this.getElement();if(a){var b=this.getLabelElement();b&&!b.id&&(b.id=this.getId()+".label");goog.dom.a11y.setRole(a,"treeitem");goog.dom.a11y.setState(a,"selected",!1);goog.dom.a11y.setState(a,"expanded",!1);goog.dom.a11y.setState(a,"level",this.getDepth());b&&goog.dom.a11y.setState(a,"labelledby",b.id);(a=this.getIconElement())&&goog.dom.a11y.setRole(a,"presentation");(a=this.getExpandIconElement())&&goog.dom.a11y.setRole(a,"presentation");
a=this.getChildrenElement();goog.dom.a11y.setRole(a,"group");if(a.hasChildNodes()){a=this.getChildCount();for(b=1;b<=a;b++){var c=this.getChildAt(b-1).getElement();goog.dom.a11y.setState(c,"setsize",a);goog.dom.a11y.setState(c,"posinset",b)}}}};goog.ui.tree.BaseNode.prototype.createDom=function(){var a=new goog.string.StringBuffer;this.toHtml(a);a=this.getDomHelper().htmlToDocumentFragment(a.toString());this.setElementInternal(a)};
goog.ui.tree.BaseNode.prototype.enterDocument=function(){goog.ui.tree.BaseNode.superClass_.enterDocument.call(this);goog.ui.tree.BaseNode.allNodes[this.getId()]=this;this.initAccessibility()};goog.ui.tree.BaseNode.prototype.exitDocument=function(){goog.ui.tree.BaseNode.superClass_.exitDocument.call(this);delete goog.ui.tree.BaseNode.allNodes[this.getId()]};
goog.ui.tree.BaseNode.prototype.addChildAt=function(a,b){goog.asserts.assert(!a.getParent());var c=this.getChildAt(b-1),d=this.getChildAt(b);goog.ui.tree.BaseNode.superClass_.addChildAt.call(this,a,b);a.previousSibling_=c;a.nextSibling_=d;c?c.nextSibling_=a:this.firstChild_=a;d?d.previousSibling_=a:this.lastChild_=a;var e=this.getTree();e&&a.setTreeInternal(e);a.setDepth_(this.getDepth()+1);if(this.getElement()&&(this.updateExpandIcon(),this.getExpanded())){e=this.getChildrenElement();a.getElement()||
a.createDom();var f=a.getElement(),g=d&&d.getElement();e.insertBefore(f,g);this.isInDocument()&&a.enterDocument();d||(c?c.updateExpandIcon():(goog.style.showElement(e,!0),this.setExpanded(this.getExpanded())))}};goog.ui.tree.BaseNode.prototype.add=function(a,b){goog.asserts.assert(!b||b.getParent()==this,"Can only add nodes before siblings");a.getParent()&&a.getParent().removeChild(a);this.addChildAt(a,b?this.indexOfChild(b):this.getChildCount());return a};
goog.ui.tree.BaseNode.prototype.removeChild=function(a){var b=this.getTree(),c=b?b.getSelectedItem():null;if(c==a||a.contains(c))b.hasFocus()?(this.select(),goog.Timer.callOnce(this.onTimeoutSelect_,10,this)):this.select();goog.ui.tree.BaseNode.superClass_.removeChild.call(this,a);this.lastChild_==a&&(this.lastChild_=a.previousSibling_);this.firstChild_==a&&(this.firstChild_=a.nextSibling_);a.previousSibling_&&(a.previousSibling_.nextSibling_=a.nextSibling_);a.nextSibling_&&(a.nextSibling_.previousSibling_=
a.previousSibling_);c=a.isLastSibling();a.tree_=null;a.depth_=-1;if(b&&(b.removeNode(this),this.isInDocument())){b=this.getChildrenElement();if(a.isInDocument()){var d=a.getElement();b.removeChild(d);a.exitDocument()}c&&(c=this.getLastChild())&&c.updateExpandIcon();this.hasChildren()||(b.style.display="none",this.updateExpandIcon(),this.updateIcon_())}return a};goog.ui.tree.BaseNode.prototype.remove=goog.ui.tree.BaseNode.prototype.removeChild;goog.ui.tree.BaseNode.prototype.onTimeoutSelect_=function(){this.select()};
goog.ui.tree.BaseNode.prototype.getDepth=function(){var a=this.depth_;0>a&&(a=this.computeDepth_(),this.setDepth_(a));return a};goog.ui.tree.BaseNode.prototype.computeDepth_=function(){var a=this.getParent();return a?a.getDepth()+1:0};goog.ui.tree.BaseNode.prototype.setDepth_=function(a){if(a!=this.depth_){this.depth_=a;var b=this.getRowElement();if(b){var c=this.getPixelIndent_()+"px";this.isRightToLeft()?b.style.paddingRight=c:b.style.paddingLeft=c}this.forEachChild(function(b){b.setDepth_(a+1)})}};
goog.ui.tree.BaseNode.prototype.contains=function(a){for(;a;){if(a==this)return!0;a=a.getParent()}return!1};goog.ui.tree.BaseNode.EMPTY_CHILDREN_=[];goog.ui.tree.BaseNode.prototype.getChildren=function(){var a=[];this.forEachChild(function(b){a.push(b)});return a};goog.ui.tree.BaseNode.prototype.getFirstChild=function(){return this.getChildAt(0)};goog.ui.tree.BaseNode.prototype.getLastChild=function(){return this.getChildAt(this.getChildCount()-1)};
goog.ui.tree.BaseNode.prototype.getPreviousSibling=function(){return this.previousSibling_};goog.ui.tree.BaseNode.prototype.getNextSibling=function(){return this.nextSibling_};goog.ui.tree.BaseNode.prototype.isLastSibling=function(){return!this.nextSibling_};goog.ui.tree.BaseNode.prototype.isSelected=function(){return this.selected_};goog.ui.tree.BaseNode.prototype.select=function(){var a=this.getTree();a&&a.setSelectedItem(this)};goog.ui.tree.BaseNode.prototype.deselect=goog.nullFunction;
goog.ui.tree.BaseNode.prototype.setSelectedInternal=function(a){if(this.selected_!=a){this.selected_=a;this.updateRow();var b=this.getElement();b&&(goog.dom.a11y.setState(b,"selected",a),a&&goog.dom.a11y.setState(this.getTree().getElement(),"activedescendant",this.getId()))}};goog.ui.tree.BaseNode.prototype.getExpanded=function(){return this.expanded_};goog.ui.tree.BaseNode.prototype.setExpandedInternal=function(a){this.expanded_=a};
goog.ui.tree.BaseNode.prototype.setExpanded=function(a){var b=a!=this.expanded_;if(!b||this.dispatchEvent(a?goog.ui.tree.BaseNode.EventType.BEFORE_EXPAND:goog.ui.tree.BaseNode.EventType.BEFORE_COLLAPSE)){var c;this.expanded_=a;c=this.getTree();var d=this.getElement();if(this.hasChildren()){if(!a&&(c&&this.contains(c.getSelectedItem()))&&this.select(),d){if(c=this.getChildrenElement())if(goog.style.showElement(c,a),a&&this.isInDocument()&&!c.hasChildNodes()){var e=new goog.string.StringBuffer;this.forEachChild(function(a){a.toHtml(e)});
c.innerHTML=e.toString();this.forEachChild(function(a){a.enterDocument()})}this.updateExpandIcon()}}else(c=this.getChildrenElement())&&goog.style.showElement(c,!1);d&&(this.updateIcon_(),goog.dom.a11y.setState(d,"expanded",a));b&&this.dispatchEvent(a?goog.ui.tree.BaseNode.EventType.EXPAND:goog.ui.tree.BaseNode.EventType.COLLAPSE)}};goog.ui.tree.BaseNode.prototype.toggle=function(){this.setExpanded(!this.getExpanded())};goog.ui.tree.BaseNode.prototype.expand=function(){this.setExpanded(!0)};
goog.ui.tree.BaseNode.prototype.collapse=function(){this.setExpanded(!1)};goog.ui.tree.BaseNode.prototype.collapseChildren=function(){this.forEachChild(function(a){a.collapseAll()})};goog.ui.tree.BaseNode.prototype.collapseAll=function(){this.collapseChildren();this.collapse()};goog.ui.tree.BaseNode.prototype.expandChildren=function(){this.forEachChild(function(a){a.expandAll()})};goog.ui.tree.BaseNode.prototype.expandAll=function(){this.expandChildren();this.expand()};
goog.ui.tree.BaseNode.prototype.reveal=function(){var a=this.getParent();a&&(a.setExpanded(!0),a.reveal())};goog.ui.tree.BaseNode.prototype.setIsUserCollapsible=function(a){(this.isUserCollapsible_=a)||this.expand();this.getElement()&&this.updateExpandIcon()};goog.ui.tree.BaseNode.prototype.isUserCollapsible=function(){return this.isUserCollapsible_};
goog.ui.tree.BaseNode.prototype.toHtml=function(a){var b=this.getTree(),b=!b.getShowLines()||b==this.getParent()&&!b.getShowRootLines()?this.config_.cssChildrenNoLines:this.config_.cssChildren,c=this.getExpanded()&&this.hasChildren();a.append('<div class="',this.config_.cssItem,'" id="',this.getId(),'">',this.getRowHtml(),'<div class="',b,'" style="',this.getLineStyle(),c?"":"display:none;",'">');c&&this.forEachChild(function(b){b.toHtml(a)});a.append("</div></div>")};
goog.ui.tree.BaseNode.prototype.getPixelIndent_=function(){return Math.max(0,(this.getDepth()-1)*this.config_.indentWidth)};goog.ui.tree.BaseNode.prototype.getRowHtml=function(){var a=new goog.string.StringBuffer;a.append('<div class="',this.getRowClassName(),'" style="padding-',this.isRightToLeft()?"right:":"left:",this.getPixelIndent_(),'px">',this.getExpandIconHtml(),this.getIconHtml(),this.getLabelHtml(),"</div>");return a.toString()};
goog.ui.tree.BaseNode.prototype.getRowClassName=function(){var a;a=this.isSelected()?" "+this.config_.cssSelectedRow:"";return this.config_.cssTreeRow+a};goog.ui.tree.BaseNode.prototype.getLabelHtml=function(){var a=this.getToolTip(),b=new goog.string.StringBuffer;b.append('<span class="',this.config_.cssItemLabel,'"',a?' title="'+goog.string.htmlEscape(a)+'"':"",">",this.getHtml(),"</span>","<span>",this.getAfterLabelHtml(),"</span>");return b.toString()};
goog.ui.tree.BaseNode.prototype.getAfterLabelHtml=function(){return this.afterLabelHtml_};goog.ui.tree.BaseNode.prototype.setAfterLabelHtml=function(a){this.afterLabelHtml_=a;var b=this.getAfterLabelElement();b&&(b.innerHTML=a)};goog.ui.tree.BaseNode.prototype.getIconHtml=function(){return'<span style="display:inline-block" class="'+this.getCalculatedIconClass()+'"></span>'};
goog.ui.tree.BaseNode.prototype.getExpandIconHtml=function(){return'<span type="expand" style="display:inline-block" class="'+this.getExpandIconClass()+'"></span>'};
goog.ui.tree.BaseNode.prototype.getExpandIconClass=function(){var a=this.getTree(),b=!a.getShowLines()||a==this.getParent()&&!a.getShowRootLines(),c=this.config_,d=new goog.string.StringBuffer;d.append(c.cssTreeIcon," ",c.cssExpandTreeIcon," ");if(this.hasChildren()){var e=0;a.getShowExpandIcons()&&this.isUserCollapsible_&&(e=this.getExpanded()?2:1);b||(e=this.isLastSibling()?e+4:e+8);switch(e){case 1:d.append(c.cssExpandTreeIconPlus);break;case 2:d.append(c.cssExpandTreeIconMinus);break;case 4:d.append(c.cssExpandTreeIconL);
break;case 5:d.append(c.cssExpandTreeIconLPlus);break;case 6:d.append(c.cssExpandTreeIconLMinus);break;case 8:d.append(c.cssExpandTreeIconT);break;case 9:d.append(c.cssExpandTreeIconTPlus);break;case 10:d.append(c.cssExpandTreeIconTMinus);break;default:d.append(c.cssExpandTreeIconBlank)}}else b?d.append(c.cssExpandTreeIconBlank):this.isLastSibling()?d.append(c.cssExpandTreeIconL):d.append(c.cssExpandTreeIconT);return d.toString()};
goog.ui.tree.BaseNode.prototype.getLineStyle=function(){return"background-position:"+this.getLineStyle2()+";"};goog.ui.tree.BaseNode.prototype.getLineStyle2=function(){return(this.isLastSibling()?"-100":(this.getDepth()-1)*this.config_.indentWidth)+"px 0"};goog.ui.tree.BaseNode.prototype.getElement=function(){var a=goog.ui.tree.BaseNode.superClass_.getElement.call(this);a||(a=this.getDomHelper().getElement(this.getId()),this.setElementInternal(a));return a};
goog.ui.tree.BaseNode.prototype.getRowElement=function(){var a=this.getElement();return a?a.firstChild:null};goog.ui.tree.BaseNode.prototype.getExpandIconElement=function(){var a=this.getRowElement();return a?a.firstChild:null};goog.ui.tree.BaseNode.prototype.getIconElement=function(){var a=this.getRowElement();return a?a.childNodes[1]:null};goog.ui.tree.BaseNode.prototype.getLabelElement=function(){var a=this.getRowElement();return a&&a.lastChild?a.lastChild.previousSibling:null};
goog.ui.tree.BaseNode.prototype.getAfterLabelElement=function(){var a=this.getRowElement();return a?a.lastChild:null};goog.ui.tree.BaseNode.prototype.getChildrenElement=function(){var a=this.getElement();return a?a.lastChild:null};goog.ui.tree.BaseNode.prototype.setIconClass=function(a){this.iconClass_=a;this.isInDocument()&&this.updateIcon_()};goog.ui.tree.BaseNode.prototype.getIconClass=function(){return this.iconClass_};
goog.ui.tree.BaseNode.prototype.setExpandedIconClass=function(a){this.expandedIconClass_=a;this.isInDocument()&&this.updateIcon_()};goog.ui.tree.BaseNode.prototype.getExpandedIconClass=function(){return this.expandedIconClass_};goog.ui.tree.BaseNode.prototype.setText=function(a){this.setHtml(goog.string.htmlEscape(a))};goog.ui.tree.BaseNode.prototype.getText=function(){return goog.string.unescapeEntities(this.getHtml())};
goog.ui.tree.BaseNode.prototype.setHtml=function(a){this.html_=a;var b=this.getLabelElement();b&&(b.innerHTML=a);(a=this.getTree())&&a.setNode(this)};goog.ui.tree.BaseNode.prototype.getHtml=function(){return this.html_};goog.ui.tree.BaseNode.prototype.setToolTip=function(a){this.toolTip_=a;var b=this.getLabelElement();b&&(b.title=a)};goog.ui.tree.BaseNode.prototype.getToolTip=function(){return this.toolTip_};
goog.ui.tree.BaseNode.prototype.updateRow=function(){var a=this.getRowElement();a&&(a.className=this.getRowClassName())};goog.ui.tree.BaseNode.prototype.updateExpandIcon=function(){var a=this.getExpandIconElement();a&&(a.className=this.getExpandIconClass());if(a=this.getChildrenElement())a.style.backgroundPosition=this.getLineStyle2()};goog.ui.tree.BaseNode.prototype.updateIcon_=function(){this.getIconElement().className=this.getCalculatedIconClass()};
goog.ui.tree.BaseNode.prototype.onMouseDown=function(a){"expand"==a.target.getAttribute("type")&&this.hasChildren()?this.isUserCollapsible_&&this.toggle():(this.select(),this.updateRow())};goog.ui.tree.BaseNode.prototype.onClick_=goog.events.Event.preventDefault;goog.ui.tree.BaseNode.prototype.onDoubleClick_=function(a){"expand"==a.target.getAttribute("type")&&this.hasChildren()||this.isUserCollapsible_&&this.toggle()};
goog.ui.tree.BaseNode.prototype.onKeyDown=function(a){var b=!0;switch(a.keyCode){case goog.events.KeyCodes.RIGHT:if(a.altKey)break;this.hasChildren()&&(this.getExpanded()?this.getFirstChild().select():this.setExpanded(!0));break;case goog.events.KeyCodes.LEFT:if(a.altKey)break;if(this.hasChildren()&&this.getExpanded()&&this.isUserCollapsible_)this.setExpanded(!1);else{var c=this.getParent(),d=this.getTree();c&&(d.getShowRootNode()||c!=d)&&c.select()}break;case goog.events.KeyCodes.DOWN:(c=this.getNextShownNode())&&
c.select();break;case goog.events.KeyCodes.UP:(c=this.getPreviousShownNode())&&c.select();break;default:b=!1}b&&(a.preventDefault(),(d=this.getTree())&&d.clearTypeAhead());return b};goog.ui.tree.BaseNode.prototype.onKeyPress_=function(a){!a.altKey&&(a.keyCode>=goog.events.KeyCodes.LEFT&&a.keyCode<=goog.events.KeyCodes.DOWN)&&a.preventDefault()};goog.ui.tree.BaseNode.prototype.getLastShownDescendant=function(){return!this.getExpanded()||!this.hasChildren()?this:this.getLastChild().getLastShownDescendant()};
goog.ui.tree.BaseNode.prototype.getNextShownNode=function(){if(this.hasChildren()&&this.getExpanded())return this.getFirstChild();for(var a=this,b;a!=this.getTree();){b=a.getNextSibling();if(null!=b)return b;a=a.getParent()}return null};goog.ui.tree.BaseNode.prototype.getPreviousShownNode=function(){var a=this.getPreviousSibling();if(null!=a)return a.getLastShownDescendant();var a=this.getParent(),b=this.getTree();return!b.getShowRootNode()&&a==b?null:a};
goog.ui.tree.BaseNode.prototype.getClientData=goog.ui.tree.BaseNode.prototype.getModel;goog.ui.tree.BaseNode.prototype.setClientData=goog.ui.tree.BaseNode.prototype.setModel;goog.ui.tree.BaseNode.prototype.getConfig=function(){return this.config_};goog.ui.tree.BaseNode.prototype.setTreeInternal=function(a){this.tree_!=a&&(this.tree_=a,a.setNode(this),this.forEachChild(function(b){b.setTreeInternal(a)}))};goog.ui.tree.TreeNode=function(a,b,c){goog.ui.tree.BaseNode.call(this,a,b,c)};goog.inherits(goog.ui.tree.TreeNode,goog.ui.tree.BaseNode);goog.ui.tree.TreeNode.prototype.tree_=null;goog.ui.tree.TreeNode.prototype.getTree=function(){if(this.tree_)return this.tree_;var a=this.getParent();return a&&(a=a.getTree())?(this.setTreeInternal(a),a):null};
goog.ui.tree.TreeNode.prototype.getCalculatedIconClass=function(){var a=this.getExpanded();if(a&&this.expandedIconClass_)return this.expandedIconClass_;if(!a&&this.iconClass_)return this.iconClass_;var b=this.getConfig();if(this.hasChildren()){if(a&&b.cssExpandedFolderIcon)return b.cssTreeIcon+" "+b.cssExpandedFolderIcon;if(!a&&b.cssCollapsedFolderIcon)return b.cssTreeIcon+" "+b.cssCollapsedFolderIcon}else if(b.cssFileIcon)return b.cssTreeIcon+" "+b.cssFileIcon;return""};goog.structs.Trie=function(a){this.childNodes_={};a&&this.setAll(a)};goog.structs.Trie.prototype.value_=void 0;goog.structs.Trie.prototype.set=function(a,b){this.setOrAdd_(a,b,!1)};goog.structs.Trie.prototype.add=function(a,b){this.setOrAdd_(a,b,!0)};
goog.structs.Trie.prototype.setOrAdd_=function(a,b,c){for(var d=this,e=0;e<a.length;e++){var f=a.charAt(e);d.childNodes_[f]||(d.childNodes_[f]=new goog.structs.Trie);d=d.childNodes_[f]}if(c&&void 0!==d.value_)throw Error('The collection already contains the key "'+a+'"');d.value_=b};goog.structs.Trie.prototype.setAll=function(a){var b=goog.structs.getKeys(a);a=goog.structs.getValues(a);for(var c=0;c<b.length;c++)this.set(b[c],a[c])};
goog.structs.Trie.prototype.get=function(a){for(var b=this,c=0;c<a.length;c++){var d=a.charAt(c);if(!b.childNodes_[d])return;b=b.childNodes_[d]}return b.value_};goog.structs.Trie.prototype.getKeyAndPrefixes=function(a,b){var c=this,d={},e=b||0;void 0!==c.value_&&(d[e]=c.value_);for(;e<a.length;e++){var f=a.charAt(e);if(!(f in c.childNodes_))break;c=c.childNodes_[f];void 0!==c.value_&&(d[e]=c.value_)}return d};goog.structs.Trie.prototype.getValues=function(){var a=[];this.getValuesInternal_(a);return a};
goog.structs.Trie.prototype.getValuesInternal_=function(a){void 0!==this.value_&&a.push(this.value_);for(var b in this.childNodes_)this.childNodes_[b].getValuesInternal_(a)};goog.structs.Trie.prototype.getKeys=function(a){var b=[];if(a){for(var c=this,d=0;d<a.length;d++){var e=a.charAt(d);if(!c.childNodes_[e])return[];c=c.childNodes_[e]}c.getKeysInternal_(a,b)}else this.getKeysInternal_("",b);return b};
goog.structs.Trie.prototype.getKeysInternal_=function(a,b){void 0!==this.value_&&b.push(a);for(var c in this.childNodes_)this.childNodes_[c].getKeysInternal_(a+c,b)};goog.structs.Trie.prototype.containsKey=function(a){return void 0!==this.get(a)};goog.structs.Trie.prototype.containsValue=function(a){if(this.value_===a)return!0;for(var b in this.childNodes_)if(this.childNodes_[b].containsValue(a))return!0;return!1};goog.structs.Trie.prototype.clear=function(){this.childNodes_={};this.value_=void 0};
goog.structs.Trie.prototype.remove=function(a){for(var b=this,c=[],d=0;d<a.length;d++){var e=a.charAt(d);if(!b.childNodes_[e])throw Error('The collection does not have the key "'+a+'"');c.push([b,e]);b=b.childNodes_[e]}a=b.value_;for(delete b.value_;0<c.length;)if(e=c.pop(),b=e[0],e=e[1],goog.object.isEmpty(b.childNodes_[e].childNodes_))delete b.childNodes_[e];else break;return a};goog.structs.Trie.prototype.clone=function(){return new goog.structs.Trie(this)};
goog.structs.Trie.prototype.getCount=function(){return goog.structs.getCount(this.getValues())};goog.structs.Trie.prototype.isEmpty=function(){return void 0===this.value_&&goog.structs.isEmpty(this.childNodes_)};goog.ui.tree.TypeAhead=function(){this.nodeMap_=new goog.structs.Trie};goog.ui.tree.TypeAhead.prototype.buffer_="";goog.ui.tree.TypeAhead.prototype.matchingLabels_=null;goog.ui.tree.TypeAhead.prototype.matchingNodes_=null;goog.ui.tree.TypeAhead.prototype.matchingLabelIndex_=0;goog.ui.tree.TypeAhead.prototype.matchingNodeIndex_=0;goog.ui.tree.TypeAhead.Offset={DOWN:1,UP:-1};
goog.ui.tree.TypeAhead.prototype.handleNavigation=function(a){var b=!1;switch(a.keyCode){case goog.events.KeyCodes.DOWN:case goog.events.KeyCodes.UP:a.ctrlKey&&(this.jumpTo_(a.keyCode==goog.events.KeyCodes.DOWN?goog.ui.tree.TypeAhead.Offset.DOWN:goog.ui.tree.TypeAhead.Offset.UP),b=!0);break;case goog.events.KeyCodes.BACKSPACE:a=this.buffer_.length-1;b=!0;0<a?(this.buffer_=this.buffer_.substring(0,a),this.jumpToLabel_(this.buffer_)):0==a?this.buffer_="":b=!1;break;case goog.events.KeyCodes.ESC:this.buffer_=
"",b=!0}return b};goog.ui.tree.TypeAhead.prototype.handleTypeAheadChar=function(a){var b=!1;if(!a.ctrlKey&&!a.altKey&&(a=String.fromCharCode(a.charCode||a.keyCode).toLowerCase(),goog.string.isUnicodeChar(a)&&(" "!=a||this.buffer_)))this.buffer_+=a,b=this.jumpToLabel_(this.buffer_);return b};goog.ui.tree.TypeAhead.prototype.setNodeInMap=function(a){var b=a.getText();if(b&&!goog.string.isEmptySafe(b)){var b=b.toLowerCase(),c=this.nodeMap_.get(b);c?c.push(a):this.nodeMap_.set(b,[a])}};
goog.ui.tree.TypeAhead.prototype.removeNodeFromMap=function(a){var b=a.getText();if(b&&!goog.string.isEmptySafe(b)){var b=b.toLowerCase(),c=this.nodeMap_.get(b);c&&(goog.array.remove(c,a),c.length&&this.nodeMap_.remove(b))}};goog.ui.tree.TypeAhead.prototype.jumpToLabel_=function(a){var b=!1;if((a=this.nodeMap_.getKeys(a))&&a.length)if(this.matchingLabelIndex_=this.matchingNodeIndex_=0,b=this.nodeMap_.get(a[0]),b=this.selectMatchingNode_(b))this.matchingLabels_=a;return b};
goog.ui.tree.TypeAhead.prototype.jumpTo_=function(a){var b=!1,c=this.matchingLabels_;if(c){var b=null,d=!1;if(this.matchingNodes_){var e=this.matchingNodeIndex_+a;0<=e&&e<this.matchingNodes_.length?(this.matchingNodeIndex_=e,b=this.matchingNodes_):d=!0}b||(e=this.matchingLabelIndex_+a,0<=e&&e<c.length&&(this.matchingLabelIndex_=e),c.length>this.matchingLabelIndex_&&(b=this.nodeMap_.get(c[this.matchingLabelIndex_])),b&&(b.length&&d)&&(this.matchingNodeIndex_=a==goog.ui.tree.TypeAhead.Offset.UP?b.length-
1:0));if(b=this.selectMatchingNode_(b))this.matchingLabels_=c}return b};goog.ui.tree.TypeAhead.prototype.selectMatchingNode_=function(a){var b;a&&(this.matchingNodeIndex_<a.length&&(b=a[this.matchingNodeIndex_],this.matchingNodes_=a),b&&(b.reveal(),b.select()));return!!b};goog.ui.tree.TypeAhead.prototype.clear=function(){this.buffer_=""};goog.ui.tree.TreeControl=function(a,b,c){goog.ui.tree.BaseNode.call(this,a,b,c);this.setExpandedInternal(!0);this.setSelectedInternal(!0);this.selectedItem_=this;this.typeAhead_=new goog.ui.tree.TypeAhead;if(goog.userAgent.IE)try{document.execCommand("BackgroundImageCache",!1,!0)}catch(d){this.logger_.warning("Failed to enable background image cache")}};goog.inherits(goog.ui.tree.TreeControl,goog.ui.tree.BaseNode);goog.ui.tree.TreeControl.prototype.keyHandler_=null;
goog.ui.tree.TreeControl.prototype.focusHandler_=null;goog.ui.tree.TreeControl.prototype.logger_=goog.debug.Logger.getLogger("goog.ui.tree.TreeControl");goog.ui.tree.TreeControl.prototype.focused_=!1;goog.ui.tree.TreeControl.prototype.focusedNode_=null;goog.ui.tree.TreeControl.prototype.showLines_=!0;goog.ui.tree.TreeControl.prototype.showExpandIcons_=!0;goog.ui.tree.TreeControl.prototype.showRootNode_=!0;goog.ui.tree.TreeControl.prototype.showRootLines_=!0;
goog.ui.tree.TreeControl.prototype.getTree=function(){return this};goog.ui.tree.TreeControl.prototype.getDepth=function(){return 0};goog.ui.tree.TreeControl.prototype.reveal=function(){};goog.ui.tree.TreeControl.prototype.handleFocus_=function(){this.focused_=!0;goog.dom.classes.add(this.getElement(),"focused");this.selectedItem_&&this.selectedItem_.select()};goog.ui.tree.TreeControl.prototype.handleBlur_=function(){this.focused_=!1;goog.dom.classes.remove(this.getElement(),"focused")};
goog.ui.tree.TreeControl.prototype.hasFocus=function(){return this.focused_};goog.ui.tree.TreeControl.prototype.getExpanded=function(){return!this.showRootNode_||goog.ui.tree.TreeControl.superClass_.getExpanded.call(this)};goog.ui.tree.TreeControl.prototype.setExpanded=function(a){this.showRootNode_?goog.ui.tree.TreeControl.superClass_.setExpanded.call(this,a):this.setExpandedInternal(a)};goog.ui.tree.TreeControl.prototype.getExpandIconHtml=function(){return""};
goog.ui.tree.TreeControl.prototype.getIconElement=function(){var a=this.getRowElement();return a?a.firstChild:null};goog.ui.tree.TreeControl.prototype.getExpandIconElement=function(){return null};goog.ui.tree.TreeControl.prototype.updateExpandIcon=function(){};goog.ui.tree.TreeControl.prototype.getRowClassName=function(){return goog.ui.tree.TreeControl.superClass_.getRowClassName.call(this)+(this.showRootNode_?"":" "+this.getConfig().cssHideRoot)};
goog.ui.tree.TreeControl.prototype.getCalculatedIconClass=function(){var a=this.getExpanded();if(a&&this.expandedIconClass_)return this.expandedIconClass_;if(!a&&this.iconClass_)return this.iconClass_;var b=this.getConfig();return a&&b.cssExpandedRootIcon?b.cssTreeIcon+" "+b.cssExpandedRootIcon:!a&&b.cssCollapsedRootIcon?b.cssTreeIcon+" "+b.cssCollapsedRootIcon:""};
goog.ui.tree.TreeControl.prototype.setSelectedItem=function(a){if(this.selectedItem_!=a){var b=!1;this.selectedItem_&&(b=this.selectedItem_==this.focusedNode_,this.selectedItem_.setSelectedInternal(!1));if(this.selectedItem_=a)a.setSelectedInternal(!0),b&&a.select();this.dispatchEvent(goog.events.EventType.CHANGE)}};goog.ui.tree.TreeControl.prototype.getSelectedItem=function(){return this.selectedItem_};
goog.ui.tree.TreeControl.prototype.setShowLines=function(a){this.showLines_!=a&&(this.showLines_=a,this.isInDocument()&&this.updateLinesAndExpandIcons_())};goog.ui.tree.TreeControl.prototype.getShowLines=function(){return this.showLines_};
goog.ui.tree.TreeControl.prototype.updateLinesAndExpandIcons_=function(){function a(e){var f=e.getChildrenElement();if(f){var g=!c||b==e.getParent()&&!d?e.getConfig().cssChildrenNoLines:e.getConfig().cssChildren;f.className=g;if(f=e.getExpandIconElement())f.className=e.getExpandIconClass()}e.forEachChild(a)}var b=this,c=b.getShowLines(),d=b.getShowRootLines();a(this)};
goog.ui.tree.TreeControl.prototype.setShowRootLines=function(a){this.showRootLines_!=a&&(this.showRootLines_=a,this.isInDocument()&&this.updateLinesAndExpandIcons_())};goog.ui.tree.TreeControl.prototype.getShowRootLines=function(){return this.showRootLines_};goog.ui.tree.TreeControl.prototype.setShowExpandIcons=function(a){this.showExpandIcons_!=a&&(this.showExpandIcons_=a,this.isInDocument()&&this.updateLinesAndExpandIcons_())};goog.ui.tree.TreeControl.prototype.getShowExpandIcons=function(){return this.showExpandIcons_};
goog.ui.tree.TreeControl.prototype.setShowRootNode=function(a){if(this.showRootNode_!=a){this.showRootNode_=a;if(this.isInDocument()){var b=this.getRowElement();b&&(b.className=this.getRowClassName())}!a&&(this.getSelectedItem()==this&&this.getFirstChild())&&this.setSelectedItem(this.getFirstChild())}};goog.ui.tree.TreeControl.prototype.getShowRootNode=function(){return this.showRootNode_};
goog.ui.tree.TreeControl.prototype.initAccessibility=function(){goog.ui.tree.TreeControl.superClass_.initAccessibility.call(this);var a=this.getElement();goog.dom.a11y.setRole(a,"tree");goog.dom.a11y.setState(a,"labelledby",this.getLabelElement().id)};goog.ui.tree.TreeControl.prototype.enterDocument=function(){goog.ui.tree.TreeControl.superClass_.enterDocument.call(this);var a=this.getElement();a.className=this.getConfig().cssRoot;a.setAttribute("hideFocus","true");this.attachEvents_();this.initAccessibility()};
goog.ui.tree.TreeControl.prototype.exitDocument=function(){goog.ui.tree.TreeControl.superClass_.exitDocument.call(this);this.detachEvents_()};
goog.ui.tree.TreeControl.prototype.attachEvents_=function(){var a=this.getElement();a.tabIndex=0;var b=this.keyHandler_=new goog.events.KeyHandler(a),c=this.focusHandler_=new goog.events.FocusHandler(a);this.getHandler().listen(c,goog.events.FocusHandler.EventType.FOCUSOUT,this.handleBlur_).listen(c,goog.events.FocusHandler.EventType.FOCUSIN,this.handleFocus_).listen(b,goog.events.KeyHandler.EventType.KEY,this.handleKeyEvent).listen(a,goog.events.EventType.MOUSEDOWN,this.handleMouseEvent_).listen(a,
goog.events.EventType.CLICK,this.handleMouseEvent_).listen(a,goog.events.EventType.DBLCLICK,this.handleMouseEvent_)};goog.ui.tree.TreeControl.prototype.detachEvents_=function(){this.keyHandler_.dispose();this.keyHandler_=null;this.focusHandler_.dispose();this.focusHandler_=null};
goog.ui.tree.TreeControl.prototype.handleMouseEvent_=function(a){this.logger_.fine("Received event "+a.type);var b=this.getNodeFromEvent_(a);if(b)switch(a.type){case goog.events.EventType.MOUSEDOWN:b.onMouseDown(a);break;case goog.events.EventType.CLICK:b.onClick_(a);break;case goog.events.EventType.DBLCLICK:b.onDoubleClick_(a)}};
goog.ui.tree.TreeControl.prototype.handleKeyEvent=function(a){var b=!1;(b=this.typeAhead_.handleNavigation(a)||this.selectedItem_&&this.selectedItem_.onKeyDown(a)||this.typeAhead_.handleTypeAheadChar(a))&&a.preventDefault();return b};goog.ui.tree.TreeControl.prototype.getNodeFromEvent_=function(a){var b=null;for(a=a.target;null!=a;){if(b=goog.ui.tree.BaseNode.allNodes[a.id])return b;if(a==this.getElement())break;a=a.parentNode}return null};
goog.ui.tree.TreeControl.prototype.createNode=function(a){return new goog.ui.tree.TreeNode(a||"",this.getConfig(),this.getDomHelper())};goog.ui.tree.TreeControl.prototype.setNode=function(a){this.typeAhead_.setNodeInMap(a)};goog.ui.tree.TreeControl.prototype.removeNode=function(a){this.typeAhead_.removeNodeFromMap(a)};goog.ui.tree.TreeControl.prototype.clearTypeAhead=function(){this.typeAhead_.clear()};
goog.ui.tree.TreeControl.defaultConfig={indentWidth:19,cssRoot:"goog-tree-root goog-tree-item",cssHideRoot:"goog-tree-hide-root",cssItem:"goog-tree-item",cssChildren:"goog-tree-children",cssChildrenNoLines:"goog-tree-children-nolines",cssTreeRow:"goog-tree-row",cssItemLabel:"goog-tree-item-label",cssTreeIcon:"goog-tree-icon",cssExpandTreeIcon:"goog-tree-expand-icon",cssExpandTreeIconPlus:"goog-tree-expand-icon-plus",cssExpandTreeIconMinus:"goog-tree-expand-icon-minus",cssExpandTreeIconTPlus:"goog-tree-expand-icon-tplus",
cssExpandTreeIconTMinus:"goog-tree-expand-icon-tminus",cssExpandTreeIconLPlus:"goog-tree-expand-icon-lplus",cssExpandTreeIconLMinus:"goog-tree-expand-icon-lminus",cssExpandTreeIconT:"goog-tree-expand-icon-t",cssExpandTreeIconL:"goog-tree-expand-icon-l",cssExpandTreeIconBlank:"goog-tree-expand-icon-blank",cssExpandedFolderIcon:"goog-tree-expanded-folder-icon",cssCollapsedFolderIcon:"goog-tree-collapsed-folder-icon",cssFileIcon:"goog-tree-file-icon",cssExpandedRootIcon:"goog-tree-expanded-folder-icon",
cssCollapsedRootIcon:"goog-tree-collapsed-folder-icon",cssSelectedRow:"selected"};var Blockly={BlockSvg:function(a){this.block_=a;this.svgGroup_=Blockly.createSvgElement("g",{},null);this.svgPathDark_=Blockly.createSvgElement("path",{"class":"blocklyPathDark",transform:"translate(1, 1)"},this.svgGroup_);this.svgPath_=Blockly.createSvgElement("path",{"class":"blocklyPath"},this.svgGroup_);this.svgPathLight_=Blockly.createSvgElement("path",{"class":"blocklyPathLight"},this.svgGroup_);this.svgPath_.tooltip=this.block_;Blockly.Tooltip&&Blockly.Tooltip.bindMouseEvents(this.svgPath_);
a.movable&&Blockly.addClass_(this.svgGroup_,"blocklyDraggable")}};Blockly.BlockSvg.INLINE=-1;Blockly.BlockSvg.prototype.init=function(){var a=this.block_;this.updateColour();for(var b=0,c;c=a.inputList[b];b++)c.init();a.mutator&&a.mutator.createIcon()};Blockly.BlockSvg.prototype.getRootElement=function(){return this.svgGroup_};Blockly.BlockSvg.SEP_SPACE_X=10;Blockly.BlockSvg.SEP_SPACE_Y=10;Blockly.BlockSvg.INLINE_PADDING_Y=5;Blockly.BlockSvg.MIN_BLOCK_Y=25;Blockly.BlockSvg.TAB_HEIGHT=20;
Blockly.BlockSvg.TAB_WIDTH=8;Blockly.BlockSvg.NOTCH_WIDTH=30;Blockly.BlockSvg.CORNER_RADIUS=8;Blockly.BlockSvg.TITLE_HEIGHT=18;Blockly.BlockSvg.DISTANCE_45_INSIDE=(1-Math.SQRT1_2)*(Blockly.BlockSvg.CORNER_RADIUS-1)+1;Blockly.BlockSvg.DISTANCE_45_OUTSIDE=(1-Math.SQRT1_2)*(Blockly.BlockSvg.CORNER_RADIUS+1)-1;Blockly.BlockSvg.NOTCH_PATH_LEFT="l 6,4 3,0 6,-4";Blockly.BlockSvg.NOTCH_PATH_LEFT_HIGHLIGHT="l 6.5,4 2,0 6.5,-4";Blockly.BlockSvg.NOTCH_PATH_RIGHT="l -6,4 -3,0 -6,-4";
Blockly.BlockSvg.JAGGED_TEETH="l 8,0 0,4 8,4 -16,8 8,4";Blockly.BlockSvg.TAB_PATH_DOWN="v 5 c 0,10 -"+Blockly.BlockSvg.TAB_WIDTH+",-8 -"+Blockly.BlockSvg.TAB_WIDTH+",7.5 s "+Blockly.BlockSvg.TAB_WIDTH+",-2.5 "+Blockly.BlockSvg.TAB_WIDTH+",7.5";Blockly.BlockSvg.TAB_PATH_DOWN_HIGHLIGHT_RTL="v 6.5 m -"+0.98*Blockly.BlockSvg.TAB_WIDTH+",2.5 q -"+0.05*Blockly.BlockSvg.TAB_WIDTH+",10 "+0.27*Blockly.BlockSvg.TAB_WIDTH+",10 m "+0.71*Blockly.BlockSvg.TAB_WIDTH+",-2.5 v 1.5";
Blockly.BlockSvg.TOP_LEFT_CORNER_START="m 0,"+Blockly.BlockSvg.CORNER_RADIUS;Blockly.BlockSvg.TOP_LEFT_CORNER_START_HIGHLIGHT_RTL="m "+Blockly.BlockSvg.DISTANCE_45_INSIDE+","+Blockly.BlockSvg.DISTANCE_45_INSIDE;Blockly.BlockSvg.TOP_LEFT_CORNER_START_HIGHLIGHT_LTR="m 1,"+(Blockly.BlockSvg.CORNER_RADIUS-1);Blockly.BlockSvg.TOP_LEFT_CORNER="A "+Blockly.BlockSvg.CORNER_RADIUS+","+Blockly.BlockSvg.CORNER_RADIUS+" 0 0,1 "+Blockly.BlockSvg.CORNER_RADIUS+",0";
Blockly.BlockSvg.TOP_LEFT_CORNER_HIGHLIGHT="A "+(Blockly.BlockSvg.CORNER_RADIUS-1)+","+(Blockly.BlockSvg.CORNER_RADIUS-1)+" 0 0,1 "+Blockly.BlockSvg.CORNER_RADIUS+",1";Blockly.BlockSvg.INNER_TOP_LEFT_CORNER=Blockly.BlockSvg.NOTCH_PATH_RIGHT+" h -"+(Blockly.BlockSvg.NOTCH_WIDTH-15-Blockly.BlockSvg.CORNER_RADIUS)+" a "+Blockly.BlockSvg.CORNER_RADIUS+","+Blockly.BlockSvg.CORNER_RADIUS+" 0 0,0 -"+Blockly.BlockSvg.CORNER_RADIUS+","+Blockly.BlockSvg.CORNER_RADIUS;
Blockly.BlockSvg.INNER_BOTTOM_LEFT_CORNER="a "+Blockly.BlockSvg.CORNER_RADIUS+","+Blockly.BlockSvg.CORNER_RADIUS+" 0 0,0 "+Blockly.BlockSvg.CORNER_RADIUS+","+Blockly.BlockSvg.CORNER_RADIUS;Blockly.BlockSvg.INNER_TOP_LEFT_CORNER_HIGHLIGHT_RTL="a "+(Blockly.BlockSvg.CORNER_RADIUS+1)+","+(Blockly.BlockSvg.CORNER_RADIUS+1)+" 0 0,0 "+(-Blockly.BlockSvg.DISTANCE_45_OUTSIDE-1)+","+(Blockly.BlockSvg.CORNER_RADIUS-Blockly.BlockSvg.DISTANCE_45_OUTSIDE);
Blockly.BlockSvg.INNER_BOTTOM_LEFT_CORNER_HIGHLIGHT_RTL="a "+(Blockly.BlockSvg.CORNER_RADIUS+1)+","+(Blockly.BlockSvg.CORNER_RADIUS+1)+" 0 0,0 "+(Blockly.BlockSvg.CORNER_RADIUS+1)+","+(Blockly.BlockSvg.CORNER_RADIUS+1);Blockly.BlockSvg.INNER_BOTTOM_LEFT_CORNER_HIGHLIGHT_LTR="a "+(Blockly.BlockSvg.CORNER_RADIUS+1)+","+(Blockly.BlockSvg.CORNER_RADIUS+1)+" 0 0,0 "+(Blockly.BlockSvg.CORNER_RADIUS-Blockly.BlockSvg.DISTANCE_45_OUTSIDE)+","+(Blockly.BlockSvg.DISTANCE_45_OUTSIDE+1);
Blockly.BlockSvg.prototype.dispose=function(){goog.dom.removeNode(this.svgGroup_);this.block_=this.svgPathDark_=this.svgPathLight_=this.svgPath_=this.svgGroup_=null};
Blockly.BlockSvg.prototype.disposeUiEffect=function(){Blockly.playAudio("delete");var a=Blockly.getSvgXY_(this.svgGroup_),b=this.svgGroup_.cloneNode(!0);b.translateX_=a.x;b.translateY_=a.y;b.setAttribute("transform","translate("+b.translateX_+","+b.translateY_+")");Blockly.svg.appendChild(b);b.bBox_=b.getBBox();b.startDate_=new Date;Blockly.BlockSvg.disposeUiStep_(b)};
Blockly.BlockSvg.disposeUiStep_=function(a){var b=(new Date-a.startDate_)/150;1<b?goog.dom.removeNode(a):(a.setAttribute("transform","translate("+(a.translateX_+(Blockly.RTL?-1:1)*a.bBox_.width/2*b+", "+(a.translateY_+a.bBox_.height*b))+") scale("+(1-b)+")"),window.setTimeout(function(){Blockly.BlockSvg.disposeUiStep_(a)},10))};
Blockly.BlockSvg.prototype.connectionUiEffect=function(){Blockly.playAudio("click");var a=Blockly.getSvgXY_(this.svgGroup_);this.block_.outputConnection?(a.x+=Blockly.RTL?3:-3,a.y+=13):this.block_.previousConnection&&(a.x+=Blockly.RTL?-23:23,a.y+=3);a=Blockly.createSvgElement("circle",{cx:a.x,cy:a.y,r:0,fill:"none",stroke:"#888","stroke-width":10},Blockly.svg);a.startDate_=new Date;Blockly.BlockSvg.connectionUiStep_(a)};
Blockly.BlockSvg.connectionUiStep_=function(a){var b=(new Date-a.startDate_)/150;1<b?goog.dom.removeNode(a):(a.setAttribute("r",25*b),a.style.opacity=1-b,window.setTimeout(function(){Blockly.BlockSvg.connectionUiStep_(a)},10))};
Blockly.BlockSvg.prototype.updateColour=function(){var a=Blockly.makeColour(this.block_.getColour()),b=goog.color.hexToRgb(a),c=goog.color.lighten(b,0.3),b=goog.color.darken(b,0.4);this.svgPathLight_.setAttribute("stroke",goog.color.rgbArrayToHex(c));this.svgPathDark_.setAttribute("fill",goog.color.rgbArrayToHex(b));this.svgPath_.setAttribute("fill",a)};
Blockly.BlockSvg.prototype.updateDisabled=function(){this.block_.disabled||this.block_.getInheritedDisabled()?(Blockly.addClass_(this.svgGroup_,"blocklyDisabled"),this.svgPath_.setAttribute("fill","url(#blocklyDisabledPattern)")):(Blockly.removeClass_(this.svgGroup_,"blocklyDisabled"),this.updateColour());for(var a=this.block_.getChildren(),b=0,c;c=a[b];b++)c.svg_.updateDisabled()};Blockly.BlockSvg.prototype.addSelect=function(){Blockly.addClass_(this.svgGroup_,"blocklySelected");this.svgGroup_.parentNode.appendChild(this.svgGroup_)};
Blockly.BlockSvg.prototype.removeSelect=function(){Blockly.removeClass_(this.svgGroup_,"blocklySelected")};Blockly.BlockSvg.prototype.addDragging=function(){Blockly.addClass_(this.svgGroup_,"blocklyDragging")};Blockly.BlockSvg.prototype.removeDragging=function(){Blockly.removeClass_(this.svgGroup_,"blocklyDragging")};
Blockly.BlockSvg.prototype.render=function(){this.block_.rendered=!0;var a=Blockly.BlockSvg.SEP_SPACE_X;Blockly.RTL&&(a=-a);this.block_.mutator&&(a=this.block_.mutator.renderIcon(a));this.block_.comment&&(a=this.block_.comment.renderIcon(a));this.block_.warning&&(a=this.block_.warning.renderIcon(a));var a=a+(Blockly.RTL?Blockly.BlockSvg.SEP_SPACE_X:-Blockly.BlockSvg.SEP_SPACE_X),b=this.renderCompute_(a);this.renderDraw_(a,b);(a=this.block_.getParent())?a.render():Blockly.fireUiEvent(window,"resize")};
Blockly.BlockSvg.prototype.renderTitles_=function(a,b,c){Blockly.RTL&&(b=-b);for(var d=0,e;e=a[d];d++){var f=e.getSize().width;Blockly.RTL?(b-=f,e.getRootElement().setAttribute("transform","translate("+b+", "+c+")"),f&&(b-=Blockly.BlockSvg.SEP_SPACE_X)):(e.getRootElement().setAttribute("transform","translate("+b+", "+c+")"),f&&(b+=f+Blockly.BlockSvg.SEP_SPACE_X))}return Blockly.RTL?-b:b};
Blockly.BlockSvg.prototype.renderCompute_=function(a){var b=this.block_.inputList,c=[];c.rightEdge=a+2*Blockly.BlockSvg.SEP_SPACE_X;if(this.block_.previousConnection||this.block_.nextConnection)c.rightEdge=Math.max(c.rightEdge,Blockly.BlockSvg.NOTCH_WIDTH+Blockly.BlockSvg.SEP_SPACE_X);if(this.block_.collapsed)return c;for(var d=0,e=0,f=!1,g=!1,h=!1,j=void 0,k=0,l;l=b[k];k++){var m;!this.block_.inputsInline||!j||j==Blockly.NEXT_STATEMENT||l.type==Blockly.NEXT_STATEMENT?(j=l.type,m=[],m.type=this.block_.inputsInline&&
l.type!=Blockly.NEXT_STATEMENT?Blockly.BlockSvg.INLINE:l.type,m.height=0,c.push(m)):m=c[c.length-1];m.push(l);l.renderHeight=Blockly.BlockSvg.MIN_BLOCK_Y;l.renderWidth=this.block_.inputsInline&&l.type==Blockly.INPUT_VALUE?Blockly.BlockSvg.TAB_WIDTH+Blockly.BlockSvg.SEP_SPACE_X:0;if(l.connection&&l.connection.targetConnection){var n=l.connection.targetBlock().getSvgRoot();try{var q=n.getBBox()}catch(p){q={height:0,width:0}}goog.userAgent.WEBKIT&&(q.height-=3);l.renderHeight=Math.max(l.renderHeight,
q.height-1);l.renderWidth=Math.max(l.renderWidth,q.width)}m.height=Math.max(m.height,l.renderHeight);l.titleWidth=0;1==c.length&&(l.titleWidth+=Blockly.RTL?-a:a);for(var n=0,r;r=l.titleRow[n];n++)0!=n&&(l.titleWidth+=Blockly.BlockSvg.SEP_SPACE_X),r=r.getSize(),l.titleWidth+=r.width,m.height=Math.max(m.height,r.height);m.type!=Blockly.BlockSvg.INLINE&&(m.type==Blockly.NEXT_STATEMENT?(g=!0,e=Math.max(e,l.titleWidth)):(m.type==Blockly.INPUT_VALUE?f=!0:m.type==Blockly.DUMMY_INPUT&&(h=!0),d=Math.max(d,
l.titleWidth)))}for(a=0;m=c[a];a++)if(m.thicker=!1,this.block_.inputsInline&&m.type==Blockly.BlockSvg.INLINE)for(b=0;l=m[b];b++)if(l.type==Blockly.INPUT_VALUE){m.height+=2*Blockly.BlockSvg.INLINE_PADDING_Y;m.thicker=!0;break}c.statementEdge=2*Blockly.BlockSvg.SEP_SPACE_X+e;g&&(c.rightEdge=Math.max(c.rightEdge,c.statementEdge+Blockly.BlockSvg.NOTCH_WIDTH));f?c.rightEdge=Math.max(c.rightEdge,d+2*Blockly.BlockSvg.SEP_SPACE_X+Blockly.BlockSvg.TAB_WIDTH):h&&(c.rightEdge=Math.max(c.rightEdge,d+2*Blockly.BlockSvg.SEP_SPACE_X));
c.hasValue=f;c.hasStatement=g;c.hasDummy=h;return c};
Blockly.BlockSvg.prototype.renderDraw_=function(a,b){if(this.block_.outputConnection)this.squareBottomLeftCorner_=this.squareTopLeftCorner_=!0;else{this.squareBottomLeftCorner_=this.squareTopLeftCorner_=!1;if(this.block_.previousConnection){var c=this.block_.previousConnection.targetBlock();c&&(c.nextConnection&&c.nextConnection.targetConnection==this.block_.previousConnection)&&(this.squareTopLeftCorner_=!0)}if(this.block_.nextConnection&&(c=this.block_.nextConnection.targetBlock())&&c.previousConnection&&
c.previousConnection.targetConnection==this.block_.nextConnection)this.squareBottomLeftCorner_=!0}var d=this.block_.getRelativeToSurfaceXY(),e=[],f=[],c=[],g=[];this.renderDrawTop_(e,c,d,b.rightEdge);var h=this.renderDrawRight_(e,c,f,g,d,b,a);this.renderDrawBottom_(e,c,d,h);this.renderDrawLeft_(e,c,d,h);d=e.join(" ")+"\n"+f.join(" ");this.svgPath_.setAttribute("d",d);this.svgPathDark_.setAttribute("d",d);d=c.join(" ")+"\n"+g.join(" ");this.svgPathLight_.setAttribute("d",d);Blockly.RTL&&(this.svgPath_.setAttribute("transform",
"scale(-1 1)"),this.svgPathLight_.setAttribute("transform","scale(-1 1)"),this.svgPathDark_.setAttribute("transform","translate(1,1) scale(-1 1)"))};
Blockly.BlockSvg.prototype.renderDrawTop_=function(a,b,c,d){this.squareTopLeftCorner_?(a.push("m 0,0"),b.push("m 1,1")):(a.push(Blockly.BlockSvg.TOP_LEFT_CORNER_START),b.push(Blockly.RTL?Blockly.BlockSvg.TOP_LEFT_CORNER_START_HIGHLIGHT_RTL:Blockly.BlockSvg.TOP_LEFT_CORNER_START_HIGHLIGHT_LTR),a.push(Blockly.BlockSvg.TOP_LEFT_CORNER),b.push(Blockly.BlockSvg.TOP_LEFT_CORNER_HIGHLIGHT));this.block_.previousConnection&&(a.push("H",Blockly.BlockSvg.NOTCH_WIDTH-15),b.push("H",Blockly.BlockSvg.NOTCH_WIDTH-
15),a.push(Blockly.BlockSvg.NOTCH_PATH_LEFT),b.push(Blockly.BlockSvg.NOTCH_PATH_LEFT_HIGHLIGHT),this.block_.previousConnection.moveTo(c.x+(Blockly.RTL?-Blockly.BlockSvg.NOTCH_WIDTH:Blockly.BlockSvg.NOTCH_WIDTH),c.y));a.push("H",d);b.push("H",d+(Blockly.RTL?-1:0))};
Blockly.BlockSvg.prototype.renderDrawRight_=function(a,b,c,d,e,f,g){for(var h,j=0,k,l,m=0,n;n=f[m];m++){h=Blockly.BlockSvg.SEP_SPACE_X;0==m&&(h+=Blockly.RTL?-g:g);b.push("M",f.rightEdge-1+","+(j+1));if(n.type==Blockly.BlockSvg.INLINE){for(var q=0,p;p=n[q];q++)k=j+Blockly.BlockSvg.TITLE_HEIGHT,n.thicker&&(k+=Blockly.BlockSvg.INLINE_PADDING_Y),h=this.renderTitles_(p.titleRow,h,k),p.type!=Blockly.DUMMY_INPUT&&(h+=p.renderWidth+Blockly.BlockSvg.SEP_SPACE_X),p.type==Blockly.INPUT_VALUE&&(c.push("M",h-
Blockly.BlockSvg.SEP_SPACE_X+","+(j+Blockly.BlockSvg.INLINE_PADDING_Y)),c.push("h",Blockly.BlockSvg.TAB_WIDTH-p.renderWidth),c.push(Blockly.BlockSvg.TAB_PATH_DOWN),c.push("v",p.renderHeight-Blockly.BlockSvg.TAB_HEIGHT),c.push("h",p.renderWidth-Blockly.BlockSvg.TAB_WIDTH),c.push("z"),Blockly.RTL?(d.push("M",h-Blockly.BlockSvg.SEP_SPACE_X+Blockly.BlockSvg.TAB_WIDTH-p.renderWidth-1+","+(j+Blockly.BlockSvg.INLINE_PADDING_Y+1)),d.push(Blockly.BlockSvg.TAB_PATH_DOWN_HIGHLIGHT_RTL),d.push("v",p.renderHeight-
Blockly.BlockSvg.TAB_HEIGHT+2),d.push("h",p.renderWidth-Blockly.BlockSvg.TAB_WIDTH)):(d.push("M",h-Blockly.BlockSvg.SEP_SPACE_X+1+","+(j+Blockly.BlockSvg.INLINE_PADDING_Y+1)),d.push("v",p.renderHeight),d.push("h",Blockly.BlockSvg.TAB_WIDTH-p.renderWidth),d.push("M",h-p.renderWidth-Blockly.BlockSvg.SEP_SPACE_X+3.8+","+(j+Blockly.BlockSvg.INLINE_PADDING_Y+Blockly.BlockSvg.TAB_HEIGHT-0.4)),d.push("l",0.42*Blockly.BlockSvg.TAB_WIDTH+",-1.8")),k=Blockly.RTL?e.x-h-Blockly.BlockSvg.TAB_WIDTH+Blockly.BlockSvg.SEP_SPACE_X+
p.renderWidth-1:e.x+h+Blockly.BlockSvg.TAB_WIDTH-Blockly.BlockSvg.SEP_SPACE_X-p.renderWidth+1,l=e.y+j+Blockly.BlockSvg.INLINE_PADDING_Y,p.connection.moveTo(k,l),p.connection.targetConnection&&p.connection.tighten_());h=Math.max(h,f.rightEdge);a.push("H",h);b.push("H",h+(Blockly.RTL?-1:0));a.push("v",n.height);Blockly.RTL&&b.push("v",n.height-2)}else if(n.type==Blockly.INPUT_VALUE)p=n[0],k=j+Blockly.BlockSvg.TITLE_HEIGHT,p.align!=Blockly.ALIGN_LEFT&&(q=f.rightEdge-p.titleWidth-Blockly.BlockSvg.TAB_WIDTH-
2*Blockly.BlockSvg.SEP_SPACE_X,p.align==Blockly.ALIGN_RIGHT?h+=q:p.align==Blockly.ALIGN_CENTRE&&(h+=(q+h)/2)),this.renderTitles_(p.titleRow,h,k),a.push(Blockly.BlockSvg.TAB_PATH_DOWN),a.push("v",n.height-Blockly.BlockSvg.TAB_HEIGHT),Blockly.RTL?(b.push(Blockly.BlockSvg.TAB_PATH_DOWN_HIGHLIGHT_RTL),b.push("v",n.height-Blockly.BlockSvg.TAB_HEIGHT)):(b.push("M",f.rightEdge-4.2+","+(j+Blockly.BlockSvg.TAB_HEIGHT-0.4)),b.push("l",0.42*Blockly.BlockSvg.TAB_WIDTH+",-1.8")),k=e.x+(Blockly.RTL?-f.rightEdge-
1:f.rightEdge+1),l=e.y+j,p.connection.moveTo(k,l),p.connection.targetConnection&&p.connection.tighten_();else if(n.type==Blockly.DUMMY_INPUT)p=n[0],k=j+Blockly.BlockSvg.TITLE_HEIGHT,p.align!=Blockly.ALIGN_LEFT&&(q=f.rightEdge-p.titleWidth-2*Blockly.BlockSvg.SEP_SPACE_X,f.hasValue&&(q-=Blockly.BlockSvg.TAB_WIDTH),p.align==Blockly.ALIGN_RIGHT?h+=q:p.align==Blockly.ALIGN_CENTRE&&(h+=(q+h)/2)),this.renderTitles_(p.titleRow,h,k),a.push("v",n.height),Blockly.RTL&&b.push("v",n.height-2);else if(n.type==
Blockly.NEXT_STATEMENT&&(p=n[0],0==m&&(a.push("v",Blockly.BlockSvg.SEP_SPACE_Y),Blockly.RTL&&b.push("v",Blockly.BlockSvg.SEP_SPACE_Y-1),j+=Blockly.BlockSvg.SEP_SPACE_Y),k=j+Blockly.BlockSvg.TITLE_HEIGHT,p.align!=Blockly.ALIGN_LEFT&&(q=f.statementEdge-p.titleWidth-2*Blockly.BlockSvg.SEP_SPACE_X,p.align==Blockly.ALIGN_RIGHT?h+=q:p.align==Blockly.ALIGN_CENTRE&&(h+=(q+h)/2)),this.renderTitles_(p.titleRow,h,k),h=f.statementEdge+Blockly.BlockSvg.NOTCH_WIDTH,a.push("H",h),a.push(Blockly.BlockSvg.INNER_TOP_LEFT_CORNER),
a.push("v",n.height-2*Blockly.BlockSvg.CORNER_RADIUS),a.push(Blockly.BlockSvg.INNER_BOTTOM_LEFT_CORNER),a.push("H",f.rightEdge),Blockly.RTL?(b.push("M",h-Blockly.BlockSvg.NOTCH_WIDTH+Blockly.BlockSvg.DISTANCE_45_OUTSIDE+","+(j+Blockly.BlockSvg.DISTANCE_45_OUTSIDE)),b.push(Blockly.BlockSvg.INNER_TOP_LEFT_CORNER_HIGHLIGHT_RTL),b.push("v",n.height-2*Blockly.BlockSvg.CORNER_RADIUS),b.push(Blockly.BlockSvg.INNER_BOTTOM_LEFT_CORNER_HIGHLIGHT_RTL),b.push("H",f.rightEdge-1)):(b.push("M",h-Blockly.BlockSvg.NOTCH_WIDTH+
Blockly.BlockSvg.DISTANCE_45_OUTSIDE+","+(j+n.height-Blockly.BlockSvg.DISTANCE_45_OUTSIDE)),b.push(Blockly.BlockSvg.INNER_BOTTOM_LEFT_CORNER_HIGHLIGHT_LTR),b.push("H",f.rightEdge)),k=e.x+(Blockly.RTL?-h:h),l=e.y+j+1,p.connection.moveTo(k,l),p.connection.targetConnection&&p.connection.tighten_(),m==f.length-1||f[m+1].type==Blockly.NEXT_STATEMENT))a.push("v",Blockly.BlockSvg.SEP_SPACE_Y),Blockly.RTL&&b.push("v",Blockly.BlockSvg.SEP_SPACE_Y-1),j+=Blockly.BlockSvg.SEP_SPACE_Y;j+=n.height}f.length||(this.block_.collapsed&&
(a.push(Blockly.BlockSvg.JAGGED_TEETH),Blockly.RTL?b.push("l 8,0 0,3.8 7,3.2 m -14.5,9 l 8,4"):b.push("h 8")),j=Blockly.BlockSvg.MIN_BLOCK_Y,a.push("V",j),Blockly.RTL&&b.push("V",j-1));return j};
Blockly.BlockSvg.prototype.renderDrawBottom_=function(a,b,c,d){this.block_.nextConnection&&(a.push("H",Blockly.BlockSvg.NOTCH_WIDTH+" "+Blockly.BlockSvg.NOTCH_PATH_RIGHT),this.block_.nextConnection.moveTo(Blockly.RTL?c.x-Blockly.BlockSvg.NOTCH_WIDTH:c.x+Blockly.BlockSvg.NOTCH_WIDTH,c.y+d+1),this.block_.nextConnection.targetConnection&&this.block_.nextConnection.tighten_());this.squareBottomLeftCorner_?(a.push("H 0"),Blockly.RTL||b.push("M","1,"+d)):(a.push("H",Blockly.BlockSvg.CORNER_RADIUS),a.push("a",
Blockly.BlockSvg.CORNER_RADIUS+","+Blockly.BlockSvg.CORNER_RADIUS+" 0 0,1 -"+Blockly.BlockSvg.CORNER_RADIUS+",-"+Blockly.BlockSvg.CORNER_RADIUS),Blockly.RTL||(b.push("M",Blockly.BlockSvg.DISTANCE_45_INSIDE+","+(d-Blockly.BlockSvg.DISTANCE_45_INSIDE)),b.push("A",Blockly.BlockSvg.CORNER_RADIUS-1+","+(Blockly.BlockSvg.CORNER_RADIUS-1)+" 0 0,1 1,"+(d-Blockly.BlockSvg.CORNER_RADIUS))))};
Blockly.BlockSvg.prototype.renderDrawLeft_=function(a,b,c){this.block_.outputConnection?(this.block_.outputConnection.moveTo(c.x,c.y),a.push("V",Blockly.BlockSvg.TAB_HEIGHT),a.push("c 0,-10 -"+Blockly.BlockSvg.TAB_WIDTH+",8 -"+Blockly.BlockSvg.TAB_WIDTH+",-7.5 s "+Blockly.BlockSvg.TAB_WIDTH+",2.5 "+Blockly.BlockSvg.TAB_WIDTH+",-7.5"),Blockly.RTL?(b.push("M",-0.3*Blockly.BlockSvg.TAB_WIDTH+",8.9"),b.push("l",-0.45*Blockly.BlockSvg.TAB_WIDTH+",-2.1")):(b.push("V",Blockly.BlockSvg.TAB_HEIGHT-1),b.push("m",
-0.92*Blockly.BlockSvg.TAB_WIDTH+",-1 q "+-0.19*Blockly.BlockSvg.TAB_WIDTH+",-5.5 0,-11"),b.push("m",0.92*Blockly.BlockSvg.TAB_WIDTH+",1 V 1 H 2"))):Blockly.RTL||(this.squareTopLeftCorner_?b.push("V",1):b.push("V",Blockly.BlockSvg.CORNER_RADIUS));a.push("z")};Blockly.Comment=function(a){this.block_=a;this.createIcon_()};Blockly.Comment.ICON_RADIUS=8;Blockly.Comment.prototype.bubble_=null;Blockly.Comment.prototype.text_="";Blockly.Comment.prototype.iconX_=0;Blockly.Comment.prototype.iconY_=0;Blockly.Comment.prototype.width_=160;Blockly.Comment.prototype.height_=80;
Blockly.Comment.prototype.createIcon_=function(){this.iconGroup_=Blockly.createSvgElement("g",{},null);this.block_.isInFlyout||this.iconGroup_.setAttribute("class","blocklyIconGroup");Blockly.createSvgElement("circle",{"class":"blocklyIconShield",r:Blockly.Comment.ICON_RADIUS,cx:Blockly.Comment.ICON_RADIUS,cy:Blockly.Comment.ICON_RADIUS},this.iconGroup_);this.iconMark_=Blockly.createSvgElement("text",{"class":"blocklyIconMark",x:Blockly.Comment.ICON_RADIUS,y:2*Blockly.Comment.ICON_RADIUS-3},this.iconGroup_);
this.iconMark_.appendChild(document.createTextNode("?"));this.block_.getSvgRoot().appendChild(this.iconGroup_);Blockly.bindEvent_(this.iconGroup_,"mouseup",this,this.iconClick_)};
Blockly.Comment.prototype.createEditor_=function(){this.foreignObject_=Blockly.createSvgElement("foreignObject",{x:Blockly.Bubble.BORDER_WIDTH,y:Blockly.Bubble.BORDER_WIDTH},null);var a=document.createElementNS(Blockly.HTML_NS,"body");a.setAttribute("xmlns",Blockly.HTML_NS);a.className="blocklyMinimalBody";this.textarea_=document.createElementNS(Blockly.HTML_NS,"textarea");this.textarea_.className="blocklyCommentTextarea";this.textarea_.setAttribute("dir",Blockly.RTL?"RTL":"LTR");a.appendChild(this.textarea_);
this.foreignObject_.appendChild(a);Blockly.bindEvent_(this.textarea_,"mouseup",this,this.textareaFocus_);return this.foreignObject_};Blockly.Comment.prototype.resizeBubble_=function(){var a=this.bubble_.getBubbleSize(),b=2*Blockly.Bubble.BORDER_WIDTH;this.foreignObject_.setAttribute("width",a.width-b);this.foreignObject_.setAttribute("height",a.height-b);this.textarea_.style.width=a.width-b-4+"px";this.textarea_.style.height=a.height-b-4+"px"};Blockly.Comment.prototype.isVisible=function(){return!!this.bubble_};
Blockly.Comment.prototype.setVisible=function(a){if(a!=this.isVisible()){var b=this.getText(),c=this.getBubbleSize();a?(this.bubble_=new Blockly.Bubble(this.block_.workspace,this.createEditor_(),this.block_.svg_.svgGroup_,this.iconX_,this.iconY_,this.width_,this.height_),this.bubble_.registerResizeEvent(this,this.resizeBubble_),this.updateColour(),this.text_=null):(this.bubble_.dispose(),this.foreignObject_=this.textarea_=this.bubble_=null);this.setText(b);this.setBubbleSize(c.width,c.height)}};
Blockly.Comment.prototype.iconClick_=function(){this.setVisible(!this.isVisible())};Blockly.Comment.prototype.textareaFocus_=function(){this.bubble_.promote_();this.textarea_.focus()};Blockly.Comment.prototype.getBubbleSize=function(){return this.isVisible()?this.bubble_.getBubbleSize():{width:this.width_,height:this.height_}};Blockly.Comment.prototype.setBubbleSize=function(a,b){this.isVisible()?this.bubble_.setBubbleSize(a,b):(this.width_=a,this.height_=b)};
Blockly.Comment.prototype.getText=function(){return this.isVisible()?this.textarea_.value:this.text_};Blockly.Comment.prototype.setText=function(a){this.isVisible()?this.textarea_.value=a:this.text_=a};Blockly.Comment.prototype.updateColour=function(){if(this.isVisible()){var a=Blockly.makeColour(this.block_.getColour());this.bubble_.setColour(a)}};
Blockly.Comment.prototype.dispose=function(){goog.dom.removeNode(this.iconGroup_);this.iconGroup_=null;this.setVisible(!1);this.block_=this.block_.comment=null};
Blockly.Comment.prototype.renderIcon=function(a){if(this.block_.collapsed)return this.iconGroup_.setAttribute("display","none"),a;this.iconGroup_.setAttribute("display","block");var b=2*Blockly.Comment.ICON_RADIUS;Blockly.RTL&&(a-=b);this.iconGroup_.setAttribute("transform","translate("+a+", 5)");this.computeIconLocation();return a=Blockly.RTL?a-Blockly.BlockSvg.SEP_SPACE_X:a+(b+Blockly.BlockSvg.SEP_SPACE_X)};
Blockly.Comment.prototype.setIconLocation=function(a,b){this.iconX_=a;this.iconY_=b;this.isVisible()&&this.bubble_.setAnchorLocation(a,b)};Blockly.Comment.prototype.computeIconLocation=function(){var a=this.block_.getRelativeToSurfaceXY(),b=Blockly.getRelativeXY_(this.iconGroup_),c=a.x+b.x+Blockly.Comment.ICON_RADIUS,a=a.y+b.y+Blockly.Comment.ICON_RADIUS;(c!==this.iconX_||a!==this.iconY_)&&this.setIconLocation(c,a)};Blockly.Comment.prototype.getIconLocation=function(){return{x:this.iconX_,y:this.iconY_}};Blockly.ScrollbarPair=function(a,b,c){this.element_=a;this.getMetrics_=b;this.setMetrics_=c;this.oldHostMetrics_=null;this.hScroll=new Blockly.Scrollbar(a,b,c,!0,!0);this.vScroll=new Blockly.Scrollbar(a,b,c,!1,!0);this.corner_=this.addCorner_(a);this.resize();var d=this;this.onResizeWrapper_=Blockly.bindEvent_(window,"resize",d,function(){d.resize()})};
Blockly.ScrollbarPair.prototype.dispose=function(){Blockly.unbindEvent_(this.onResizeWrapper_);this.onResizeWrapper_=null;goog.dom.removeNode(this.corner_);this.oldHostMetrics_=this.setMetrics_=this.getMetrics_=this.element_=this.corner_=null;this.hScroll.dispose();this.hScroll=null;this.vScroll.dispose();this.vScroll=null};
Blockly.ScrollbarPair.prototype.addCorner_=function(a){var b=Blockly.createSvgElement("rect",{height:Blockly.Scrollbar.scrollbarThickness,width:Blockly.Scrollbar.scrollbarThickness,style:"fill: #fff"},null);Blockly.Scrollbar.insertAfter_(b,a);return b};
Blockly.ScrollbarPair.prototype.resize=function(){var a=this.getMetrics_();if(a){var b=!1,c=!1;if(!this.oldHostMetrics_||this.oldHostMetrics_.viewWidth!=a.viewWidth||this.oldHostMetrics_.viewHeight!=a.viewHeight||this.oldHostMetrics_.absoluteTop!=a.absoluteTop||this.oldHostMetrics_.absoluteLeft!=a.absoluteLeft)c=b=!0;else{if(!this.oldHostMetrics_||this.oldHostMetrics_.contentWidth!=a.contentWidth||this.oldHostMetrics_.viewLeft!=a.viewLeft||this.oldHostMetrics_.contentLeft!=a.contentLeft)b=!0;if(!this.oldHostMetrics_||
this.oldHostMetrics_.contentHeight!=a.contentHeight||this.oldHostMetrics_.viewTop!=a.viewTop||this.oldHostMetrics_.contentTop!=a.contentTop)c=!0}b&&this.hScroll.resize(a);c&&this.vScroll.resize(a);(!this.oldHostMetrics_||this.oldHostMetrics_.viewWidth!=a.viewWidth||this.oldHostMetrics_.absoluteLeft!=a.absoluteLeft)&&this.corner_.setAttribute("x",this.vScroll.xCoordinate);(!this.oldHostMetrics_||this.oldHostMetrics_.viewHeight!=a.viewHeight||this.oldHostMetrics_.absoluteTop!=a.absoluteTop)&&this.corner_.setAttribute("y",
this.hScroll.yCoordinate);this.oldHostMetrics_=a}};Blockly.ScrollbarPair.prototype.set=function(a,b){if(Blockly.Scrollbar===Blockly.ScrollbarNative){this.hScroll.set(a,!1);this.vScroll.set(b,!1);var c={};c.x=this.hScroll.outerDiv_.scrollLeft/this.hScroll.innerImg_.offsetWidth||0;c.y=this.vScroll.outerDiv_.scrollTop/this.vScroll.innerImg_.offsetHeight||0;this.setMetrics_(c)}else this.hScroll.set(a,!0),this.vScroll.set(b,!0)};Blockly.ScrollbarInterface=function(){};
Blockly.ScrollbarInterface.prototype.dispose=function(){};Blockly.ScrollbarInterface.prototype.resize=function(){};Blockly.ScrollbarInterface.prototype.isVisible=function(){};Blockly.ScrollbarInterface.prototype.setVisible=function(){};Blockly.ScrollbarInterface.prototype.set=function(){};
Blockly.ScrollbarNative=function(a,b,c,d,e){this.element_=a;this.getMetrics_=b;this.setMetrics_=c;this.pair_=e||!1;this.horizontal_=d;this.createDom_(a);if(null!==d){Blockly.Scrollbar.scrollbarThickness||Blockly.ScrollbarNative.measureScrollbarThickness_(a);d?(this.foreignObject_.setAttribute("height",Blockly.Scrollbar.scrollbarThickness),this.outerDiv_.style.height=Blockly.Scrollbar.scrollbarThickness+"px",this.outerDiv_.style.overflowX="scroll",this.outerDiv_.style.overflowY="hidden",this.innerImg_.style.height=
"1px"):(this.foreignObject_.setAttribute("width",Blockly.Scrollbar.scrollbarThickness),this.outerDiv_.style.width=Blockly.Scrollbar.scrollbarThickness+"px",this.outerDiv_.style.overflowX="hidden",this.outerDiv_.style.overflowY="scroll",this.innerImg_.style.width="1px");var f=this;this.onScrollWrapper_=Blockly.bindEvent_(this.outerDiv_,"scroll",f,function(){f.onScroll_()});Blockly.bindEvent_(this.foreignObject_,"mousedown",null,Blockly.noEvent);this.pair_||(this.resize(),this.onResizeWrapper_=Blockly.bindEvent_(window,
"resize",f,function(){f.resize()}))}};Blockly.ScrollbarNative.prototype.dispose=function(){Blockly.unbindEvent_(this.onResizeWrapper_);this.onResizeWrapper_=null;Blockly.unbindEvent_(this.onScrollWrapper_);this.onScrollWrapper_=null;goog.dom.removeNode(this.foreignObject_);this.innerImg_=this.outerDiv_=this.setMetrics_=this.getMetrics_=this.element_=this.foreignObject_=null};
Blockly.ScrollbarNative.prototype.resize=function(a){if(!a&&(a=this.getMetrics_(),!a))return;if(this.horizontal_){var b=a.viewWidth;this.pair_?b-=Blockly.Scrollbar.scrollbarThickness:this.setVisible(b<a.contentHeight);this.ratio_=b/a.viewWidth;var c=this.ratio_*a.contentWidth,d=(a.viewLeft-a.contentLeft)*this.ratio_;this.outerDiv_.style.width=b+"px";this.innerImg_.style.width=c+"px";this.xCoordinate=a.absoluteLeft;this.pair_&&Blockly.RTL&&(this.xCoordinate+=Blockly.Scrollbar.scrollbarThickness);this.yCoordinate=
a.absoluteTop+a.viewHeight-Blockly.Scrollbar.scrollbarThickness;this.foreignObject_.setAttribute("x",this.xCoordinate);this.foreignObject_.setAttribute("y",this.yCoordinate);this.foreignObject_.setAttribute("width",Math.max(0,b));this.outerDiv_.scrollLeft=Math.round(d)}else b=a.viewHeight,this.pair_?b-=Blockly.Scrollbar.scrollbarThickness:this.setVisible(b<a.contentHeight),this.ratio_=b/a.viewHeight,c=this.ratio_*a.contentHeight,d=(a.viewTop-a.contentTop)*this.ratio_,this.outerDiv_.style.height=b+
"px",this.innerImg_.style.height=c+"px",this.xCoordinate=a.absoluteLeft,Blockly.RTL||(this.xCoordinate+=a.viewWidth-Blockly.Scrollbar.scrollbarThickness),this.yCoordinate=a.absoluteTop,this.foreignObject_.setAttribute("x",this.xCoordinate),this.foreignObject_.setAttribute("y",this.yCoordinate),this.foreignObject_.setAttribute("height",Math.max(0,b)),this.outerDiv_.scrollTop=Math.round(d)};
Blockly.ScrollbarNative.prototype.createDom_=function(a){this.foreignObject_=Blockly.createSvgElement("foreignObject",{},null);var b=document.createElementNS(Blockly.HTML_NS,"body");b.setAttribute("xmlns",Blockly.HTML_NS);b.setAttribute("class","blocklyMinimalBody");var c=document.createElementNS(Blockly.HTML_NS,"div");this.outerDiv_=c;var d=document.createElementNS(Blockly.HTML_NS,"img");d.setAttribute("src",Blockly.pathToBlockly+"media/1x1.gif");this.innerImg_=d;c.appendChild(d);b.appendChild(c);
this.foreignObject_.appendChild(b);Blockly.Scrollbar.insertAfter_(this.foreignObject_,a)};Blockly.ScrollbarNative.prototype.isVisible=function(){return"none"!=this.foreignObject_.style.display};Blockly.ScrollbarNative.prototype.setVisible=function(a){if(a!=this.isVisible()){if(this.pair_)throw"Unable to toggle visibility of paired scrollbars.";a?(this.foreignObject_.style.display="block",this.getMetrics_()):(this.setMetrics_({x:0,y:0}),this.foreignObject_.style.display="none")}};
Blockly.ScrollbarNative.prototype.onScroll_=function(){var a={};this.horizontal_?a.x=this.outerDiv_.scrollLeft/this.innerImg_.offsetWidth||0:a.y=this.outerDiv_.scrollTop/this.innerImg_.offsetHeight||0;this.setMetrics_(a)};
Blockly.ScrollbarNative.prototype.set=function(a,b){if(!b&&this.onScrollWrapper_)var c=Blockly.unbindEvent_(this.onScrollWrapper_);this.horizontal_?this.outerDiv_.scrollLeft=a*this.ratio_:this.outerDiv_.scrollTop=a*this.ratio_;c&&(this.onScrollWrapper_=Blockly.bindEvent_(this.outerDiv_,"scroll",this,c))};
Blockly.ScrollbarNative.measureScrollbarThickness_=function(a){a=new Blockly.ScrollbarNative(a,null,null,null,!1);a.outerDiv_.style.width="100px";a.outerDiv_.style.height="100px";a.innerImg_.style.width="100%";a.innerImg_.style.height="200px";a.foreignObject_.setAttribute("width",1);a.foreignObject_.setAttribute("height",1);a.outerDiv_.style.overflowY="scroll";var b=a.innerImg_.offsetWidth;a.outerDiv_.style.overflowY="hidden";var c=a.innerImg_.offsetWidth;goog.dom.removeNode(a.foreignObject_);a=c-
b;0>=a&&(a=15);Blockly.Scrollbar.scrollbarThickness=a};
Blockly.ScrollbarSvg=function(a,b,c,d,e){this.element_=a;this.getMetrics_=b;this.setMetrics_=c;this.pair_=e||!1;this.horizontal_=d;this.createDom_(a);d?(this.svgBackground_.setAttribute("height",Blockly.Scrollbar.scrollbarThickness),this.svgKnob_.setAttribute("height",Blockly.Scrollbar.scrollbarThickness-6),this.svgKnob_.setAttribute("y",3)):(this.svgBackground_.setAttribute("width",Blockly.Scrollbar.scrollbarThickness),this.svgKnob_.setAttribute("width",Blockly.Scrollbar.scrollbarThickness-6),this.svgKnob_.setAttribute("x",
3));var f=this;this.pair_||(this.resize(),this.onResizeWrapper_=Blockly.bindEvent_(window,"resize",f,function(){f.resize()}));this.onMouseDownBarWrapper_=Blockly.bindEvent_(this.svgBackground_,"mousedown",f,f.onMouseDownBar_);this.onMouseDownKnobWrapper_=Blockly.bindEvent_(this.svgKnob_,"mousedown",f,f.onMouseDownKnob_)};
Blockly.ScrollbarSvg.prototype.dispose=function(){this.onMouseUpKnob_();this.onResizeWrapper_&&(Blockly.unbindEvent_(this.onResizeWrapper_),this.onResizeWrapper_=null);Blockly.unbindEvent_(this.onMouseDownBarWrapper_);this.onMouseDownBarWrapper_=null;Blockly.unbindEvent_(this.onMouseDownKnobWrapper_);this.onMouseDownKnobWrapper_=null;goog.dom.removeNode(this.svgGroup_);this.setMetrics_=this.getMetrics_=this.element_=this.svgKnob_=this.svgBackground_=this.svgGroup_=null};
Blockly.ScrollbarSvg.prototype.resize=function(a){if(!a&&(a=this.getMetrics_(),!a))return;if(this.horizontal_){var b=a.viewWidth;this.pair_?b-=Blockly.Scrollbar.scrollbarThickness:this.setVisible(b<a.contentHeight);this.ratio_=b/a.contentWidth;if(-Infinity===this.ratio_||Infinity===this.ratio_||isNaN(this.ratio_))this.ratio_=0;var c=a.viewWidth*this.ratio_,d=(a.viewLeft-a.contentLeft)*this.ratio_;this.svgKnob_.setAttribute("width",Math.max(0,c));this.xCoordinate=a.absoluteLeft;this.pair_&&Blockly.RTL&&
(this.xCoordinate+=a.absoluteLeft+Blockly.Scrollbar.scrollbarThickness);this.yCoordinate=a.absoluteTop+a.viewHeight-Blockly.Scrollbar.scrollbarThickness;this.svgGroup_.setAttribute("transform","translate("+this.xCoordinate+", "+this.yCoordinate+")");this.svgBackground_.setAttribute("width",Math.max(0,b));this.svgKnob_.setAttribute("x",this.constrainKnob_(d))}else{b=a.viewHeight;this.pair_?b-=Blockly.Scrollbar.scrollbarThickness:this.setVisible(b<a.contentHeight);this.ratio_=b/a.contentHeight;if(-Infinity===
this.ratio_||Infinity===this.ratio_||isNaN(this.ratio_))this.ratio_=0;c=a.viewHeight*this.ratio_;d=(a.viewTop-a.contentTop)*this.ratio_;this.svgKnob_.setAttribute("height",Math.max(0,c));this.xCoordinate=a.absoluteLeft;Blockly.RTL||(this.xCoordinate+=a.viewWidth-Blockly.Scrollbar.scrollbarThickness);this.yCoordinate=a.absoluteTop;this.svgGroup_.setAttribute("transform","translate("+this.xCoordinate+", "+this.yCoordinate+")");this.svgBackground_.setAttribute("height",Math.max(0,b));this.svgKnob_.setAttribute("y",
this.constrainKnob_(d))}this.onScroll_()};Blockly.ScrollbarSvg.prototype.createDom_=function(a){this.svgGroup_=Blockly.createSvgElement("g",{},null);this.svgBackground_=Blockly.createSvgElement("rect",{"class":"blocklyScrollbarBackground"},this.svgGroup_);var b=Math.floor((Blockly.Scrollbar.scrollbarThickness-6)/2);this.svgKnob_=Blockly.createSvgElement("rect",{"class":"blocklyScrollbarKnob",rx:b,ry:b},this.svgGroup_);Blockly.Scrollbar.insertAfter_(this.svgGroup_,a)};
Blockly.ScrollbarSvg.prototype.isVisible=function(){return"none"!=this.svgGroup_.getAttribute("display")};Blockly.ScrollbarSvg.prototype.setVisible=function(a){if(a!=this.isVisible()){if(this.pair_)throw"Unable to toggle visibility of paired scrollbars.";a?this.svgGroup_.setAttribute("display","block"):(this.setMetrics_({x:0,y:0}),this.svgGroup_.setAttribute("display","none"))}};
Blockly.ScrollbarSvg.prototype.onMouseDownBar_=function(a){Blockly.hideChaff(!0);if(!Blockly.isRightButton(a)){Blockly.svgResize();var b=Blockly.svgSize(),b=this.horizontal_?a.x-b.left:a.y-b.top,c=Blockly.getSvgXY_(this.svgKnob_),c=this.horizontal_?c.x:c.y,d=parseFloat(this.svgKnob_.getAttribute(this.horizontal_?"width":"height")),e=parseFloat(this.svgKnob_.getAttribute(this.horizontal_?"x":"y")),f=0.95*d;b<=c?e-=f:b>=c+d&&(e+=f);this.svgKnob_.setAttribute(this.horizontal_?"x":"y",this.constrainKnob_(e));
this.onScroll_()}a.stopPropagation()};
Blockly.ScrollbarSvg.prototype.onMouseDownKnob_=function(a){Blockly.hideChaff(!0);this.onMouseUpKnob_();Blockly.isRightButton(a)||(this.startDragKnob=parseFloat(this.svgKnob_.getAttribute(this.horizontal_?"x":"y")),this.startDragMouse=this.horizontal_?a.clientX:a.clientY,Blockly.ScrollbarSvg.onMouseUpWrapper_=Blockly.bindEvent_(document,"mouseup",this,this.onMouseUpKnob_),Blockly.ScrollbarSvg.onMouseMoveWrapper_=Blockly.bindEvent_(document,"mousemove",this,this.onMouseMoveKnob_));a.stopPropagation()};
Blockly.ScrollbarSvg.prototype.onMouseMoveKnob_=function(a){this.svgKnob_.setAttribute(this.horizontal_?"x":"y",this.constrainKnob_(this.startDragKnob+((this.horizontal_?a.clientX:a.clientY)-this.startDragMouse)));this.onScroll_()};
Blockly.ScrollbarSvg.prototype.onMouseUpKnob_=function(){Blockly.ScrollbarSvg.onMouseUpWrapper_&&(Blockly.unbindEvent_(Blockly.ScrollbarSvg.onMouseUpWrapper_),Blockly.ScrollbarSvg.onMouseUpWrapper_=null);Blockly.ScrollbarSvg.onMouseMoveWrapper_&&(Blockly.unbindEvent_(Blockly.ScrollbarSvg.onMouseMoveWrapper_),Blockly.ScrollbarSvg.onMouseMoveWrapper_=null)};
Blockly.ScrollbarSvg.prototype.constrainKnob_=function(a){if(0>=a||isNaN(a))a=0;else{var b=this.horizontal_?"width":"height",c=parseFloat(this.svgBackground_.getAttribute(b)),b=parseFloat(this.svgKnob_.getAttribute(b));a=Math.min(a,c-b)}return a};
Blockly.ScrollbarSvg.prototype.onScroll_=function(){var a=parseFloat(this.svgKnob_.getAttribute(this.horizontal_?"x":"y")),b=parseFloat(this.svgBackground_.getAttribute(this.horizontal_?"width":"height")),a=a/b;isNaN(a)&&(a=0);b={};this.horizontal_?b.x=a:b.y=a;this.setMetrics_(b)};Blockly.ScrollbarSvg.prototype.set=function(a,b){this.svgKnob_.setAttribute(this.horizontal_?"x":"y",a*this.ratio_);if(b)this.onScroll_()};
goog.userAgent.GECKO&&(goog.userAgent.MAC||goog.userAgent.LINUX)?(Blockly.Scrollbar=Blockly.ScrollbarNative,Blockly.Scrollbar.scrollbarThickness=0):(Blockly.Scrollbar=Blockly.ScrollbarSvg,Blockly.Scrollbar.scrollbarThickness=15);Blockly.Scrollbar.insertAfter_=function(a,b){var c=b.nextSibling,d=b.parentNode;if(!d)throw"Reference node has no parent.";c?d.insertBefore(a,c):d.appendChild(a)};Blockly.Trashcan=function(a){this.getMetrics_=a};Blockly.Trashcan.prototype.BODY_URL_="media/trashbody.png";Blockly.Trashcan.prototype.LID_URL_="media/trashlid.png";Blockly.Trashcan.prototype.WIDTH_=47;Blockly.Trashcan.prototype.BODY_HEIGHT_=45;Blockly.Trashcan.prototype.LID_HEIGHT_=15;Blockly.Trashcan.prototype.MARGIN_BOTTOM_=35;Blockly.Trashcan.prototype.MARGIN_SIDE_=35;Blockly.Trashcan.prototype.isOpen=!1;Blockly.Trashcan.prototype.svgGroup_=null;Blockly.Trashcan.prototype.svgBody_=null;
Blockly.Trashcan.prototype.svgLid_=null;Blockly.Trashcan.prototype.lidTask_=0;Blockly.Trashcan.prototype.lidAngle_=0;Blockly.Trashcan.prototype.left_=0;Blockly.Trashcan.prototype.top_=0;
Blockly.Trashcan.prototype.createDom=function(){this.svgGroup_=Blockly.createSvgElement("g",{filter:"url(#blocklyTrashcanShadowFilter)"},null);this.svgBody_=Blockly.createSvgElement("image",{width:this.WIDTH_,height:this.BODY_HEIGHT_},this.svgGroup_);this.svgBody_.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",Blockly.pathToBlockly+this.BODY_URL_);this.svgBody_.setAttribute("y",this.LID_HEIGHT_);this.svgLid_=Blockly.createSvgElement("image",{width:this.WIDTH_,height:this.LID_HEIGHT_},
this.svgGroup_);this.svgLid_.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",Blockly.pathToBlockly+this.LID_URL_);return this.svgGroup_};Blockly.Trashcan.prototype.init=function(){this.setOpen_(!1);this.position_();Blockly.bindEvent_(window,"resize",this,this.position_)};Blockly.Trashcan.prototype.dispose=function(){this.svgGroup_&&(goog.dom.removeNode(this.svgGroup_),this.svgGroup_=null);this.getMetrics_=this.svgLid_=this.svgBody_=null;goog.Timer.clear(this.lidTask_)};
Blockly.Trashcan.prototype.position_=function(){var a=this.getMetrics_();a&&(this.left_=Blockly.RTL?this.MARGIN_SIDE_:a.viewWidth+a.absoluteLeft-this.WIDTH_-this.MARGIN_SIDE_,this.top_=a.viewHeight+a.absoluteTop-(this.BODY_HEIGHT_+this.LID_HEIGHT_)-this.MARGIN_BOTTOM_,this.svgGroup_.setAttribute("transform","translate("+this.left_+","+this.top_+")"))};
Blockly.Trashcan.prototype.onMouseMove=function(a){if(this.svgGroup_){var b=Blockly.getAbsoluteXY_(this.svgGroup_);a=a.clientX>b.x&&a.clientX<b.x+this.WIDTH_&&a.clientY>b.y&&a.clientY<b.y+this.BODY_HEIGHT_+this.LID_HEIGHT_;this.isOpen!=a&&this.setOpen_(a)}};Blockly.Trashcan.prototype.setOpen_=function(a){this.isOpen!=a&&(goog.Timer.clear(this.lidTask_),this.isOpen=a,this.animateLid_())};
Blockly.Trashcan.prototype.animateLid_=function(){this.lidAngle_+=this.isOpen?10:-10;this.lidAngle_=Math.max(0,this.lidAngle_);this.svgLid_.setAttribute("transform","rotate("+(Blockly.RTL?-this.lidAngle_:this.lidAngle_)+", "+(Blockly.RTL?4:this.WIDTH_-4)+", "+(this.LID_HEIGHT_-2)+")");if(this.isOpen?45>this.lidAngle_:0<this.lidAngle_)this.lidTask_=goog.Timer.callOnce(this.animateLid_,5,this)};Blockly.Trashcan.prototype.close=function(){this.setOpen_(!1)};Blockly.Xml={};Blockly.Xml.workspaceToDom=function(a){var b=goog.dom.createDom("xml");a=a.getTopBlocks(!0);for(var c=0,d;d=a[c];c++){var e=Blockly.Xml.blockToDom_(d);d=d.getRelativeToSurfaceXY();e.setAttribute("x",Blockly.RTL?-d.x:d.x);e.setAttribute("y",d.y);b.appendChild(e)}return b};
Blockly.Xml.blockToDom_=function(a){var b=goog.dom.createDom("block");b.setAttribute("type",a.type);if(a.mutationToDom){var c=a.mutationToDom();c&&b.appendChild(c)}for(var d=0;c=a.inputList[d];d++)for(var e=0,f;f=c.titleRow[e];e++)if(f.name&&f.EDITABLE){var g=goog.dom.createDom("title",null,f.getValue());g.setAttribute("name",f.name);b.appendChild(g)}a.comment&&(c=goog.dom.createDom("comment",null,a.comment.getText()),c.setAttribute("pinned",a.comment.isVisible()),d=a.comment.getBubbleSize(),c.setAttribute("h",
d.height),c.setAttribute("w",d.width),b.appendChild(c));d=!1;for(e=0;c=a.inputList[e];e++){var h;f=!0;c.type!=Blockly.DUMMY_INPUT&&(g=c.connection.targetBlock(),c.type==Blockly.INPUT_VALUE?(h=goog.dom.createDom("value"),d=!0):c.type==Blockly.NEXT_STATEMENT&&(h=goog.dom.createDom("statement")),g&&(h.appendChild(Blockly.Xml.blockToDom_(g)),f=!1),h.setAttribute("name",c.name),f||b.appendChild(h))}d&&b.setAttribute("inline",a.inputsInline);a.collapsed&&b.setAttribute("collapsed",!0);a.disabled&&b.setAttribute("disabled",
!0);a.deletable||b.setAttribute("deletable",!1);a.movable||b.setAttribute("movable",!1);if(a.nextConnection&&(a=a.nextConnection.targetBlock()))h=goog.dom.createDom("next",null,Blockly.Xml.blockToDom_(a)),b.appendChild(h);return b};Blockly.Xml.domToText=function(a){return(new XMLSerializer).serializeToString(a)};
Blockly.Xml.domToPrettyText=function(a){a=Blockly.Xml.domToText(a).split("<");for(var b="",c=1;c<a.length;c++){var d=a[c];"/"==d[0]&&(b=b.substring(2));a[c]=b+"<"+d;"/"!=d[0]&&"/>"!=d.slice(-2)&&(b+="  ")}a=a.join("\n");a=a.replace(/(<(\w+)\b[^>]*>[^\n]*)\n *<\/\2>/g,"$1</$2>");return a.replace(/^\n/,"")};
Blockly.Xml.textToDom=function(a){a=(new DOMParser).parseFromString(a,"text/xml");if(!a||!a.firstChild||"xml"!=a.firstChild.nodeName.toLowerCase()||a.firstChild!==a.lastChild)throw"Blockly.Xml.textToDom did not obtain a valid XML tree.";return a.firstChild};
Blockly.Xml.domToWorkspace=function(a,b){for(var c=0,d;d=b.childNodes[c];c++)if("block"==d.nodeName.toLowerCase()){var e=Blockly.Xml.domToBlock_(a,d),f=parseInt(d.getAttribute("x"),10);d=parseInt(d.getAttribute("y"),10);!isNaN(f)&&!isNaN(d)&&e.moveBy(Blockly.RTL?-f:f,d)}};
Blockly.Xml.domToBlock_=function(a,b){var c=b.getAttribute("type"),c=new Blockly.Block(a,c);c.initSvg();for(var d=null,e=0,f;f=b.childNodes[e];e++)if(!(3==f.nodeType&&f.data.match(/^\s*$/))){for(var g=null,h=0,j;j=f.childNodes[h];h++)if(3!=j.nodeType||!j.data.match(/^\s*$/))g=j;h=f.getAttribute("name");switch(f.nodeName.toLowerCase()){case "mutation":c.domToMutation&&c.domToMutation(f);break;case "comment":c.setCommentText(f.textContent);(g=f.getAttribute("pinned"))&&c.comment.setVisible("true"==
g);g=parseInt(f.getAttribute("w"),10);f=parseInt(f.getAttribute("h"),10);!isNaN(g)&&!isNaN(f)&&c.comment.setBubbleSize(g,f);break;case "title":c.setTitleValue(f.textContent,h);break;case "value":case "statement":f=c.getInput(h);if(!f)throw"Input does not exist: "+h;if(g&&"block"==g.nodeName.toLowerCase())if(d=Blockly.Xml.domToBlock_(a,g),d.outputConnection)f.connection.connect(d.outputConnection);else if(d.previousConnection)f.connection.connect(d.previousConnection);else throw"Child block does not have output or previous statement.";
break;case "next":if(g&&"block"==g.nodeName.toLowerCase()){if(c.nextConnection){if(c.nextConnection.targetConnection)throw"Next statement is already connected.";}else throw"Next statement does not exist.";d=Blockly.Xml.domToBlock_(a,g);if(!d.previousConnection)throw"Next block does not have previous statement.";c.nextConnection.connect(d.previousConnection)}}}(e=b.getAttribute("inline"))&&c.setInputsInline("true"==e);(e=b.getAttribute("collapsed"))&&c.setCollapsed("true"==e);(e=b.getAttribute("disabled"))&&
c.setDisabled("true"==e);if(e=b.getAttribute("deletable"))c.deletable="true"==e;if(e=b.getAttribute("movable"))c.movable="true"==e;d||c.render();return c};Blockly.Xml.deleteNext=function(a){for(var b=0,c;c=a.childNodes[b];b++)if("next"==c.nodeName.toLowerCase()){a.removeChild(c);break}};Blockly.Workspace=function(){this.isFlyout=!1;this.topBlocks_=[];this.maxBlocks=Infinity;Blockly.ConnectionDB.init(this)};Blockly.Workspace.prototype.dragMode=!1;Blockly.Workspace.prototype.scrollX=0;Blockly.Workspace.prototype.scrollY=0;Blockly.Workspace.prototype.trashcan=null;Blockly.Workspace.prototype.fireChangeEventPid_=null;Blockly.Workspace.prototype.scrollbar=null;
Blockly.Workspace.prototype.createDom=function(){this.svgGroup_=Blockly.createSvgElement("g",{},null);this.svgBlockCanvas_=Blockly.createSvgElement("g",{},this.svgGroup_);this.svgBubbleCanvas_=Blockly.createSvgElement("g",{},this.svgGroup_);this.fireChangeEvent();return this.svgGroup_};
Blockly.Workspace.prototype.dispose=function(){this.svgGroup_&&(goog.dom.removeNode(this.svgGroup_),this.svgGroup_=null);this.svgBubbleCanvas_=this.svgBlockCanvas_=null;this.trashcan&&(this.trashcan.dispose(),this.trashcan=null)};Blockly.Workspace.prototype.addTrashcan=function(a){Blockly.Trashcan&&Blockly.editable&&(this.trashcan=new Blockly.Trashcan(a),a=this.trashcan.createDom(),this.svgGroup_.insertBefore(a,this.svgBlockCanvas_),this.trashcan.init())};Blockly.Workspace.prototype.getCanvas=function(){return this.svgBlockCanvas_};
Blockly.Workspace.prototype.getBubbleCanvas=function(){return this.svgBubbleCanvas_};Blockly.Workspace.prototype.addTopBlock=function(a){this.topBlocks_.push(a);this.fireChangeEvent()};Blockly.Workspace.prototype.removeTopBlock=function(a){for(var b=!1,c,d=0;c=this.topBlocks_[d];d++)if(c==a){this.topBlocks_.splice(d,1);b=!0;break}if(!b)throw"Block not present in workspace's list of top-most blocks.";this.fireChangeEvent()};
Blockly.Workspace.prototype.getTopBlocks=function(a){var b=[].concat(this.topBlocks_);a&&1<b.length&&b.sort(function(a,b){return a.getRelativeToSurfaceXY().y-b.getRelativeToSurfaceXY().y});return b};Blockly.Workspace.prototype.getAllBlocks=function(){for(var a=this.getTopBlocks(!1),b=0;b<a.length;b++)a=a.concat(a[b].getChildren());return a};Blockly.Workspace.prototype.clear=function(){for(Blockly.hideChaff();this.topBlocks_.length;)this.topBlocks_[0].dispose()};
Blockly.Workspace.prototype.render=function(){for(var a=this.getAllBlocks(),b=0,c;c=a[b];b++)c.getChildren().length||c.render()};Blockly.Workspace.prototype.getBlockById=function(a){for(var b=this.getAllBlocks(),c=0,d;d=b[c];c++)if(d.id==a)return d;return null};
Blockly.Workspace.prototype.traceOn=function(a){this.traceOn_=a;this.traceWrapper_&&(Blockly.unbindEvent_(this.traceWrapper_),this.traceWrapper_=null);a&&(this.traceWrapper_=Blockly.bindEvent_(this.svgBlockCanvas_,"blocklySelectChange",this,function(){this.traceOn_=!1}))};Blockly.Workspace.prototype.highlightBlock=function(a){if(this.traceOn_){var b=null;if(a&&(b=this.getBlockById(a),!b))return;this.traceOn(!1);b?b.select():Blockly.selected&&Blockly.selected.unselect();this.traceOn(!0)}};
Blockly.Workspace.prototype.fireChangeEvent=function(){this.fireChangeEventPid_&&window.clearTimeout(this.fireChangeEventPid_);var a=this.svgBlockCanvas_;a&&(this.fireChangeEventPid_=window.setTimeout(function(){Blockly.fireUiEvent(a,"blocklyWorkspaceChange")},0))};
Blockly.Workspace.prototype.paste=function(a){if(!(a.getElementsByTagName("block").length>=this.remainingCapacity())){var b=Blockly.Xml.domToBlock_(this,a),c=parseInt(a.getAttribute("x"),10);a=parseInt(a.getAttribute("y"),10);if(!isNaN(c)&&!isNaN(a)){Blockly.RTL&&(c=-c);do for(var d=!1,e=this.getAllBlocks(),f=0,g;g=e[f];f++)g=g.getRelativeToSurfaceXY(),1>=Math.abs(c-g.x)&&1>=Math.abs(a-g.y)&&(c=Blockly.RTL?c-Blockly.SNAP_RADIUS:c+Blockly.SNAP_RADIUS,a+=2*Blockly.SNAP_RADIUS,d=!0);while(d);b.moveBy(c,
a)}b.select()}};Blockly.Workspace.prototype.remainingCapacity=function(){return Infinity==this.maxBlocks?Infinity:this.maxBlocks-this.getAllBlocks().length};Blockly.Connection=function(a,b){this.sourceBlock_=a;this.targetConnection=null;this.type=b;this.y_=this.x_=0;this.inDB_=!1;this.dbList_=this.sourceBlock_.workspace.connectionDBList};
Blockly.Connection.prototype.dispose=function(){if(this.targetConnection)throw"Disconnect connection before disposing of it.";this.inDB_&&this.dbList_[this.type].removeConnection_(this);this.inDB_=!1;Blockly.highlightedConnection_==this&&(Blockly.highlightedConnection_=null);Blockly.localConnection_==this&&(Blockly.localConnection_=null)};Blockly.Connection.prototype.isSuperior=function(){return this.type==Blockly.INPUT_VALUE||this.type==Blockly.NEXT_STATEMENT};
Blockly.Connection.prototype.connect=function(a){if(this.sourceBlock_==a.sourceBlock_)throw"Attempted to connect a block to itself.";if(this.sourceBlock_.workspace!==a.sourceBlock_.workspace)throw"Blocks are on different workspaces.";if(Blockly.OPPOSITE_TYPE[this.type]!=a.type)throw"Attempt to connect incompatible types.";if(this.type==Blockly.INPUT_VALUE||this.type==Blockly.OUTPUT_VALUE){if(this.targetConnection)throw"Source connection already connected (value).";if(a.targetConnection){var b=a.targetBlock();
b.setParent(null);if(!b.outputConnection)throw"Orphan block does not have an output connection.";for(var c=this.sourceBlock_;c=Blockly.Connection.singleConnection_(c,b);)if(c.targetBlock())c=c.targetBlock();else{c.connect(b.outputConnection);b=null;break}b&&window.setTimeout(function(){b.outputConnection.bumpAwayFrom_(a)},Blockly.BUMP_DELAY)}}else{if(this.targetConnection)throw"Source connection already connected (block).";if(a.targetConnection){if(this.type!=Blockly.PREVIOUS_STATEMENT)throw"Can only do a mid-stack connection with the top of a block.";
b=a.targetBlock();b.setParent(null);if(!b.previousConnection)throw"Orphan block does not have a previous connection.";for(c=this.sourceBlock_;c.nextConnection;)if(c.nextConnection.targetConnection)c=c.nextConnection.targetBlock();else{c.nextConnection.connect(b.previousConnection);b=null;break}b&&window.setTimeout(function(){b.previousConnection.bumpAwayFrom_(a)},Blockly.BUMP_DELAY)}}var d;this.isSuperior()?(c=this.sourceBlock_,d=a.sourceBlock_):(c=a.sourceBlock_,d=this.sourceBlock_);this.targetConnection=
a;a.targetConnection=this;d.setParent(c);c.rendered&&c.svg_.updateDisabled();d.rendered&&(d.svg_.updateDisabled(),d.render())};Blockly.Connection.singleConnection_=function(a,b){for(var c=!1,d=0;d<a.inputList.length;d++){var e=a.inputList[d].connection;if(e&&e.type==Blockly.INPUT_VALUE&&b.outputConnection.checkType_(e)){if(c)return null;c=e}}return c};
Blockly.Connection.prototype.disconnect=function(){var a=this.targetConnection;if(a){if(a.targetConnection!=this)throw"Target connection not connected to source connection.";}else throw"Source connection not connected.";this.targetConnection=a.targetConnection=null;var b;this.isSuperior()?(b=this.sourceBlock_,a=a.sourceBlock_):(b=a.sourceBlock_,a=this.sourceBlock_);b.rendered&&b.render();a.rendered&&(a.svg_.updateDisabled(),a.render())};
Blockly.Connection.prototype.targetBlock=function(){return this.targetConnection?this.targetConnection.sourceBlock_:null};
Blockly.Connection.prototype.bumpAwayFrom_=function(a){if(0==Blockly.Block.dragMode_){var b=this.sourceBlock_.getRootBlock(),c=!1;if(!b.movable){b=a.sourceBlock_.getRootBlock();if(!b.movable)return;a=this;c=!0}b.getSvgRoot().parentNode.appendChild(b.getSvgRoot());var d=a.x_+Blockly.SNAP_RADIUS-this.x_;a=a.y_+2*Blockly.SNAP_RADIUS-this.y_;c&&(a=-a);Blockly.RTL&&(d=-d);b.moveBy(d,a)}};
Blockly.Connection.prototype.moveTo=function(a,b){this.inDB_&&this.dbList_[this.type].removeConnection_(this);this.x_=a;this.y_=b;this.dbList_[this.type].addConnection_(this)};Blockly.Connection.prototype.moveBy=function(a,b){this.moveTo(this.x_+a,this.y_+b)};
Blockly.Connection.prototype.highlight=function(){var a;this.type==Blockly.INPUT_VALUE||this.type==Blockly.OUTPUT_VALUE?(a=Blockly.RTL?-Blockly.BlockSvg.TAB_WIDTH:Blockly.BlockSvg.TAB_WIDTH,a="m 0,0 v 5 c 0,10 "+-a+",-8 "+-a+",7.5 s "+a+",-2.5 "+a+",7.5 v 5"):a=Blockly.RTL?"m 20,0 h -5 l -6,4 -3,0 -6,-4 h -5":"m -20,0 h 5 l 6,4 3,0 6,-4 h 5";var b=this.sourceBlock_.getRelativeToSurfaceXY();Blockly.Connection.highlightedPath_=Blockly.createSvgElement("path",{"class":"blocklyHighlightedConnectionPath",
d:a,transform:"translate("+(this.x_-b.x)+", "+(this.y_-b.y)+")"},this.sourceBlock_.getSvgRoot())};Blockly.Connection.prototype.unhighlight=function(){goog.dom.removeNode(Blockly.Connection.highlightedPath_);delete Blockly.Connection.highlightedPath_};
Blockly.Connection.prototype.tighten_=function(){var a=Math.round(this.targetConnection.x_-this.x_),b=Math.round(this.targetConnection.y_-this.y_);if(0!=a||0!=b){var c=this.targetBlock(),d=c.getSvgRoot();if(!d)throw"block is not rendered.";d=Blockly.getRelativeXY_(d);c.getSvgRoot().setAttribute("transform","translate("+(d.x-a)+", "+(d.y-b)+")");c.moveConnections_(-a,-b)}};
Blockly.Connection.prototype.closest=function(a,b,c){function d(b){var c=e[b];if((c.type==Blockly.OUTPUT_VALUE||c.type==Blockly.PREVIOUS_STATEMENT)&&c.targetConnection||!l.checkType_(c))return!0;c=c.sourceBlock_;do{if(k==c)return!0;c=c.getParent()}while(c);var d=f-e[b].x_,c=g-e[b].y_,d=Math.sqrt(d*d+c*c);d<=a&&(j=e[b],a=d);return c<a}if(this.targetConnection)return{connection:null,radius:a};var e=this.dbList_[Blockly.OPPOSITE_TYPE[this.type]],f=this.x_+b,g=this.y_+c;b=0;for(var h=c=e.length-2;b<h;)e[h].y_<
g?b=h:c=h,h=Math.floor((b+c)/2);c=b=h;var j=null,k=this.sourceBlock_,l=this;if(e.length){for(;0<=b&&d(b);)b--;do c++;while(c<e.length&&d(c))}return{connection:j,radius:a}};Blockly.Connection.prototype.checkType_=function(a){if(!this.check_||!a.check_)return!0;for(var b=0;b<this.check_.length;b++)if(-1!=a.check_.indexOf(this.check_[b]))return!0;return!1};
Blockly.Connection.prototype.setCheck=function(a){a?(a instanceof Array||(a=[a]),this.check_=a,this.targetConnection&&!this.checkType_(this.targetConnection)&&(this.isSuperior()?this.targetBlock().setParent(null):this.sourceBlock_.setParent(null),this.sourceBlock_.bumpNeighbours_())):this.check_=null;return this};
Blockly.Connection.prototype.neighbours_=function(a){function b(b){var f=d-c[b].x_,g=e-c[b].y_;Math.sqrt(f*f+g*g)<=a&&j.push(c[b]);return g<a}for(var c=this.dbList_[Blockly.OPPOSITE_TYPE[this.type]],d=this.x_,e=this.y_,f=0,g=c.length-2,h=g;f<h;)c[h].y_<e?f=h:g=h,h=Math.floor((f+g)/2);var g=f=h,j=[];if(c.length){for(;0<=f&&b(f);)f--;do g++;while(g<c.length&&b(g))}return j};
Blockly.Connection.prototype.hideAll=function(){this.inDB_&&this.dbList_[this.type].removeConnection_(this);if(this.targetConnection)for(var a=this.targetBlock().getDescendants(),b=0;b<a.length;b++){for(var c=a[b],d=c.getConnections_(!0),e=0;e<d.length;e++){var f=d[e];f.inDB_&&this.dbList_[f.type].removeConnection_(f)}c.mutator&&c.mutator.setVisible(!1);c.comment&&c.comment.setVisible(!1);c.warning&&c.warning.setVisible(!1)}};
Blockly.Connection.prototype.unhideAll=function(){this.inDB_||this.dbList_[this.type].addConnection_(this);var a=[];if(this.type!=Blockly.INPUT_VALUE&&this.type!=Blockly.NEXT_STATEMENT)return a;var b=this.targetBlock();if(b){var c;b.collapsed?(c=[],b.outputConnection&&c.push(b.outputConnection),b.nextConnection&&c.push(b.nextConnection),b.previousConnection&&c.push(b.previousConnection)):c=b.getConnections_(!0);for(var d=0;d<c.length;d++)a=a.concat(c[d].unhideAll());0==a.length&&(a[0]=b)}return a};
Blockly.ConnectionDB=function(){};Blockly.ConnectionDB.prototype=[];Blockly.ConnectionDB.constructor=Blockly.ConnectionDB;Blockly.ConnectionDB.prototype.addConnection_=function(a){if(a.inDB_)throw"Connection already in database.";for(var b=0,c=this.length;b<c;){var d=Math.floor((b+c)/2);if(this[d].y_<a.y_)b=d+1;else if(this[d].y_>a.y_)c=d;else{b=d;break}}this.splice(b,0,a);a.inDB_=!0};
Blockly.ConnectionDB.prototype.removeConnection_=function(a){if(!a.inDB_)throw"Connection not in database.";a.inDB_=!1;for(var b=0,c=this.length-2,d=c;b<d;)this[d].y_<a.y_?b=d:c=d,d=Math.floor((b+c)/2);for(c=b=d;0<=b&&this[b].y_==a.y_;){if(this[b]==a){this.splice(b,1);return}b--}do{if(this[c]==a){this.splice(c,1);return}c++}while(c<this.length&&this[c].y_==a.y_);throw"Unable to find connection in connectionDB.";};
Blockly.ConnectionDB.init=function(a){var b=[];b[Blockly.INPUT_VALUE]=new Blockly.ConnectionDB;b[Blockly.OUTPUT_VALUE]=new Blockly.ConnectionDB;b[Blockly.NEXT_STATEMENT]=new Blockly.ConnectionDB;b[Blockly.PREVIOUS_STATEMENT]=new Blockly.ConnectionDB;a.connectionDBList=b};Blockly.Field=function(a){this.sourceBlock_=null;this.group_=Blockly.createSvgElement("g",{},null);this.borderRect_=Blockly.createSvgElement("rect",{rx:4,ry:4,x:-Blockly.BlockSvg.SEP_SPACE_X/2,y:-12,height:16},this.group_);this.textElement_=Blockly.createSvgElement("text",{"class":"blocklyText"},this.group_);this.CURSOR&&(this.group_.style.cursor=this.CURSOR);this.size_={height:25,width:0};this.setText(a)};Blockly.Field.NBSP="\u00a0";Blockly.Field.prototype.EDITABLE=!0;
Blockly.Field.prototype.init=function(a){if(this.sourceBlock_)throw"Field has already been initialized once.";this.sourceBlock_=a;this.group_.setAttribute("class",Blockly.editable?"blocklyEditableText":"blocklyNonEditableText");a.getSvgRoot().appendChild(this.group_);Blockly.editable&&(this.mouseUpWrapper_=Blockly.bindEvent_(this.group_,"mouseup",this,this.onMouseUp_));this.setText(null)};
Blockly.Field.prototype.dispose=function(){this.mouseUpWrapper_&&(Blockly.unbindEvent_(this.mouseUpWrapper_),this.mouseUpWrapper_=null);this.sourceBlock_=null;goog.dom.removeNode(this.group_);this.borderRect_=this.textElement_=this.group_=null};Blockly.Field.prototype.setVisible=function(a){this.getRootElement().style.display=a?"block":"none"};Blockly.Field.prototype.getRootElement=function(){return this.group_};
Blockly.Field.prototype.render_=function(){var a=this.textElement_.getComputedTextLength();this.borderRect_&&this.borderRect_.setAttribute("width",a+Blockly.BlockSvg.SEP_SPACE_X);this.size_.width=a};Blockly.Field.prototype.getSize=function(){this.size_.width||this.render_();return this.size_};Blockly.Field.prototype.getText=function(){return this.text_};
Blockly.Field.prototype.setText=function(a){null!==a&&(this.text_=a,goog.dom.removeChildren(this.textElement_),a=a.replace(/\s/g,Blockly.Field.NBSP),a||(a=Blockly.Field.NBSP),a=document.createTextNode(a),this.textElement_.appendChild(a),this.size_.width=0,this.sourceBlock_&&this.sourceBlock_.rendered&&(this.sourceBlock_.render(),this.sourceBlock_.bumpNeighbours_(),this.sourceBlock_.workspace.fireChangeEvent()))};Blockly.Field.prototype.getValue=function(){return this.getText()};
Blockly.Field.prototype.setValue=function(a){this.setText(a)};Blockly.Field.prototype.onMouseUp_=function(a){Blockly.isRightButton(a)||2!=Blockly.Block.dragMode_&&this.showEditor_()};Blockly.Field.prototype.setTooltip=function(){};Blockly.Tooltip={};Blockly.Tooltip.visible=!1;Blockly.Tooltip.mouseOutPid_=0;Blockly.Tooltip.showPid_=0;Blockly.Tooltip.lastX_=0;Blockly.Tooltip.lastY_=0;Blockly.Tooltip.element_=null;Blockly.Tooltip.poisonedElement_=null;Blockly.Tooltip.svgGroup_=null;Blockly.Tooltip.svgText_=null;Blockly.Tooltip.svgBackground_=null;Blockly.Tooltip.svgShadow_=null;Blockly.Tooltip.OFFSET_X=0;Blockly.Tooltip.OFFSET_Y=10;Blockly.Tooltip.RADIUS_OK=10;Blockly.Tooltip.HOVER_MS=1E3;Blockly.Tooltip.MARGINS=5;
Blockly.Tooltip.createDom=function(){var a=Blockly.createSvgElement("g",{"class":"blocklyHidden"},null);Blockly.Tooltip.svgGroup_=a;Blockly.Tooltip.svgShadow_=Blockly.createSvgElement("rect",{"class":"blocklyTooltipShadow",x:2,y:2},a);Blockly.Tooltip.svgBackground_=Blockly.createSvgElement("rect",{"class":"blocklyTooltipBackground"},a);Blockly.Tooltip.svgText_=Blockly.createSvgElement("text",{"class":"blocklyTooltipText"},a);return a};
Blockly.Tooltip.bindMouseEvents=function(a){Blockly.bindEvent_(a,"mouseover",null,Blockly.Tooltip.onMouseOver_);Blockly.bindEvent_(a,"mouseout",null,Blockly.Tooltip.onMouseOut_);Blockly.bindEvent_(a,"mousemove",null,Blockly.Tooltip.onMouseMove_)};Blockly.Tooltip.onMouseOver_=function(a){for(a=a.target;!goog.isString(a.tooltip)&&!goog.isFunction(a.tooltip);)a=a.tooltip;Blockly.Tooltip.element_!=a&&(Blockly.Tooltip.hide(),Blockly.Tooltip.poisonedElement_=null,Blockly.Tooltip.element_=a);window.clearTimeout(Blockly.Tooltip.mouseOutPid_)};
Blockly.Tooltip.onMouseOut_=function(){Blockly.Tooltip.mouseOutPid_=window.setTimeout(function(){Blockly.Tooltip.element_=null;Blockly.Tooltip.poisonedElement_=null;Blockly.Tooltip.hide()},1);window.clearTimeout(Blockly.Tooltip.showPid_)};
Blockly.Tooltip.onMouseMove_=function(a){if(Blockly.Tooltip.element_&&Blockly.Tooltip.element_.tooltip&&!(Blockly.ContextMenu&&Blockly.ContextMenu.visible||0!=Blockly.Block.dragMode_))if(Blockly.Tooltip.visible){var b=Blockly.Tooltip.lastY_-a.clientY;Math.sqrt(Math.pow(Blockly.Tooltip.lastX_-a.clientX,2)+Math.pow(b,2))>Blockly.Tooltip.RADIUS_OK&&Blockly.Tooltip.hide()}else Blockly.Tooltip.poisonedElement_!=Blockly.Tooltip.element_&&(window.clearTimeout(Blockly.Tooltip.showPid_),Blockly.Tooltip.lastX_=
a.clientX,Blockly.Tooltip.lastY_=a.clientY,Blockly.Tooltip.showPid_=window.setTimeout(Blockly.Tooltip.show_,Blockly.Tooltip.HOVER_MS))};Blockly.Tooltip.hide=function(){Blockly.Tooltip.visible&&(Blockly.Tooltip.visible=!1,Blockly.Tooltip.svgGroup_&&(Blockly.Tooltip.svgGroup_.style.display="none"));window.clearTimeout(Blockly.Tooltip.showPid_)};
Blockly.Tooltip.show_=function(){Blockly.Tooltip.poisonedElement_=Blockly.Tooltip.element_;if(Blockly.Tooltip.svgGroup_){goog.dom.removeChildren(Blockly.Tooltip.svgText_);var a=Blockly.Tooltip.element_.tooltip;goog.isFunction(a)&&(a=a());for(var a=a.split("\n"),b=0;b<a.length;b++){var c=Blockly.createSvgElement("tspan",{dy:"1em",x:Blockly.Tooltip.MARGINS},Blockly.Tooltip.svgText_),d=document.createTextNode(a[b]);c.appendChild(d)}Blockly.Tooltip.visible=!0;Blockly.Tooltip.svgGroup_.style.display="block";
a=Blockly.Tooltip.svgText_.getBBox();b=2*Blockly.Tooltip.MARGINS+a.width;c=a.height;Blockly.Tooltip.svgBackground_.setAttribute("width",b);Blockly.Tooltip.svgBackground_.setAttribute("height",c);Blockly.Tooltip.svgShadow_.setAttribute("width",b);Blockly.Tooltip.svgShadow_.setAttribute("height",c);if(Blockly.RTL)for(var c=a.width,d=0,e;e=Blockly.Tooltip.svgText_.childNodes[d];d++)e.setAttribute("text-anchor","end"),e.setAttribute("x",c+Blockly.Tooltip.MARGINS);c=Blockly.Tooltip.lastX_;c=Blockly.RTL?
c-(Blockly.Tooltip.OFFSET_X+b):c+Blockly.Tooltip.OFFSET_X;b=Blockly.Tooltip.lastY_+Blockly.Tooltip.OFFSET_Y;b=Blockly.convertCoordinates(c,b,!0);c=b.x;b=b.y;d=Blockly.svgSize();b+a.height>d.height&&(b-=a.height+2*Blockly.Tooltip.OFFSET_Y);Blockly.RTL?c=Math.max(Blockly.Tooltip.MARGINS,c):c+a.width>d.width-2*Blockly.Tooltip.MARGINS&&(c=d.width-a.width-2*Blockly.Tooltip.MARGINS);Blockly.Tooltip.svgGroup_.setAttribute("transform","translate("+c+","+b+")")}};Blockly.FieldLabel=function(a){this.sourceBlock_=null;this.textElement_=Blockly.createSvgElement("text",{"class":"blocklyText"},null);this.size_={height:25,width:0};this.setText(a)};goog.inherits(Blockly.FieldLabel,Blockly.Field);Blockly.FieldLabel.prototype.EDITABLE=!1;
Blockly.FieldLabel.prototype.init=function(a){if(this.sourceBlock_)throw"Text has already been initialized once.";this.sourceBlock_=a;a.getSvgRoot().appendChild(this.textElement_);this.textElement_.tooltip=this.sourceBlock_;Blockly.Tooltip&&Blockly.Tooltip.bindMouseEvents(this.textElement_)};Blockly.FieldLabel.prototype.dispose=function(){goog.dom.removeNode(this.textElement_);this.textElement_=null};Blockly.FieldLabel.prototype.getRootElement=function(){return this.textElement_};
Blockly.FieldLabel.prototype.setTooltip=function(a){this.textElement_.tooltip=a};Blockly.Input=function(a,b,c,d){this.type=a;this.name=b;this.sourceBlock_=c;this.connection=d;this.titleRow=[];this.align=Blockly.ALIGN_LEFT};
Blockly.Input.prototype.appendTitle=function(a,b){if(!goog.isDefAndNotNull(a))return this;goog.isString(a)&&(a=new Blockly.FieldLabel(a));this.sourceBlock_.svg_&&a.init(this.sourceBlock_);a.name=b;a.prefixTitle&&this.appendTitle(a.prefixTitle);this.titleRow.push(a);a.suffixTitle&&this.appendTitle(a.suffixTitle);this.sourceBlock_.rendered&&(this.sourceBlock_.render(),this.sourceBlock_.bumpNeighbours_());return this};
Blockly.Input.prototype.setCheck=function(a){if(!this.connection)throw"This input does not have a connection.";this.connection.setCheck(a);return this};Blockly.Input.prototype.setAlign=function(a){this.align=a;this.sourceBlock_.rendered&&this.sourceBlock_.render();return this};Blockly.Input.prototype.init=function(){for(var a=0;a<this.titleRow.length;a++)this.titleRow[a].init(this.sourceBlock_)};
Blockly.Input.prototype.dispose=function(){for(var a=0,b;b=this.titleRow[a];a++)b.dispose();this.connection&&this.connection.dispose();this.sourceBlock_=null};Blockly.Language={};Blockly.Bubble=function(a,b,c,d,e,f,g){var h=Blockly.Bubble.ARROW_ANGLE;Blockly.RTL&&(h=-h);this.arrow_radians_=2*h/360*Math.PI;this.workspace_=a;this.content_=b;this.shape_=c;a.getBubbleCanvas().appendChild(this.createDom_(b,!(!f||!g)));this.setAnchorLocation(d,e);if(!f||!g)a=this.content_.getBBox(),f=a.width+2*Blockly.Bubble.BORDER_WIDTH,g=a.height+2*Blockly.Bubble.BORDER_WIDTH;this.setBubbleSize(f,g);this.positionBubble_();this.renderArrow_();this.rendered_=!0;Blockly.bindEvent_(this.bubbleBack_,
"mousedown",this,this.bubbleMouseDown_);this.resizeGroup_&&Blockly.bindEvent_(this.resizeGroup_,"mousedown",this,this.resizeMouseDown_)};Blockly.Bubble.BORDER_WIDTH=6;Blockly.Bubble.ARROW_THICKNESS=10;Blockly.Bubble.ARROW_ANGLE=20;Blockly.Bubble.ARROW_BEND=4;Blockly.Bubble.ANCHOR_RADIUS=8;Blockly.Bubble.onMouseUpWrapper_=null;Blockly.Bubble.onMouseMoveWrapper_=null;
Blockly.Bubble.unbindDragEvents_=function(){Blockly.Bubble.onMouseUpWrapper_&&(Blockly.unbindEvent_(Blockly.Bubble.onMouseUpWrapper_),Blockly.Bubble.onMouseUpWrapper_=null);Blockly.Bubble.onMouseMoveWrapper_&&(Blockly.unbindEvent_(Blockly.Bubble.onMouseMoveWrapper_),Blockly.Bubble.onMouseMoveWrapper_=null)};Blockly.Bubble.prototype.rendered_=!1;Blockly.Bubble.prototype.anchorX_=0;Blockly.Bubble.prototype.anchorY_=0;Blockly.Bubble.prototype.relativeLeft_=0;Blockly.Bubble.prototype.relativeTop_=0;
Blockly.Bubble.prototype.width_=0;Blockly.Bubble.prototype.height_=0;Blockly.Bubble.prototype.autoLayout_=!0;
Blockly.Bubble.prototype.createDom_=function(a,b){this.bubbleGroup_=Blockly.createSvgElement("g",{},null);var c=Blockly.createSvgElement("g",{filter:"url(#blocklyEmboss)"},this.bubbleGroup_);this.bubbleArrow_=Blockly.createSvgElement("path",{},c);this.bubbleBack_=Blockly.createSvgElement("rect",{"class":"blocklyDraggable",x:0,y:0,rx:Blockly.Bubble.BORDER_WIDTH,ry:Blockly.Bubble.BORDER_WIDTH},c);b?(this.resizeGroup_=Blockly.createSvgElement("g",{"class":Blockly.RTL?"blocklyResizeSW":"blocklyResizeSE"},
this.bubbleGroup_),c=2*Blockly.Bubble.BORDER_WIDTH,Blockly.createSvgElement("polygon",{points:"0,x x,x x,0".replace(/x/g,c.toString())},this.resizeGroup_),Blockly.createSvgElement("line",{"class":"blocklyResizeLine",x1:c/3,y1:c-1,x2:c-1,y2:c/3},this.resizeGroup_),Blockly.createSvgElement("line",{"class":"blocklyResizeLine",x1:2*c/3,y1:c-1,x2:c-1,y2:2*c/3},this.resizeGroup_)):this.resizeGroup_=null;this.bubbleGroup_.appendChild(a);return this.bubbleGroup_};
Blockly.Bubble.prototype.bubbleMouseDown_=function(a){this.promote_();Blockly.Bubble.unbindDragEvents_();!Blockly.isRightButton(a)&&!Blockly.isTargetInput_(a)&&(Blockly.setCursorHand_(!0),this.dragDeltaX=Blockly.RTL?this.relativeLeft_+a.clientX:this.relativeLeft_-a.clientX,this.dragDeltaY=this.relativeTop_-a.clientY,Blockly.Bubble.onMouseUpWrapper_=Blockly.bindEvent_(document,"mouseup",this,Blockly.Bubble.unbindDragEvents_),Blockly.Bubble.onMouseMoveWrapper_=Blockly.bindEvent_(document,"mousemove",
this,this.bubbleMouseMove_),Blockly.hideChaff(),a.stopPropagation())};Blockly.Bubble.prototype.bubbleMouseMove_=function(a){this.autoLayout_=!1;this.relativeLeft_=Blockly.RTL?this.dragDeltaX-a.clientX:this.dragDeltaX+a.clientX;this.relativeTop_=this.dragDeltaY+a.clientY;this.positionBubble_();this.renderArrow_()};
Blockly.Bubble.prototype.resizeMouseDown_=function(a){this.promote_();Blockly.Bubble.unbindDragEvents_();Blockly.isRightButton(a)||(Blockly.setCursorHand_(!0),this.resizeDeltaWidth=Blockly.RTL?this.width_+a.clientX:this.width_-a.clientX,this.resizeDeltaHeight=this.height_-a.clientY,Blockly.Bubble.onMouseUpWrapper_=Blockly.bindEvent_(document,"mouseup",this,Blockly.Bubble.unbindDragEvents_),Blockly.Bubble.onMouseMoveWrapper_=Blockly.bindEvent_(document,"mousemove",this,this.resizeMouseMove_),Blockly.hideChaff(),
a.stopPropagation())};Blockly.Bubble.prototype.resizeMouseMove_=function(a){this.autoLayout_=!1;var b=this.resizeDeltaWidth,c=this.resizeDeltaHeight+a.clientY,b=Blockly.RTL?b-a.clientX:b+a.clientX;this.setBubbleSize(b,c);Blockly.RTL&&this.positionBubble_()};Blockly.Bubble.prototype.registerResizeEvent=function(a,b){Blockly.bindEvent_(this.bubbleGroup_,"resize",a,b)};Blockly.Bubble.prototype.promote_=function(){this.bubbleGroup_.parentNode.appendChild(this.bubbleGroup_)};
Blockly.Bubble.prototype.setAnchorLocation=function(a,b){this.anchorX_=a;this.anchorY_=b;this.rendered_&&this.positionBubble_()};
Blockly.Bubble.prototype.layoutBubble_=function(){var a=-this.width_/4,b=-this.height_-Blockly.BlockSvg.MIN_BLOCK_Y;if(this.workspace_.scrollbar){var c=this.workspace_.scrollbar.getMetrics_();this.anchorX_+a<Blockly.BlockSvg.SEP_SPACE_X+c.viewLeft?a=Blockly.BlockSvg.SEP_SPACE_X+c.viewLeft-this.anchorX_:c.viewLeft+c.viewWidth<this.anchorX_+a+this.width_+Blockly.BlockSvg.SEP_SPACE_X+Blockly.Scrollbar.scrollbarThickness&&(a=c.viewLeft+c.viewWidth-this.anchorX_-this.width_-Blockly.BlockSvg.SEP_SPACE_X-
Blockly.Scrollbar.scrollbarThickness);this.anchorY_+b<Blockly.BlockSvg.SEP_SPACE_Y+c.viewTop&&(b=this.shape_.getBBox().height)}this.relativeLeft_=a;this.relativeTop_=b};Blockly.Bubble.prototype.positionBubble_=function(){this.bubbleGroup_.setAttribute("transform","translate("+(Blockly.RTL?this.anchorX_-this.relativeLeft_-this.width_:this.anchorX_+this.relativeLeft_)+", "+(this.relativeTop_+this.anchorY_)+")")};Blockly.Bubble.prototype.getBubbleSize=function(){return{width:this.width_,height:this.height_}};
Blockly.Bubble.prototype.setBubbleSize=function(a,b){var c=2*Blockly.Bubble.BORDER_WIDTH;a=Math.max(a,c+45);b=Math.max(b,c+Blockly.BlockSvg.TITLE_HEIGHT);this.width_=a;this.height_=b;this.bubbleBack_.setAttribute("width",a);this.bubbleBack_.setAttribute("height",b);this.resizeGroup_&&(Blockly.RTL?this.resizeGroup_.setAttribute("transform","translate("+2*Blockly.Bubble.BORDER_WIDTH+", "+(b-c)+") scale(-1 1)"):this.resizeGroup_.setAttribute("transform","translate("+(a-c)+", "+(b-c)+")"));this.rendered_&&
(this.autoLayout_&&this.layoutBubble_(),this.positionBubble_(),this.renderArrow_());Blockly.fireUiEvent(this.bubbleGroup_,"resize")};
Blockly.Bubble.prototype.renderArrow_=function(){var a=[],b=this.width_/2,c=this.height_/2,d=-this.relativeLeft_,e=-this.relativeTop_;if(b==d&&c==e)a.push("M "+b+","+c);else{e-=c;d-=b;Blockly.RTL&&(d*=-1);var f=Math.sqrt(e*e+d*d),g=Math.acos(d/f);0>e&&(g=2*Math.PI-g);var h=g+Math.PI/2;h>2*Math.PI&&(h-=2*Math.PI);var j=Math.sin(h),k=Math.cos(h),l=this.getBubbleSize(),h=(l.width+l.height)/Blockly.Bubble.ARROW_THICKNESS,h=Math.min(h,l.width,l.height)/2,l=1-Blockly.Bubble.ANCHOR_RADIUS/f,d=b+l*d,e=c+
l*e,l=b+h*k,m=c+h*j,b=b-h*k,c=c-h*j,j=g+this.arrow_radians_;j>2*Math.PI&&(j-=2*Math.PI);g=Math.sin(j)*f/Blockly.Bubble.ARROW_BEND;f=Math.cos(j)*f/Blockly.Bubble.ARROW_BEND;a.push("M"+l+","+m);a.push("C"+(l+f)+","+(m+g)+" "+d+","+e+" "+d+","+e);a.push("C"+d+","+e+" "+(b+f)+","+(c+g)+" "+b+","+c)}a.push("z");this.bubbleArrow_.setAttribute("d",a.join(" "))};Blockly.Bubble.prototype.setColour=function(a){this.bubbleBack_.setAttribute("fill",a);this.bubbleArrow_.setAttribute("fill",a)};
Blockly.Bubble.prototype.dispose=function(){Blockly.Bubble.unbindDragEvents_();goog.dom.removeNode(this.bubbleGroup_);this.shape_=this.content_=this.workspace_=this.bubbleGroup_=null};Blockly.Mutator=function(a){this.block_=null;this.quarkXml_=[];for(var b=0;b<a.length;b++){var c=goog.dom.createDom("block");c.setAttribute("type",a[b]);this.quarkXml_[b]=c}};Blockly.Mutator.ICON_SIZE=16;Blockly.Mutator.prototype.bubble_=null;Blockly.Mutator.prototype.iconX_=0;Blockly.Mutator.prototype.iconY_=0;Blockly.Mutator.prototype.workspaceWidth_=0;Blockly.Mutator.prototype.workspaceHeight_=0;
Blockly.Mutator.prototype.createIcon=function(){this.iconGroup_=Blockly.createSvgElement("g",{},null);this.block_.isInFlyout||this.iconGroup_.setAttribute("class","blocklyIconGroup");var a=Blockly.Mutator.ICON_SIZE/8;Blockly.createSvgElement("rect",{"class":"blocklyIconShield",width:8*a,height:8*a,rx:2*a,ry:2*a},this.iconGroup_);if(!Blockly.Mutator.plusPath_){var b=[];b.push("M",3.5*a+","+3.5*a);b.push("v",-2*a,"h",a);b.push("v",2*a,"h",2*a);b.push("v",a,"h",-2*a);b.push("v",2*a,"h",-a);b.push("v",
-2*a,"h",-2*a);b.push("v",-a,"z");Blockly.Mutator.plusPath_=b.join(" ")}Blockly.Mutator.minusPath_||(b=[],b.push("M",1.5*a+","+3.5*a),b.push("h",5*a,"v",a),b.push("h",-5*a,"z"),Blockly.Mutator.minusPath_=b.join(" "));this.iconMark_=Blockly.createSvgElement("path",{"class":"blocklyIconMark",d:Blockly.Mutator.plusPath_},this.iconGroup_);this.block_.getSvgRoot().appendChild(this.iconGroup_);this.block_.isInFlyout||Blockly.bindEvent_(this.iconGroup_,"mouseup",this,this.iconClick_)};
Blockly.Mutator.prototype.createEditor_=function(){this.svgDialog_=Blockly.createSvgElement("svg",{x:Blockly.Bubble.BORDER_WIDTH,y:Blockly.Bubble.BORDER_WIDTH},null);this.svgBackground_=Blockly.createSvgElement("rect",{"class":"blocklyMutatorBackground",height:"100%",width:"100%"},this.svgDialog_);this.workspace_=new Blockly.Workspace;this.flyout_=new Blockly.Flyout;this.flyout_.autoClose=!1;this.svgDialog_.appendChild(this.flyout_.createDom());this.svgDialog_.appendChild(this.workspace_.createDom());
return this.svgDialog_};
Blockly.Mutator.prototype.resizeBubble_=function(){var a=2*Blockly.Bubble.BORDER_WIDTH,b=this.workspace_.getCanvas().getBBox(),c=this.flyout_.getMetrics(),d;d=Blockly.RTL?-b.x:b.width+b.x;b=Math.max(b.height+3*a,c.contentHeight+20);d+=3*a;if(Math.abs(this.workspaceWidth_-d)>a||Math.abs(this.workspaceHeight_-b)>a)this.workspaceWidth_=d,this.workspaceHeight_=b,this.bubble_.setBubbleSize(d+a,b+a),this.svgDialog_.setAttribute("width",this.workspaceWidth_),this.svgDialog_.setAttribute("height",this.workspaceHeight_);
Blockly.RTL&&(a="translate("+this.workspaceWidth_+",0)",this.workspace_.getCanvas().setAttribute("transform",a))};Blockly.Mutator.prototype.isVisible=function(){return!!this.bubble_};
Blockly.Mutator.prototype.setVisible=function(a){if(a!=this.isVisible())if(a){this.iconMark_.setAttribute("d",Blockly.Mutator.minusPath_);this.bubble_=new Blockly.Bubble(this.block_.workspace,this.createEditor_(),this.block_.svg_.svgGroup_,this.iconX_,this.iconY_,null,null);var b=this;this.flyout_.init(this.workspace_,function(){return b.getFlyoutMetrics_()},!1);this.flyout_.show(this.quarkXml_);this.rootBlock_=this.block_.decompose(this.workspace_);a=this.rootBlock_.getDescendants();for(var c=0,
d;d=a[c];c++)d.render();this.rootBlock_.movable=!1;this.rootBlock_.deletable=!1;a=2*this.flyout_.CORNER_RADIUS;c=this.flyout_.width_+a;Blockly.RTL&&(c=-c);this.rootBlock_.moveBy(c,a);this.block_.saveConnections&&(this.block_.saveConnections(this.rootBlock_),this.sourceListener_=Blockly.bindEvent_(this.block_.workspace.getCanvas(),"blocklyWorkspaceChange",this.block_,function(){b.block_.saveConnections(b.rootBlock_)}));this.resizeBubble_();Blockly.bindEvent_(this.workspace_.getCanvas(),"blocklyWorkspaceChange",
this.block_,function(){b.workspaceChanged_()});this.updateColour()}else this.iconMark_.setAttribute("d",Blockly.Mutator.plusPath_),this.svgBackground_=this.svgDialog_=null,this.flyout_.dispose(),this.flyout_=null,this.workspace_.dispose(),this.rootBlock_=this.workspace_=null,this.bubble_.dispose(),this.bubble_=null,this.workspaceHeight_=this.workspaceWidth_=0,this.sourceListener_&&(Blockly.unbindEvent_(this.sourceListener_),this.sourceListener_=null)};
Blockly.Mutator.prototype.workspaceChanged_=function(){if(0==Blockly.Block.dragMode_)for(var a=this.workspace_.getTopBlocks(!1),b=0,c;c=a[b];b++){var d=c.getRelativeToSurfaceXY(),e=c.getSvgRoot().getBBox();(d.y<10-e.height||(Blockly.RTL?d.x>-this.flyout_.width_+10:d.x<this.flyout_.width_-10))&&c.dispose(!1,!1)}this.rootBlock_.workspace==this.workspace_&&(a=this.block_.rendered,this.block_.rendered=!1,this.block_.compose(this.rootBlock_),this.block_.rendered=a,this.block_.rendered&&this.block_.render(),
this.resizeBubble_(),this.block_.workspace.fireChangeEvent())};Blockly.Mutator.prototype.getFlyoutMetrics_=function(){var a=0;Blockly.RTL&&(a+=this.workspaceWidth_);return{viewHeight:this.workspaceHeight_,viewWidth:0,absoluteTop:0,absoluteLeft:a}};Blockly.Mutator.prototype.iconClick_=function(){this.setVisible(!this.isVisible())};Blockly.Mutator.prototype.updateColour=function(){if(this.isVisible()){var a=Blockly.makeColour(this.block_.getColour());this.bubble_.setColour(a)}};
Blockly.Mutator.prototype.dispose=function(){goog.dom.removeNode(this.iconGroup_);this.iconGroup_=null;this.setVisible(!1);this.block_=this.block_.mutator=null};
Blockly.Mutator.prototype.renderIcon=function(a){if(this.block_.collapsed)return this.iconGroup_.setAttribute("display","none"),a;this.iconGroup_.setAttribute("display","block");Blockly.RTL&&(a-=Blockly.Mutator.ICON_SIZE);this.iconGroup_.setAttribute("transform","translate("+a+", 5)");this.computeIconLocation();return a=Blockly.RTL?a-Blockly.BlockSvg.SEP_SPACE_X:a+(Blockly.Mutator.ICON_SIZE+Blockly.BlockSvg.SEP_SPACE_X)};
Blockly.Mutator.prototype.setIconLocation=function(a,b){this.iconX_=a;this.iconY_=b;this.isVisible()&&this.bubble_.setAnchorLocation(a,b)};Blockly.Mutator.prototype.computeIconLocation=function(){var a=this.block_.getRelativeToSurfaceXY(),b=Blockly.getRelativeXY_(this.iconGroup_),c=a.x+b.x+Blockly.Mutator.ICON_SIZE/2,a=a.y+b.y+Blockly.Mutator.ICON_SIZE/2;(c!==this.iconX_||a!==this.iconY_)&&this.setIconLocation(c,a)};Blockly.Mutator.prototype.getIconLocation=function(){return{x:this.iconX_,y:this.iconY_}};Blockly.ContextMenu={};Blockly.ContextMenu.X_PADDING=20;Blockly.ContextMenu.Y_HEIGHT=20;Blockly.ContextMenu.visible=!1;
Blockly.ContextMenu.createDom=function(){var a=Blockly.createSvgElement("g",{"class":"blocklyHidden"},null);Blockly.ContextMenu.svgGroup=a;Blockly.ContextMenu.svgShadow=Blockly.createSvgElement("rect",{"class":"blocklyContextMenuShadow",x:2,y:-2,rx:4,ry:4},a);Blockly.ContextMenu.svgBackground=Blockly.createSvgElement("rect",{"class":"blocklyContextMenuBackground",y:-4,rx:4,ry:4},a);Blockly.ContextMenu.svgOptions=Blockly.createSvgElement("g",{"class":"blocklyContextMenuOptions"},a);return a};
Blockly.ContextMenu.show=function(a,b,c){if(c.length){goog.dom.removeChildren(Blockly.ContextMenu.svgOptions);Blockly.ContextMenu.svgGroup.style.display="block";for(var d=0,e=[Blockly.ContextMenu.svgBackground,Blockly.ContextMenu.svgShadow],f=0,g;g=c[f];f++){var h=Blockly.ContextMenu.optionToDom(g.text),j=h.firstChild,k=h.lastChild;Blockly.ContextMenu.svgOptions.appendChild(h);h.setAttribute("transform","translate(0, "+f*Blockly.ContextMenu.Y_HEIGHT+")");e.push(j);Blockly.bindEvent_(h,"mousedown",
null,Blockly.noEvent);g.enabled?(Blockly.bindEvent_(h,"mouseup",null,g.callback),Blockly.bindEvent_(h,"mouseup",null,Blockly.ContextMenu.hide)):h.setAttribute("class","blocklyMenuDivDisabled");d=Math.max(d,k.getComputedTextLength())}d+=2*Blockly.ContextMenu.X_PADDING;for(f=0;f<e.length;f++)e[f].setAttribute("width",d);if(Blockly.RTL)for(f=0;h=Blockly.ContextMenu.svgOptions.childNodes[f];f++)k=h.lastChild,k.setAttribute("text-anchor","end"),k.setAttribute("x",d-Blockly.ContextMenu.X_PADDING);Blockly.ContextMenu.svgBackground.setAttribute("height",
c.length*Blockly.ContextMenu.Y_HEIGHT+8);Blockly.ContextMenu.svgShadow.setAttribute("height",c.length*Blockly.ContextMenu.Y_HEIGHT+10);b=Blockly.convertCoordinates(a,b,!0);a=b.x;b=b.y;c=Blockly.ContextMenu.svgGroup.getBBox();d=Blockly.svgSize();b+c.height>d.height&&(b-=c.height-10);Blockly.RTL?0>=a-c.width?a++:a-=c.width:a+c.width>d.width?a-=c.width:a++;Blockly.ContextMenu.svgGroup.setAttribute("transform","translate("+a+", "+b+")");Blockly.ContextMenu.visible=!0}else Blockly.ContextMenu.hide()};
Blockly.ContextMenu.optionToDom=function(a){var b=Blockly.createSvgElement("g",{"class":"blocklyMenuDiv"},null);Blockly.createSvgElement("rect",{height:Blockly.ContextMenu.Y_HEIGHT},b);var c=Blockly.createSvgElement("text",{"class":"blocklyMenuText",x:Blockly.ContextMenu.X_PADDING,y:15},b);a=document.createTextNode(a);c.appendChild(a);return b};Blockly.ContextMenu.hide=function(){Blockly.ContextMenu.visible&&(Blockly.ContextMenu.svgGroup.style.display="none",Blockly.ContextMenu.visible=!1)};
Blockly.ContextMenu.callbackFactory=function(a,b){return function(){var c=Blockly.Xml.domToBlock_(a.workspace,b),d=a.getRelativeToSurfaceXY();d.x=Blockly.RTL?d.x-Blockly.SNAP_RADIUS:d.x+Blockly.SNAP_RADIUS;d.y+=2*Blockly.SNAP_RADIUS;c.moveBy(d.x,d.y);c.select()}};Blockly.Warning=function(a){this.block_=a;this.createIcon_()};Blockly.Warning.ICON_RADIUS=8;Blockly.Warning.prototype.bubble_=null;Blockly.Warning.prototype.text_="";Blockly.Warning.prototype.iconX_=0;Blockly.Warning.prototype.iconY_=0;
Blockly.Warning.prototype.createIcon_=function(){this.iconGroup_=Blockly.createSvgElement("g",{},null);this.block_.isInFlyout||this.iconGroup_.setAttribute("class","blocklyIconGroup");Blockly.createSvgElement("path",{"class":"blocklyIconShield",d:"M 2,15 Q -1,15 0.5,12 L 6.5,1.7 Q 8,-1 9.5,1.7 L 15.5,12 Q 17,15 14,15 z"},this.iconGroup_);this.iconMark_=Blockly.createSvgElement("text",{"class":"blocklyIconMark",x:Blockly.Warning.ICON_RADIUS,y:2*Blockly.Warning.ICON_RADIUS-3},this.iconGroup_);this.iconMark_.appendChild(document.createTextNode("!"));
this.block_.getSvgRoot().appendChild(this.iconGroup_);Blockly.bindEvent_(this.iconGroup_,"mouseup",this,this.iconClick_)};Blockly.Warning.prototype.textToDom_=function(a){var b=Blockly.createSvgElement("text",{"class":"blocklyText",y:Blockly.Bubble.BORDER_WIDTH},null);a=a.split("\n");for(var c=0;c<a.length;c++){var d=Blockly.createSvgElement("tspan",{dy:"1em",x:Blockly.Bubble.BORDER_WIDTH},b),e=document.createTextNode(a[c]);d.appendChild(e)}return b};Blockly.Warning.prototype.isVisible=function(){return!!this.bubble_};
Blockly.Warning.prototype.setVisible=function(a){if(a!=this.isVisible())if(a){a=this.textToDom_(this.text_);this.bubble_=new Blockly.Bubble(this.block_.workspace,a,this.block_.svg_.svgGroup_,this.iconX_,this.iconY_,null,null);if(Blockly.RTL)for(var b=a.getBBox().width,c=0,d;d=a.childNodes[c];c++)d.setAttribute("text-anchor","end"),d.setAttribute("x",b+Blockly.Bubble.BORDER_WIDTH);this.updateColour();a=this.bubble_.getBubbleSize();this.bubble_.setBubbleSize(a.width,a.height)}else this.bubble_.dispose(),
this.foreignObject_=this.body_=this.bubble_=null};Blockly.Warning.prototype.iconClick_=function(){this.setVisible(!this.isVisible())};Blockly.Warning.prototype.bodyFocus_=function(){this.bubble_.promote_()};Blockly.Warning.prototype.setText=function(a){this.text_=a;this.isVisible()&&(this.setVisible(!1),this.setVisible(!0))};Blockly.Warning.prototype.updateColour=function(){if(this.isVisible()){var a=Blockly.makeColour(this.block_.getColour());this.bubble_.setColour(a)}};
Blockly.Warning.prototype.dispose=function(){goog.dom.removeNode(this.iconGroup_);this.iconGroup_=null;this.setVisible(!1);this.block_=this.block_.warning=null};
Blockly.Warning.prototype.renderIcon=function(a){if(this.block_.collapsed)return this.iconGroup_.setAttribute("display","none"),a;this.iconGroup_.setAttribute("display","block");var b=2*Blockly.Warning.ICON_RADIUS;Blockly.RTL&&(a-=b);this.iconGroup_.setAttribute("transform","translate("+a+", 5)");this.computeIconLocation();return a=Blockly.RTL?a-Blockly.BlockSvg.SEP_SPACE_X:a+(b+Blockly.BlockSvg.SEP_SPACE_X)};
Blockly.Warning.prototype.setIconLocation=function(a,b){this.iconX_=a;this.iconY_=b;this.isVisible()&&this.bubble_.setAnchorLocation(a,b)};Blockly.Warning.prototype.computeIconLocation=function(){var a=this.block_.getRelativeToSurfaceXY(),b=Blockly.getRelativeXY_(this.iconGroup_),c=a.x+b.x+Blockly.Warning.ICON_RADIUS,a=a.y+b.y+Blockly.Warning.ICON_RADIUS;(c!==this.iconX_||a!==this.iconY_)&&this.setIconLocation(c,a)};Blockly.Warning.prototype.getIconLocation=function(){return{x:this.iconX_,y:this.iconY_}};Blockly.uidCounter_=0;
Blockly.Block=function(a,b){this.id=++Blockly.uidCounter_;this.previousConnection=this.nextConnection=this.outputConnection=null;this.inputList=[];this.disabled=this.collapsed=this.rendered=this.inputsInline=!1;this.deletable=this.movable=Blockly.editable;this.tooltip="";this.contextMenu=!0;this.parentBlock_=null;this.childBlocks_=[];this.workspace=a;this.isInFlyout=a.isFlyout;a.addTopBlock(this);if(b){this.type=b;var c=Blockly.Language[b];if(!c)throw'Error: "'+b+'" is an unknown language block.';goog.mixin(this,
c)}goog.isFunction(this.init)&&this.init();goog.isFunction(this.onchange)&&Blockly.bindEvent_(a.getCanvas(),"blocklyWorkspaceChange",this,this.onchange)};Blockly.Block.prototype.svg_=null;Blockly.Block.prototype.mutator=null;Blockly.Block.prototype.comment=null;Blockly.Block.prototype.warning=null;Blockly.Block.prototype.initSvg=function(){this.svg_=new Blockly.BlockSvg(this);this.svg_.init();Blockly.bindEvent_(this.svg_.getRootElement(),"mousedown",this,this.onMouseDown_);this.workspace.getCanvas().appendChild(this.svg_.getRootElement())};
Blockly.Block.prototype.getSvgRoot=function(){return this.svg_&&this.svg_.getRootElement()};Blockly.Block.dragMode_=0;Blockly.Block.onMouseUpWrapper_=null;Blockly.Block.onMouseMoveWrapper_=null;
Blockly.Block.terminateDrag_=function(){Blockly.Block.onMouseUpWrapper_&&(Blockly.unbindEvent_(Blockly.Block.onMouseUpWrapper_),Blockly.Block.onMouseUpWrapper_=null);Blockly.Block.onMouseMoveWrapper_&&(Blockly.unbindEvent_(Blockly.Block.onMouseMoveWrapper_),Blockly.Block.onMouseMoveWrapper_=null);var a=Blockly.selected;if(2==Blockly.Block.dragMode_&&a){var b=a.getRelativeToSurfaceXY();a.moveConnections_(b.x-a.startDragX,b.y-a.startDragY);delete a.draggedBubbles_;a.setDragging_(!1);a.render();goog.Timer.callOnce(a.bumpNeighbours_,
Blockly.BUMP_DELAY,a);Blockly.fireUiEvent(window,"resize")}a&&a.workspace.fireChangeEvent();Blockly.Block.dragMode_=0};Blockly.Block.prototype.select=function(){if(!this.svg_)throw"Block is not rendered.";Blockly.selected&&Blockly.selected.unselect();Blockly.selected=this;this.svg_.addSelect();Blockly.fireUiEvent(this.workspace.getCanvas(),"blocklySelectChange")};
Blockly.Block.prototype.unselect=function(){if(!this.svg_)throw"Block is not rendered.";Blockly.selected=null;this.svg_.removeSelect();Blockly.fireUiEvent(this.workspace.getCanvas(),"blocklySelectChange")};
Blockly.Block.prototype.dispose=function(a,b){this.unplug(a);b&&this.svg_&&this.svg_.disposeUiEffect();this.workspace.removeTopBlock(this);this.workspace=null;this.rendered=!1;Blockly.selected==this&&(Blockly.selected=null,Blockly.Block.terminateDrag_());for(var c=this.childBlocks_.length-1;0<=c;c--)this.childBlocks_[c].dispose(!1);this.mutator&&this.mutator.dispose();this.comment&&this.comment.dispose();this.warning&&this.warning.dispose();for(var c=0,d;d=this.inputList[c];c++)d.dispose();this.inputList=
[];d=this.getConnections_(!0);for(c=0;c<d.length;c++){var e=d[c];e.targetConnection&&e.disconnect();d[c].dispose()}this.svg_&&(this.svg_.dispose(),this.svg_=null)};
Blockly.Block.prototype.unplug=function(a,b){b=b&&!!this.getParent();if(this.outputConnection)this.outputConnection.targetConnection&&this.setParent(null);else{var c=null;this.previousConnection&&this.previousConnection.targetConnection&&(c=this.previousConnection.targetConnection,this.setParent(null));if(a&&this.nextConnection&&this.nextConnection.targetConnection){var d=this.nextConnection.targetConnection,e=this.nextConnection.targetBlock();this.nextConnection.disconnect();e.setParent(null);c&&
c.connect(d)}}b&&this.moveBy(Blockly.SNAP_RADIUS*(Blockly.RTL?-1:1),2*Blockly.SNAP_RADIUS)};Blockly.Block.prototype.getRelativeToSurfaceXY=function(){var a=0,b=0;if(this.svg_){var c=this.svg_.getRootElement();do var d=Blockly.getRelativeXY_(c),a=a+d.x,b=b+d.y,c=c.parentElement;while(c&&c!=this.workspace.getCanvas())}return{x:a,y:b}};
Blockly.Block.prototype.moveBy=function(a,b){var c=this.getRelativeToSurfaceXY();this.svg_.getRootElement().setAttribute("transform","translate("+(c.x+a)+", "+(c.y+b)+")");this.moveConnections_(a,b)};
Blockly.Block.prototype.onMouseDown_=function(a){if(!this.isInFlyout){Blockly.svgResize();Blockly.Block.terminateDrag_();this.select();Blockly.hideChaff();if(Blockly.isRightButton(a))Blockly.ContextMenu&&this.showContextMenu_(a.clientX,a.clientY);else if(this.movable){Blockly.removeAllRanges();Blockly.setCursorHand_(!0);var b=this.getRelativeToSurfaceXY();this.startDragX=b.x;this.startDragY=b.y;this.startDragMouseX=a.clientX;this.startDragMouseY=a.clientY;Blockly.Block.dragMode_=1;Blockly.Block.onMouseUpWrapper_=
Blockly.bindEvent_(document,"mouseup",this,this.onMouseUp_);Blockly.Block.onMouseMoveWrapper_=Blockly.bindEvent_(document,"mousemove",this,this.onMouseMove_);this.draggedBubbles_=[];for(var b=this.getDescendants(),c=0,d;d=b[c];c++){if(d.mutator){var e=d.mutator.getIconLocation();e.bubble=d.mutator;this.draggedBubbles_.push(e)}d.comment&&(e=d.comment.getIconLocation(),e.bubble=d.comment,this.draggedBubbles_.push(e));d.warning&&(e=d.warning.getIconLocation(),e.bubble=d.warning,this.draggedBubbles_.push(e))}}else return;
a.stopPropagation()}};
Blockly.Block.prototype.onMouseUp_=function(){Blockly.Block.terminateDrag_();if(Blockly.selected&&Blockly.highlightedConnection_)Blockly.localConnection_.connect(Blockly.highlightedConnection_),this.svg_&&(Blockly.localConnection_.isSuperior()?Blockly.highlightedConnection_:Blockly.localConnection_).sourceBlock_.svg_.connectionUiEffect(),this.workspace.trashcan&&this.workspace.trashcan.isOpen&&this.workspace.trashcan.close();else if(this.workspace.trashcan&&this.workspace.trashcan.isOpen){var a=this.workspace.trashcan;
goog.Timer.callOnce(a.close,100,a);Blockly.selected.dispose(!1,!0);Blockly.fireUiEvent(window,"resize")}Blockly.highlightedConnection_&&(Blockly.highlightedConnection_.unhighlight(),Blockly.highlightedConnection_=null)};Blockly.Block.prototype.showHelp_=function(){var a=goog.isFunction(this.helpUrl)?this.helpUrl():this.helpUrl;a&&window.open(a)};
Blockly.Block.prototype.duplicate_=function(){var a=Blockly.Xml.blockToDom_(this);Blockly.Xml.deleteNext(a);var a=Blockly.Xml.domToBlock_(this.workspace,a),b=this.getRelativeToSurfaceXY();b.x=Blockly.RTL?b.x-Blockly.SNAP_RADIUS:b.x+Blockly.SNAP_RADIUS;b.y+=2*Blockly.SNAP_RADIUS;a.moveBy(b.x,b.y);return a};
Blockly.Block.prototype.showContextMenu_=function(a,b){if(this.contextMenu){var c=this,d=[];if(this.deletable){var e={text:Blockly.MSG_DUPLICATE_BLOCK,enabled:!0,callback:function(){c.duplicate_()}};this.getDescendants().length>this.workspace.remainingCapacity()&&(e.enabled=!1);d.push(e);Blockly.Comment&&!this.collapsed&&(e={enabled:!0},this.comment?(e.text=Blockly.MSG_REMOVE_COMMENT,e.callback=function(){c.setCommentText(null)}):(e.text=Blockly.MSG_ADD_COMMENT,e.callback=function(){c.setCommentText("")}),
d.push(e));if(!this.collapsed)for(e=0;e<this.inputList.length;e++)if(this.inputList[e].type==Blockly.INPUT_VALUE){e={enabled:!0};e.text=this.inputsInline?Blockly.MSG_EXTERNAL_INPUTS:Blockly.MSG_INLINE_INPUTS;e.callback=function(){c.setInputsInline(!c.inputsInline)};d.push(e);break}Blockly.collapse&&(this.collapsed?(e={enabled:!0},e.text=Blockly.MSG_EXPAND_BLOCK,e.callback=function(){c.setCollapsed(!1)}):(e={enabled:!0},e.text=Blockly.MSG_COLLAPSE_BLOCK,e.callback=function(){c.setCollapsed(!0)}),d.push(e));
e={text:this.disabled?Blockly.MSG_ENABLE_BLOCK:Blockly.MSG_DISABLE_BLOCK,enabled:!this.getInheritedDisabled(),callback:function(){c.setDisabled(!c.disabled)}};d.push(e);e=this.getDescendants().length;c.nextConnection&&c.nextConnection.targetConnection&&(e-=this.nextConnection.targetBlock().getDescendants().length);e={text:1==e?Blockly.MSG_DELETE_BLOCK:Blockly.MSG_DELETE_X_BLOCKS.replace("%1",e),enabled:!0,callback:function(){c.dispose(!0,!0)}};d.push(e)}e={enabled:!!(goog.isFunction(this.helpUrl)?
this.helpUrl():this.helpUrl)};e.text=Blockly.MSG_HELP;e.callback=function(){c.showHelp_()};d.push(e);this.customContextMenu&&this.customContextMenu(d);Blockly.ContextMenu.show(a,b,d)}};Blockly.Block.prototype.getConnections_=function(a){var b=[];if(a||this.rendered)if(this.outputConnection&&b.push(this.outputConnection),this.nextConnection&&b.push(this.nextConnection),this.previousConnection&&b.push(this.previousConnection),a||!this.collapsed){a=0;for(var c;c=this.inputList[a];a++)c.connection&&b.push(c.connection)}return b};
Blockly.Block.prototype.moveConnections_=function(a,b){if(this.rendered){for(var c=this.getConnections_(!1),d=0;d<c.length;d++)c[d].moveBy(a,b);this.mutator&&this.mutator.computeIconLocation();this.comment&&this.comment.computeIconLocation();this.warning&&this.warning.computeIconLocation();for(d=0;d<this.childBlocks_.length;d++)this.childBlocks_[d].moveConnections_(a,b)}};Blockly.Block.prototype.setDragging_=function(a){a?this.svg_.addDragging():this.svg_.removeDragging();for(var b=0;b<this.childBlocks_.length;b++)this.childBlocks_[b].setDragging_(a)};
Blockly.Block.prototype.onMouseMove_=function(a){if(!("mousemove"==a.type&&1==a.x&&0==a.y&&0==a.button)){Blockly.removeAllRanges();var b=a.clientX-this.startDragMouseX,c=a.clientY-this.startDragMouseY;1==Blockly.Block.dragMode_&&Math.sqrt(Math.pow(b,2)+Math.pow(c,2))>Blockly.DRAG_RADIUS&&(Blockly.Block.dragMode_=2,this.setParent(null),this.setDragging_(!0));if(2==Blockly.Block.dragMode_){var d=this.startDragX+b,e=this.startDragY+c;this.svg_.getRootElement().setAttribute("transform","translate("+d+
", "+e+")");for(d=0;d<this.draggedBubbles_.length;d++)e=this.draggedBubbles_[d],e.bubble.setIconLocation(e.x+b,e.y+c);for(var e=this.getConnections_(!1),f=null,g=null,h=Blockly.SNAP_RADIUS,d=0;d<e.length;d++){var j=e[d],k=j.closest(h,b,c);k.connection&&(f=k.connection,g=j,h=k.radius)}Blockly.highlightedConnection_&&Blockly.highlightedConnection_!=f&&(Blockly.highlightedConnection_.unhighlight(),Blockly.highlightedConnection_=null,Blockly.localConnection_=null);f&&f!=Blockly.highlightedConnection_&&
(f.highlight(),Blockly.highlightedConnection_=f,Blockly.localConnection_=g);if(this.workspace.trashcan&&this.deletable)this.workspace.trashcan.onMouseMove(a)}}a.stopPropagation()};
Blockly.Block.prototype.bumpNeighbours_=function(){for(var a=this.getRootBlock(),b=this.getConnections_(!1),c=0;c<b.length;c++){var d=b[c];d.targetConnection&&d.isSuperior()&&d.targetBlock().bumpNeighbours_();for(var e=d.neighbours_(Blockly.SNAP_RADIUS),f=0;f<e.length;f++){var g=e[f];if(!d.targetConnection||!g.targetConnection)g.sourceBlock_.getRootBlock()!=a&&(d.isSuperior()?g.bumpAwayFrom_(d):d.bumpAwayFrom_(g))}}};Blockly.Block.prototype.getParent=function(){return this.parentBlock_};
Blockly.Block.prototype.getSurroundParent=function(){for(var a=this;;){do{var b=a,a=a.getParent();if(!a)return null}while(a.nextConnection&&a.nextConnection.targetBlock()==b);return a}};Blockly.Block.prototype.getRootBlock=function(){var a,b=this;do a=b,b=a.parentBlock_;while(b);return a};Blockly.Block.prototype.getChildren=function(){return this.childBlocks_};
Blockly.Block.prototype.setParent=function(a){if(this.parentBlock_){for(var b=this.parentBlock_.childBlocks_,c,d=0;c=b[d];d++)if(c==this){b.splice(d,1);break}b=this.getRelativeToSurfaceXY();this.workspace.getCanvas().appendChild(this.svg_.getRootElement());this.svg_.getRootElement().setAttribute("transform","translate("+b.x+", "+b.y+")");this.parentBlock_=null;this.previousConnection&&this.previousConnection.targetConnection&&this.previousConnection.disconnect();this.outputConnection&&this.outputConnection.targetConnection&&
this.outputConnection.disconnect()}else this.workspace.removeTopBlock(this);(this.parentBlock_=a)?(a.childBlocks_.push(this),b=this.getRelativeToSurfaceXY(),a.svg_&&this.svg_&&a.svg_.getRootElement().appendChild(this.svg_.getRootElement()),a=this.getRelativeToSurfaceXY(),this.moveConnections_(a.x-b.x,a.y-b.y)):this.workspace.addTopBlock(this)};Blockly.Block.prototype.getDescendants=function(){for(var a=[this],b,c=0;b=this.childBlocks_[c];c++)a=a.concat(b.getDescendants());return a};
Blockly.Block.prototype.getColour=function(){return this.colourHue_};Blockly.Block.prototype.setColour=function(a){this.colourHue_=a;this.svg_&&this.svg_.updateColour();this.mutator&&this.mutator.updateColour();this.comment&&this.comment.updateColour();this.warning&&this.warning.updateColour();if(this.rendered){a=0;for(var b;b=this.inputList[a];a++)for(var c=0,d;d=b.titleRow[c];c++)d.setText(null);this.render()}};
Blockly.Block.prototype.getTitle_=function(a){for(var b=0,c;c=this.inputList[b];b++)for(var d=0,e;e=c.titleRow[d];d++)if(e.name===a)return e;return null};Blockly.Block.prototype.getTitleValue=function(a){return(a=this.getTitle_(a))?a.getValue():null};Blockly.Block.prototype.setTitleValue=function(a,b){var c=this.getTitle_(b);if(c)c.setValue(a);else throw'Title "'+b+'" not found.';};Blockly.Block.prototype.setTooltip=function(a){this.tooltip=a};
Blockly.Block.prototype.setPreviousStatement=function(a,b){if(this.previousConnection){if(this.previousConnection.targetConnection)throw"Must disconnect previous statement before removing connection.";this.previousConnection.dispose();this.previousConnection=null}if(a){if(this.outputConnection)throw"Remove output connection prior to adding previous connection.";void 0===b&&(b=null);this.previousConnection=new Blockly.Connection(this,Blockly.PREVIOUS_STATEMENT);this.previousConnection.setCheck(b)}this.rendered&&
(this.render(),this.bumpNeighbours_())};Blockly.Block.prototype.setNextStatement=function(a,b){if(this.nextConnection){if(this.nextConnection.targetConnection)throw"Must disconnect next statement before removing connection.";this.nextConnection.dispose();this.nextConnection=null}a&&(void 0===b&&(b=null),this.nextConnection=new Blockly.Connection(this,Blockly.NEXT_STATEMENT),this.nextConnection.setCheck(b));this.rendered&&(this.render(),this.bumpNeighbours_())};
Blockly.Block.prototype.setOutput=function(a,b){if(this.outputConnection){if(this.outputConnection.targetConnection)throw"Must disconnect output value before removing connection.";this.outputConnection.dispose();this.outputConnection=null}if(a){if(this.previousConnection)throw"Remove previous connection prior to adding output connection.";void 0===b&&(b=null);this.outputConnection=new Blockly.Connection(this,Blockly.OUTPUT_VALUE);this.outputConnection.setCheck(b)}this.rendered&&(this.render(),this.bumpNeighbours_())};
Blockly.Block.prototype.setInputsInline=function(a){this.inputsInline=a;this.rendered&&(this.render(),this.bumpNeighbours_(),this.workspace.fireChangeEvent())};Blockly.Block.prototype.setDisabled=function(a){this.disabled!=a&&(this.disabled=a,this.svg_.updateDisabled(),this.workspace.fireChangeEvent())};Blockly.Block.prototype.getInheritedDisabled=function(){for(var a=this;;)if(a=a.getSurroundParent()){if(a.disabled)return!0}else return!1};
Blockly.Block.prototype.setCollapsed=function(a){if(this.collapsed!=a){for(var b=(this.collapsed=a)?"none":"block",c=[],d=0,e;e=this.inputList[d];d++){for(var f=0,g;g=e.titleRow[f];f++)(g.getRootElement?g.getRootElement():g).style.display=b;if(e.connection&&(a?e.connection.hideAll():c=c.concat(e.connection.unhideAll()),e=e.connection.targetBlock()))e.svg_.getRootElement().style.display=b,a&&(e.rendered=!1)}a&&(this.mutator&&this.mutator.setVisible(!1),this.comment&&this.comment.setVisible(!1),this.warning&&
this.warning.setVisible(!1));0==c.length&&(c[0]=this);if(this.rendered){for(d=0;a=c[d];d++)a.render();this.bumpNeighbours_()}}};Blockly.Block.prototype.appendValueInput=function(a){return this.appendInput_(Blockly.INPUT_VALUE,a)};Blockly.Block.prototype.appendStatementInput=function(a){return this.appendInput_(Blockly.NEXT_STATEMENT,a)};Blockly.Block.prototype.appendDummyInput=function(a){return this.appendInput_(Blockly.DUMMY_INPUT,a||"")};
Blockly.Block.prototype.appendInput_=function(a,b){var c=null;if(a==Blockly.INPUT_VALUE||a==Blockly.NEXT_STATEMENT)c=new Blockly.Connection(this,a);c=new Blockly.Input(a,b,this,c);this.inputList.push(c);this.rendered&&(this.render(),this.bumpNeighbours_());return c};
Blockly.Block.prototype.moveInputBefore=function(a,b){if(a==b)throw"Can't move \""+a+'" to itself.';for(var c=-1,d=-1,e=0,f;f=this.inputList[e];e++)if(f.name==a){if(c=e,-1!=d)break}else if(f.name==b&&(d=e,-1!=c))break;if(-1==c)throw'Named input "'+a+'" not found.';if(-1==d)throw'Reference input "'+a+'" not found.';this.inputList.splice(c,1);c<d&&d--;this.inputList.splice(d,0,f);this.rendered&&(this.render(),this.bumpNeighbours_())};
Blockly.Block.prototype.removeInput=function(a){for(var b=0,c;c=this.inputList[b];b++)if(c.name==a){c.connection&&c.connection.targetConnection&&c.connection.targetBlock().setParent(null);c.dispose();this.inputList.splice(b,1);this.rendered&&(this.render(),this.bumpNeighbours_());return}throw'Input "'+a+'" not found.';};Blockly.Block.prototype.getInput=function(a){for(var b=0,c;c=this.inputList[b];b++)if(c.name==a)return c;return null};
Blockly.Block.prototype.getInputTargetBlock=function(a){return(a=this.getInput(a))&&a.connection&&a.connection.targetBlock()};Blockly.Block.prototype.setMutator=function(a){this.mutator&&this.mutator!==a&&this.mutator.dispose();a&&(a.block_=this,this.mutator=a,this.svg_&&a.createIcon())};Blockly.Block.prototype.getCommentText=function(){return this.comment?this.comment.getText().replace(/\s+$/,"").replace(/ +\n/g,"\n"):""};
Blockly.Block.prototype.setCommentText=function(a){if(!Blockly.Comment)throw"Comments not supported.";var b=!1;goog.isString(a)?(this.comment||(this.comment=new Blockly.Comment(this),b=!0),this.comment.setText(a)):this.comment&&(this.comment.dispose(),b=!0);this.rendered&&(this.render(),b&&this.bumpNeighbours_())};
Blockly.Block.prototype.setWarningText=function(a){if(!Blockly.Warning)throw"Warnings not supported.";this.isInFlyout&&(a=null);var b=!1;goog.isString(a)?(this.warning||(this.warning=new Blockly.Warning(this),b=!0),this.warning.setText(a)):this.warning&&(this.warning.dispose(),b=!0);this.rendered&&(this.render(),b&&this.bumpNeighbours_())};Blockly.Block.prototype.render=function(){if(!this.svg_)throw"Uninitialized block cannot be rendered.  Call block.initSvg()";this.svg_.render()};Blockly.Generator={};Blockly.Generator.NAME_TYPE="generated_function";Blockly.Generator.languages={};Blockly.Generator.get=function(a){if(!(a in Blockly.Generator.languages)){var b=new Blockly.CodeGenerator(a);Blockly.Generator.languages[a]=b}return Blockly.Generator.languages[a]};
Blockly.Generator.workspaceToCode=function(a){var b=[];a=Blockly.Generator.get(a);a.init();for(var c=Blockly.mainWorkspace.getTopBlocks(!0),d=0,e;e=c[d];d++){var f=a.blockToCode(e);f instanceof Array&&(f=f[0]);f&&(e.outputConnection&&a.scrubNakedValue&&(f=a.scrubNakedValue(f)),b.push(f))}b=b.join("\n");b=a.finish(b);b=b.replace(/^\s+\n/,"");b=b.replace(/\n\s+$/,"\n");return b=b.replace(/[ \t]+\n/g,"\n")};Blockly.Generator.prefixLines=function(a,b){return b+a.replace(/\n(.)/g,"\n"+b+"$1")};
Blockly.Generator.allNestedComments=function(a){var b=[];a=a.getDescendants();for(var c=0;c<a.length;c++){var d=a[c].getCommentText();d&&b.push(d)}b.length&&b.push("");return b.join("\n")};Blockly.CodeGenerator=function(a){this.name_=a;this.RESERVED_WORDS_=""};
Blockly.CodeGenerator.prototype.blockToCode=function(a){if(!a)return"";if(a.disabled)return a=a.nextConnection&&a.nextConnection.targetBlock(),this.blockToCode(a);var b=this[a.type];if(!b)throw'Language "'+this.name_+'" does not know how to generate code for block type "'+a.type+'".';b=b.call(a);return b instanceof Array?[this.scrub_(a,b[0]),b[1]]:this.scrub_(a,b)};
Blockly.CodeGenerator.prototype.valueToCode=function(a,b,c){if(isNaN(c))throw'Expecting valid order from block "'+a.type+'".';a=a.getInputTargetBlock(b);if(!a)return"";var d=this.blockToCode(a);if(""===d)return"";if(!(d instanceof Array))throw'Expecting tuple from value block "'+a.type+'".';b=d[0];d=d[1];if(isNaN(d))throw'Expecting valid order from value block "'+a.type+'".';b&&c<=d&&(b="("+b+")");return b};
Blockly.CodeGenerator.prototype.statementToCode=function(a,b){var c=a.getInputTargetBlock(b),d=this.blockToCode(c);if(!goog.isString(d))throw'Expecting code from statement block "'+c.type+'".';d&&(d=Blockly.Generator.prefixLines(d,"  "));return d};Blockly.CodeGenerator.prototype.addReservedWords=function(a){this.RESERVED_WORDS_+=a+","};Blockly.Css={};Blockly.Css.inject=function(){var a=Blockly.Css.CONTENT.join("\n"),b=Blockly.pathToBlockly.replace(/[\\\/]$/,""),a=a.replace(/<<<PATH>>>/g,b);goog.cssom.addCssText(a)};
Blockly.Css.CONTENT=[".blocklySvg {","  background-color: #fff;","  border: 1px solid #ddd;","}",".blocklyWidgetDiv {","  position: absolute;","  display: none;","  z-index: 999;","}",".blocklyDraggable {","  /* Hotspot coordinates are baked into the CUR file, but they are still","     required in the CSS due to a Chrome bug.","     http://code.google.com/p/chromium/issues/detail?id=1446 */","  cursor: url(<<<PATH>>>/media/handopen.cur) 8 5, auto;","}",".blocklyResizeSE {","  fill: #aaa;","  cursor: se-resize;",
"}",".blocklyResizeSW {","  fill: #aaa;","  cursor: sw-resize;","}",".blocklyResizeLine {","  stroke-width: 1;","  stroke: #888;","}",".blocklyHighlightedConnectionPath {","  stroke-width: 4px;","  stroke: #fc3;","  fill: none;","}",".blocklyPathLight {","  fill: none;","  stroke-width: 2;","  stroke-linecap: round;","}",".blocklySelected>.blocklyPath {","  stroke-width: 3px;","  stroke: #fc3;","}",".blocklySelected>.blocklyPathLight {","  display: none;","}",".blocklyDragging>.blocklyPath,",".blocklyDragging>.blocklyPathLight {",
"  fill-opacity: 0.8;","  stroke-opacity: 0.8;","}",".blocklyDragging>.blocklyPathDark {","  display: none;","}",".blocklyDisabled>.blocklyPath {","  fill-opacity: 0.50;","  stroke-opacity: 0.50;","}",".blocklyDisabled>.blocklyPathLight,",".blocklyDisabled>.blocklyPathDark {","  display: none;","}",".blocklyText {","  cursor: default;","  font-family: sans-serif;","  font-size: 11pt;","  fill: #fff;","}",".blocklyNonEditableText>text {","  pointer-events: none;","}",".blocklyNonEditableText>rect,",
".blocklyEditableText>rect {","  fill: #fff;","  fill-opacity: 0.6;","}",".blocklyNonEditableText>text,",".blocklyEditableText>text {","  fill: #000;","}",".blocklyEditableText:hover>rect {","  stroke-width: 2;","  stroke: #fff;","}","/*"," * Don't allow users to select text.  It gets annoying when trying to"," * drag a block and selected text moves instead."," */",".blocklySvg text {","  -moz-user-select: none;","  -webkit-user-select: none;","  user-select: none;","  cursor: inherit;","}","",".blocklyHidden {",
"  display: none;","}",".blocklyFieldDropdown:not(.blocklyHidden) {","  display: block;","}",".blocklyTooltipBackground {","  fill: #ffffc7;","  stroke-width: 1px;","  stroke: #d8d8d8;","}",".blocklyTooltipShadow,",".blocklyContextMenuShadow,",".blocklyDropdownMenuShadow {","  fill: #bbb;","  filter: url(#blocklyShadowFilter);","}",".blocklyTooltipText {","  font-family: sans-serif;","  font-size: 9pt;","  fill: #000;","}","",".blocklyIconShield {","  cursor: default;","  fill: #00c;","  stroke-width: 1px;",
"  stroke: #ccc;","}",".blocklyIconGroup:hover>.blocklyIconShield {","  fill: #00f;","  stroke: #fff;","}",".blocklyIconGroup:hover>.blocklyIconMark {","  fill: #fff;","}",".blocklyIconMark {","  cursor: default !important;","  font-family: sans-serif;","  font-size: 9pt;","  font-weight: bold;","  fill: #ccc;","  text-anchor: middle;","}",".blocklyWarningBody {","}",".blocklyMinimalBody {","  margin: 0;","  padding: 0;","}",".blocklyCommentTextarea {","  margin: 0;","  padding: 2px;","  border: 0;",
"  resize: none;","  background-color: #ffc;","}",".blocklyHtmlInput {","  font-family: sans-serif;","  font-size: 11pt;","  border: none;","  outline: none;","}",".blocklyContextMenuBackground,",".blocklyMutatorBackground {","  fill: #fff;","  stroke-width: 1;","  stroke: #ddd;","}",".blocklyContextMenuOptions>.blocklyMenuDiv,",".blocklyContextMenuOptions>.blocklyMenuDivDisabled,",".blocklyDropdownMenuOptions>.blocklyMenuDiv {","  fill: #fff;","}",".blocklyContextMenuOptions>.blocklyMenuDiv:hover>rect,",
".blocklyDropdownMenuOptions>.blocklyMenuDiv:hover>rect {","  fill: #57e;","}",".blocklyMenuSelected>rect {","  fill: #57e;","}",".blocklyMenuText {","  cursor: default !important;","  font-family: sans-serif;","  font-size: 15px; /* All context menu sizes are based on pixels. */","  fill: #000;","}",".blocklyContextMenuOptions>.blocklyMenuDiv:hover>.blocklyMenuText,",".blocklyDropdownMenuOptions>.blocklyMenuDiv:hover>.blocklyMenuText {","  fill: #fff;","}",".blocklyMenuSelected>.blocklyMenuText {",
"  fill: #fff;","}",".blocklyMenuDivDisabled>.blocklyMenuText {","  fill: #ccc;","}",".blocklyFlyoutBackground {","  fill: #ddd;","  fill-opacity: 0.8;","}",".blocklyColourBackground {","  fill: #666;","}",".blocklyScrollbarBackground {","  fill: #fff;","  stroke-width: 1;","  stroke: #e4e4e4;","}",".blocklyScrollbarKnob {","  fill: #ccc;","}",".blocklyScrollbarBackground:hover+.blocklyScrollbarKnob,",".blocklyScrollbarKnob:hover {","  fill: #bbb;","}",".blocklyInvalidInput {","  background: #faa;",
"}","","/* Category tree in Toolbox. */",".blocklyToolboxDiv {","  background-color: #ddd;","  display: none;","  overflow-x: visible;","  overflow-y: auto;","  position: absolute;","  z-index: 888;","}",".blocklyTreeRoot {","  padding: 4px 0;","}",".blocklyTreeRoot:focus {","  outline: none;","}",".blocklyTreeRow {","  line-height: 22px;","  height: 22px;","  padding-right: 1em;","  white-space: nowrap;","}",'.blocklyToolboxDiv[dir="RTL"] .blocklyTreeRow {',"  padding-right: 0;","  padding-left: 1em !important;",
"}",".blocklyTreeRow:hover {","  background-color: #e4e4e4;","}",".blocklyTreeIcon {","  height: 16px;","  width: 16px;","  vertical-align: middle;","  background-image: url(<<<PATH>>>/media/tree.png);","}",".blocklyTreeIconClosedLtr {","  background-position: -32px -1px;","}",".blocklyTreeIconClosedRtl {","  background-position: 0px -1px;","}",".blocklyTreeIconOpen {","  background-position: -16px -1px;","}",".blocklyTreeIconNone {","  background-position: -48px -1px;","}",".blocklyTreeSelected>.blocklyTreeIconClosedLtr {",
"  background-position: -32px -17px;","}",".blocklyTreeSelected>.blocklyTreeIconClosedRtl {","  background-position: 0px -17px;","}",".blocklyTreeSelected>.blocklyTreeIconOpen {","  background-position: -16px -17px;","}",".blocklyTreeSelected>.blocklyTreeIconNone {","  background-position: -48px -17px;","}",".blocklyTreeLabel {","  cursor: default;","  font-family: sans-serif;","  font-size: 16px;","  padding: 0 3px;","  vertical-align: middle;","}",".blocklyTreeSelected  {","  background-color: #57e !important;",
"}",".blocklyTreeSelected .blocklyTreeLabel {","  color: #fff;","}","","/*"," * Copyright 2007 The Closure Library Authors. All Rights Reserved."," *"," * Use of this source code is governed by the Apache License, Version 2.0."," * See the COPYING file for details."," */","","/* Author: pupius@google.com (Daniel Pupius) */","","/*","  Styles to make the colorpicker look like the old gmail color picker","  NOTE: without CSS scoping this will override styles defined in palette.css","*/",".goog-palette {",
"  outline: none;","  cursor: default;","}","",".goog-palette-table {","  border: 1px solid #666;","  border-collapse: collapse;","}","",".goog-palette-cell {","  height: 13px;","  width: 15px;","  margin: 0;","  border: 0;","  text-align: center;","  vertical-align: middle;","  border-right: 1px solid #666;","  font-size: 1px;","}","",".goog-palette-colorswatch {","  position: relative;","  height: 13px;","  width: 15px;","  border: 1px solid #666;","}","",".goog-palette-cell-hover .goog-palette-colorswatch {",
"  border: 1px solid #FFF;","}","",".goog-palette-cell-selected .goog-palette-colorswatch {","  border: 1px solid #000;","  color: #fff;","}",""];Blockly.inject=function(a,b){if(!goog.dom.contains(document,a))throw"Error: container is not in current document.";b&&goog.mixin(Blockly,Blockly.parseOptions_(b));Blockly.createDom_(a);Blockly.init_()};
Blockly.parseOptions_=function(a){var b=!a.readOnly;if(b){var c=a.toolbox||"<xml />";"string"==typeof c&&(c=Blockly.Xml.textToDom(c));var d=!!c.getElementsByTagName("category").length,e=a.trashcan;void 0===e&&(e=d);var f=a.collapse;void 0===f&&(f=d)}else f=e=d=!1,c=null;return{RTL:!!a.rtl,collapse:f,editable:b,maxBlocks:a.maxBlocks||Infinity,pathToBlockly:a.path||"./",Toolbox:d?Blockly.Toolbox:void 0,Trashcan:e?Blockly.Trashcan:void 0,languageTree:c}};
Blockly.createDom_=function(a){a.setAttribute("dir","LTR");goog.ui.Component.setDefaultRightToLeft(Blockly.RTL);Blockly.Css.inject();var b=Blockly.createSvgElement("svg",{xmlns:"http://www.w3.org/2000/svg","xmlns:html":"http://www.w3.org/1999/xhtml","xmlns:xlink":"http://www.w3.org/1999/xlink",version:"1.1","class":"blocklySvg"},null),c=Blockly.createSvgElement("defs",{},b),d,e;d=Blockly.createSvgElement("filter",{id:"blocklyEmboss"},c);Blockly.createSvgElement("feGaussianBlur",{"in":"SourceAlpha",
stdDeviation:1,result:"blur"},d);e=Blockly.createSvgElement("feSpecularLighting",{"in":"blur",surfaceScale:1,specularConstant:0.5,specularExponent:10,"lighting-color":"white",result:"specOut"},d);Blockly.createSvgElement("fePointLight",{x:-5E3,y:-1E4,z:2E4},e);Blockly.createSvgElement("feComposite",{"in":"specOut",in2:"SourceAlpha",operator:"in",result:"specOut"},d);Blockly.createSvgElement("feComposite",{"in":"SourceGraphic",in2:"specOut",operator:"arithmetic",k1:0,k2:1,k3:1,k4:0},d);d=Blockly.createSvgElement("filter",
{id:"blocklyTrashcanShadowFilter"},c);Blockly.createSvgElement("feGaussianBlur",{"in":"SourceAlpha",stdDeviation:2,result:"blur"},d);Blockly.createSvgElement("feOffset",{"in":"blur",dx:1,dy:1,result:"offsetBlur"},d);d=Blockly.createSvgElement("feMerge",{},d);Blockly.createSvgElement("feMergeNode",{"in":"offsetBlur"},d);Blockly.createSvgElement("feMergeNode",{"in":"SourceGraphic"},d);d=Blockly.createSvgElement("filter",{id:"blocklyShadowFilter"},c);Blockly.createSvgElement("feGaussianBlur",{stdDeviation:2},
d);c=Blockly.createSvgElement("pattern",{id:"blocklyDisabledPattern",patternUnits:"userSpaceOnUse",width:10,height:10},c);Blockly.createSvgElement("rect",{width:10,height:10,fill:"#aaa"},c);Blockly.createSvgElement("path",{d:"M 0 0 L 10 10 M 10 0 L 0 10",stroke:"#cc0"},c);Blockly.mainWorkspace=new Blockly.Workspace;b.appendChild(Blockly.mainWorkspace.createDom());Blockly.mainWorkspace.maxBlocks=Blockly.maxBlocks;if(Blockly.editable)if(Blockly.Toolbox)Blockly.Toolbox.createDom(b,a);else{Blockly.mainWorkspace.flyout_=
new Blockly.Flyout;var f=Blockly.mainWorkspace.flyout_,c=f.createDom();f.init(Blockly.mainWorkspace,Blockly.getMainWorkspaceMetrics,!0);f.autoClose=!1;goog.dom.insertSiblingBefore(c,Blockly.mainWorkspace.svgGroup_);Blockly.bindEvent_(Blockly.mainWorkspace.getCanvas(),"blocklyWorkspaceChange",Blockly.mainWorkspace,function(){if(0==Blockly.Block.dragMode_)for(var a=Blockly.svgSize(),b=Blockly.mainWorkspace.getTopBlocks(!1),c=0,d;d=b[c];c++)if(d.deletable){var e=d.getRelativeToSurfaceXY(),m=d.getSvgRoot().getBBox(),
n=e.y>a.height-20,q=Blockly.RTL?e.x>a.width-f.width_+40-Blockly.mainWorkspace.scrollX:e.x<f.width_-40-Blockly.mainWorkspace.scrollX,p=Blockly.RTL?e.x<20-Blockly.mainWorkspace.scrollX:e.x>a.width-20-Blockly.mainWorkspace.scrollX;(e.y<20-m.height||n||q||p)&&d.dispose(!1,!0)}})}else delete Blockly.Toolbox,delete Blockly.Flyout;Blockly.Tooltip&&b.appendChild(Blockly.Tooltip.createDom());Blockly.editable&&Blockly.FieldDropdown&&b.appendChild(Blockly.FieldDropdown.createDom());Blockly.ContextMenu&&Blockly.ContextMenu&&
b.appendChild(Blockly.ContextMenu.createDom());a.appendChild(b);Blockly.svg=b;Blockly.svgResize();Blockly.widgetDiv=goog.dom.createDom("div",{"class":"blocklyWidgetDiv"});document.body.appendChild(Blockly.widgetDiv)};
Blockly.init_=function(){Blockly.bindEvent_(Blockly.svg,"mousedown",null,Blockly.onMouseDown_);Blockly.bindEvent_(Blockly.svg,"mousemove",null,Blockly.onMouseMove_);Blockly.bindEvent_(Blockly.svg,"contextmenu",null,Blockly.onContextMenu_);Blockly.documentEventsBound_||(Blockly.bindEvent_(window,"resize",document,Blockly.svgResize),Blockly.bindEvent_(document,"mouseup",null,Blockly.onMouseUp_),Blockly.bindEvent_(document,"keydown",null,Blockly.onKeyDown_),Blockly.documentEventsBound_=!0);var a=!0;
Blockly.languageTree&&(Blockly.Toolbox?Blockly.Toolbox.init():Blockly.Flyout&&(Blockly.mainWorkspace.flyout_.init(Blockly.mainWorkspace,Blockly.getMainWorkspaceMetrics,!0),Blockly.mainWorkspace.flyout_.show(Blockly.languageTree.childNodes),Blockly.mainWorkspace.scrollX=Blockly.mainWorkspace.flyout_.width_,a="translate("+Blockly.mainWorkspace.scrollX+", 0)",Blockly.mainWorkspace.getCanvas().setAttribute("transform",a),Blockly.mainWorkspace.getBubbleCanvas().setAttribute("transform",a),a=!1));a&&(Blockly.mainWorkspace.scrollbar=
new Blockly.ScrollbarPair(Blockly.mainWorkspace.getBubbleCanvas(),Blockly.getMainWorkspaceMetrics,Blockly.setMainWorkspaceMetrics));Blockly.mainWorkspace.addTrashcan(Blockly.getMainWorkspaceMetrics);Blockly.loadAudio_("media/click.wav","click");Blockly.loadAudio_("media/delete.wav","delete")};Blockly.FieldCheckbox=function(a,b){Blockly.FieldCheckbox.superClass_.constructor.call(this,"");this.changeHandler_=b;this.checkElement_=Blockly.createSvgElement("text",{"class":"blocklyText",x:-3},this.group_);var c=document.createTextNode("\u2713");this.checkElement_.appendChild(c);this.setValue(a)};goog.inherits(Blockly.FieldCheckbox,Blockly.Field);Blockly.FieldCheckbox.prototype.CURSOR="default";Blockly.FieldCheckbox.prototype.getValue=function(){return String(this.state_).toUpperCase()};
Blockly.FieldCheckbox.prototype.setValue=function(a){a="TRUE"==a;this.state_!==a&&(this.state_=a,this.checkElement_.style.display=a?"block":"none",this.sourceBlock_&&this.sourceBlock_.rendered&&this.sourceBlock_.workspace.fireChangeEvent())};Blockly.FieldCheckbox.prototype.showEditor_=function(){var a=!this.state_;if(this.changeHandler_){var b=this.changeHandler_(a);void 0!==b&&(a=b)}null!==a&&this.setValue(String(a).toUpperCase())};Blockly.FieldColour=function(a,b){Blockly.FieldColour.superClass_.constructor.call(this,"\u00a0\u00a0\u00a0");this.changeHandler_=b;this.borderRect_.style.fillOpacity=1;this.setValue(a)};goog.inherits(Blockly.FieldColour,Blockly.Field);Blockly.FieldColour.isOpen_=!1;Blockly.FieldColour.prototype.CURSOR="default";Blockly.FieldColour.prototype.getValue=function(){return this.colour_};
Blockly.FieldColour.prototype.setValue=function(a){this.colour_=a;this.borderRect_.style.fill=a;this.sourceBlock_&&this.sourceBlock_.rendered&&this.sourceBlock_.workspace.fireChangeEvent()};
Blockly.FieldColour.prototype.showEditor_=function(){Blockly.FieldColour.isOpen_=!0;goog.dom.removeChildren(Blockly.widgetDiv);Blockly.widgetDiv.style.display="block";var a=goog.ui.ColorPicker.createSimpleColorGrid();a.render(Blockly.widgetDiv);a.setSelectedColor(this.getValue());var b=Blockly.getAbsoluteXY_(this.borderRect_),c=this.borderRect_.getBBox();Blockly.RTL&&(b.x+=c.width);b.y+=c.height-1;Blockly.RTL&&(b.x-=Blockly.widgetDiv.offsetWidth);Blockly.widgetDiv.style.left=b.x+"px";Blockly.widgetDiv.style.top=
b.y+"px";var d=this;Blockly.FieldColour.changeEventKey_=goog.events.listen(a,goog.ui.ColorPicker.EventType.CHANGE,function(a){a=a.target.getSelectedColor()||"#000000";Blockly.FieldColour.hide();if(d.changeHandler_){var b=d.changeHandler_(a);void 0!==b&&(a=b)}null!==a&&d.setValue(a)})};
Blockly.FieldColour.hide=function(){Blockly.FieldColour.isOpen_&&(Blockly.widgetDiv.style.display="none",goog.dom.removeChildren(Blockly.widgetDiv),Blockly.FieldColour.isOpen_=!1,Blockly.FieldColour.changeEventKey_&&goog.events.unlistenByKey(Blockly.FieldColour.changeEventKey_))};Blockly.FieldDropdown=function(a,b){this.menuGenerator_=a;this.changeHandler_=b;this.trimOptions_();var c=this.getOptions_()[0];this.value_=c[1];this.arrow_=Blockly.createSvgElement("tspan",{},null);this.arrow_.appendChild(document.createTextNode(Blockly.RTL?"\u25be ":" \u25be"));Blockly.FieldDropdown.superClass_.constructor.call(this,c[0])};goog.inherits(Blockly.FieldDropdown,Blockly.Field);
Blockly.FieldDropdown.createDom=function(){var a=Blockly.createSvgElement("g",{"class":"blocklyHidden blocklyFieldDropdown"},null);Blockly.FieldDropdown.svgGroup_=a;Blockly.FieldDropdown.svgShadow_=Blockly.createSvgElement("rect",{"class":"blocklyDropdownMenuShadow",x:0,y:1,rx:2,ry:2},a);Blockly.FieldDropdown.svgBackground_=Blockly.createSvgElement("rect",{x:-2,y:-1,rx:2,ry:2,filter:"url(#blocklyEmboss)"},a);Blockly.FieldDropdown.svgOptions_=Blockly.createSvgElement("g",{"class":"blocklyDropdownMenuOptions"},
a);return a};Blockly.FieldDropdown.prototype.dispose=function(){Blockly.FieldDropdown.openDropdown_==this&&Blockly.FieldDropdown.hide();Blockly.Field.prototype.dispose.call(this)};Blockly.FieldDropdown.CORNER_RADIUS=2;Blockly.FieldDropdown.prototype.CURSOR="default";Blockly.FieldDropdown.openDropdown_=null;
Blockly.FieldDropdown.prototype.showEditor_=function(){function a(a){return function(b){if(this.changeHandler_){var c=this.changeHandler_(a);void 0!==c&&(a=c)}null!==a&&this.setValue(a);b.stopPropagation()}}var b=Blockly.FieldDropdown.svgGroup_,c=Blockly.FieldDropdown.svgOptions_,d=Blockly.FieldDropdown.svgBackground_,e=Blockly.FieldDropdown.svgShadow_;goog.dom.removeChildren(c);Blockly.removeClass_(b,"blocklyHidden");Blockly.FieldDropdown.openDropdown_=this;for(var f=0,g=[],h=null,j=this.getOptions_(),
k=0;k<j.length;k++){var l=j[k][1],m=Blockly.ContextMenu.optionToDom(j[k][0]),n=m.firstChild,q=m.lastChild;c.appendChild(m);!h&&l==this.value_&&(h=Blockly.createSvgElement("text",{"class":"blocklyMenuText",y:15},null),m.insertBefore(h,q),h.appendChild(document.createTextNode("\u2713")));m.setAttribute("transform","translate(0, "+k*Blockly.ContextMenu.Y_HEIGHT+")");g.push(n);Blockly.bindEvent_(m,"mousedown",null,Blockly.noEvent);Blockly.bindEvent_(m,"mouseup",this,a(l));Blockly.bindEvent_(m,"mouseup",
null,Blockly.FieldDropdown.hide);f=Math.max(f,q.getComputedTextLength())}f+=2*Blockly.ContextMenu.X_PADDING;for(k=0;k<g.length;k++)g[k].setAttribute("width",f);if(Blockly.RTL)for(k=0;m=c.childNodes[k];k++)q=m.lastChild,q.setAttribute("text-anchor","end"),q.setAttribute("x",f-Blockly.ContextMenu.X_PADDING);h&&(Blockly.RTL?(h.setAttribute("text-anchor","end"),h.setAttribute("x",f-5)):h.setAttribute("x",5));k=f+2*Blockly.FieldDropdown.CORNER_RADIUS;j=j.length*Blockly.ContextMenu.Y_HEIGHT+Blockly.FieldDropdown.CORNER_RADIUS+
1;e.setAttribute("width",k);e.setAttribute("height",j);d.setAttribute("width",k);d.setAttribute("height",j);e=Blockly.makeColour(this.sourceBlock_.getColour());d.setAttribute("fill",e);d=Blockly.getSvgXY_(this.borderRect_);e=this.borderRect_.getBBox();k=Blockly.RTL?d.x-f+Blockly.ContextMenu.X_PADDING+e.width-Blockly.BlockSvg.SEP_SPACE_X/2:d.x-Blockly.ContextMenu.X_PADDING+Blockly.BlockSvg.SEP_SPACE_X/2;b.setAttribute("transform","translate("+k+", "+(d.y+e.height)+")")};
Blockly.FieldDropdown.prototype.trimOptions_=function(){this.suffixTitle=this.prefixTitle=null;var a=this.menuGenerator_;if(goog.isArray(a)&&!(2>a.length)){var b=a.map(function(a){return a[0]}),c=Blockly.shortestStringLength(b),d=Blockly.commonWordPrefix(b,c),e=Blockly.commonWordSuffix(b,c);if((d||e)&&!(c<=d+e)){d&&(this.prefixTitle=b[0].substring(0,d-1));e&&(this.suffixTitle=b[0].substr(1-e));b=[];for(c=0;c<a.length;c++){var f=a[c][0],g=a[c][1],f=f.substring(d,f.length-e);b[c]=[f,g]}this.menuGenerator_=
b}}};Blockly.FieldDropdown.prototype.getOptions_=function(){return goog.isFunction(this.menuGenerator_)?this.menuGenerator_.call(this):this.menuGenerator_};Blockly.FieldDropdown.prototype.getValue=function(){return this.value_};Blockly.FieldDropdown.prototype.setValue=function(a){this.value_=a;for(var b=this.getOptions_(),c=0;c<b.length;c++)if(b[c][1]==a){this.setText(b[c][0]);return}this.setText(a)};
Blockly.FieldDropdown.prototype.setText=function(a){this.sourceBlock_&&(this.arrow_.style.fill=Blockly.makeColour(this.sourceBlock_.getColour()));null!==a&&(this.text_=a,goog.dom.removeChildren(this.textElement_),a=a.replace(/\s/g,Blockly.Field.NBSP),a||(a=Blockly.Field.NBSP),a=document.createTextNode(a),this.textElement_.appendChild(a),Blockly.RTL?this.textElement_.insertBefore(this.arrow_,this.textElement_.firstChild):this.textElement_.appendChild(this.arrow_),this.size_.width=0,this.sourceBlock_&&
this.sourceBlock_.rendered&&(this.sourceBlock_.render(),this.sourceBlock_.bumpNeighbours_(),this.sourceBlock_.workspace.fireChangeEvent()))};Blockly.FieldDropdown.hide=function(){var a=Blockly.FieldDropdown.svgGroup_;a&&Blockly.addClass_(a,"blocklyHidden");Blockly.FieldDropdown.openDropdown_=null};Blockly.FieldImage=function(a,b,c){this.sourceBlock_=null;c=Number(c);b=Number(b);this.size_={height:c+10,width:b};var d=6-Blockly.BlockSvg.TITLE_HEIGHT;this.group_=Blockly.createSvgElement("g",{},null);this.imageElement_=Blockly.createSvgElement("image",{height:c+"px",width:b+"px",y:d},this.group_);this.setText(a);goog.userAgent.GECKO&&(this.rectElement_=Blockly.createSvgElement("rect",{height:c+"px",width:b+"px",y:d,"fill-opacity":0},this.group_))};goog.inherits(Blockly.FieldImage,Blockly.Field);
Blockly.FieldImage.prototype.rectElement_=null;Blockly.FieldImage.prototype.EDITABLE=!1;Blockly.FieldImage.prototype.init=function(a){if(this.sourceBlock_)throw"Image has already been initialized once.";this.sourceBlock_=a;a.getSvgRoot().appendChild(this.group_);a=this.rectElement_||this.imageElement_;a.tooltip=this.sourceBlock_;Blockly.Tooltip&&Blockly.Tooltip.bindMouseEvents(a)};
Blockly.FieldImage.prototype.dispose=function(){goog.dom.removeNode(this.group_);this.rectElement_=this.imageElement_=this.group_=null};Blockly.FieldImage.prototype.setTooltip=function(a){(this.rectElement_||this.imageElement_).tooltip=a};Blockly.FieldImage.prototype.getText=function(){return this.src_};Blockly.FieldImage.prototype.setText=function(a){null!==a&&(this.src_=a,this.imageElement_.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",goog.isString(a)?a:""))};Blockly.FieldTextInput=function(a,b){Blockly.FieldTextInput.superClass_.constructor.call(this,a);this.changeHandler_=b};goog.inherits(Blockly.FieldTextInput,Blockly.Field);Blockly.FieldTextInput.prototype.setText=function(a){if(null!==a){if(this.changeHandler_){var b=this.changeHandler_(a);null!==b&&void 0!==b&&(a=b)}Blockly.Field.prototype.setText.call(this,a)}};
Blockly.FieldTextInput.injectDom_=function(a){a=Blockly.createSvgElement("foreignObject",{height:22},a);Blockly.FieldTextInput.svgForeignObject_=a;var b=goog.dom.createDom("body","blocklyMinimalBody"),c=goog.dom.createDom("input","blocklyHtmlInput");Blockly.FieldTextInput.htmlInput_=c;b.appendChild(c);a.appendChild(b)};
Blockly.FieldTextInput.disposeDom_=function(){goog.dom.removeNode(Blockly.FieldTextInput.svgForeignObject_);Blockly.FieldTextInput.svgForeignObject_=null;Blockly.FieldTextInput.htmlInput_=null};Blockly.FieldTextInput.prototype.CURSOR="text";
Blockly.FieldTextInput.prototype.showEditor_=function(){if(goog.userAgent.MOBILE||window.opera){var a=window.prompt(Blockly.MSG_CHANGE_VALUE_TITLE,this.text_);if(this.changeHandler_){var b=this.changeHandler_(a);void 0!==b&&(a=b)}null!==a&&this.setText(a)}else{a=this.sourceBlock_.workspace.getCanvas();Blockly.FieldTextInput.injectDom_(a);b=Blockly.FieldTextInput.htmlInput_;b.value=b.defaultValue=this.text_;b.oldValue_=null;var c=Blockly.FieldTextInput.svgForeignObject_,d=Blockly.getSvgXY_(this.borderRect_),
e=Blockly.getSvgXY_(a);d.x-=e.x;d.y-=e.y;Blockly.RTL||c.setAttribute("x",d.x+1);goog.userAgent.GECKO?c.setAttribute("y",d.y-1):c.setAttribute("y",d.y-3);b.focus();b.select();b.onBlurWrapper_=Blockly.bindEvent_(b,"blur",this,this.onHtmlInputBlur_);b.onKeyUpWrapper_=Blockly.bindEvent_(b,"keyup",this,this.onHtmlInputChange_);b.onKeyPressWrapper_=Blockly.bindEvent_(b,"keypress",this,this.onHtmlInputChange_);b.onWorkspaceChangeWrapper_=Blockly.bindEvent_(a,"blocklyWorkspaceChange",this,this.resizeEditor_);
this.validate_();this.resizeEditor_()}};Blockly.FieldTextInput.prototype.onHtmlInputBlur_=function(){this.closeEditor_(!0)};Blockly.FieldTextInput.prototype.onHtmlInputChange_=function(a){if(13==a.keyCode)this.closeEditor_(!0);else if(27==a.keyCode)this.closeEditor_(!1);else{a=Blockly.FieldTextInput.htmlInput_;var b=a.value;b!==a.oldValue_?(a.oldValue_=b,this.setText(b),this.validate_()):goog.userAgent.WEBKIT&&this.sourceBlock_.render()}};
Blockly.FieldTextInput.prototype.validate_=function(){var a=!0;goog.asserts.assertObject(Blockly.FieldTextInput.htmlInput_);var b=Blockly.FieldTextInput.htmlInput_;this.changeHandler_&&(a=this.changeHandler_(b.value));null===a?Blockly.addClass_(b,"blocklyInvalidInput"):Blockly.removeClass_(b,"blocklyInvalidInput")};
Blockly.FieldTextInput.prototype.resizeEditor_=function(){var a=Blockly.FieldTextInput.htmlInput_,b=this.group_.getBBox(),c=Blockly.FieldTextInput.svgForeignObject_;c.setAttribute("width",b.width);a.style.width=b.width-2+"px";a=Blockly.getSvgXY_(this.group_);b=this.sourceBlock_.workspace.getCanvas();b=Blockly.getSvgXY_(b);a.x-=b.x;c.setAttribute("x",a.x-4)};
Blockly.FieldTextInput.prototype.closeEditor_=function(a){var b=Blockly.FieldTextInput.htmlInput_;Blockly.unbindEvent_(b.onBlurWrapper_);Blockly.unbindEvent_(b.onKeyUpWrapper_);Blockly.unbindEvent_(b.onKeyPressWrapper_);Blockly.unbindEvent_(b.onWorkspaceChangeWrapper_);a?(a=b.value,this.changeHandler_&&(a=this.changeHandler_(a),null===a&&(a=b.defaultValue))):a=b.defaultValue;this.setText(a);Blockly.FieldTextInput.disposeDom_();this.sourceBlock_.render()};
Blockly.FieldTextInput.numberValidator=function(a){a=a.replace(/O/ig,"0");a=a.replace(/,/g,"");a=parseFloat(a||0);return isNaN(a)?null:String(a)};Blockly.FieldTextInput.nonnegativeIntegerValidator=function(a){(a=Blockly.FieldTextInput.numberValidator(a))&&(a=String(Math.max(0,Math.floor(a))));return a};Blockly.Flyout=function(){this.workspace_=new Blockly.Workspace;this.workspace_.isFlyout=!0;this.changeWrapper_=null;this.height_=this.width_=0;this.buttons_=[]};Blockly.Flyout.prototype.autoClose=!0;Blockly.Flyout.prototype.CORNER_RADIUS=8;Blockly.Flyout.prototype.onResizeWrapper_=null;
Blockly.Flyout.prototype.createDom=function(){this.svgGroup_=Blockly.createSvgElement("g",{},null);this.svgBackground_=Blockly.createSvgElement("path",{"class":"blocklyFlyoutBackground"},this.svgGroup_);this.svgOptions_=Blockly.createSvgElement("g",{},this.svgGroup_);this.svgOptions_.appendChild(this.workspace_.createDom());return this.svgGroup_};
Blockly.Flyout.prototype.dispose=function(){this.onResizeWrapper_&&(Blockly.unbindEvent_(this.onResizeWrapper_),this.onResizeWrapper_=null);this.changeWrapper_&&(Blockly.unbindEvent_(this.changeWrapper_),this.changeWrapper_=null);this.scrollbar_&&(this.scrollbar_.dispose(),this.scrollbar_=null);this.workspace_=null;this.svgGroup_&&(goog.dom.removeNode(this.svgGroup_),this.svgGroup_=null);this.targetWorkspaceMetrics_=this.targetWorkspace_=this.svgOptions_=this.svgBackground_=null;this.buttons_.splice(0)};
Blockly.Flyout.prototype.getMetrics=function(){if(!this.isVisible())return null;var a=this.height_-2*this.CORNER_RADIUS,b=this.width_;try{var c=this.svgOptions_.getBBox()}catch(d){c={height:0,y:0}}return{viewHeight:a,viewWidth:b,contentHeight:c.height+c.y,viewTop:-this.svgOptions_.scrollY,contentTop:0,absoluteTop:this.CORNER_RADIUS,absoluteLeft:0}};
Blockly.Flyout.prototype.setMetrics=function(a){var b=this.getMetrics();goog.isNumber(a.y)&&(this.svgOptions_.scrollY=-b.contentHeight*a.y-b.contentTop);this.svgOptions_.setAttribute("transform","translate(0,"+(this.svgOptions_.scrollY+b.absoluteTop)+")")};
Blockly.Flyout.prototype.init=function(a,b,c){this.targetWorkspace_=a;this.targetWorkspaceMetrics_=b;var d=this;c&&(this.scrollbar_=new Blockly.Scrollbar(this.svgOptions_,function(){return d.getMetrics()},function(a){return d.setMetrics(a)},!1,!1));this.hide();this.onResizeWrapper_=Blockly.bindEvent_(window,goog.events.EventType.RESIZE,this,this.position_);this.position_();this.changeWrapper_=Blockly.bindEvent_(this.targetWorkspace_.getCanvas(),"blocklyWorkspaceChange",this,this.filterForCapacity_)};
Blockly.Flyout.prototype.position_=function(){if(this.isVisible()){var a=this.targetWorkspaceMetrics_();if(a){var b=this.width_-this.CORNER_RADIUS;Blockly.RTL&&(b*=-1);var c=["M "+(Blockly.RTL?this.width_:0)+",0"];c.push("h",b);c.push("a",this.CORNER_RADIUS,this.CORNER_RADIUS,0,0,Blockly.RTL?0:1,Blockly.RTL?-this.CORNER_RADIUS:this.CORNER_RADIUS,this.CORNER_RADIUS);c.push("v",Math.max(0,a.viewHeight-2*this.CORNER_RADIUS));c.push("a",this.CORNER_RADIUS,this.CORNER_RADIUS,0,0,Blockly.RTL?0:1,Blockly.RTL?
this.CORNER_RADIUS:-this.CORNER_RADIUS,this.CORNER_RADIUS);c.push("h",-b);c.push("z");this.svgBackground_.setAttribute("d",c.join(" "));b=a.absoluteLeft;Blockly.RTL&&(b+=a.viewWidth,b-=this.width_);this.svgGroup_.setAttribute("transform","translate("+b+","+a.absoluteTop+")");this.height_=a.viewHeight}}};Blockly.Flyout.prototype.isVisible=function(){return"block"==this.svgGroup_.style.display};
Blockly.Flyout.prototype.hide=function(){if(this.isVisible()){this.svgGroup_.style.display="none";for(var a=this.workspace_.getTopBlocks(!1),b=0,c;c=a[b];b++)c.workspace==this.workspace_&&c.dispose(!1,!1);for(b=0;a=this.buttons_[b];b++)Blockly.unbindEvent_(a.wrapper_),goog.dom.removeNode(a);this.buttons_.splice(0)}};
Blockly.Flyout.prototype.show=function(a){this.hide();var b=this.CORNER_RADIUS;this.svgGroup_.style.display="block";var c=[],d=[];if(a==Blockly.Variables.NAME_TYPE)Blockly.Variables.flyoutCategory(c,d,b,this.workspace_);else if(a==Blockly.Procedures.NAME_TYPE)Blockly.Procedures.flyoutCategory(c,d,b,this.workspace_);else for(var e=0,f;f=a[e];e++)f.tagName&&"BLOCK"==f.tagName.toUpperCase()&&(f=Blockly.Xml.domToBlock_(this.workspace_,f),c.push(f),d.push(2*b));a=0;for(var g=b,e=0;f=c[e];e++){for(var h=
f.getDescendants(),j=0,k;k=h[j];j++)k.isInFlyout=!0,Blockly.Comment&&k.setCommentText(null);f.render();h=f.getSvgRoot().getBBox();f.moveBy(Blockly.RTL?0:b+Blockly.BlockSvg.TAB_WIDTH,g);a=Math.max(a,h.width);g+=h.height+d[e];f.disabled||Blockly.bindEvent_(f.getSvgRoot(),"mousedown",null,Blockly.Flyout.createBlockFunc_(this,f))}a+=b+Blockly.BlockSvg.TAB_WIDTH+b/2+Blockly.Scrollbar.scrollbarThickness;for(e=0;f=c[e];e++)Blockly.RTL&&f.moveBy(a-b-Blockly.BlockSvg.TAB_WIDTH,0),h=f.getSvgRoot().getBBox(),
d=f.getRelativeToSurfaceXY(),d=Blockly.createSvgElement("rect",{width:h.width,height:h.height,x:d.x+h.x,y:d.y+h.y,"fill-opacity":0},null),this.svgOptions_.insertBefore(d,this.svgOptions_.firstChild),d.wrapper_=Blockly.bindEvent_(d,"mousedown",null,Blockly.Flyout.createBlockFunc_(this,f)),this.buttons_[e]=d;this.width_=a;this.filterForCapacity_();Blockly.fireUiEvent(window,"resize")};
Blockly.Flyout.createBlockFunc_=function(a,b){return function(c){if(!Blockly.isRightButton(c)&&!b.disabled){var d=Blockly.Xml.blockToDom_(b),d=Blockly.Xml.domToBlock_(a.targetWorkspace_,d),e=b.getSvgRoot();if(!e)throw"originBlock is not rendered.";var e=Blockly.getSvgXY_(e),f=Blockly.getSvgXY_(a.targetWorkspace_.getCanvas());d.moveBy(e.x-f.x,e.y-f.y);d.render();a.autoClose?a.hide():a.filterForCapacity_();d.onMouseDown_(c)}}};
Blockly.Flyout.prototype.filterForCapacity_=function(){for(var a=this.targetWorkspace_.remainingCapacity(),b=this.workspace_.getTopBlocks(!1),c=0,d;d=b[c];c++){var e=d.getDescendants().length>a;d.setDisabled(e)}};Blockly.Toolbox={};Blockly.Toolbox.width=0;Blockly.Toolbox.selectedOption_=null;Blockly.Toolbox.CONFIG_={indentWidth:19,cssRoot:"blocklyTreeRoot",cssHideRoot:"blocklyHidden",cssItem:"",cssTreeRow:"blocklyTreeRow",cssItemLabel:"blocklyTreeLabel",cssTreeIcon:"blocklyTreeIcon",cssExpandedFolderIcon:"blocklyTreeIconOpen",cssFileIcon:"blocklyTreeIconNone",cssSelectedRow:"blocklyTreeSelected"};
Blockly.Toolbox.createDom=function(a,b){Blockly.Toolbox.HtmlDiv=goog.dom.createDom("div",{"class":"blocklyToolboxDiv"});Blockly.Toolbox.HtmlDiv.setAttribute("dir",Blockly.RTL?"RTL":"LTR");b.appendChild(Blockly.Toolbox.HtmlDiv);Blockly.Toolbox.flyout_=new Blockly.Flyout;a.appendChild(Blockly.Toolbox.flyout_.createDom());Blockly.bindEvent_(Blockly.Toolbox.HtmlDiv,"mousedown",null,function(a){Blockly.isRightButton(a)||a.target==Blockly.Toolbox.HtmlDiv?Blockly.hideChaff(!1):Blockly.hideChaff(!0)})};
Blockly.Toolbox.init=function(){Blockly.Toolbox.CONFIG_.cleardotPath=Blockly.pathToBlockly+"media/1x1.gif";Blockly.Toolbox.CONFIG_.cssCollapsedFolderIcon="blocklyTreeIconClosed"+(Blockly.RTL?"Rtl":"Ltr");var a=new Blockly.Toolbox.TreeControl("root",Blockly.Toolbox.CONFIG_);Blockly.Toolbox.tree_=a;a.setShowRootNode(!1);a.setShowLines(!1);a.setShowExpandIcons(!1);a.setSelectedItem(null);Blockly.Toolbox.HtmlDiv.style.display="block";Blockly.Toolbox.flyout_.init(Blockly.mainWorkspace,Blockly.getMainWorkspaceMetrics,
!0);Blockly.Toolbox.populate_();a.render(Blockly.Toolbox.HtmlDiv);goog.events.listen(window,goog.events.EventType.RESIZE,Blockly.Toolbox.position_);Blockly.Toolbox.position_()};Blockly.Toolbox.position_=function(){var a=Blockly.Toolbox.HtmlDiv,b=goog.style.getBorderBox(Blockly.svg),c=Blockly.svgSize();Blockly.RTL?(b=c.left+1,b+=c.width-a.offsetWidth,a.style.left=b+"px"):a.style.marginLeft=b.left;a.style.height=c.height+1+"px";Blockly.Toolbox.width=a.offsetWidth};
Blockly.Toolbox.populate_=function(){function a(c,d){for(var e=0,f;f=c.childNodes[e];e++)if(f.tagName){var g=f.tagName.toUpperCase();if("CATEGORY"==g){g=b.createNode(f.getAttribute("name"));g.blocks=[];d.add(g);var h=f.getAttribute("custom");h?g.blocks=h:a(f,g)}else"BLOCK"==g&&d.blocks.push(f)}}var b=Blockly.Toolbox.tree_;b.blocks=[];a(Blockly.languageTree,Blockly.Toolbox.tree_);if(b.blocks.length)throw"Toolbox cannot have both blocks and categories in the root level.";Blockly.fireUiEvent(window,
"resize")};Blockly.Toolbox.clearSelection=function(){Blockly.Toolbox.tree_.setSelectedItem(null)};Blockly.Toolbox.TreeControl=function(a,b,c){goog.ui.tree.TreeControl.call(this,a,b,c)};goog.inherits(Blockly.Toolbox.TreeControl,goog.ui.tree.TreeControl);Blockly.Toolbox.TreeControl.prototype.createNode=function(a){return new Blockly.Toolbox.TreeNode(a||"",this.getConfig(),this.getDomHelper())};
Blockly.Toolbox.TreeControl.prototype.setSelectedItem=function(a){this.selectedItem_!=a&&(goog.ui.tree.TreeControl.prototype.setSelectedItem.call(this,a),a&&a.blocks&&a.blocks.length?Blockly.Toolbox.flyout_.show(a.blocks):Blockly.Toolbox.flyout_.hide())};
Blockly.Toolbox.TreeNode=function(a,b,c){goog.ui.tree.TreeNode.call(this,a,b,c);a=function(){Blockly.fireUiEvent(window,"resize")};goog.events.listen(Blockly.Toolbox.tree_,goog.ui.tree.BaseNode.EventType.EXPAND,a);goog.events.listen(Blockly.Toolbox.tree_,goog.ui.tree.BaseNode.EventType.COLLAPSE,a)};goog.inherits(Blockly.Toolbox.TreeNode,goog.ui.tree.TreeNode);Blockly.Toolbox.TreeNode.prototype.getExpandIconHtml=function(){return"<span></span>"};
Blockly.Toolbox.TreeNode.prototype.getExpandIconElement=function(){return null};Blockly.Toolbox.TreeNode.prototype.onMouseDown=function(){this.hasChildren()&&this.isUserCollapsible_?(this.toggle(),this.select()):this.isSelected()?this.getTree().setSelectedItem(null):this.select();this.updateRow()};Blockly.Toolbox.TreeNode.prototype.onDoubleClick_=function(){};Blockly.Variables={};Blockly.Variables.NAME_TYPE="VARIABLE";Blockly.Variables.allVariables=function(a){var b;b=a?a.getDescendants():Blockly.mainWorkspace.getAllBlocks();a={};for(var c=0;c<b.length;c++){var d=b[c].getVars;if(d)for(var d=d.call(b[c]),e=0;e<d.length;e++){var f=d[e];f&&(a[Blockly.Names.PREFIX_+f.toLowerCase()]=f)}}b=[];for(var g in a)b.push(a[g]);return b};
Blockly.Variables.renameVariable=function(a,b){for(var c=Blockly.mainWorkspace.getAllBlocks(),d=0;d<c.length;d++){var e=c[d].renameVar;e&&e.call(c[d],a,b)}};
Blockly.Variables.flyoutCategory=function(a,b,c,d){var e=Blockly.Variables.allVariables();e.sort(goog.string.caseInsensitiveCompare);e.unshift(null);for(var f=void 0,g=0;g<e.length;g++)if(e[g]!==f){var h=Blockly.Language.variables_get?new Blockly.Block(d,"variables_get"):null;h&&h.initSvg();var j=Blockly.Language.variables_set?new Blockly.Block(d,"variables_set"):null;j&&j.initSvg();null===e[g]?f=(h||j).getVars()[0]:(h&&h.setTitleValue(e[g],"VAR"),j&&j.setTitleValue(e[g],"VAR"));j&&a.push(j);h&&a.push(h);
h&&j?b.push(c,3*c):b.push(2*c)}};Blockly.Variables.generateUniqueName=function(){var a=Blockly.Variables.allVariables(),b="";if(a.length){a.sort(goog.string.caseInsensitiveCompare);for(var c=0,d="i",e=0,f=!1;!b;){e=0;for(f=!1;e<a.length&&!f;)a[e].toLowerCase()==d&&(f=!0),e++;f?("z"===d[0]?(c++,d="a"):(d=String.fromCharCode(d.charCodeAt(0)+1),"l"==d[0]&&(d=String.fromCharCode(d.charCodeAt(0)+1))),0<c&&(d+=c)):b=d}}else b="i";return b};Blockly.FieldVariable=function(a){Blockly.FieldVariable.superClass_.constructor.call(this,Blockly.FieldVariable.dropdownCreate,Blockly.FieldVariable.dropdownChange);a?this.setValue(a):this.setValue(Blockly.Variables.generateUniqueName())};goog.inherits(Blockly.FieldVariable,Blockly.FieldDropdown);Blockly.FieldVariable.prototype.getValue=function(){return this.getText()};Blockly.FieldVariable.prototype.setValue=function(a){this.value_=a;this.setText(a)};
Blockly.FieldVariable.dropdownCreate=function(){var a=Blockly.Variables.allVariables(),b=this.getText();b&&-1==a.indexOf(b)&&a.push(b);a.sort(goog.string.caseInsensitiveCompare);a.push(Blockly.MSG_RENAME_VARIABLE);a.push(Blockly.MSG_NEW_VARIABLE);for(var b=[],c=0;c<a.length;c++)b[c]=[a[c],a[c]];return b};
Blockly.FieldVariable.dropdownChange=function(a){function b(a,b){Blockly.hideChaff();var c=window.prompt(a,b);return c&&c.replace(/[\s\xa0]+/g," ").replace(/^ | $/g,"")}if(a==Blockly.MSG_RENAME_VARIABLE){var c=this.getText();(a=b(Blockly.MSG_RENAME_VARIABLE_TITLE.replace("%1",c),c))&&Blockly.Variables.renameVariable(c,a);return null}if(a==Blockly.MSG_NEW_VARIABLE)return(a=b(Blockly.MSG_NEW_VARIABLE_TITLE,""))?(Blockly.Variables.renameVariable(a,a),a):null};Blockly.Names=function(a){this.reservedDict_={};if(a){a=a.split(",");for(var b=0;b<a.length;b++)this.reservedDict_[Blockly.Names.PREFIX_+a[b]]=!0}this.reset()};Blockly.Names.PREFIX_="$_";Blockly.Names.prototype.reset=function(){this.db_={};this.dbReverse_={}};Blockly.Names.prototype.getName=function(a,b){var c=Blockly.Names.PREFIX_+a.toLowerCase()+"_"+b;if(c in this.db_)return this.db_[c];var d=this.getDistinctName(a,b);return this.db_[c]=d};
Blockly.Names.prototype.getDistinctName=function(a){a=this.safeName_(a);for(var b="";this.dbReverse_[Blockly.Names.PREFIX_+a+b]||Blockly.Names.PREFIX_+a+b in this.reservedDict_;)b=b?b+1:2;a+=b;this.dbReverse_[Blockly.Names.PREFIX_+a]=!0;return a};Blockly.Names.prototype.safeName_=function(a){a?(a=encodeURI(a.replace(/ /g,"_")).replace(/[^\w]/g,"_"),-1!="0123456789".indexOf(a[0])&&(a="my_"+a)):a="unnamed";return a};Blockly.Names.equals=function(a,b){return a.toLowerCase()==b.toLowerCase()};Blockly.Procedures={};Blockly.Procedures.NAME_TYPE="PROCEDURE";Blockly.Procedures.allProcedures=function(){for(var a=Blockly.mainWorkspace.getAllBlocks(),b=[],c=[],d=0;d<a.length;d++){var e=a[d].getProcedureDef;e&&(e=e.call(a[d]))&&(e[2]?b.push(e):c.push(e))}c.sort(Blockly.Procedures.procTupleComparator_);b.sort(Blockly.Procedures.procTupleComparator_);return[c,b]};Blockly.Procedures.procTupleComparator_=function(a,b){var c=a[0].toLowerCase(),d=b[0].toLowerCase();return c>d?1:c<d?-1:0};
Blockly.Procedures.findLegalName=function(a,b){if(b.isInFlyout)return a;for(;!Blockly.Procedures.isLegalName(a,b.workspace,b);){var c=a.match(/^(.*?)(\d+)$/);a=c?c[1]+(parseInt(c[2],10)+1):a+"2"}return a};Blockly.Procedures.isLegalName=function(a,b,c){b=b.getAllBlocks();for(var d=0;d<b.length;d++)if(b[d]!=c){var e=b[d].getProcedureDef;if(e&&(e=e.call(b[d]),Blockly.Names.equals(e[0],a)))return!1}return!0};
Blockly.Procedures.rename=function(a){a=a.replace(/^[\s\xa0]+|[\s\xa0]+$/g,"");a=Blockly.Procedures.findLegalName(a,this.sourceBlock_);for(var b=this.sourceBlock_.workspace.getAllBlocks(),c=0;c<b.length;c++){var d=b[c].renameProcedure;d&&d.call(b[c],this.text_,a)}return a};
Blockly.Procedures.flyoutCategory=function(a,b,c,d){function e(e,f){for(var j=0;j<e.length;j++){var k=new Blockly.Block(d,f);k.setTitleValue(e[j][0],"NAME");for(var l=[],m=0;m<e[j][1].length;m++)l[m]="ARG"+m;k.setProcedureParameters(e[j][1],l);k.initSvg();a.push(k);b.push(2*c)}}if(Blockly.Language.procedures_defnoreturn){var f=new Blockly.Block(d,"procedures_defnoreturn");f.initSvg();a.push(f);b.push(2*c)}Blockly.Language.procedures_defreturn&&(f=new Blockly.Block(d,"procedures_defreturn"),f.initSvg(),
a.push(f),b.push(2*c));Blockly.Language.procedures_ifreturn&&(f=new Blockly.Block(d,"procedures_ifreturn"),f.initSvg(),a.push(f),b.push(2*c));f=Blockly.Procedures.allProcedures();e(f[0],"procedures_callnoreturn");e(f[1],"procedures_callreturn")};Blockly.Procedures.getCallers=function(a,b){for(var c=[],d=b.getAllBlocks(),e=0;e<d.length;e++){var f=d[e].getProcedureCall;f&&(f=f.call(d[e]))&&Blockly.Names.equals(f,a)&&c.push(d[e])}return c};
Blockly.Procedures.disposeCallers=function(a,b){for(var c=Blockly.Procedures.getCallers(a,b),d=0;d<c.length;d++)c[d].dispose(!0,!1)};Blockly.Procedures.mutateCallers=function(a,b,c,d){a=Blockly.Procedures.getCallers(a,b);for(b=0;b<a.length;b++)a[b].setProcedureParameters(c,d)};Blockly.Procedures.getDefinition=function(a,b){for(var c=b.getAllBlocks(),d=0;d<c.length;d++){var e=c[d].getProcedureDef;if(e&&(e=e.call(c[d]))&&Blockly.Names.equals(e[0],a))return c[d]}return null};Blockly.utils={};Blockly.addClass_=function(a,b){var c=a.getAttribute("class")||"";-1==(" "+c+" ").indexOf(" "+b+" ")&&(c&&(c+=" "),a.setAttribute("class",c+b))};Blockly.removeClass_=function(a,b){var c=a.getAttribute("class");if(-1!=(" "+c+" ").indexOf(" "+b+" ")){for(var c=c.split(/\s+/),d=0;d<c.length;d++)if(!c[d]||c[d]==b)c.splice(d,1),d--;c.length?a.setAttribute("class",c.join(" ")):a.removeAttribute("class")}};
Blockly.bindEvent_=function(a,b,c,d){var e=[],f;if(!a.addEventListener)throw"Element is not a DOM node with addEventListener.";f=function(a){d.apply(c,arguments)};a.addEventListener(b,f,!1);e.push([a,b,f]);b in Blockly.bindEvent_.TOUCH_MAP&&(f=function(a){if(1==a.changedTouches.length){var b=a.changedTouches[0];a.clientX=b.clientX;a.clientY=b.clientY}d.apply(c,arguments);a.preventDefault()},a.addEventListener(Blockly.bindEvent_.TOUCH_MAP[b],f,!1),e.push([a,Blockly.bindEvent_.TOUCH_MAP[b],f]));return e};
Blockly.bindEvent_.TOUCH_MAP={};Blockly.bindEvent_.TOUCH_MAP="ontouchstart"in document.documentElement?{mousedown:"touchstart",mousemove:"touchmove",mouseup:"touchend"}:{};Blockly.unbindEvent_=function(a){for(;a.length;){var b=a.pop(),c=b[2];b[0].removeEventListener(b[1],c,!1)}return c};
Blockly.fireUiEvent=function(a,b){var c=document;if(c.createEvent)c=c.createEvent("UIEvents"),c.initEvent(b,!0,!0),a.dispatchEvent(c);else if(c.createEventObject)c=c.createEventObject(),a.fireEvent("on"+b,c);else throw"FireEvent: No event creation mechanism.";};Blockly.noEvent=function(a){a.preventDefault();a.stopPropagation()};
Blockly.getRelativeXY_=function(a){var b={x:0,y:0},c=a.getAttribute("x");c&&(b.x=parseInt(c,10));if(c=a.getAttribute("y"))b.y=parseInt(c,10);if(a=(a=a.getAttribute("transform"))&&a.match(/translate\(\s*([-\d.]+)(,\s*([-\d.]+)\s*\))?/))b.x+=parseInt(a[1],10),a[3]&&(b.y+=parseInt(a[3],10));return b};Blockly.getSvgXY_=function(a){var b=0,c=0;do{var d=Blockly.getRelativeXY_(a),b=b+d.x,c=c+d.y;a=a.parentNode}while(a&&a!=Blockly.svg);return{x:b,y:c}};
Blockly.getAbsoluteXY_=function(a){a=Blockly.getSvgXY_(a);return Blockly.convertCoordinates(a.x,a.y,!1)};Blockly.createSvgElement=function(a,b,c){a=document.createElementNS(Blockly.SVG_NS,a);for(var d in b)a.setAttribute(d,b[d]);c&&c.appendChild(a);return a};Blockly.isRightButton=function(a){return 2==a.button||a.ctrlKey};Blockly.convertCoordinates=function(a,b,c){var d=Blockly.svg.createSVGPoint();d.x=a;d.y=b;a=Blockly.svg.getScreenCTM();c&&(a=a.inverse());return d.matrixTransform(a)};
Blockly.shortestStringLength=function(a){if(!a.length)return 0;for(var b=a[0].length,c=1;c<a.length;c++)b=Math.min(b,a[c].length);return b};Blockly.commonWordPrefix=function(a,b){if(a.length){if(1==a.length)return a[0].length}else return 0;for(var c=0,d=b||Blockly.shortestStringLength(a),e=0;e<d;e++){for(var f=a[0][e],g=1;g<a.length;g++)if(f!=a[g][e])return c;" "==f&&(c=e+1)}for(g=1;g<a.length;g++)if((f=a[g][e])&&" "!=f)return c;return d};
Blockly.commonWordSuffix=function(a,b){if(a.length){if(1==a.length)return a[0].length}else return 0;for(var c=0,d=b||Blockly.shortestStringLength(a),e=0;e<d;e++){for(var f=a[0].substr(-e-1,1),g=1;g<a.length;g++)if(f!=a[g].substr(-e-1,1))return c;" "==f&&(c=e+1)}for(g=1;g<a.length;g++)if((f=a[g].charAt(a[g].length-e-1))&&" "!=f)return c;return d};Blockly.isNumber=function(a){return!!a.match(/^\s*-?\d+(\.\d+)?\s*$/)};Blockly.pathToBlockly="./";Blockly.SVG_NS="http://www.w3.org/2000/svg";Blockly.HTML_NS="http://www.w3.org/1999/xhtml";Blockly.HSV_SATURATION=0.45;Blockly.HSV_VALUE=0.65;Blockly.makeColour=function(a){return goog.color.hsvToHex(a,Blockly.HSV_SATURATION,256*Blockly.HSV_VALUE)};Blockly.INPUT_VALUE=1;Blockly.OUTPUT_VALUE=2;Blockly.NEXT_STATEMENT=3;Blockly.PREVIOUS_STATEMENT=4;Blockly.DUMMY_INPUT=5;Blockly.ALIGN_LEFT=-1;Blockly.ALIGN_CENTRE=0;Blockly.ALIGN_RIGHT=1;Blockly.OPPOSITE_TYPE=[];
Blockly.OPPOSITE_TYPE[Blockly.INPUT_VALUE]=Blockly.OUTPUT_VALUE;Blockly.OPPOSITE_TYPE[Blockly.OUTPUT_VALUE]=Blockly.INPUT_VALUE;Blockly.OPPOSITE_TYPE[Blockly.NEXT_STATEMENT]=Blockly.PREVIOUS_STATEMENT;Blockly.OPPOSITE_TYPE[Blockly.PREVIOUS_STATEMENT]=Blockly.NEXT_STATEMENT;Blockly.SOUNDS_={};Blockly.selected=null;Blockly.editable=!0;Blockly.highlightedConnection_=null;Blockly.localConnection_=null;Blockly.DRAG_RADIUS=5;Blockly.SNAP_RADIUS=15;Blockly.BUMP_DELAY=250;Blockly.mainWorkspace=null;
Blockly.clipboard_=null;Blockly.svgSize=function(){return{width:Blockly.svg.cachedWidth_,height:Blockly.svg.cachedHeight_,top:Blockly.svg.cachedTop_,left:Blockly.svg.cachedLeft_}};
Blockly.svgResize=function(){var a=Blockly.svg,b=a.parentNode,c=b.offsetWidth,d=b.offsetHeight;a.cachedWidth_!=c&&(a.setAttribute("width",c+"px"),a.cachedWidth_=c);a.cachedHeight_!=d&&(a.setAttribute("height",d+"px"),a.cachedHeight_=d);a.cachedLeft_=0;for(a.cachedTop_=0;b;)a.cachedLeft_+=b.offsetLeft,a.cachedTop_+=b.offsetTop,b=b.offsetParent};
Blockly.onMouseDown_=function(a){Blockly.Block.terminateDrag_();Blockly.hideChaff();var b=a.target&&a.target.nodeName&&"svg"==a.target.nodeName.toLowerCase();Blockly.selected&&b&&Blockly.selected.unselect();if(Blockly.isRightButton(a))Blockly.ContextMenu&&Blockly.showContextMenu_(a.clientX,a.clientY);else if((!Blockly.editable||b)&&Blockly.mainWorkspace.scrollbar)Blockly.mainWorkspace.dragMode=!0,Blockly.mainWorkspace.startDragMouseX=a.clientX,Blockly.mainWorkspace.startDragMouseY=a.clientY,Blockly.mainWorkspace.startDragMetrics=
Blockly.getMainWorkspaceMetrics(),Blockly.mainWorkspace.startScrollX=Blockly.mainWorkspace.scrollX,Blockly.mainWorkspace.startScrollY=Blockly.mainWorkspace.scrollY};Blockly.onMouseUp_=function(){Blockly.setCursorHand_(!1);Blockly.mainWorkspace.dragMode=!1};
Blockly.onMouseMove_=function(a){if(Blockly.mainWorkspace.dragMode){Blockly.removeAllRanges();var b=Blockly.mainWorkspace.startDragMetrics,c=Blockly.mainWorkspace.startScrollX+(a.clientX-Blockly.mainWorkspace.startDragMouseX);a=Blockly.mainWorkspace.startScrollY+(a.clientY-Blockly.mainWorkspace.startDragMouseY);c=Math.min(c,-b.contentLeft);a=Math.min(a,-b.contentTop);c=Math.max(c,b.viewWidth-b.contentLeft-b.contentWidth);a=Math.max(a,b.viewHeight-b.contentTop-b.contentHeight);Blockly.mainWorkspace.scrollbar.set(-c-
b.contentLeft,-a-b.contentTop)}};
Blockly.onKeyDown_=function(a){if(!Blockly.isTargetInput_(a))if(27==a.keyCode)Blockly.hideChaff();else if(8==a.keyCode||46==a.keyCode)Blockly.selected&&Blockly.selected.deletable&&(Blockly.hideChaff(),Blockly.selected.dispose(!0,!0)),a.preventDefault();else if(a.altKey||a.ctrlKey||a.metaKey)Blockly.selected&&(Blockly.selected.deletable&&Blockly.selected.workspace==Blockly.mainWorkspace)&&(Blockly.hideChaff(),67==a.keyCode?Blockly.copy_(Blockly.selected):88==a.keyCode&&(Blockly.copy_(Blockly.selected),
Blockly.selected.dispose(!0,!0))),86==a.keyCode&&Blockly.clipboard_&&Blockly.mainWorkspace.paste(Blockly.clipboard_)};Blockly.copy_=function(a){var b=Blockly.Xml.blockToDom_(a);Blockly.Xml.deleteNext(b);a=a.getRelativeToSurfaceXY();b.setAttribute("x",Blockly.RTL?-a.x:a.x);b.setAttribute("y",a.y);Blockly.clipboard_=b};
Blockly.showContextMenu_=function(a,b){var c=[];if(Blockly.collapse){for(var d=!1,e=!1,f=Blockly.mainWorkspace.getTopBlocks(!1),g=0;g<f.length;g++)f[g].collapsed?d=!0:e=!0;e={enabled:e};e.text=Blockly.MSG_COLLAPSE_ALL;e.callback=function(){for(var a=0;a<f.length;a++)f[a].setCollapsed(!0)};c.push(e);d={enabled:d};d.text=Blockly.MSG_EXPAND_ALL;d.callback=function(){for(var a=0;a<f.length;a++)f[a].setCollapsed(!1)};c.push(d)}d={enabled:!1};d.text=Blockly.MSG_HELP;d.callback=function(){};c.push(d);Blockly.ContextMenu.show(a,
b,c)};Blockly.onContextMenu_=function(a){!Blockly.isTargetInput_(a)&&Blockly.ContextMenu&&a.preventDefault()};Blockly.hideChaff=function(a){Blockly.Tooltip&&Blockly.Tooltip.hide();Blockly.ContextMenu&&Blockly.ContextMenu.hide();Blockly.FieldDropdown&&Blockly.FieldDropdown.hide();Blockly.FieldColour&&Blockly.FieldColour.hide();Blockly.Toolbox&&(!a&&Blockly.Toolbox.flyout_.autoClose)&&Blockly.Toolbox.clearSelection()};
Blockly.removeAllRanges=function(){if(window.getSelection){var a=window.getSelection();a&&a.removeAllRanges&&(a.removeAllRanges(),window.setTimeout(function(){window.getSelection().removeAllRanges()},0))}};Blockly.isTargetInput_=function(a){return"textarea"==a.target.type||"text"==a.target.type};Blockly.loadAudio_=function(a,b){if(window.Audio){var c=new window.Audio(Blockly.pathToBlockly+a);c&&c.play&&(c.play(),c.volume=0.01,Blockly.SOUNDS_[b]=c)}};
Blockly.playAudio=function(a,b){var c=Blockly.SOUNDS_[a];c&&(c=c.cloneNode(),c.volume=void 0===b?1:b,c.play())};Blockly.setCursorHand_=function(a){if(Blockly.editable){var b="";a&&(b="url("+Blockly.pathToBlockly+"media/handclosed.cur) 7 3, auto");Blockly.selected&&(Blockly.selected.getSvgRoot().style.cursor=b);document.getElementsByTagName("svg")[0].style.cursor=b}};
Blockly.getMainWorkspaceMetrics=function(){var a=Blockly.svgSize();Blockly.Toolbox&&(a.width-=Blockly.Toolbox.width);var b=a.width-Blockly.Scrollbar.scrollbarThickness,c=a.height-Blockly.Scrollbar.scrollbarThickness;try{var d=Blockly.mainWorkspace.getCanvas().getBBox()}catch(e){return null}-Infinity==d.width&&-Infinity==d.height&&(d={width:0,height:0,x:0,y:0});var f=Math.min(d.x-b/2,d.x+d.width-b),b=Math.max(d.x+d.width+b/2,d.x+b),g=Math.min(d.y-c/2,d.y+d.height-c),c=Math.max(d.y+d.height+c/2,d.y+
c),d=0;Blockly.Toolbox&&!Blockly.RTL&&(d=Blockly.Toolbox.width);return{viewHeight:a.height,viewWidth:a.width,contentHeight:c-g,contentWidth:b-f,viewTop:-Blockly.mainWorkspace.scrollY,viewLeft:-Blockly.mainWorkspace.scrollX,contentTop:g,contentLeft:f,absoluteTop:0,absoluteLeft:d}};
Blockly.setMainWorkspaceMetrics=function(a){var b=Blockly.getMainWorkspaceMetrics();goog.isNumber(a.x)&&(Blockly.mainWorkspace.scrollX=-b.contentWidth*a.x-b.contentLeft);goog.isNumber(a.y)&&(Blockly.mainWorkspace.scrollY=-b.contentHeight*a.y-b.contentTop);a="translate("+(Blockly.mainWorkspace.scrollX+b.absoluteLeft)+","+(Blockly.mainWorkspace.scrollY+b.absoluteTop)+")";Blockly.mainWorkspace.getCanvas().setAttribute("transform",a);Blockly.mainWorkspace.getBubbleCanvas().setAttribute("transform",a)};
Blockly.addChangeListener=function(a){return Blockly.bindEvent_(Blockly.mainWorkspace.getCanvas(),"blocklyWorkspaceChange",null,a)};Blockly.removeChangeListener=function(a){Blockly.unbindEvent_(a)};

// End source
  return Blockly
  }).bind(window)()
}
})()
},{}],6:[function(require,module,exports){
// module.exports is an init function that takes in the frame context and the Blockly.core obj
module.exports = function(frameWindow,Blockly){
  return (function(){
// Start Source


// Do not edit this file; automatically generated by build.py.
"use strict";

Blockly.JavaScript=Blockly.Generator.get("JavaScript");Blockly.JavaScript.addReservedWords("Blockly,break,case,catch,continue,debugger,default,delete,do,else,finally,for,function,if,in,instanceof,new,return,switch,this,throw,try,typeof,var,void,while,with,class,enum,export,extends,import,super,implements,interface,let,package,private,protected,public,static,yield,const,null,true,false,Array,ArrayBuffer,Boolean,Date,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,Error,eval,EvalError,Float32Array,Float64Array,Function,Infinity,Int16Array,Int32Array,Int8Array,isFinite,isNaN,Iterator,JSON,Math,NaN,Number,Object,parseFloat,parseInt,RangeError,ReferenceError,RegExp,StopIteration,String,SyntaxError,TypeError,Uint16Array,Uint32Array,Uint8Array,Uint8ClampedArray,undefined,uneval,URIError,applicationCache,closed,Components,content,_content,controllers,crypto,defaultStatus,dialogArguments,directories,document,frameElement,frames,fullScreen,globalStorage,history,innerHeight,innerWidth,length,location,locationbar,localStorage,menubar,messageManager,mozAnimationStartTime,mozInnerScreenX,mozInnerScreenY,mozPaintCount,name,navigator,opener,outerHeight,outerWidth,pageXOffset,pageYOffset,parent,performance,personalbar,pkcs11,returnValue,screen,screenX,screenY,scrollbars,scrollMaxX,scrollMaxY,scrollX,scrollY,self,sessionStorage,sidebar,status,statusbar,toolbar,top,URL,window,addEventListener,alert,atob,back,blur,btoa,captureEvents,clearImmediate,clearInterval,clearTimeout,close,confirm,disableExternalCapture,dispatchEvent,dump,enableExternalCapture,escape,find,focus,forward,GeckoActiveXObject,getAttention,getAttentionWithCycleCount,getComputedStyle,getSelection,home,matchMedia,maximize,minimize,moveBy,moveTo,mozRequestAnimationFrame,open,openDialog,postMessage,print,prompt,QueryInterface,releaseEvents,removeEventListener,resizeBy,resizeTo,restore,routeEvent,scroll,scrollBy,scrollByLines,scrollByPages,scrollTo,setCursor,setImmediate,setInterval,setResizable,setTimeout,showModalDialog,sizeToContent,stop,unescape,updateCommands,XPCNativeWrapper,XPCSafeJSObjectWrapper,onabort,onbeforeunload,onblur,onchange,onclick,onclose,oncontextmenu,ondevicemotion,ondeviceorientation,ondragdrop,onerror,onfocus,onhashchange,onkeydown,onkeypress,onkeyup,onload,onmousedown,onmousemove,onmouseout,onmouseover,onmouseup,onmozbeforepaint,onpaint,onpopstate,onreset,onresize,onscroll,onselect,onsubmit,onunload,onpageshow,onpagehide,Image,Option,Worker,Event,Range,File,FileReader,Blob,BlobBuilder,Attr,CDATASection,CharacterData,Comment,console,DocumentFragment,DocumentType,DomConfiguration,DOMError,DOMErrorHandler,DOMException,DOMImplementation,DOMImplementationList,DOMImplementationRegistry,DOMImplementationSource,DOMLocator,DOMObject,DOMString,DOMStringList,DOMTimeStamp,DOMUserData,Entity,EntityReference,MediaQueryList,MediaQueryListListener,NameList,NamedNodeMap,Node,NodeFilter,NodeIterator,NodeList,Notation,Plugin,PluginArray,ProcessingInstruction,SharedWorker,Text,TimeRanges,Treewalker,TypeInfo,UserDataHandler,Worker,WorkerGlobalScope,HTMLDocument,HTMLElement,HTMLAnchorElement,HTMLAppletElement,HTMLAudioElement,HTMLAreaElement,HTMLBaseElement,HTMLBaseFontElement,HTMLBodyElement,HTMLBRElement,HTMLButtonElement,HTMLCanvasElement,HTMLDirectoryElement,HTMLDivElement,HTMLDListElement,HTMLEmbedElement,HTMLFieldSetElement,HTMLFontElement,HTMLFormElement,HTMLFrameElement,HTMLFrameSetElement,HTMLHeadElement,HTMLHeadingElement,HTMLHtmlElement,HTMLHRElement,HTMLIFrameElement,HTMLImageElement,HTMLInputElement,HTMLKeygenElement,HTMLLabelElement,HTMLLIElement,HTMLLinkElement,HTMLMapElement,HTMLMenuElement,HTMLMetaElement,HTMLModElement,HTMLObjectElement,HTMLOListElement,HTMLOptGroupElement,HTMLOptionElement,HTMLOutputElement,HTMLParagraphElement,HTMLParamElement,HTMLPreElement,HTMLQuoteElement,HTMLScriptElement,HTMLSelectElement,HTMLSourceElement,HTMLSpanElement,HTMLStyleElement,HTMLTableElement,HTMLTableCaptionElement,HTMLTableCellElement,HTMLTableDataCellElement,HTMLTableHeaderCellElement,HTMLTableColElement,HTMLTableRowElement,HTMLTableSectionElement,HTMLTextAreaElement,HTMLTimeElement,HTMLTitleElement,HTMLTrackElement,HTMLUListElement,HTMLUnknownElement,HTMLVideoElement,HTMLCanvasElement,CanvasRenderingContext2D,CanvasGradient,CanvasPattern,TextMetrics,ImageData,CanvasPixelArray,HTMLAudioElement,HTMLVideoElement,NotifyAudioAvailableEvent,HTMLCollection,HTMLAllCollection,HTMLFormControlsCollection,HTMLOptionsCollection,HTMLPropertiesCollection,DOMTokenList,DOMSettableTokenList,DOMStringMap,RadioNodeList,SVGDocument,SVGElement,SVGAElement,SVGAltGlyphElement,SVGAltGlyphDefElement,SVGAltGlyphItemElement,SVGAnimationElement,SVGAnimateElement,SVGAnimateColorElement,SVGAnimateMotionElement,SVGAnimateTransformElement,SVGSetElement,SVGCircleElement,SVGClipPathElement,SVGColorProfileElement,SVGCursorElement,SVGDefsElement,SVGDescElement,SVGEllipseElement,SVGFilterElement,SVGFilterPrimitiveStandardAttributes,SVGFEBlendElement,SVGFEColorMatrixElement,SVGFEComponentTransferElement,SVGFECompositeElement,SVGFEConvolveMatrixElement,SVGFEDiffuseLightingElement,SVGFEDisplacementMapElement,SVGFEDistantLightElement,SVGFEFloodElement,SVGFEGaussianBlurElement,SVGFEImageElement,SVGFEMergeElement,SVGFEMergeNodeElement,SVGFEMorphologyElement,SVGFEOffsetElement,SVGFEPointLightElement,SVGFESpecularLightingElement,SVGFESpotLightElement,SVGFETileElement,SVGFETurbulenceElement,SVGComponentTransferFunctionElement,SVGFEFuncRElement,SVGFEFuncGElement,SVGFEFuncBElement,SVGFEFuncAElement,SVGFontElement,SVGFontFaceElement,SVGFontFaceFormatElement,SVGFontFaceNameElement,SVGFontFaceSrcElement,SVGFontFaceUriElement,SVGForeignObjectElement,SVGGElement,SVGGlyphElement,SVGGlyphRefElement,SVGGradientElement,SVGLinearGradientElement,SVGRadialGradientElement,SVGHKernElement,SVGImageElement,SVGLineElement,SVGMarkerElement,SVGMaskElement,SVGMetadataElement,SVGMissingGlyphElement,SVGMPathElement,SVGPathElement,SVGPatternElement,SVGPolylineElement,SVGPolygonElement,SVGRectElement,SVGScriptElement,SVGStopElement,SVGStyleElement,SVGSVGElement,SVGSwitchElement,SVGSymbolElement,SVGTextElement,SVGTextPathElement,SVGTitleElement,SVGTRefElement,SVGTSpanElement,SVGUseElement,SVGViewElement,SVGVKernElement,SVGAngle,SVGColor,SVGICCColor,SVGElementInstance,SVGElementInstanceList,SVGLength,SVGLengthList,SVGMatrix,SVGNumber,SVGNumberList,SVGPaint,SVGPoint,SVGPointList,SVGPreserveAspectRatio,SVGRect,SVGStringList,SVGTransform,SVGTransformList,SVGAnimatedAngle,SVGAnimatedBoolean,SVGAnimatedEnumeration,SVGAnimatedInteger,SVGAnimatedLength,SVGAnimatedLengthList,SVGAnimatedNumber,SVGAnimatedNumberList,SVGAnimatedPreserveAspectRatio,SVGAnimatedRect,SVGAnimatedString,SVGAnimatedTransformList,SVGPathSegList,SVGPathSeg,SVGPathSegArcAbs,SVGPathSegArcRel,SVGPathSegClosePath,SVGPathSegCurvetoCubicAbs,SVGPathSegCurvetoCubicRel,SVGPathSegCurvetoCubicSmoothAbs,SVGPathSegCurvetoCubicSmoothRel,SVGPathSegCurvetoQuadraticAbs,SVGPathSegCurvetoQuadraticRel,SVGPathSegCurvetoQuadraticSmoothAbs,SVGPathSegCurvetoQuadraticSmoothRel,SVGPathSegLinetoAbs,SVGPathSegLinetoHorizontalAbs,SVGPathSegLinetoHorizontalRel,SVGPathSegLinetoRel,SVGPathSegLinetoVerticalAbs,SVGPathSegLinetoVerticalRel,SVGPathSegMovetoAbs,SVGPathSegMovetoRel,ElementTimeControl,TimeEvent,SVGAnimatedPathData,SVGAnimatedPoints,SVGColorProfileRule,SVGCSSRule,SVGExternalResourcesRequired,SVGFitToViewBox,SVGLangSpace,SVGLocatable,SVGRenderingIntent,SVGStylable,SVGTests,SVGTextContentElement,SVGTextPositioningElement,SVGTransformable,SVGUnitTypes,SVGURIReference,SVGViewSpec,SVGZoomAndPan");
Blockly.JavaScript.ORDER_ATOMIC=0;Blockly.JavaScript.ORDER_MEMBER=1;Blockly.JavaScript.ORDER_NEW=1;Blockly.JavaScript.ORDER_FUNCTION_CALL=2;Blockly.JavaScript.ORDER_INCREMENT=3;Blockly.JavaScript.ORDER_DECREMENT=3;Blockly.JavaScript.ORDER_LOGICAL_NOT=4;Blockly.JavaScript.ORDER_BITWISE_NOT=4;Blockly.JavaScript.ORDER_UNARY_PLUS=4;Blockly.JavaScript.ORDER_UNARY_NEGATION=4;Blockly.JavaScript.ORDER_TYPEOF=4;Blockly.JavaScript.ORDER_VOID=4;Blockly.JavaScript.ORDER_DELETE=4;
Blockly.JavaScript.ORDER_MULTIPLICATION=5;Blockly.JavaScript.ORDER_DIVISION=5;Blockly.JavaScript.ORDER_MODULUS=5;Blockly.JavaScript.ORDER_ADDITION=6;Blockly.JavaScript.ORDER_SUBTRACTION=6;Blockly.JavaScript.ORDER_BITWISE_SHIFT=7;Blockly.JavaScript.ORDER_RELATIONAL=8;Blockly.JavaScript.ORDER_IN=8;Blockly.JavaScript.ORDER_INSTANCEOF=8;Blockly.JavaScript.ORDER_EQUALITY=9;Blockly.JavaScript.ORDER_BITWISE_AND=10;Blockly.JavaScript.ORDER_BITWISE_XOR=11;Blockly.JavaScript.ORDER_BITWISE_OR=12;
Blockly.JavaScript.ORDER_LOGICAL_AND=13;Blockly.JavaScript.ORDER_LOGICAL_OR=14;Blockly.JavaScript.ORDER_CONDITIONAL=15;Blockly.JavaScript.ORDER_ASSIGNMENT=16;Blockly.JavaScript.ORDER_COMMA=17;Blockly.JavaScript.ORDER_NONE=99;Blockly.JavaScript.INFINITE_LOOP_TRAP=null;
Blockly.JavaScript.init=function(){Blockly.JavaScript.definitions_={};if(Blockly.Variables){Blockly.JavaScript.variableDB_?Blockly.JavaScript.variableDB_.reset():Blockly.JavaScript.variableDB_=new Blockly.Names(Blockly.JavaScript.RESERVED_WORDS_);for(var a=[],b=Blockly.Variables.allVariables(),c=0;c<b.length;c++)a[c]="var "+Blockly.JavaScript.variableDB_.getName(b[c],Blockly.Variables.NAME_TYPE)+";";Blockly.JavaScript.definitions_.variables=a.join("\n")}};
Blockly.JavaScript.finish=function(a){var b=[],c;for(c in Blockly.JavaScript.definitions_)b.push(Blockly.JavaScript.definitions_[c]);return b.join("\n\n")+"\n\n\n"+a};Blockly.JavaScript.scrubNakedValue=function(a){return a+";\n"};Blockly.JavaScript.quote_=function(a){a=a.replace(/\\/g,"\\\\").replace(/\n/g,"\\\n").replace(/'/g,"\\'");return"'"+a+"'"};
Blockly.JavaScript.scrub_=function(a,b){if(null===b)return"";var c="";if(!a.outputConnection||!a.outputConnection.targetConnection){var d=a.getCommentText();d&&(c+=Blockly.Generator.prefixLines(d,"// ")+"\n");for(var e=0;e<a.inputList.length;e++)if(a.inputList[e].type==Blockly.INPUT_VALUE&&(d=a.inputList[e].connection.targetBlock()))(d=Blockly.Generator.allNestedComments(d))&&(c+=Blockly.Generator.prefixLines(d,"// "))}e=a.nextConnection&&a.nextConnection.targetBlock();e=this.blockToCode(e);return c+
b+e};Blockly.JavaScript.text={};Blockly.JavaScript.text=function(){return[Blockly.JavaScript.quote_(this.getTitleValue("TEXT")),Blockly.JavaScript.ORDER_ATOMIC]};
Blockly.JavaScript.text_join=function(){var a;if(0==this.itemCount_)return["''",Blockly.JavaScript.ORDER_ATOMIC];if(1==this.itemCount_)return a=Blockly.JavaScript.valueToCode(this,"ADD0",Blockly.JavaScript.ORDER_NONE)||"''",["String("+a+")",Blockly.JavaScript.ORDER_FUNCTION_CALL];if(2==this.itemCount_){a=Blockly.JavaScript.valueToCode(this,"ADD0",Blockly.JavaScript.ORDER_NONE)||"''";var b=Blockly.JavaScript.valueToCode(this,"ADD1",Blockly.JavaScript.ORDER_NONE)||"''";return["String("+a+") + String("+
b+")",Blockly.JavaScript.ORDER_ADDITION]}a=Array(this.itemCount_);for(b=0;b<this.itemCount_;b++)a[b]=Blockly.JavaScript.valueToCode(this,"ADD"+b,Blockly.JavaScript.ORDER_COMMA)||"''";a="["+a.join(",")+"].join('')";return[a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};
Blockly.JavaScript.text_append=function(){var a=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("VAR"),Blockly.Variables.NAME_TYPE),b=Blockly.JavaScript.valueToCode(this,"TEXT",Blockly.JavaScript.ORDER_NONE)||"''";return a+" = String("+a+") + String("+b+");\n"};Blockly.JavaScript.text_length=function(){return[(Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_FUNCTION_CALL)||"''")+".length",Blockly.JavaScript.ORDER_MEMBER]};
Blockly.JavaScript.text_isEmpty=function(){return["!"+(Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"''"),Blockly.JavaScript.ORDER_LOGICAL_NOT]};Blockly.JavaScript.text_indexOf=function(){var a="FIRST"==this.getTitleValue("END")?"indexOf":"lastIndexOf",b=Blockly.JavaScript.valueToCode(this,"FIND",Blockly.JavaScript.ORDER_NONE)||"''";return[(Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"''")+"."+a+"("+b+") + 1",Blockly.JavaScript.ORDER_MEMBER]};
Blockly.JavaScript.text_charAt=function(){var a=this.getTitleValue("WHERE")||"FROM_START",b=Blockly.JavaScript.valueToCode(this,"AT",Blockly.JavaScript.ORDER_UNARY_NEGATION)||"1",c=Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"''";switch(a){case "FIRST":return[c+".charAt(0)",Blockly.JavaScript.ORDER_FUNCTION_CALL];case "LAST":return[c+".slice(-1)",Blockly.JavaScript.ORDER_FUNCTION_CALL];case "FROM_START":return b=Blockly.isNumber(b)?parseFloat(b)-1:b+" - 1",[c+".charAt("+
b+")",Blockly.JavaScript.ORDER_FUNCTION_CALL];case "FROM_END":return[c+".slice(-"+b+").charAt(0)",Blockly.JavaScript.ORDER_FUNCTION_CALL];case "RANDOM":return Blockly.JavaScript.definitions_.text_random_letter||(a=Blockly.JavaScript.variableDB_.getDistinctName("text_random_letter",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.text_charAt.text_random_letter=a,b=[],b.push("function "+a+"(text) {"),b.push("  var x = Math.floor(Math.random() * text.length);"),b.push("  return text[x];"),b.push("}"),
Blockly.JavaScript.definitions_.text_random_letter=b.join("\n")),c=Blockly.JavaScript.text_charAt.text_random_letter+"("+c+")",[c,Blockly.JavaScript.ORDER_FUNCTION_CALL]}throw"Unhandled option (text_charAt).";};
Blockly.JavaScript.text_getSubstring=function(){var a=Blockly.JavaScript.valueToCode(this,"STRING",Blockly.JavaScript.ORDER_MEMBER)||"[]",b=this.getTitleValue("WHERE1"),c=this.getTitleValue("WHERE2"),d=Blockly.JavaScript.valueToCode(this,"AT1",Blockly.JavaScript.ORDER_NONE)||"1",e=Blockly.JavaScript.valueToCode(this,"AT2",Blockly.JavaScript.ORDER_NONE)||"1";if(!("FIRST"==b&&"LAST"==c)){if(!Blockly.JavaScript.definitions_.text_get_substring){var g=Blockly.JavaScript.variableDB_.getDistinctName("text_get_substring",
Blockly.Generator.NAME_TYPE);Blockly.JavaScript.text_getSubstring.func=g;var f=[];f.push("function "+g+"(text, where1, at1, where2, at2) {");f.push("  function getAt(where, at) {");f.push("    if (where == 'FROM_START') {");f.push("      at--;");f.push("    } else if (where == 'FROM_END') {");f.push("      at = text.length - at;");f.push("    } else if (where == 'FIRST') {");f.push("      at = 0;");f.push("    } else if (where == 'LAST') {");f.push("      at = text.length - 1;");f.push("    } else {");
f.push("      throw 'Unhandled option (text_getSubstring).';");f.push("    }");f.push("    return at;");f.push("  }");f.push("  at1 = getAt(where1, at1);");f.push("  at2 = getAt(where2, at2) + 1;");f.push("  return text.slice(at1, at2);");f.push("}");Blockly.JavaScript.definitions_.text_get_substring=f.join("\n")}a=Blockly.JavaScript.text_getSubstring.func+"("+a+", '"+b+"', "+d+", '"+c+"', "+e+")"}return[a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};
Blockly.JavaScript.text_changeCase=function(){var a=this.getTitleValue("CASE");if(a=Blockly.JavaScript.text_changeCase.OPERATORS[a])var b=Blockly.JavaScript.valueToCode(this,"TEXT",Blockly.JavaScript.ORDER_MEMBER)||"''",a=b+a;else Blockly.JavaScript.definitions_.text_toTitleCase||(a=Blockly.JavaScript.variableDB_.getDistinctName("text_toTitleCase",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.text_changeCase.toTitleCase=a,b=[],b.push("function "+a+"(str) {"),b.push("  return str.replace(/\\S+/g,"),
b.push("      function(txt) {return txt[0].toUpperCase() + txt.substring(1).toLowerCase();});"),b.push("}"),Blockly.JavaScript.definitions_.text_toTitleCase=b.join("\n")),b=Blockly.JavaScript.valueToCode(this,"TEXT",Blockly.JavaScript.ORDER_NONE)||"''",a=Blockly.JavaScript.text_changeCase.toTitleCase+"("+b+")";return[a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.text_changeCase.OPERATORS={UPPERCASE:".toUpperCase()",LOWERCASE:".toLowerCase()",TITLECASE:null};
Blockly.JavaScript.text_trim=function(){var a=this.getTitleValue("MODE"),a=Blockly.JavaScript.text_trim.OPERATORS[a];return[(Blockly.JavaScript.valueToCode(this,"TEXT",Blockly.JavaScript.ORDER_MEMBER)||"''")+a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.text_trim.OPERATORS={LEFT:".trimLeft()",RIGHT:".trimRight()",BOTH:".trim()"};Blockly.JavaScript.text_print=function(){return"window.alert("+(Blockly.JavaScript.valueToCode(this,"TEXT",Blockly.JavaScript.ORDER_NONE)||"''")+");\n"};
Blockly.JavaScript.text_prompt=function(){var a="window.prompt("+Blockly.JavaScript.quote_(this.getTitleValue("TEXT"))+")";"NUMBER"==this.getTitleValue("TYPE")&&(a="window.parseFloat("+a+")");return[a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.variables={};Blockly.JavaScript.variables_get=function(){return[Blockly.JavaScript.variableDB_.getName(this.getTitleValue("VAR"),Blockly.Variables.NAME_TYPE),Blockly.JavaScript.ORDER_ATOMIC]};Blockly.JavaScript.variables_set=function(){var a=Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_ASSIGNMENT)||"0";return Blockly.JavaScript.variableDB_.getName(this.getTitleValue("VAR"),Blockly.Variables.NAME_TYPE)+" = "+a+";\n"};Blockly.JavaScript.math={};Blockly.JavaScript.math_number=function(){return[window.parseFloat(this.getTitleValue("NUM")),Blockly.JavaScript.ORDER_ATOMIC]};Blockly.JavaScript.math_arithmetic=function(){var a=this.getTitleValue("OP"),b=Blockly.JavaScript.math_arithmetic.OPERATORS[a],a=b[0],b=b[1],c=Blockly.JavaScript.valueToCode(this,"A",b)||"0",d=Blockly.JavaScript.valueToCode(this,"B",b)||"0";return!a?["Math.pow("+c+", "+d+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]:[c+a+d,b]};
Blockly.JavaScript.math_arithmetic.OPERATORS={ADD:[" + ",Blockly.JavaScript.ORDER_ADDITION],MINUS:[" - ",Blockly.JavaScript.ORDER_SUBTRACTION],MULTIPLY:[" * ",Blockly.JavaScript.ORDER_MULTIPLICATION],DIVIDE:[" / ",Blockly.JavaScript.ORDER_DIVISION],POWER:[null,Blockly.JavaScript.ORDER_COMMA]};
Blockly.JavaScript.math_single=function(){var a=this.getTitleValue("OP"),b,c;if("NEG"==a)return c=Blockly.JavaScript.valueToCode(this,"NUM",Blockly.JavaScript.ORDER_UNARY_NEGATION)||"0","-"==c[0]&&(c=" "+c),["-"+c,Blockly.JavaScript.ORDER_UNARY_NEGATION];c="SIN"==a||"COS"==a||"TAN"==a?Blockly.JavaScript.valueToCode(this,"NUM",Blockly.JavaScript.ORDER_DIVISION)||"0":Blockly.JavaScript.valueToCode(this,"NUM",Blockly.JavaScript.ORDER_NONE)||"0";switch(a){case "ABS":b="Math.abs("+c+")";break;case "ROOT":b=
"Math.sqrt("+c+")";break;case "LN":b="Math.log("+c+")";break;case "EXP":b="Math.exp("+c+")";break;case "POW10":b="Math.pow(10,"+c+")";break;case "ROUND":b="Math.round("+c+")";break;case "ROUNDUP":b="Math.ceil("+c+")";break;case "ROUNDDOWN":b="Math.floor("+c+")";break;case "SIN":b="Math.sin("+c+" / 180 * Math.PI)";break;case "COS":b="Math.cos("+c+" / 180 * Math.PI)";break;case "TAN":b="Math.tan("+c+" / 180 * Math.PI)"}if(b)return[b,Blockly.JavaScript.ORDER_FUNCTION_CALL];switch(a){case "LOG10":b="Math.log("+
c+") / Math.log(10)";break;case "ASIN":b="Math.asin("+c+") / Math.PI * 180";break;case "ACOS":b="Math.acos("+c+") / Math.PI * 180";break;case "ATAN":b="Math.atan("+c+") / Math.PI * 180";break;default:throw"Unknown math operator: "+a;}return[b,Blockly.JavaScript.ORDER_DIVISION]};Blockly.JavaScript.math_constant=function(){var a=this.getTitleValue("CONSTANT");return Blockly.JavaScript.math_constant.CONSTANTS[a]};
Blockly.JavaScript.math_constant.CONSTANTS={PI:["Math.PI",Blockly.JavaScript.ORDER_MEMBER],E:["Math.E",Blockly.JavaScript.ORDER_MEMBER],GOLDEN_RATIO:["(1 + Math.sqrt(5)) / 2",Blockly.JavaScript.ORDER_DIVISION],SQRT2:["Math.SQRT2",Blockly.JavaScript.ORDER_MEMBER],SQRT1_2:["Math.SQRT1_2",Blockly.JavaScript.ORDER_MEMBER],INFINITY:["Infinity",Blockly.JavaScript.ORDER_ATOMIC]};
Blockly.JavaScript.math_number_property=function(){var a=Blockly.JavaScript.valueToCode(this,"NUMBER_TO_CHECK",Blockly.JavaScript.ORDER_MODULUS)||"NaN",b=this.getTitleValue("PROPERTY"),c;if("PRIME"==b)return Blockly.JavaScript.definitions_.isPrime||(b=Blockly.JavaScript.variableDB_.getDistinctName("isPrime",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.logic_prime=b,c=[],c.push("function "+b+"(n) {"),c.push("  // http://en.wikipedia.org/wiki/Primality_test#Naive_methods"),c.push("  if (n == 2 || n == 3) {"),
c.push("    return true;"),c.push("  }"),c.push("  // False if n is NaN, negative, is 1, or not whole."),c.push("  // And false if n is divisible by 2 or 3."),c.push("  if (isNaN(n) || n <= 1 || n % 1 != 0 || n % 2 == 0 || n % 3 == 0) {"),c.push("    return false;"),c.push("  }"),c.push("  // Check all the numbers of form 6k +/- 1, up to sqrt(n)."),c.push("  for (var x = 6; x <= Math.sqrt(n) + 1; x += 6) {"),c.push("    if (n % (x - 1) == 0 || n % (x + 1) == 0) {"),c.push("      return false;"),c.push("    }"),
c.push("  }"),c.push("  return true;"),c.push("}"),Blockly.JavaScript.definitions_.isPrime=c.join("\n")),c=Blockly.JavaScript.logic_prime+"("+a+")",[c,Blockly.JavaScript.ORDER_FUNCTION_CALL];switch(b){case "EVEN":c=a+" % 2 == 0";break;case "ODD":c=a+" % 2 == 1";break;case "WHOLE":c=a+" % 1 == 0";break;case "POSITIVE":c=a+" > 0";break;case "NEGATIVE":c=a+" < 0";break;case "DIVISIBLE_BY":b=Blockly.JavaScript.valueToCode(this,"DIVISOR",Blockly.JavaScript.ORDER_MODULUS)||"NaN",c=a+" % "+b+" == 0"}return[c,
Blockly.JavaScript.ORDER_EQUALITY]};Blockly.JavaScript.math_change=function(){var a=Blockly.JavaScript.valueToCode(this,"DELTA",Blockly.JavaScript.ORDER_ADDITION)||"0",b=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("VAR"),Blockly.Variables.NAME_TYPE);return b+" = (typeof "+b+" == 'number' ? "+b+" : 0) + "+a+";\n"};Blockly.JavaScript.math_round=Blockly.JavaScript.math_single;Blockly.JavaScript.math_trig=Blockly.JavaScript.math_single;
Blockly.JavaScript.math_on_list=function(){var a=this.getTitleValue("OP");switch(a){case "SUM":a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_MEMBER)||"[]";a+=".reduce(function(x, y) {return x + y;})";break;case "MIN":a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_COMMA)||"[]";a="Math.min.apply(null, "+a+")";break;case "MAX":a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_COMMA)||"[]";a="Math.max.apply(null, "+a+")";break;case "AVERAGE":if(!Blockly.JavaScript.definitions_.math_mean){var b=
Blockly.JavaScript.variableDB_.getDistinctName("math_mean",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.math_on_list.math_mean=b;a=[];a.push("function "+b+"(myList) {");a.push("  return myList.reduce(function(x, y) {return x + y;}) / myList.length;");a.push("}");Blockly.JavaScript.definitions_.math_mean=a.join("\n")}a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_NONE)||"[]";a=Blockly.JavaScript.math_on_list.math_mean+"("+a+")";break;case "MEDIAN":Blockly.JavaScript.definitions_.math_median||
(b=Blockly.JavaScript.variableDB_.getDistinctName("math_median",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.math_on_list.math_median=b,a=[],a.push("function "+b+"(myList) {"),a.push("  var localList = myList.filter(function (x) {return typeof x == 'number';});"),a.push("  if (!localList.length) return null;"),a.push("  localList.sort(function(a, b) {return b - a;});"),a.push("  if (localList.length % 2 == 0) {"),a.push("    return (localList[localList.length / 2 - 1] + localList[localList.length / 2]) / 2;"),
a.push("  } else {"),a.push("    return localList[(localList.length - 1) / 2];"),a.push("  }"),a.push("}"),Blockly.JavaScript.definitions_.math_median=a.join("\n"));a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_NONE)||"[]";a=Blockly.JavaScript.math_on_list.math_median+"("+a+")";break;case "MODE":Blockly.JavaScript.definitions_.math_modes||(b=Blockly.JavaScript.variableDB_.getDistinctName("math_modes",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.math_on_list.math_modes=b,
a=[],a.push("function "+b+"(values) {"),a.push("  var modes = [];"),a.push("  var counts = [];"),a.push("  var maxCount = 0;"),a.push("  for (var i = 0; i < values.length; i++) {"),a.push("    var value = values[i];"),a.push("    var found = false;"),a.push("    var thisCount;"),a.push("    for (var j = 0; j < counts.length; j++) {"),a.push("      if (counts[j][0] === value) {"),a.push("        thisCount = ++counts[j][1];"),a.push("        found = true;"),a.push("        break;"),a.push("      }"),
a.push("    }"),a.push("    if (!found) {"),a.push("      counts.push([value, 1]);"),a.push("      thisCount = 1;"),a.push("    }"),a.push("    maxCount = Math.max(thisCount, maxCount);"),a.push("  }"),a.push("  for (var j = 0; j < counts.length; j++) {"),a.push("    if (counts[j][1] == maxCount) {"),a.push("        modes.push(counts[j][0]);"),a.push("    }"),a.push("  }"),a.push("  return modes;"),a.push("}"),Blockly.JavaScript.definitions_.math_modes=a.join("\n"));a=Blockly.JavaScript.valueToCode(this,
"LIST",Blockly.JavaScript.ORDER_NONE)||"[]";a=Blockly.JavaScript.math_on_list.math_modes+"("+a+")";break;case "STD_DEV":Blockly.JavaScript.definitions_.math_standard_deviation||(b=Blockly.JavaScript.variableDB_.getDistinctName("math_standard_deviation",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.math_on_list.math_standard_deviation=b,a=[],a.push("function "+b+"(numbers) {"),a.push("  var n = numbers.length;"),a.push("  if (!n) return null;"),a.push("  var mean = numbers.reduce(function(x, y) {return x + y;}) / n;"),
a.push("  var variance = 0;"),a.push("  for (var j = 0; j < n; j++) {"),a.push("    variance += Math.pow(numbers[j] - mean, 2);"),a.push("  }"),a.push("  variance = variance / n;"),a.push("  return Math.sqrt(variance);"),a.push("}"),Blockly.JavaScript.definitions_.math_standard_deviation=a.join("\n"));a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_NONE)||"[]";a=Blockly.JavaScript.math_on_list.math_standard_deviation+"("+a+")";break;case "RANDOM":Blockly.JavaScript.definitions_.math_random_item||
(b=Blockly.JavaScript.variableDB_.getDistinctName("math_random_item",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.math_on_list.math_random_item=b,a=[],a.push("function "+b+"(list) {"),a.push("  var x = Math.floor(Math.random() * list.length);"),a.push("  return list[x];"),a.push("}"),Blockly.JavaScript.definitions_.math_random_item=a.join("\n"));a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_NONE)||"[]";a=Blockly.JavaScript.math_on_list.math_random_item+"("+a+")";break;default:throw"Unknown operator: "+
a;}return[a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.math_modulo=function(){var a=Blockly.JavaScript.valueToCode(this,"DIVIDEND",Blockly.JavaScript.ORDER_MODULUS)||"0",b=Blockly.JavaScript.valueToCode(this,"DIVISOR",Blockly.JavaScript.ORDER_MODULUS)||"0";return[a+" % "+b,Blockly.JavaScript.ORDER_MODULUS]};
Blockly.JavaScript.math_constrain=function(){var a=Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_COMMA)||"0",b=Blockly.JavaScript.valueToCode(this,"LOW",Blockly.JavaScript.ORDER_COMMA)||"0",c=Blockly.JavaScript.valueToCode(this,"HIGH",Blockly.JavaScript.ORDER_COMMA)||"Infinity";return["Math.min(Math.max("+a+", "+b+"), "+c+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};
Blockly.JavaScript.math_random_int=function(){var a=Blockly.JavaScript.valueToCode(this,"FROM",Blockly.JavaScript.ORDER_COMMA)||"0",b=Blockly.JavaScript.valueToCode(this,"TO",Blockly.JavaScript.ORDER_COMMA)||"0";if(!Blockly.JavaScript.definitions_.math_random_int){var c=Blockly.JavaScript.variableDB_.getDistinctName("math_random_int",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.math_random_int.random_function=c;var d=[];d.push("function "+c+"(a, b) {");d.push("  if (a > b) {");d.push("    // Swap a and b to ensure a is smaller.");
d.push("    var c = a;");d.push("    a = b;");d.push("    b = c;");d.push("  }");d.push("  return Math.floor(Math.random() * (b - a + 1) + a);");d.push("}");Blockly.JavaScript.definitions_.math_random_int=d.join("\n")}return[Blockly.JavaScript.math_random_int.random_function+"("+a+", "+b+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.math_random_float=function(){return["Math.random()",Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.procedures={};
Blockly.JavaScript.procedures_defreturn=function(){var a=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("NAME"),Blockly.Procedures.NAME_TYPE),b=Blockly.JavaScript.statementToCode(this,"STACK");Blockly.JavaScript.INFINITE_LOOP_TRAP&&(b=Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,"'"+this.id+"'")+b);var c=Blockly.JavaScript.valueToCode(this,"RETURN",Blockly.JavaScript.ORDER_NONE)||"";c&&(c="  return "+c+";\n");for(var d=[],e=0;e<this.arguments_.length;e++)d[e]=Blockly.JavaScript.variableDB_.getName(this.arguments_[e],
Blockly.Variables.NAME_TYPE);b="function "+a+"("+d.join(", ")+") {\n"+b+c+"}";b=Blockly.JavaScript.scrub_(this,b);Blockly.JavaScript.definitions_[a]=b;return null};Blockly.JavaScript.procedures_defnoreturn=Blockly.JavaScript.procedures_defreturn;
Blockly.JavaScript.procedures_callreturn=function(){for(var a=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("NAME"),Blockly.Procedures.NAME_TYPE),b=[],c=0;c<this.arguments_.length;c++)b[c]=Blockly.JavaScript.valueToCode(this,"ARG"+c,Blockly.JavaScript.ORDER_COMMA)||"null";return[a+"("+b.join(", ")+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};
Blockly.JavaScript.procedures_callnoreturn=function(){for(var a=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("NAME"),Blockly.Procedures.NAME_TYPE),b=[],c=0;c<this.arguments_.length;c++)b[c]=Blockly.JavaScript.valueToCode(this,"ARG"+c,Blockly.JavaScript.ORDER_COMMA)||"null";return a+"("+b.join(", ")+");\n"};
Blockly.JavaScript.procedures_ifreturn=function(){var a="if ("+(Blockly.JavaScript.valueToCode(this,"CONDITION",Blockly.JavaScript.ORDER_NONE)||"false")+") {\n";if(this.hasReturnValue_)var b=Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_NONE)||"null",a=a+("  return "+b+";\n");else a+="  return;\n";return a+"}\n"};Blockly.JavaScript.logic={};Blockly.JavaScript.logic_compare=function(){var a=this.getTitleValue("OP"),a=Blockly.JavaScript.logic_compare.OPERATORS[a],b="=="==a||"!="==a?Blockly.JavaScript.ORDER_EQUALITY:Blockly.JavaScript.ORDER_RELATIONAL,c=Blockly.JavaScript.valueToCode(this,"A",b)||"0",d=Blockly.JavaScript.valueToCode(this,"B",b)||"0";return[c+" "+a+" "+d,b]};Blockly.JavaScript.logic_compare.OPERATORS={EQ:"==",NEQ:"!=",LT:"<",LTE:"<=",GT:">",GTE:">="};
Blockly.JavaScript.logic_operation=function(){var a="AND"==this.getTitleValue("OP")?"&&":"||",b="&&"==a?Blockly.JavaScript.ORDER_LOGICAL_AND:Blockly.JavaScript.ORDER_LOGICAL_OR,c=Blockly.JavaScript.valueToCode(this,"A",b)||"false",d=Blockly.JavaScript.valueToCode(this,"B",b)||"false";return[c+" "+a+" "+d,b]};Blockly.JavaScript.logic_negate=function(){var a=Blockly.JavaScript.ORDER_LOGICAL_NOT;return["!"+(Blockly.JavaScript.valueToCode(this,"BOOL",a)||"false"),a]};
Blockly.JavaScript.logic_boolean=function(){return["TRUE"==this.getTitleValue("BOOL")?"true":"false",Blockly.JavaScript.ORDER_ATOMIC]};Blockly.JavaScript.logic_null=function(){return["null",Blockly.JavaScript.ORDER_ATOMIC]};
Blockly.JavaScript.logic_ternary=function(){var a=Blockly.JavaScript.valueToCode(this,"IF",Blockly.JavaScript.ORDER_CONDITIONAL)||"false",b=Blockly.JavaScript.valueToCode(this,"THEN",Blockly.JavaScript.ORDER_CONDITIONAL)||"null",c=Blockly.JavaScript.valueToCode(this,"ELSE",Blockly.JavaScript.ORDER_CONDITIONAL)||"null";return[a+" ? "+b+" : "+c,Blockly.JavaScript.ORDER_CONDITIONAL]};Blockly.JavaScript.lists={};Blockly.JavaScript.lists_create_empty=function(){return["[]",Blockly.JavaScript.ORDER_ATOMIC]};Blockly.JavaScript.lists_create_with=function(){for(var a=Array(this.itemCount_),b=0;b<this.itemCount_;b++)a[b]=Blockly.JavaScript.valueToCode(this,"ADD"+b,Blockly.JavaScript.ORDER_COMMA)||"null";a="["+a.join(", ")+"]";return[a,Blockly.JavaScript.ORDER_ATOMIC]};
Blockly.JavaScript.lists_repeat=function(){if(!Blockly.JavaScript.definitions_.lists_repeat){var a=Blockly.JavaScript.variableDB_.getDistinctName("lists_repeat",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.lists_repeat.repeat=a;var b=[];b.push("function "+a+"(value, n) {");b.push("  var array = [];");b.push("  for (var i = 0; i < n; i++) {");b.push("    array[i] = value;");b.push("  }");b.push("  return array;");b.push("}");Blockly.JavaScript.definitions_.lists_repeat=b.join("\n")}a=Blockly.JavaScript.valueToCode(this,
"ITEM",Blockly.JavaScript.ORDER_COMMA)||"null";b=Blockly.JavaScript.valueToCode(this,"NUM",Blockly.JavaScript.ORDER_COMMA)||"0";return[Blockly.JavaScript.lists_repeat.repeat+"("+a+", "+b+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.lists_length=function(){return[(Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_FUNCTION_CALL)||"''")+".length",Blockly.JavaScript.ORDER_MEMBER]};
Blockly.JavaScript.lists_isEmpty=function(){return["!"+(Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"[]")+".length",Blockly.JavaScript.ORDER_LOGICAL_NOT]};Blockly.JavaScript.lists_indexOf=function(){var a="FIRST"==this.getTitleValue("END")?"indexOf":"lastIndexOf",b=Blockly.JavaScript.valueToCode(this,"FIND",Blockly.JavaScript.ORDER_NONE)||"''";return[(Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"[]")+"."+a+"("+b+") + 1",Blockly.JavaScript.ORDER_MEMBER]};
Blockly.JavaScript.lists_getIndex=function(){var a=this.getTitleValue("MODE")||"GET",b=this.getTitleValue("WHERE")||"FROM_START",c=Blockly.JavaScript.valueToCode(this,"AT",Blockly.JavaScript.ORDER_UNARY_NEGATION)||"1",d=Blockly.JavaScript.valueToCode(this,"VALUE",Blockly.JavaScript.ORDER_MEMBER)||"[]";if("FIRST"==b){if("GET"==a)return[d+"[0]",Blockly.JavaScript.ORDER_MEMBER];if("GET_REMOVE"==a)return[d+".shift()",Blockly.JavaScript.ORDER_MEMBER];if("REMOVE"==a)return d+".shift();\n"}else if("LAST"==
b){if("GET"==a)return[d+".slice(-1)[0]",Blockly.JavaScript.ORDER_MEMBER];if("GET_REMOVE"==a)return[d+".pop()",Blockly.JavaScript.ORDER_MEMBER];if("REMOVE"==a)return d+".pop();\n"}else if("FROM_START"==b){c=Blockly.isNumber(c)?parseFloat(c)-1:c+" - 1";if("GET"==a)return[d+"["+c+"]",Blockly.JavaScript.ORDER_MEMBER];if("GET_REMOVE"==a)return[d+".splice("+c+", 1)[0]",Blockly.JavaScript.ORDER_FUNCTION_CALL];if("REMOVE"==a)return d+".splice("+c+", 1);\n"}else if("FROM_END"==b){if("GET"==a)return[d+".slice(-"+
c+")[0]",Blockly.JavaScript.ORDER_FUNCTION_CALL];if("GET_REMOVE"==a||"REMOVE"==a){if(!Blockly.JavaScript.definitions_.lists_remove_from_end){b=Blockly.JavaScript.variableDB_.getDistinctName("lists_remove_from_end",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.lists_getIndex.lists_remove_from_end=b;var e=[];e.push("function "+b+"(list, x) {");e.push("  x = list.length - x;");e.push("  return list.splice(x, 1)[0];");e.push("}");Blockly.JavaScript.definitions_.lists_remove_from_end=e.join("\n")}c=
Blockly.JavaScript.lists_getIndex.lists_remove_from_end+"("+d+", "+c+")";if("GET_REMOVE"==a)return[c,Blockly.JavaScript.ORDER_FUNCTION_CALL];if("REMOVE"==a)return c+";\n"}}else if("RANDOM"==b){Blockly.JavaScript.definitions_.lists_get_random_item||(b=Blockly.JavaScript.variableDB_.getDistinctName("lists_get_random_item",Blockly.Generator.NAME_TYPE),Blockly.JavaScript.lists_getIndex.random=b,e=[],e.push("function "+b+"(list, remove) {"),e.push("  var x = Math.floor(Math.random() * list.length);"),
e.push("  if (remove) {"),e.push("    return list.splice(x, 1)[0];"),e.push("  } else {"),e.push("    return list[x];"),e.push("  }"),e.push("}"),Blockly.JavaScript.definitions_.lists_get_random_item=e.join("\n"));c=Blockly.JavaScript.lists_getIndex.random+"("+d+", "+("GET"!=a)+")";if("GET"==a||"GET_REMOVE"==a)return[c,Blockly.JavaScript.ORDER_FUNCTION_CALL];if("REMOVE"==a)return c+";\n"}throw"Unhandled combination (lists_getIndex).";};
Blockly.JavaScript.lists_setIndex=function(){function a(){if(b.match(/^\w+$/))return"";var a=Blockly.JavaScript.variableDB_.getDistinctName("tmp_list",Blockly.Variables.NAME_TYPE),c="var "+a+" = "+b+";\n";b=a;return c}var b=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_MEMBER)||"[]",c=this.getTitleValue("MODE")||"GET",d=this.getTitleValue("WHERE")||"FROM_START",e=Blockly.JavaScript.valueToCode(this,"AT",Blockly.JavaScript.ORDER_NONE)||"1",g=Blockly.JavaScript.valueToCode(this,
"TO",Blockly.JavaScript.ORDER_ASSIGNMENT)||"null";if("FIRST"==d){if("SET"==c)return b+"[0] = "+g+";\n";if("INSERT"==c)return b+".unshift("+g+");\n"}else if("LAST"==d){if("SET"==c)return d=a(),d+(b+"["+b+".length - 1] = "+g+";\n");if("INSERT"==c)return b+".push("+g+");\n"}else if("FROM_START"==d){e=Blockly.isNumber(e)?parseFloat(e)-1:e+" - 1";if("SET"==c)return b+"["+e+"] = "+g+";\n";if("INSERT"==c)return b+".splice("+e+", 0, "+g+");\n"}else if("FROM_END"==d){d=a();if("SET"==c)return d+=b+"["+b+".length - "+
e+"] = "+g+";\n";if("INSERT"==c)return d+=b+".splice("+b+".length - "+e+", 0, "+g+");\n"}else if("RANDOM"==d){d=a();e=Blockly.JavaScript.variableDB_.getDistinctName("tmp_x",Blockly.Variables.NAME_TYPE);d+="var "+e+" = Math.floor(Math.random() * "+b+".length);\n";if("SET"==c)return d+=b+"["+e+"] = "+g+";\n";if("INSERT"==c)return d+=b+".splice("+e+", 0, "+g+");\n"}throw"Unhandled combination (lists_setIndex).";};
Blockly.JavaScript.lists_getSublist=function(){var a=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_MEMBER)||"[]",b=this.getTitleValue("WHERE1"),c=this.getTitleValue("WHERE2"),d=Blockly.JavaScript.valueToCode(this,"AT1",Blockly.JavaScript.ORDER_NONE)||"1",e=Blockly.JavaScript.valueToCode(this,"AT2",Blockly.JavaScript.ORDER_NONE)||"1";if("FIRST"==b&&"LAST"==c)a+=".concat()";else{if(!Blockly.JavaScript.definitions_.lists_get_sublist){var g=Blockly.JavaScript.variableDB_.getDistinctName("lists_get_sublist",
Blockly.Generator.NAME_TYPE);Blockly.JavaScript.lists_getSublist.func=g;var f=[];f.push("function "+g+"(list, where1, at1, where2, at2) {");f.push("  function getAt(where, at) {");f.push("    if (where == 'FROM_START') {");f.push("      at--;");f.push("    } else if (where == 'FROM_END') {");f.push("      at = list.length - at;");f.push("    } else if (where == 'FIRST') {");f.push("      at = 0;");f.push("    } else if (where == 'LAST') {");f.push("      at = list.length - 1;");f.push("    } else {");
f.push("      throw 'Unhandled option (lists_getSublist).';");f.push("    }");f.push("    return at;");f.push("  }");f.push("  at1 = getAt(where1, at1);");f.push("  at2 = getAt(where2, at2) + 1;");f.push("  return list.slice(at1, at2);");f.push("}");Blockly.JavaScript.definitions_.lists_get_sublist=f.join("\n")}a=Blockly.JavaScript.lists_getSublist.func+"("+a+", '"+b+"', "+d+", '"+c+"', "+e+")"}return[a,Blockly.JavaScript.ORDER_FUNCTION_CALL]};Blockly.JavaScript.control={};
Blockly.JavaScript.controls_if=function(){for(var a=0,b=Blockly.JavaScript.valueToCode(this,"IF"+a,Blockly.JavaScript.ORDER_NONE)||"false",c=Blockly.JavaScript.statementToCode(this,"DO"+a),d="if ("+b+") {\n"+c+"}",a=1;a<=this.elseifCount_;a++)b=Blockly.JavaScript.valueToCode(this,"IF"+a,Blockly.JavaScript.ORDER_NONE)||"false",c=Blockly.JavaScript.statementToCode(this,"DO"+a),d+=" else if ("+b+") {\n"+c+"}\n";this.elseCount_&&(c=Blockly.JavaScript.statementToCode(this,"ELSE"),d+=" else {\n"+c+"}\n");
return d+"\n"};Blockly.JavaScript.controls_repeat=function(){var a=Number(this.getTitleValue("TIMES")),b=Blockly.JavaScript.statementToCode(this,"DO");Blockly.JavaScript.INFINITE_LOOP_TRAP&&(b=Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,"'"+this.id+"'")+b);var c=Blockly.JavaScript.variableDB_.getDistinctName("count",Blockly.Variables.NAME_TYPE);return"for (var "+c+" = 0; "+c+" < "+a+"; "+c+"++) {\n"+b+"}\n"};
Blockly.JavaScript.controls_repeat_ext=function(){var a=Blockly.JavaScript.valueToCode(this,"TIMES",Blockly.JavaScript.ORDER_ASSIGNMENT)||"0",b=Blockly.JavaScript.statementToCode(this,"DO");Blockly.JavaScript.INFINITE_LOOP_TRAP&&(b=Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,"'"+this.id+"'")+b);var c="",d=Blockly.JavaScript.variableDB_.getDistinctName("count",Blockly.Variables.NAME_TYPE),e=a;!a.match(/^\w+$/)&&!Blockly.isNumber(a)&&(e=Blockly.JavaScript.variableDB_.getDistinctName("repeat_end",
Blockly.Variables.NAME_TYPE),c+="var "+e+" = "+a+";\n");return c+("for (var "+d+" = 0; "+d+" < "+e+"; "+d+"++) {\n"+b+"}\n")};
Blockly.JavaScript.controls_whileUntil=function(){var a="UNTIL"==this.getTitleValue("MODE"),b=Blockly.JavaScript.valueToCode(this,"BOOL",a?Blockly.JavaScript.ORDER_LOGICAL_NOT:Blockly.JavaScript.ORDER_NONE)||"false",c=Blockly.JavaScript.statementToCode(this,"DO");Blockly.JavaScript.INFINITE_LOOP_TRAP&&(c=Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,"'"+this.id+"'")+c);a&&(b="!"+b);return"while ("+b+") {\n"+c+"}\n"};
Blockly.JavaScript.controls_for=function(){var a=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("VAR"),Blockly.Variables.NAME_TYPE),b=Blockly.JavaScript.valueToCode(this,"FROM",Blockly.JavaScript.ORDER_ASSIGNMENT)||"0",c=Blockly.JavaScript.valueToCode(this,"TO",Blockly.JavaScript.ORDER_ASSIGNMENT)||"0",d=Blockly.JavaScript.valueToCode(this,"BY",Blockly.JavaScript.ORDER_ASSIGNMENT)||"1",e=Blockly.JavaScript.statementToCode(this,"DO");Blockly.JavaScript.INFINITE_LOOP_TRAP&&(e=Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,
"'"+this.id+"'")+e);var g;if(Blockly.isNumber(b)&&Blockly.isNumber(c)&&Blockly.isNumber(d)){var f=parseFloat(b)<=parseFloat(c);g="for ("+a+" = "+b+"; "+a+(f?" <= ":" >= ")+c+"; "+a;a=Math.abs(parseFloat(d));g=(1==a?g+(f?"++":"--"):g+((f?" += ":" -= ")+a))+(") {\n"+e+"}\n")}else g="",f=b,!b.match(/^\w+$/)&&!Blockly.isNumber(b)&&(f=Blockly.JavaScript.variableDB_.getDistinctName(a+"_start",Blockly.Variables.NAME_TYPE),g+="var "+f+" = "+b+";\n"),b=c,!c.match(/^\w+$/)&&!Blockly.isNumber(c)&&(b=Blockly.JavaScript.variableDB_.getDistinctName(a+
"_end",Blockly.Variables.NAME_TYPE),g+="var "+b+" = "+c+";\n"),c=Blockly.JavaScript.variableDB_.getDistinctName(a+"_inc",Blockly.Variables.NAME_TYPE),g+="var "+c+" = ",g=Blockly.isNumber(d)?g+Math.abs(d):g+("Math.abs("+d+");\n"),g+=";\n",g+="if ("+f+" > "+b+") {\n",g+="  "+c+" = -"+c+";\n",g+="}\n",g+="for ("+a+" = "+f+";\n     "+c+" >= 0 ? "+a+" <= "+b+" : "+a+" >= "+b+";\n     "+a+" += "+c+") {\n"+e+"}\n";return g};
Blockly.JavaScript.controls_forEach=function(){var a=Blockly.JavaScript.variableDB_.getName(this.getTitleValue("VAR"),Blockly.Variables.NAME_TYPE),b=Blockly.JavaScript.valueToCode(this,"LIST",Blockly.JavaScript.ORDER_ASSIGNMENT)||"[]",c=Blockly.JavaScript.statementToCode(this,"DO");Blockly.JavaScript.INFINITE_LOOP_TRAP&&(c=Blockly.JavaScript.INFINITE_LOOP_TRAP.replace(/%1/g,"'"+this.id+"'")+c);var d=Blockly.JavaScript.variableDB_.getDistinctName(a+"_index",Blockly.Variables.NAME_TYPE);if(b.match(/^\w+$/))a=
"for (var "+d+" in  "+b+") {\n"+("  "+a+" = "+b+"["+d+"];\n"+c)+"}\n";else var e=Blockly.JavaScript.variableDB_.getDistinctName(a+"_list",Blockly.Variables.NAME_TYPE),c="  "+a+" = "+e+"["+d+"];\n"+c,a="var "+e+" = "+b+";\nfor (var "+d+" in "+e+") {\n"+c+"}\n";return a};Blockly.JavaScript.controls_flow_statements=function(){switch(this.getTitleValue("FLOW")){case "BREAK":return"break;\n";case "CONTINUE":return"continue;\n"}throw"Unknown flow statement.";};Blockly.JavaScript.colour={};Blockly.JavaScript.colour_picker=function(){return["'"+this.getTitleValue("COLOUR")+"'",Blockly.JavaScript.ORDER_ATOMIC]};
Blockly.JavaScript.colour_random=function(){if(!Blockly.JavaScript.definitions_.colour_random){var a=Blockly.JavaScript.variableDB_.getDistinctName("colour_random",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.colour_random.functionName=a;var b=[];b.push("function "+a+"() {");b.push("  var num = Math.floor(Math.random() * Math.pow(2, 24));");b.push("  return '#' + ('00000' + num.toString(16)).substr(-6);");b.push("}");Blockly.JavaScript.definitions_.colour_random=b.join("\n")}return[Blockly.JavaScript.colour_random.functionName+
"()",Blockly.JavaScript.ORDER_FUNCTION_CALL]};
Blockly.JavaScript.colour_rgb=function(){var a=Blockly.JavaScript.valueToCode(this,"RED",Blockly.JavaScript.ORDER_COMMA)||0,b=Blockly.JavaScript.valueToCode(this,"GREEN",Blockly.JavaScript.ORDER_COMMA)||0,c=Blockly.JavaScript.valueToCode(this,"BLUE",Blockly.JavaScript.ORDER_COMMA)||0;if(!Blockly.JavaScript.definitions_.colour_rgb){var d=Blockly.JavaScript.variableDB_.getDistinctName("colour_rgb",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.colour_rgb.functionName=d;var e=[];e.push("function "+
d+"(r, g, b) {");e.push("  r = Math.round(Math.max(Math.min(Number(r), 100), 0) * 2.55);");e.push("  g = Math.round(Math.max(Math.min(Number(g), 100), 0) * 2.55);");e.push("  b = Math.round(Math.max(Math.min(Number(b), 100), 0) * 2.55);");e.push("  r = ('0' + (r || 0).toString(16)).slice(-2);");e.push("  g = ('0' + (g || 0).toString(16)).slice(-2);");e.push("  b = ('0' + (b || 0).toString(16)).slice(-2);");e.push("  return '#' + r + g + b;");e.push("}");Blockly.JavaScript.definitions_.colour_rgb=
e.join("\n")}return[Blockly.JavaScript.colour_rgb.functionName+"("+a+", "+b+", "+c+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};
Blockly.JavaScript.colour_blend=function(){var a=Blockly.JavaScript.valueToCode(this,"COLOUR1",Blockly.JavaScript.ORDER_COMMA)||"'#000000'",b=Blockly.JavaScript.valueToCode(this,"COLOUR2",Blockly.JavaScript.ORDER_COMMA)||"'#000000'",c=Blockly.JavaScript.valueToCode(this,"RATIO",Blockly.JavaScript.ORDER_COMMA)||0.5;if(!Blockly.JavaScript.definitions_.colour_blend){var d=Blockly.JavaScript.variableDB_.getDistinctName("colour_blend",Blockly.Generator.NAME_TYPE);Blockly.JavaScript.colour_blend.functionName=
d;var e=[];e.push("function "+d+"(c1, c2, ratio) {");e.push("  ratio = Math.max(Math.min(Number(ratio), 1), 0);");e.push("  var r1 = parseInt(c1.substring(1, 3), 16);");e.push("  var g1 = parseInt(c1.substring(3, 5), 16);");e.push("  var b1 = parseInt(c1.substring(5, 7), 16);");e.push("  var r2 = parseInt(c2.substring(1, 3), 16);");e.push("  var g2 = parseInt(c2.substring(3, 5), 16);");e.push("  var b2 = parseInt(c2.substring(5, 7), 16);");e.push("  var r = Math.round(r1 * (1 - ratio) + r2 * ratio);");
e.push("  var g = Math.round(g1 * (1 - ratio) + g2 * ratio);");e.push("  var b = Math.round(b1 * (1 - ratio) + b2 * ratio);");e.push("  r = ('0' + (r || 0).toString(16)).slice(-2);");e.push("  g = ('0' + (g || 0).toString(16)).slice(-2);");e.push("  b = ('0' + (b || 0).toString(16)).slice(-2);");e.push("  return '#' + r + g + b;");e.push("}");Blockly.JavaScript.definitions_.colour_blend=e.join("\n")}return[Blockly.JavaScript.colour_blend.functionName+"("+a+", "+b+", "+c+")",Blockly.JavaScript.ORDER_FUNCTION_CALL]};

// End source
  }).bind(frameWindow)()
}
},{}],7:[function(require,module,exports){
(function(__dirname){// Create module root object
var Blockly = module.exports = {}

// Modules Deps
var createEditor = require('javascript-editor')
var path = require('path')
var treeify = require('treeify')
var esprima = require('esprima')

//  Blockly Core Deps
var initBlocklyCore = require('./node_modules/blockly/lib/blockly_compressed.js')
var MSG = require('./node_modules/blockly/lib/MSG.js')
var code_app = require('./node_modules/blockly/lib/code.js')
var initEnglish = require('./node_modules/blockly/lib/en_compressed.js')

//  Blockly JSEditor Deps
var blocklyTemplate = require('./templates/template.soy.js')
var initJsGenerator = require('./node_modules/blockly/lib/javascript_compressed.js')
var initJslang = require('./language/jslang.js')
Blockly.util = require('./util.js')

// Pollute window - Required for cross-iframe communication
window.Blockly = Blockly;

// Called by consumer to insert the workspace into the DOM
Blockly.injectWorkspace = function( options ) {

  // Set Defaults
  var targetElement = options.targetElement || document.body

  // Inject Blockly into target div
  var holder = document.createElement('div');
  holder.innerHTML = blocklyTemplate.start({}, null, {MSG: MSG, framePathname: path.join(__dirname,"frame.html"), frameSrc: "en_compressed.js"});
  while (holder.hasChildNodes()) {
    targetElement.appendChild( holder.firstChild )
  }

  // inject styles
  if (options.injectStyles) injectStyles(['./style.css'])

  // Prepare for code editor
  // create left and right sections
  var editorContainer = document.querySelector('#content_javascript')
  var left = document.createElement('div')
  left.setAttribute("class","left")
  editorContainer.appendChild(left)
  var right = document.createElement('div')
  right.setAttribute("class","right")
  editorContainer.appendChild(right)

  // inject editor
  Blockly.editor = createEditor({
    container: editorContainer,
    injectStyles: true
  })

  // Blockly.editor.on('change', function() {})

}

// Called from workspace iframe when ready
Blockly.init = function(frameWindow) {
  Blockly.core = initBlocklyCore(frameWindow)
  initJsGenerator(frameWindow,Blockly.core)
  initWorkspace(frameWindow,Blockly.core)
  initEnglish(frameWindow,Blockly.core)
  // Initialize basic JS Language definitions (Blocks + Generators)
  initJslang(Blockly)
  // Init App (UI stuff etc)
  code_app.init(Blockly.core)
}

// ===
// = Debugging
// ===

window._parse = function(src) {
  return esprima.parse(src)
}

window._tree = function(src) {
  src = src || Blockly.getCode()
  console.log( treeify.asTree(_parse(src),true) )
}

window._code = function() {
  _tree(Blockly.core.Generator.workspaceToCode('JavaScript')) 
}

window._xml = function(src) {
  var xmlDom = src ? Blockly.util.jsToBlocklyXml(src) : Blockly.core.Xml.workspaceToDom(Blockly.core.mainWorkspace)
  console.log( Blockly.core.Xml.domToPrettyText(xmlDom) || xmlDom )
}

// ===
// = Public Methods
// ===

Blockly.setCode = function(newCode) {
  Blockly.editor.setValue(newCode)
}
Blockly.getCode = function(newCode) {
  return Blockly.editor.getValue(newCode)
}
Blockly.refresh = function(newCode) {
  Blockly.editor.refresh()
}

// Patch commands from DOM (embedded event handlers) into code_app
// TODO: remove(?)
Blockly.tabClick = function(id) {
  code_app.tabClick(id)
}
Blockly.discard = function() {
  code_app.discard()
}
Blockly.renderContent = function() {
  code_app.renderContent()
}
Blockly.runJS = function() {
  code_app.runJS()
}


// ===
// = Private Methods
// ===

function injectStyles(styles) {
  styles.forEach(function(cssFile) {
    var pathname = path.join(__dirname,cssFile)
    injectStyle( pathname )
  })
}

function injectStyle( pathname ) {
  var linkTag = document.createElement("link")
  linkTag.setAttribute("rel", "stylesheet")
  linkTag.setAttribute("type", "text/css")
  linkTag.setAttribute("href", pathname)
  linkTag.setAttribute("onload", "Blockly.refresh()")
  document.getElementsByTagName("head")[0].appendChild(linkTag)
}

function initWorkspace(window,Blockly) {
  (function(){
    var document = window.document
    var rtl = false;
    var toolbox = null;
    if (window.parent.document) {
      // document.dir fails in Mozilla, use document.body.parentNode.dir.
      // https://bugzilla.mozilla.org/show_bug.cgi?id=151407
      rtl = window.parent.document.body.parentNode.dir == 'rtl';
      toolbox = window.parent.document.getElementById('toolbox');
    }
    Blockly.inject(document.body,
        {path: '../../',
         rtl: rtl,
         toolbox: toolbox});
  }).bind(window)()
}
})("/")
},{"path":2,"./node_modules/blockly/lib/blockly_compressed.js":5,"./node_modules/blockly/lib/MSG.js":3,"./node_modules/blockly/lib/code.js":8,"./node_modules/blockly/lib/en_compressed.js":4,"./templates/template.soy.js":9,"./node_modules/blockly/lib/javascript_compressed.js":6,"./language/jslang.js":10,"./util.js":11,"esprima":12,"javascript-editor":13,"treeify":14}],9:[function(require,module,exports){
var soy = require('/Users/kumavis/Dropbox/Development/Node/node-blockly-js-editor/node_modules/blockly/lib/_soy/soyutils.js').soy;

// This file was automatically generated from template.soy.
// Please don't edit this file by hand.

if (typeof blockly_js_editor == 'undefined') { var blockly_js_editor = {}; }


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {string}
 * @notypecheck
 */
blockly_js_editor.start = function(opt_data, opt_ignored, opt_ijData) {
  return '<table width="100%" height="100%"><tr><td><table><tr id="tabRow" height="1em"><td id="tab_blocks" class="tabon" onclick="Blockly.tabClick(this.id)">' + soy.$$escapeHtml(opt_ijData.MSG.blocks) + '</td><td class="tabmin">&nbsp;</td><td id="tab_javascript" class="taboff" onclick="Blockly.tabClick(this.id)">JavaScript</td><td class="tabmin">&nbsp;</td><td class="tabmax"><button title="' + soy.$$escapeHtml(opt_ijData.MSG.trashTooltip) + '" onclick="Blockly.discard(); Blockly.renderContent();"><img src=\'../../media/1x1.gif\' class="trash"></button></td></tr></table></td></tr><tr><td height="99%">' + blockly_js_editor.toolbox(null, null, opt_ijData) + '<iframe id="content_blocks" src="' + soy.$$escapeHtml(opt_ijData.framePathname) + '?' + soy.$$escapeHtml(opt_ijData.frameSrc) + '"></iframe><pre id="content_javascript"></pre><div id="content_xml"><textarea id="textarea_xml"></textarea></div></td></tr></table>';
};


/**
 * @param {Object.<string, *>=} opt_data
 * @param {(null|undefined)=} opt_ignored
 * @param {Object.<string, *>=} opt_ijData
 * @return {string}
 * @notypecheck
 */
blockly_js_editor.toolbox = function(opt_data, opt_ignored, opt_ijData) {
  return '<xml id="toolbox" style="display: none"><category name="basic javascript language features"><block type="jslang_try_catch"></block><block type="jslang_call"></block><block type="jslang_member_chain"></block><block type="jslang_statement_nub"></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catControl) + '"><block type="controls_if"></block><block type="controls_repeat_ext"><value name="TIMES"><block type="math_number"><title name="NUM">10</title></block></value></block><block type="controls_whileUntil"></block><block type="controls_for"><value name="FROM"><block type="math_number"><title name="NUM">1</title></block></value><value name="TO"><block type="math_number"><title name="NUM">10</title></block></value><value name="BY"><block type="math_number"><title name="NUM">1</title></block></value></block><block type="controls_forEach"></block><block type="controls_flow_statements"></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catLogic) + '"><block type="logic_compare"></block><block type="logic_operation"></block><block type="logic_negate"></block><block type="logic_boolean"></block><block type="logic_null"></block><block type="logic_ternary"></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catMath) + '"><block type="math_number"></block><block type="math_arithmetic"></block><block type="math_single"></block><block type="math_trig"></block><block type="math_constant"></block><block type="math_number_property"></block><block type="math_change"><value name="DELTA"><block type="math_number"><title name="NUM">1</title></block></value></block><block type="math_round"></block><block type="math_on_list"></block><block type="math_modulo"></block><block type="math_constrain"><value name="LOW"><block type="math_number"><title name="NUM">1</title></block></value><value name="HIGH"><block type="math_number"><title name="NUM">100</title></block></value></block><block type="math_random_int"><value name="FROM"><block type="math_number"><title name="NUM">1</title></block></value><value name="TO"><block type="math_number"><title name="NUM">100</title></block></value></block><block type="math_random_float"></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catText) + '"><block type="text"></block><block type="text_join"></block><block type="text_append"><value name="TEXT"><block type="text"></block></value></block><block type="text_length"></block><block type="text_isEmpty"></block><block type="text_indexOf"><value name="VALUE"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.textVariable) + '</title></block></value></block><block type="text_charAt"><value name="VALUE"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.textVariable) + '</title></block></value></block><block type="text_getSubstring"><value name="STRING"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.textVariable) + '</title></block></value></block><block type="text_changeCase"></block><block type="text_trim"></block><block type="text_print"></block><block type="text_prompt"></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catLists) + '"><block type="lists_create_empty"></block><block type="lists_create_with"></block><block type="lists_repeat"><value name="NUM"><block type="math_number"><title name="NUM">5</title></block></value></block><block type="lists_length"></block><block type="lists_isEmpty"></block><block type="lists_indexOf"><value name="VALUE"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.listVariable) + '</title></block></value></block><block type="lists_getIndex"><value name="VALUE"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.listVariable) + '</title></block></value></block><block type="lists_setIndex"><value name="LIST"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.listVariable) + '</title></block></value></block><block type="lists_getSublist"><value name="LIST"><block type="variables_get"><title name="VAR">' + soy.$$escapeHtml(opt_ijData.MSG.listVariable) + '</title></block></value></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catColour) + '"><block type="colour_picker"></block><block type="colour_random"></block><block type="colour_rgb"></block><block type="colour_blend"></block></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catVariables) + '" custom="VARIABLE"></category><category name="' + soy.$$escapeHtml(opt_ijData.MSG.catProcedures) + '" custom="PROCEDURE"></category></xml>';
};


;; module.exports=blockly_js_editor;
},{"/Users/kumavis/Dropbox/Development/Node/node-blockly-js-editor/node_modules/blockly/lib/_soy/soyutils.js":15}],8:[function(require,module,exports){
var code_app = module.exports = {}


var MSG = require('./MSG.js')
/**
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
 * http://blockly.googlecode.com/
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
  //     xmlDom = Blockly.core.Xml.textToDom(xmlText);
  //   } catch (e) {
  //     var q =
  //         window.confirm(MSG.badXml.replace('%1', e));
  //     if (!q) {
  //       // Leave the user on the XML tab.
  //       return;
  //     }
  //   }
  //   if (xmlDom) {
  //     Blockly.core.mainWorkspace.clear();
  //     Blockly.core.Xml.domToWorkspace(Blockly.core.mainWorkspace, xmlDom);
  //   }
  // }

  // If the JS tab was open, save and render the content.
  if (document.getElementById('tab_javascript').className == 'tabon') {
    var jsText = Blockly.getCode();
    var xmlText = Blockly.util.jsToBlocklyXml(jsText);
    var xmlDom = null;
    try {
      xmlDom = Blockly.core.Xml.textToDom(xmlText);
    } catch (e) {
      var q =
          window.confirm(MSG.badXml.replace('%1', e));
      if (!q) {
        // Leave the user on the XML tab.
        return;
      }
    }
    if (xmlDom) {
      Blockly.core.mainWorkspace.clear();
      Blockly.core.Xml.domToWorkspace(Blockly.core.mainWorkspace, xmlDom);
    }
  }

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
    Blockly.core.mainWorkspace.render();
  } else if (content.id == 'content_xml') {
    var xmlTextarea = document.getElementById('textarea_xml');
    var xmlDom = Blockly.core.Xml.workspaceToDom(Blockly.core.mainWorkspace);
    var xmlText = Blockly.core.Xml.domToPrettyText(xmlDom);
    xmlTextarea.value = xmlText;
    xmlTextarea.focus();
  } else if (content.id == 'content_javascript') {
    Blockly.setCode(Blockly.core.Generator.workspaceToCode('JavaScript'))
    Blockly.editor.editor.focus()
    // content.innerHTML = Blockly.core.Generator.workspaceToCode('JavaScript');
  // } else if (content.id == 'content_python') {
  //   content.innerHTML = Blockly.core.Generator.workspaceToCode('Python');
  }
}

/**
 * Initialize Blockly.core.  Called on page load.
 * @param {!Blockly} blockly Instance of Blockly from iframe.
 */
var init = code_app.init = function init(blockly) {
 // window.Blockly = blockly;
 window.Blockly.core = blockly;

  // Add to reserved word list: Local variables in execution evironment (runJS)
  // and the infinite loop detection function.
  Blockly.core.JavaScript.addReservedWords('code,timeouts,checkTimeout');

  // Make the 'Blocks' tab line up with the toolbox.
  if (Blockly.core.Toolbox) {
    window.setTimeout(function() {
        document.getElementById('tab_blocks').style.minWidth =
            (Blockly.core.Toolbox.width - 38) + 'px';
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
  Blockly.core.JavaScript.INFINITE_LOOP_TRAP = '  checkTimeout();\n';
  var timeouts = 0;
  var checkTimeout = function() {
    if (timeouts++ > 1000000) {
      throw MSG.timeout;
    }
  };
  var code = Blockly.core.Generator.workspaceToCode('JavaScript');
  Blockly.core.JavaScript.INFINITE_LOOP_TRAP = null;
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
  var count = Blockly.core.mainWorkspace.getAllBlocks().length;
  if (count < 2 ||
      window.confirm(MSG.discard.replace('%1', count))) {
    Blockly.core.mainWorkspace.clear();
    window.location.hash = '';
  }
}

},{"./MSG.js":3}],12:[function(require,module,exports){
(function(){/*
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/*jslint bitwise:true plusplus:true */
/*global esprima:true, define:true, exports:true, window: true,
throwError: true, createLiteral: true, generateStatement: true,
parseAssignmentExpression: true, parseBlock: true, parseExpression: true,
parseFunctionDeclaration: true, parseFunctionExpression: true,
parseFunctionSourceElements: true, parseVariableIdentifier: true,
parseLeftHandSideExpression: true,
parseStatement: true, parseSourceElement: true */

(function (root, factory) {
    'use strict';

    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js,
    // Rhino, and plain browser loading.
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports !== 'undefined') {
        factory(exports);
    } else {
        factory((root.esprima = {}));
    }
}(this, function (exports) {
    'use strict';

    var Token,
        TokenName,
        Syntax,
        PropertyKind,
        Messages,
        Regex,
        source,
        strict,
        index,
        lineNumber,
        lineStart,
        length,
        buffer,
        state,
        extra;

    Token = {
        BooleanLiteral: 1,
        EOF: 2,
        Identifier: 3,
        Keyword: 4,
        NullLiteral: 5,
        NumericLiteral: 6,
        Punctuator: 7,
        StringLiteral: 8
    };

    TokenName = {};
    TokenName[Token.BooleanLiteral] = 'Boolean';
    TokenName[Token.EOF] = '<end>';
    TokenName[Token.Identifier] = 'Identifier';
    TokenName[Token.Keyword] = 'Keyword';
    TokenName[Token.NullLiteral] = 'Null';
    TokenName[Token.NumericLiteral] = 'Numeric';
    TokenName[Token.Punctuator] = 'Punctuator';
    TokenName[Token.StringLiteral] = 'String';

    Syntax = {
        AssignmentExpression: 'AssignmentExpression',
        ArrayExpression: 'ArrayExpression',
        BlockStatement: 'BlockStatement',
        BinaryExpression: 'BinaryExpression',
        BreakStatement: 'BreakStatement',
        CallExpression: 'CallExpression',
        CatchClause: 'CatchClause',
        ConditionalExpression: 'ConditionalExpression',
        ContinueStatement: 'ContinueStatement',
        DoWhileStatement: 'DoWhileStatement',
        DebuggerStatement: 'DebuggerStatement',
        EmptyStatement: 'EmptyStatement',
        ExpressionStatement: 'ExpressionStatement',
        ForStatement: 'ForStatement',
        ForInStatement: 'ForInStatement',
        FunctionDeclaration: 'FunctionDeclaration',
        FunctionExpression: 'FunctionExpression',
        Identifier: 'Identifier',
        IfStatement: 'IfStatement',
        Literal: 'Literal',
        LabeledStatement: 'LabeledStatement',
        LogicalExpression: 'LogicalExpression',
        MemberExpression: 'MemberExpression',
        NewExpression: 'NewExpression',
        ObjectExpression: 'ObjectExpression',
        Program: 'Program',
        Property: 'Property',
        ReturnStatement: 'ReturnStatement',
        SequenceExpression: 'SequenceExpression',
        SwitchStatement: 'SwitchStatement',
        SwitchCase: 'SwitchCase',
        ThisExpression: 'ThisExpression',
        ThrowStatement: 'ThrowStatement',
        TryStatement: 'TryStatement',
        UnaryExpression: 'UnaryExpression',
        UpdateExpression: 'UpdateExpression',
        VariableDeclaration: 'VariableDeclaration',
        VariableDeclarator: 'VariableDeclarator',
        WhileStatement: 'WhileStatement',
        WithStatement: 'WithStatement'
    };

    PropertyKind = {
        Data: 1,
        Get: 2,
        Set: 4
    };

    // Error messages should be identical to V8.
    Messages = {
        UnexpectedToken:  'Unexpected token %0',
        UnexpectedNumber:  'Unexpected number',
        UnexpectedString:  'Unexpected string',
        UnexpectedIdentifier:  'Unexpected identifier',
        UnexpectedReserved:  'Unexpected reserved word',
        UnexpectedEOS:  'Unexpected end of input',
        NewlineAfterThrow:  'Illegal newline after throw',
        InvalidRegExp: 'Invalid regular expression',
        UnterminatedRegExp:  'Invalid regular expression: missing /',
        InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
        InvalidLHSInForIn:  'Invalid left-hand side in for-in',
        MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
        NoCatchOrFinally:  'Missing catch or finally after try',
        UnknownLabel: 'Undefined label \'%0\'',
        Redeclaration: '%0 \'%1\' has already been declared',
        IllegalContinue: 'Illegal continue statement',
        IllegalBreak: 'Illegal break statement',
        IllegalReturn: 'Illegal return statement',
        StrictModeWith:  'Strict mode code may not include a with statement',
        StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
        StrictVarName:  'Variable name may not be eval or arguments in strict mode',
        StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
        StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
        StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
        StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
        StrictDelete:  'Delete of an unqualified identifier in strict mode.',
        StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
        AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
        AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
        StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
        StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
        StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
        StrictReservedWord:  'Use of future reserved word in strict mode'
    };

    // See also tools/generate-unicode-regex.py.
    Regex = {
        NonAsciiIdentifierStart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]'),
        NonAsciiIdentifierPart: new RegExp('[\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05d0-\u05ea\u05f0-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u0800-\u082d\u0840-\u085b\u08a0\u08a2-\u08ac\u08e4-\u08fe\u0900-\u0963\u0966-\u096f\u0971-\u0977\u0979-\u097f\u0981-\u0983\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7\u09c8\u09cb-\u09ce\u09d7\u09dc\u09dd\u09df-\u09e3\u09e6-\u09f1\u0a01-\u0a03\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5c\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c58\u0c59\u0c60-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1\u0cf2\u0d02\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d57\u0d60-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb9\u0ebb-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772\u1773\u1780-\u17d3\u17d7\u17dc\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1877\u1880-\u18aa\u18b0-\u18f5\u1900-\u191c\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19d9\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1cd0-\u1cd2\u1cd4-\u1cf6\u1d00-\u1de6\u1dfc-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u200c\u200d\u203f\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u2e2f\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099\u309a\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua697\ua69f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua827\ua840-\ua873\ua880-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua900-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a\uaa7b\uaa80-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabea\uabec\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc]')
    };

    // Ensure the condition is true, otherwise throw an error.
    // This is only to have a better contract semantic, i.e. another safety net
    // to catch a logic error. The condition shall be fulfilled in normal case.
    // Do NOT use this to enforce a certain condition on any user input.

    function assert(condition, message) {
        if (!condition) {
            throw new Error('ASSERT: ' + message);
        }
    }

    function sliceSource(from, to) {
        return source.slice(from, to);
    }

    if (typeof 'esprima'[0] === 'undefined') {
        sliceSource = function sliceArraySource(from, to) {
            return source.slice(from, to).join('');
        };
    }

    function isDecimalDigit(ch) {
        return '0123456789'.indexOf(ch) >= 0;
    }

    function isHexDigit(ch) {
        return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
    }

    function isOctalDigit(ch) {
        return '01234567'.indexOf(ch) >= 0;
    }


    // 7.2 White Space

    function isWhiteSpace(ch) {
        return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
            (ch === '\u000C') || (ch === '\u00A0') ||
            (ch.charCodeAt(0) >= 0x1680 &&
             '\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF'.indexOf(ch) >= 0);
    }

    // 7.3 Line Terminators

    function isLineTerminator(ch) {
        return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
    }

    // 7.6 Identifier Names and Identifiers

    function isIdentifierStart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierStart.test(ch));
    }

    function isIdentifierPart(ch) {
        return (ch === '$') || (ch === '_') || (ch === '\\') ||
            (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
            ((ch >= '0') && (ch <= '9')) ||
            ((ch.charCodeAt(0) >= 0x80) && Regex.NonAsciiIdentifierPart.test(ch));
    }

    // 7.6.1.2 Future Reserved Words

    function isFutureReservedWord(id) {
        switch (id) {

        // Future reserved words.
        case 'class':
        case 'enum':
        case 'export':
        case 'extends':
        case 'import':
        case 'super':
            return true;
        }

        return false;
    }

    function isStrictModeReservedWord(id) {
        switch (id) {

        // Strict Mode reserved words.
        case 'implements':
        case 'interface':
        case 'package':
        case 'private':
        case 'protected':
        case 'public':
        case 'static':
        case 'yield':
        case 'let':
            return true;
        }

        return false;
    }

    function isRestrictedWord(id) {
        return id === 'eval' || id === 'arguments';
    }

    // 7.6.1.1 Keywords

    function isKeyword(id) {
        var keyword = false;
        switch (id.length) {
        case 2:
            keyword = (id === 'if') || (id === 'in') || (id === 'do');
            break;
        case 3:
            keyword = (id === 'var') || (id === 'for') || (id === 'new') || (id === 'try');
            break;
        case 4:
            keyword = (id === 'this') || (id === 'else') || (id === 'case') || (id === 'void') || (id === 'with');
            break;
        case 5:
            keyword = (id === 'while') || (id === 'break') || (id === 'catch') || (id === 'throw');
            break;
        case 6:
            keyword = (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch');
            break;
        case 7:
            keyword = (id === 'default') || (id === 'finally');
            break;
        case 8:
            keyword = (id === 'function') || (id === 'continue') || (id === 'debugger');
            break;
        case 10:
            keyword = (id === 'instanceof');
            break;
        }

        if (keyword) {
            return true;
        }

        switch (id) {
        // Future reserved words.
        // 'const' is specialized as Keyword in V8.
        case 'const':
            return true;

        // For compatiblity to SpiderMonkey and ES.next
        case 'yield':
        case 'let':
            return true;
        }

        if (strict && isStrictModeReservedWord(id)) {
            return true;
        }

        return isFutureReservedWord(id);
    }

    // 7.4 Comments

    function skipComment() {
        var ch, blockComment, lineComment;

        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    lineComment = false;
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            ++index;
                            blockComment = false;
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    index += 2;
                    lineComment = true;
                } else if (ch === '*') {
                    index += 2;
                    blockComment = true;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function scanHexEscape(prefix) {
        var i, len, ch, code = 0;

        len = (prefix === 'u') ? 4 : 2;
        for (i = 0; i < len; ++i) {
            if (index < length && isHexDigit(source[index])) {
                ch = source[index++];
                code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
            } else {
                return '';
            }
        }
        return String.fromCharCode(code);
    }

    function scanIdentifier() {
        var ch, start, id, restore;

        ch = source[index];
        if (!isIdentifierStart(ch)) {
            return;
        }

        start = index;
        if (ch === '\\') {
            ++index;
            if (source[index] !== 'u') {
                return;
            }
            ++index;
            restore = index;
            ch = scanHexEscape('u');
            if (ch) {
                if (ch === '\\' || !isIdentifierStart(ch)) {
                    return;
                }
                id = ch;
            } else {
                index = restore;
                id = 'u';
            }
        } else {
            id = source[index++];
        }

        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }
            if (ch === '\\') {
                ++index;
                if (source[index] !== 'u') {
                    return;
                }
                ++index;
                restore = index;
                ch = scanHexEscape('u');
                if (ch) {
                    if (ch === '\\' || !isIdentifierPart(ch)) {
                        return;
                    }
                    id += ch;
                } else {
                    index = restore;
                    id += 'u';
                }
            } else {
                id += source[index++];
            }
        }

        // There is no keyword or literal with only one character.
        // Thus, it must be an identifier.
        if (id.length === 1) {
            return {
                type: Token.Identifier,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (isKeyword(id)) {
            return {
                type: Token.Keyword,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.1 Null Literals

        if (id === 'null') {
            return {
                type: Token.NullLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 7.8.2 Boolean Literals

        if (id === 'true' || id === 'false') {
            return {
                type: Token.BooleanLiteral,
                value: id,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        return {
            type: Token.Identifier,
            value: id,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.7 Punctuators

    function scanPunctuator() {
        var start = index,
            ch1 = source[index],
            ch2,
            ch3,
            ch4;

        // Check for most common single-character punctuators.

        if (ch1 === ';' || ch1 === '{' || ch1 === '}') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === ',' || ch1 === '(' || ch1 === ')') {
            ++index;
            return {
                type: Token.Punctuator,
                value: ch1,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Dot (.) can also start a floating-point number, hence the need
        // to check the next character.

        ch2 = source[index + 1];
        if (ch1 === '.' && !isDecimalDigit(ch2)) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // Peek more characters.

        ch3 = source[index + 2];
        ch4 = source[index + 3];

        // 4-character punctuator: >>>=

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            if (ch4 === '=') {
                index += 4;
                return {
                    type: Token.Punctuator,
                    value: '>>>=',
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // 3-character punctuators: === !== >>> <<= >>=

        if (ch1 === '=' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '===',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '!' && ch2 === '=' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '!==',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '>') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>>',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '<' && ch2 === '<' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '<<=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        if (ch1 === '>' && ch2 === '>' && ch3 === '=') {
            index += 3;
            return {
                type: Token.Punctuator,
                value: '>>=',
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }

        // 2-character punctuators: <= >= == != ++ -- << >> && ||
        // += -= *= %= &= |= ^= /=

        if (ch2 === '=') {
            if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0)) {
            if ('+-<>&|'.indexOf(ch2) >= 0) {
                index += 2;
                return {
                    type: Token.Punctuator,
                    value: ch1 + ch2,
                    lineNumber: lineNumber,
                    lineStart: lineStart,
                    range: [start, index]
                };
            }
        }

        // The remaining 1-character punctuators.

        if ('[]<>+-*%&|^!~?:=/'.indexOf(ch1) >= 0) {
            return {
                type: Token.Punctuator,
                value: source[index++],
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [start, index]
            };
        }
    }

    // 7.8.3 Numeric Literals

    function scanNumericLiteral() {
        var number, start, ch;

        ch = source[index];
        assert(isDecimalDigit(ch) || (ch === '.'),
            'Numeric literal must start with a decimal digit or a decimal point');

        start = index;
        number = '';
        if (ch !== '.') {
            number = source[index++];
            ch = source[index];

            // Hex number starts with '0x'.
            // Octal number starts with '0'.
            if (number === '0') {
                if (ch === 'x' || ch === 'X') {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isHexDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (number.length <= 2) {
                        // only 0x
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 16),
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                } else if (isOctalDigit(ch)) {
                    number += source[index++];
                    while (index < length) {
                        ch = source[index];
                        if (!isOctalDigit(ch)) {
                            break;
                        }
                        number += source[index++];
                    }

                    if (index < length) {
                        ch = source[index];
                        if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                        }
                    }
                    return {
                        type: Token.NumericLiteral,
                        value: parseInt(number, 8),
                        octal: true,
                        lineNumber: lineNumber,
                        lineStart: lineStart,
                        range: [start, index]
                    };
                }

                // decimal number starts with '0' such as '09' is illegal.
                if (isDecimalDigit(ch)) {
                    throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                }
            }

            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === '.') {
            number += source[index++];
            while (index < length) {
                ch = source[index];
                if (!isDecimalDigit(ch)) {
                    break;
                }
                number += source[index++];
            }
        }

        if (ch === 'e' || ch === 'E') {
            number += source[index++];

            ch = source[index];
            if (ch === '+' || ch === '-') {
                number += source[index++];
            }

            ch = source[index];
            if (isDecimalDigit(ch)) {
                number += source[index++];
                while (index < length) {
                    ch = source[index];
                    if (!isDecimalDigit(ch)) {
                        break;
                    }
                    number += source[index++];
                }
            } else {
                ch = 'character ' + ch;
                if (index >= length) {
                    ch = '<end>';
                }
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        if (index < length) {
            ch = source[index];
            if (isIdentifierStart(ch)) {
                throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
            }
        }

        return {
            type: Token.NumericLiteral,
            value: parseFloat(number),
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    // 7.8.4 String Literals

    function scanStringLiteral() {
        var str = '', quote, start, ch, code, unescaped, restore, octal = false;

        quote = source[index];
        assert((quote === '\'' || quote === '"'),
            'String literal must starts with a quote');

        start = index;
        ++index;

        while (index < length) {
            ch = source[index++];

            if (ch === quote) {
                quote = '';
                break;
            } else if (ch === '\\') {
                ch = source[index++];
                if (!isLineTerminator(ch)) {
                    switch (ch) {
                    case 'n':
                        str += '\n';
                        break;
                    case 'r':
                        str += '\r';
                        break;
                    case 't':
                        str += '\t';
                        break;
                    case 'u':
                    case 'x':
                        restore = index;
                        unescaped = scanHexEscape(ch);
                        if (unescaped) {
                            str += unescaped;
                        } else {
                            index = restore;
                            str += ch;
                        }
                        break;
                    case 'b':
                        str += '\b';
                        break;
                    case 'f':
                        str += '\f';
                        break;
                    case 'v':
                        str += '\x0B';
                        break;

                    default:
                        if (isOctalDigit(ch)) {
                            code = '01234567'.indexOf(ch);

                            // \0 is not octal escape sequence
                            if (code !== 0) {
                                octal = true;
                            }

                            if (index < length && isOctalDigit(source[index])) {
                                octal = true;
                                code = code * 8 + '01234567'.indexOf(source[index++]);

                                // 3 digits are only allowed when string starts
                                // with 0, 1, 2, 3
                                if ('0123'.indexOf(ch) >= 0 &&
                                        index < length &&
                                        isOctalDigit(source[index])) {
                                    code = code * 8 + '01234567'.indexOf(source[index++]);
                                }
                            }
                            str += String.fromCharCode(code);
                        } else {
                            str += ch;
                        }
                        break;
                    }
                } else {
                    ++lineNumber;
                    if (ch ===  '\r' && source[index] === '\n') {
                        ++index;
                    }
                }
            } else if (isLineTerminator(ch)) {
                break;
            } else {
                str += ch;
            }
        }

        if (quote !== '') {
            throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
        }

        return {
            type: Token.StringLiteral,
            value: str,
            octal: octal,
            lineNumber: lineNumber,
            lineStart: lineStart,
            range: [start, index]
        };
    }

    function scanRegExp() {
        var str, ch, start, pattern, flags, value, classMarker = false, restore, terminated = false;

        buffer = null;
        skipComment();

        start = index;
        ch = source[index];
        assert(ch === '/', 'Regular expression literal must start with a slash');
        str = source[index++];

        while (index < length) {
            ch = source[index++];
            str += ch;
            if (classMarker) {
                if (ch === ']') {
                    classMarker = false;
                }
            } else {
                if (ch === '\\') {
                    ch = source[index++];
                    // ECMA-262 7.8.5
                    if (isLineTerminator(ch)) {
                        throwError({}, Messages.UnterminatedRegExp);
                    }
                    str += ch;
                } else if (ch === '/') {
                    terminated = true;
                    break;
                } else if (ch === '[') {
                    classMarker = true;
                } else if (isLineTerminator(ch)) {
                    throwError({}, Messages.UnterminatedRegExp);
                }
            }
        }

        if (!terminated) {
            throwError({}, Messages.UnterminatedRegExp);
        }

        // Exclude leading and trailing slash.
        pattern = str.substr(1, str.length - 2);

        flags = '';
        while (index < length) {
            ch = source[index];
            if (!isIdentifierPart(ch)) {
                break;
            }

            ++index;
            if (ch === '\\' && index < length) {
                ch = source[index];
                if (ch === 'u') {
                    ++index;
                    restore = index;
                    ch = scanHexEscape('u');
                    if (ch) {
                        flags += ch;
                        str += '\\u';
                        for (; restore < index; ++restore) {
                            str += source[restore];
                        }
                    } else {
                        index = restore;
                        flags += 'u';
                        str += '\\u';
                    }
                } else {
                    str += '\\';
                }
            } else {
                flags += ch;
                str += ch;
            }
        }

        try {
            value = new RegExp(pattern, flags);
        } catch (e) {
            throwError({}, Messages.InvalidRegExp);
        }

        return {
            literal: str,
            value: value,
            range: [start, index]
        };
    }

    function isIdentifierName(token) {
        return token.type === Token.Identifier ||
            token.type === Token.Keyword ||
            token.type === Token.BooleanLiteral ||
            token.type === Token.NullLiteral;
    }

    function advance() {
        var ch, token;

        skipComment();

        if (index >= length) {
            return {
                type: Token.EOF,
                lineNumber: lineNumber,
                lineStart: lineStart,
                range: [index, index]
            };
        }

        token = scanPunctuator();
        if (typeof token !== 'undefined') {
            return token;
        }

        ch = source[index];

        if (ch === '\'' || ch === '"') {
            return scanStringLiteral();
        }

        if (ch === '.' || isDecimalDigit(ch)) {
            return scanNumericLiteral();
        }

        token = scanIdentifier();
        if (typeof token !== 'undefined') {
            return token;
        }

        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
    }

    function lex() {
        var token;

        if (buffer) {
            index = buffer.range[1];
            lineNumber = buffer.lineNumber;
            lineStart = buffer.lineStart;
            token = buffer;
            buffer = null;
            return token;
        }

        buffer = null;
        return advance();
    }

    function lookahead() {
        var pos, line, start;

        if (buffer !== null) {
            return buffer;
        }

        pos = index;
        line = lineNumber;
        start = lineStart;
        buffer = advance();
        index = pos;
        lineNumber = line;
        lineStart = start;

        return buffer;
    }

    // Return true if there is a line terminator before the next token.

    function peekLineTerminator() {
        var pos, line, start, found;

        pos = index;
        line = lineNumber;
        start = lineStart;
        skipComment();
        found = lineNumber !== line;
        index = pos;
        lineNumber = line;
        lineStart = start;

        return found;
    }

    // Throw an exception

    function throwError(token, messageFormat) {
        var error,
            args = Array.prototype.slice.call(arguments, 2),
            msg = messageFormat.replace(
                /%(\d)/g,
                function (whole, index) {
                    return args[index] || '';
                }
            );

        if (typeof token.lineNumber === 'number') {
            error = new Error('Line ' + token.lineNumber + ': ' + msg);
            error.index = token.range[0];
            error.lineNumber = token.lineNumber;
            error.column = token.range[0] - lineStart + 1;
        } else {
            error = new Error('Line ' + lineNumber + ': ' + msg);
            error.index = index;
            error.lineNumber = lineNumber;
            error.column = index - lineStart + 1;
        }

        throw error;
    }

    function throwErrorTolerant() {
        try {
            throwError.apply(null, arguments);
        } catch (e) {
            if (extra.errors) {
                extra.errors.push(e);
            } else {
                throw e;
            }
        }
    }


    // Throw an exception because of the token.

    function throwUnexpected(token) {
        if (token.type === Token.EOF) {
            throwError(token, Messages.UnexpectedEOS);
        }

        if (token.type === Token.NumericLiteral) {
            throwError(token, Messages.UnexpectedNumber);
        }

        if (token.type === Token.StringLiteral) {
            throwError(token, Messages.UnexpectedString);
        }

        if (token.type === Token.Identifier) {
            throwError(token, Messages.UnexpectedIdentifier);
        }

        if (token.type === Token.Keyword) {
            if (isFutureReservedWord(token.value)) {
                throwError(token, Messages.UnexpectedReserved);
            } else if (strict && isStrictModeReservedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictReservedWord);
                return;
            }
            throwError(token, Messages.UnexpectedToken, token.value);
        }

        // BooleanLiteral, NullLiteral, or Punctuator.
        throwError(token, Messages.UnexpectedToken, token.value);
    }

    // Expect the next token to match the specified punctuator.
    // If not, an exception will be thrown.

    function expect(value) {
        var token = lex();
        if (token.type !== Token.Punctuator || token.value !== value) {
            throwUnexpected(token);
        }
    }

    // Expect the next token to match the specified keyword.
    // If not, an exception will be thrown.

    function expectKeyword(keyword) {
        var token = lex();
        if (token.type !== Token.Keyword || token.value !== keyword) {
            throwUnexpected(token);
        }
    }

    // Return true if the next token matches the specified punctuator.

    function match(value) {
        var token = lookahead();
        return token.type === Token.Punctuator && token.value === value;
    }

    // Return true if the next token matches the specified keyword

    function matchKeyword(keyword) {
        var token = lookahead();
        return token.type === Token.Keyword && token.value === keyword;
    }

    // Return true if the next token is an assignment operator

    function matchAssign() {
        var token = lookahead(),
            op = token.value;

        if (token.type !== Token.Punctuator) {
            return false;
        }
        return op === '=' ||
            op === '*=' ||
            op === '/=' ||
            op === '%=' ||
            op === '+=' ||
            op === '-=' ||
            op === '<<=' ||
            op === '>>=' ||
            op === '>>>=' ||
            op === '&=' ||
            op === '^=' ||
            op === '|=';
    }

    function consumeSemicolon() {
        var token, line;

        // Catch the very common case first.
        if (source[index] === ';') {
            lex();
            return;
        }

        line = lineNumber;
        skipComment();
        if (lineNumber !== line) {
            return;
        }

        if (match(';')) {
            lex();
            return;
        }

        token = lookahead();
        if (token.type !== Token.EOF && !match('}')) {
            throwUnexpected(token);
        }
    }

    // Return true if provided expression is LeftHandSideExpression

    function isLeftHandSide(expr) {
        return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
    }

    // 11.1.4 Array Initialiser

    function parseArrayInitialiser() {
        var elements = [];

        expect('[');

        while (!match(']')) {
            if (match(',')) {
                lex();
                elements.push(null);
            } else {
                elements.push(parseAssignmentExpression());

                if (!match(']')) {
                    expect(',');
                }
            }
        }

        expect(']');

        return {
            type: Syntax.ArrayExpression,
            elements: elements
        };
    }

    // 11.1.5 Object Initialiser

    function parsePropertyFunction(param, first) {
        var previousStrict, body;

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (first && strict && isRestrictedWord(param[0].name)) {
            throwErrorTolerant(first, Messages.StrictParamName);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: null,
            params: param,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseObjectPropertyKey() {
        var token = lex();

        // Note: This function is called only from parseObjectProperty(), where
        // EOF and Punctuator tokens are already filtered out.

        if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseObjectProperty() {
        var token, key, id, param;

        token = lookahead();

        if (token.type === Token.Identifier) {

            id = parseObjectPropertyKey();

            // Property Assignment: Getter and Setter.

            if (token.value === 'get' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                expect(')');
                return {
                    type: Syntax.Property,
                    key: key,
                    value: parsePropertyFunction([]),
                    kind: 'get'
                };
            } else if (token.value === 'set' && !match(':')) {
                key = parseObjectPropertyKey();
                expect('(');
                token = lookahead();
                if (token.type !== Token.Identifier) {
                    expect(')');
                    throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction([]),
                        kind: 'set'
                    };
                } else {
                    param = [ parseVariableIdentifier() ];
                    expect(')');
                    return {
                        type: Syntax.Property,
                        key: key,
                        value: parsePropertyFunction(param, token),
                        kind: 'set'
                    };
                }
            } else {
                expect(':');
                return {
                    type: Syntax.Property,
                    key: id,
                    value: parseAssignmentExpression(),
                    kind: 'init'
                };
            }
        } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
            throwUnexpected(token);
        } else {
            key = parseObjectPropertyKey();
            expect(':');
            return {
                type: Syntax.Property,
                key: key,
                value: parseAssignmentExpression(),
                kind: 'init'
            };
        }
    }

    function parseObjectInitialiser() {
        var properties = [], property, name, kind, map = {}, toString = String;

        expect('{');

        while (!match('}')) {
            property = parseObjectProperty();

            if (property.key.type === Syntax.Identifier) {
                name = property.key.name;
            } else {
                name = toString(property.key.value);
            }
            kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;
            if (Object.prototype.hasOwnProperty.call(map, name)) {
                if (map[name] === PropertyKind.Data) {
                    if (strict && kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                    } else if (kind !== PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    }
                } else {
                    if (kind === PropertyKind.Data) {
                        throwErrorTolerant({}, Messages.AccessorDataProperty);
                    } else if (map[name] & kind) {
                        throwErrorTolerant({}, Messages.AccessorGetSet);
                    }
                }
                map[name] |= kind;
            } else {
                map[name] = kind;
            }

            properties.push(property);

            if (!match('}')) {
                expect(',');
            }
        }

        expect('}');

        return {
            type: Syntax.ObjectExpression,
            properties: properties
        };
    }

    // 11.1.6 The Grouping Operator

    function parseGroupExpression() {
        var expr;

        expect('(');

        expr = parseExpression();

        expect(')');

        return expr;
    }


    // 11.1 Primary Expressions

    function parsePrimaryExpression() {
        var token = lookahead(),
            type = token.type;

        if (type === Token.Identifier) {
            return {
                type: Syntax.Identifier,
                name: lex().value
            };
        }

        if (type === Token.StringLiteral || type === Token.NumericLiteral) {
            if (strict && token.octal) {
                throwErrorTolerant(token, Messages.StrictOctalLiteral);
            }
            return createLiteral(lex());
        }

        if (type === Token.Keyword) {
            if (matchKeyword('this')) {
                lex();
                return {
                    type: Syntax.ThisExpression
                };
            }

            if (matchKeyword('function')) {
                return parseFunctionExpression();
            }
        }

        if (type === Token.BooleanLiteral) {
            lex();
            token.value = (token.value === 'true');
            return createLiteral(token);
        }

        if (type === Token.NullLiteral) {
            lex();
            token.value = null;
            return createLiteral(token);
        }

        if (match('[')) {
            return parseArrayInitialiser();
        }

        if (match('{')) {
            return parseObjectInitialiser();
        }

        if (match('(')) {
            return parseGroupExpression();
        }

        if (match('/') || match('/=')) {
            return createLiteral(scanRegExp());
        }

        return throwUnexpected(lex());
    }

    // 11.2 Left-Hand-Side Expressions

    function parseArguments() {
        var args = [];

        expect('(');

        if (!match(')')) {
            while (index < length) {
                args.push(parseAssignmentExpression());
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        return args;
    }

    function parseNonComputedProperty() {
        var token = lex();

        if (!isIdentifierName(token)) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseNonComputedMember() {
        expect('.');

        return parseNonComputedProperty();
    }

    function parseComputedMember() {
        var expr;

        expect('[');

        expr = parseExpression();

        expect(']');

        return expr;
    }

    function parseNewExpression() {
        var expr;

        expectKeyword('new');

        expr = {
            type: Syntax.NewExpression,
            callee: parseLeftHandSideExpression(),
            'arguments': []
        };

        if (match('(')) {
            expr['arguments'] = parseArguments();
        }

        return expr;
    }

    function parseLeftHandSideExpressionAllowCall() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }


    function parseLeftHandSideExpression() {
        var expr;

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
            }
        }

        return expr;
    }

    // 11.3 Postfix Expressions

    function parsePostfixExpression() {
        var expr = parseLeftHandSideExpressionAllowCall(), token;

        token = lookahead();
        if (token.type !== Token.Punctuator) {
            return expr;
        }

        if ((match('++') || match('--')) && !peekLineTerminator()) {
            // 11.3.1, 11.3.2
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPostfix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: lex().value,
                argument: expr,
                prefix: false
            };
        }

        return expr;
    }

    // 11.4 Unary Operators

    function parseUnaryExpression() {
        var token, expr;

        token = lookahead();
        if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
            return parsePostfixExpression();
        }

        if (match('++') || match('--')) {
            token = lex();
            expr = parseUnaryExpression();
            // 11.4.4, 11.4.5
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant({}, Messages.StrictLHSPrefix);
            }

            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            expr = {
                type: Syntax.UpdateExpression,
                operator: token.value,
                argument: expr,
                prefix: true
            };
            return expr;
        }

        if (match('+') || match('-') || match('~') || match('!')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            return expr;
        }

        if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
            expr = {
                type: Syntax.UnaryExpression,
                operator: lex().value,
                argument: parseUnaryExpression(),
                prefix: true
            };
            if (strict && expr.operator === 'delete' && expr.argument.type === Syntax.Identifier) {
                throwErrorTolerant({}, Messages.StrictDelete);
            }
            return expr;
        }

        return parsePostfixExpression();
    }

    // 11.5 Multiplicative Operators

    function parseMultiplicativeExpression() {
        var expr = parseUnaryExpression();

        while (match('*') || match('/') || match('%')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseUnaryExpression()
            };
        }

        return expr;
    }

    // 11.6 Additive Operators

    function parseAdditiveExpression() {
        var expr = parseMultiplicativeExpression();

        while (match('+') || match('-')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseMultiplicativeExpression()
            };
        }

        return expr;
    }

    // 11.7 Bitwise Shift Operators

    function parseShiftExpression() {
        var expr = parseAdditiveExpression();

        while (match('<<') || match('>>') || match('>>>')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseAdditiveExpression()
            };
        }

        return expr;
    }
    // 11.8 Relational Operators

    function parseRelationalExpression() {
        var expr, previousAllowIn;

        previousAllowIn = state.allowIn;
        state.allowIn = true;

        expr = parseShiftExpression();

        while (match('<') || match('>') || match('<=') || match('>=') || (previousAllowIn && matchKeyword('in')) || matchKeyword('instanceof')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseShiftExpression()
            };
        }

        state.allowIn = previousAllowIn;
        return expr;
    }

    // 11.9 Equality Operators

    function parseEqualityExpression() {
        var expr = parseRelationalExpression();

        while (match('==') || match('!=') || match('===') || match('!==')) {
            expr = {
                type: Syntax.BinaryExpression,
                operator: lex().value,
                left: expr,
                right: parseRelationalExpression()
            };
        }

        return expr;
    }

    // 11.10 Binary Bitwise Operators

    function parseBitwiseANDExpression() {
        var expr = parseEqualityExpression();

        while (match('&')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '&',
                left: expr,
                right: parseEqualityExpression()
            };
        }

        return expr;
    }

    function parseBitwiseXORExpression() {
        var expr = parseBitwiseANDExpression();

        while (match('^')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '^',
                left: expr,
                right: parseBitwiseANDExpression()
            };
        }

        return expr;
    }

    function parseBitwiseORExpression() {
        var expr = parseBitwiseXORExpression();

        while (match('|')) {
            lex();
            expr = {
                type: Syntax.BinaryExpression,
                operator: '|',
                left: expr,
                right: parseBitwiseXORExpression()
            };
        }

        return expr;
    }

    // 11.11 Binary Logical Operators

    function parseLogicalANDExpression() {
        var expr = parseBitwiseORExpression();

        while (match('&&')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '&&',
                left: expr,
                right: parseBitwiseORExpression()
            };
        }

        return expr;
    }

    function parseLogicalORExpression() {
        var expr = parseLogicalANDExpression();

        while (match('||')) {
            lex();
            expr = {
                type: Syntax.LogicalExpression,
                operator: '||',
                left: expr,
                right: parseLogicalANDExpression()
            };
        }

        return expr;
    }

    // 11.12 Conditional Operator

    function parseConditionalExpression() {
        var expr, previousAllowIn, consequent;

        expr = parseLogicalORExpression();

        if (match('?')) {
            lex();
            previousAllowIn = state.allowIn;
            state.allowIn = true;
            consequent = parseAssignmentExpression();
            state.allowIn = previousAllowIn;
            expect(':');

            expr = {
                type: Syntax.ConditionalExpression,
                test: expr,
                consequent: consequent,
                alternate: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.13 Assignment Operators

    function parseAssignmentExpression() {
        var token, expr;

        token = lookahead();
        expr = parseConditionalExpression();

        if (matchAssign()) {
            // LeftHandSideExpression
            if (!isLeftHandSide(expr)) {
                throwError({}, Messages.InvalidLHSInAssignment);
            }

            // 11.13.1
            if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                throwErrorTolerant(token, Messages.StrictLHSAssignment);
            }

            expr = {
                type: Syntax.AssignmentExpression,
                operator: lex().value,
                left: expr,
                right: parseAssignmentExpression()
            };
        }

        return expr;
    }

    // 11.14 Comma Operator

    function parseExpression() {
        var expr = parseAssignmentExpression();

        if (match(',')) {
            expr = {
                type: Syntax.SequenceExpression,
                expressions: [ expr ]
            };

            while (index < length) {
                if (!match(',')) {
                    break;
                }
                lex();
                expr.expressions.push(parseAssignmentExpression());
            }

        }
        return expr;
    }

    // 12.1 Block

    function parseStatementList() {
        var list = [],
            statement;

        while (index < length) {
            if (match('}')) {
                break;
            }
            statement = parseSourceElement();
            if (typeof statement === 'undefined') {
                break;
            }
            list.push(statement);
        }

        return list;
    }

    function parseBlock() {
        var block;

        expect('{');

        block = parseStatementList();

        expect('}');

        return {
            type: Syntax.BlockStatement,
            body: block
        };
    }

    // 12.2 Variable Statement

    function parseVariableIdentifier() {
        var token = lex();

        if (token.type !== Token.Identifier) {
            throwUnexpected(token);
        }

        return {
            type: Syntax.Identifier,
            name: token.value
        };
    }

    function parseVariableDeclaration(kind) {
        var id = parseVariableIdentifier(),
            init = null;

        // 12.2.1
        if (strict && isRestrictedWord(id.name)) {
            throwErrorTolerant({}, Messages.StrictVarName);
        }

        if (kind === 'const') {
            expect('=');
            init = parseAssignmentExpression();
        } else if (match('=')) {
            lex();
            init = parseAssignmentExpression();
        }

        return {
            type: Syntax.VariableDeclarator,
            id: id,
            init: init
        };
    }

    function parseVariableDeclarationList(kind) {
        var list = [];

        do {
            list.push(parseVariableDeclaration(kind));
            if (!match(',')) {
                break;
            }
            lex();
        } while (index < length);

        return list;
    }

    function parseVariableStatement() {
        var declarations;

        expectKeyword('var');

        declarations = parseVariableDeclarationList();

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: 'var'
        };
    }

    // kind may be `const` or `let`
    // Both are experimental and not in the specification yet.
    // see http://wiki.ecmascript.org/doku.php?id=harmony:const
    // and http://wiki.ecmascript.org/doku.php?id=harmony:let
    function parseConstLetDeclaration(kind) {
        var declarations;

        expectKeyword(kind);

        declarations = parseVariableDeclarationList(kind);

        consumeSemicolon();

        return {
            type: Syntax.VariableDeclaration,
            declarations: declarations,
            kind: kind
        };
    }

    // 12.3 Empty Statement

    function parseEmptyStatement() {
        expect(';');

        return {
            type: Syntax.EmptyStatement
        };
    }

    // 12.4 Expression Statement

    function parseExpressionStatement() {
        var expr = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 12.5 If statement

    function parseIfStatement() {
        var test, consequent, alternate;

        expectKeyword('if');

        expect('(');

        test = parseExpression();

        expect(')');

        consequent = parseStatement();

        if (matchKeyword('else')) {
            lex();
            alternate = parseStatement();
        } else {
            alternate = null;
        }

        return {
            type: Syntax.IfStatement,
            test: test,
            consequent: consequent,
            alternate: alternate
        };
    }

    // 12.6 Iteration Statements

    function parseDoWhileStatement() {
        var body, test, oldInIteration;

        expectKeyword('do');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        if (match(';')) {
            lex();
        }

        return {
            type: Syntax.DoWhileStatement,
            body: body,
            test: test
        };
    }

    function parseWhileStatement() {
        var test, body, oldInIteration;

        expectKeyword('while');

        expect('(');

        test = parseExpression();

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        return {
            type: Syntax.WhileStatement,
            test: test,
            body: body
        };
    }

    function parseForVariableDeclaration() {
        var token = lex();

        return {
            type: Syntax.VariableDeclaration,
            declarations: parseVariableDeclarationList(),
            kind: token.value
        };
    }

    function parseForStatement() {
        var init, test, update, left, right, body, oldInIteration;

        init = test = update = null;

        expectKeyword('for');

        expect('(');

        if (match(';')) {
            lex();
        } else {
            if (matchKeyword('var') || matchKeyword('let')) {
                state.allowIn = false;
                init = parseForVariableDeclaration();
                state.allowIn = true;

                if (init.declarations.length === 1 && matchKeyword('in')) {
                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            } else {
                state.allowIn = false;
                init = parseExpression();
                state.allowIn = true;

                if (matchKeyword('in')) {
                    // LeftHandSideExpression
                    if (!isLeftHandSide(init)) {
                        throwError({}, Messages.InvalidLHSInForIn);
                    }

                    lex();
                    left = init;
                    right = parseExpression();
                    init = null;
                }
            }

            if (typeof left === 'undefined') {
                expect(';');
            }
        }

        if (typeof left === 'undefined') {

            if (!match(';')) {
                test = parseExpression();
            }
            expect(';');

            if (!match(')')) {
                update = parseExpression();
            }
        }

        expect(')');

        oldInIteration = state.inIteration;
        state.inIteration = true;

        body = parseStatement();

        state.inIteration = oldInIteration;

        if (typeof left === 'undefined') {
            return {
                type: Syntax.ForStatement,
                init: init,
                test: test,
                update: update,
                body: body
            };
        }

        return {
            type: Syntax.ForInStatement,
            left: left,
            right: right,
            body: body,
            each: false
        };
    }

    // 12.7 The continue statement

    function parseContinueStatement() {
        var token, label = null;

        expectKeyword('continue');

        // Optimize the most common form: 'continue;'.
        if (source[index] === ';') {
            lex();

            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!state.inIteration) {
                throwError({}, Messages.IllegalContinue);
            }

            return {
                type: Syntax.ContinueStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !state.inIteration) {
            throwError({}, Messages.IllegalContinue);
        }

        return {
            type: Syntax.ContinueStatement,
            label: label
        };
    }

    // 12.8 The break statement

    function parseBreakStatement() {
        var token, label = null;

        expectKeyword('break');

        // Optimize the most common form: 'break;'.
        if (source[index] === ';') {
            lex();

            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        if (peekLineTerminator()) {
            if (!(state.inIteration || state.inSwitch)) {
                throwError({}, Messages.IllegalBreak);
            }

            return {
                type: Syntax.BreakStatement,
                label: null
            };
        }

        token = lookahead();
        if (token.type === Token.Identifier) {
            label = parseVariableIdentifier();

            if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                throwError({}, Messages.UnknownLabel, label.name);
            }
        }

        consumeSemicolon();

        if (label === null && !(state.inIteration || state.inSwitch)) {
            throwError({}, Messages.IllegalBreak);
        }

        return {
            type: Syntax.BreakStatement,
            label: label
        };
    }

    // 12.9 The return statement

    function parseReturnStatement() {
        var token, argument = null;

        expectKeyword('return');

        if (!state.inFunctionBody) {
            throwErrorTolerant({}, Messages.IllegalReturn);
        }

        // 'return' followed by a space and an identifier is very common.
        if (source[index] === ' ') {
            if (isIdentifierStart(source[index + 1])) {
                argument = parseExpression();
                consumeSemicolon();
                return {
                    type: Syntax.ReturnStatement,
                    argument: argument
                };
            }
        }

        if (peekLineTerminator()) {
            return {
                type: Syntax.ReturnStatement,
                argument: null
            };
        }

        if (!match(';')) {
            token = lookahead();
            if (!match('}') && token.type !== Token.EOF) {
                argument = parseExpression();
            }
        }

        consumeSemicolon();

        return {
            type: Syntax.ReturnStatement,
            argument: argument
        };
    }

    // 12.10 The with statement

    function parseWithStatement() {
        var object, body;

        if (strict) {
            throwErrorTolerant({}, Messages.StrictModeWith);
        }

        expectKeyword('with');

        expect('(');

        object = parseExpression();

        expect(')');

        body = parseStatement();

        return {
            type: Syntax.WithStatement,
            object: object,
            body: body
        };
    }

    // 12.10 The swith statement

    function parseSwitchCase() {
        var test,
            consequent = [],
            statement;

        if (matchKeyword('default')) {
            lex();
            test = null;
        } else {
            expectKeyword('case');
            test = parseExpression();
        }
        expect(':');

        while (index < length) {
            if (match('}') || matchKeyword('default') || matchKeyword('case')) {
                break;
            }
            statement = parseStatement();
            if (typeof statement === 'undefined') {
                break;
            }
            consequent.push(statement);
        }

        return {
            type: Syntax.SwitchCase,
            test: test,
            consequent: consequent
        };
    }

    function parseSwitchStatement() {
        var discriminant, cases, clause, oldInSwitch, defaultFound;

        expectKeyword('switch');

        expect('(');

        discriminant = parseExpression();

        expect(')');

        expect('{');

        if (match('}')) {
            lex();
            return {
                type: Syntax.SwitchStatement,
                discriminant: discriminant
            };
        }

        cases = [];

        oldInSwitch = state.inSwitch;
        state.inSwitch = true;
        defaultFound = false;

        while (index < length) {
            if (match('}')) {
                break;
            }
            clause = parseSwitchCase();
            if (clause.test === null) {
                if (defaultFound) {
                    throwError({}, Messages.MultipleDefaultsInSwitch);
                }
                defaultFound = true;
            }
            cases.push(clause);
        }

        state.inSwitch = oldInSwitch;

        expect('}');

        return {
            type: Syntax.SwitchStatement,
            discriminant: discriminant,
            cases: cases
        };
    }

    // 12.13 The throw statement

    function parseThrowStatement() {
        var argument;

        expectKeyword('throw');

        if (peekLineTerminator()) {
            throwError({}, Messages.NewlineAfterThrow);
        }

        argument = parseExpression();

        consumeSemicolon();

        return {
            type: Syntax.ThrowStatement,
            argument: argument
        };
    }

    // 12.14 The try statement

    function parseCatchClause() {
        var param;

        expectKeyword('catch');

        expect('(');
        if (match(')')) {
            throwUnexpected(lookahead());
        }

        param = parseVariableIdentifier();
        // 12.14.1
        if (strict && isRestrictedWord(param.name)) {
            throwErrorTolerant({}, Messages.StrictCatchVariable);
        }

        expect(')');

        return {
            type: Syntax.CatchClause,
            param: param,
            body: parseBlock()
        };
    }

    function parseTryStatement() {
        var block, handlers = [], finalizer = null;

        expectKeyword('try');

        block = parseBlock();

        if (matchKeyword('catch')) {
            handlers.push(parseCatchClause());
        }

        if (matchKeyword('finally')) {
            lex();
            finalizer = parseBlock();
        }

        if (handlers.length === 0 && !finalizer) {
            throwError({}, Messages.NoCatchOrFinally);
        }

        return {
            type: Syntax.TryStatement,
            block: block,
            guardedHandlers: [],
            handlers: handlers,
            finalizer: finalizer
        };
    }

    // 12.15 The debugger statement

    function parseDebuggerStatement() {
        expectKeyword('debugger');

        consumeSemicolon();

        return {
            type: Syntax.DebuggerStatement
        };
    }

    // 12 Statements

    function parseStatement() {
        var token = lookahead(),
            expr,
            labeledBody;

        if (token.type === Token.EOF) {
            throwUnexpected(token);
        }

        if (token.type === Token.Punctuator) {
            switch (token.value) {
            case ';':
                return parseEmptyStatement();
            case '{':
                return parseBlock();
            case '(':
                return parseExpressionStatement();
            default:
                break;
            }
        }

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'break':
                return parseBreakStatement();
            case 'continue':
                return parseContinueStatement();
            case 'debugger':
                return parseDebuggerStatement();
            case 'do':
                return parseDoWhileStatement();
            case 'for':
                return parseForStatement();
            case 'function':
                return parseFunctionDeclaration();
            case 'if':
                return parseIfStatement();
            case 'return':
                return parseReturnStatement();
            case 'switch':
                return parseSwitchStatement();
            case 'throw':
                return parseThrowStatement();
            case 'try':
                return parseTryStatement();
            case 'var':
                return parseVariableStatement();
            case 'while':
                return parseWhileStatement();
            case 'with':
                return parseWithStatement();
            default:
                break;
            }
        }

        expr = parseExpression();

        // 12.12 Labelled Statements
        if ((expr.type === Syntax.Identifier) && match(':')) {
            lex();

            if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                throwError({}, Messages.Redeclaration, 'Label', expr.name);
            }

            state.labelSet[expr.name] = true;
            labeledBody = parseStatement();
            delete state.labelSet[expr.name];

            return {
                type: Syntax.LabeledStatement,
                label: expr,
                body: labeledBody
            };
        }

        consumeSemicolon();

        return {
            type: Syntax.ExpressionStatement,
            expression: expr
        };
    }

    // 13 Function Definition

    function parseFunctionSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted,
            oldLabelSet, oldInIteration, oldInSwitch, oldInFunctionBody;

        expect('{');

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        oldLabelSet = state.labelSet;
        oldInIteration = state.inIteration;
        oldInSwitch = state.inSwitch;
        oldInFunctionBody = state.inFunctionBody;

        state.labelSet = {};
        state.inIteration = false;
        state.inSwitch = false;
        state.inFunctionBody = true;

        while (index < length) {
            if (match('}')) {
                break;
            }
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }

        expect('}');

        state.labelSet = oldLabelSet;
        state.inIteration = oldInIteration;
        state.inSwitch = oldInSwitch;
        state.inFunctionBody = oldInFunctionBody;

        return {
            type: Syntax.BlockStatement,
            body: sourceElements
        };
    }

    function parseFunctionDeclaration() {
        var id, param, params = [], body, token, stricted, firstRestricted, message, previousStrict, paramSet;

        expectKeyword('function');
        token = lookahead();
        id = parseVariableIdentifier();
        if (strict) {
            if (isRestrictedWord(token.value)) {
                throwErrorTolerant(token, Messages.StrictFunctionName);
            }
        } else {
            if (isRestrictedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictFunctionName;
            } else if (isStrictModeReservedWord(token.value)) {
                firstRestricted = token;
                message = Messages.StrictReservedWord;
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionDeclaration,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    function parseFunctionExpression() {
        var token, id = null, stricted, firstRestricted, message, param, params = [], body, previousStrict, paramSet;

        expectKeyword('function');

        if (!match('(')) {
            token = lookahead();
            id = parseVariableIdentifier();
            if (strict) {
                if (isRestrictedWord(token.value)) {
                    throwErrorTolerant(token, Messages.StrictFunctionName);
                }
            } else {
                if (isRestrictedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictFunctionName;
                } else if (isStrictModeReservedWord(token.value)) {
                    firstRestricted = token;
                    message = Messages.StrictReservedWord;
                }
            }
        }

        expect('(');

        if (!match(')')) {
            paramSet = {};
            while (index < length) {
                token = lookahead();
                param = parseVariableIdentifier();
                if (strict) {
                    if (isRestrictedWord(token.value)) {
                        stricted = token;
                        message = Messages.StrictParamName;
                    }
                    if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        stricted = token;
                        message = Messages.StrictParamDupe;
                    }
                } else if (!firstRestricted) {
                    if (isRestrictedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamName;
                    } else if (isStrictModeReservedWord(token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictReservedWord;
                    } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                        firstRestricted = token;
                        message = Messages.StrictParamDupe;
                    }
                }
                params.push(param);
                paramSet[param.name] = true;
                if (match(')')) {
                    break;
                }
                expect(',');
            }
        }

        expect(')');

        previousStrict = strict;
        body = parseFunctionSourceElements();
        if (strict && firstRestricted) {
            throwError(firstRestricted, message);
        }
        if (strict && stricted) {
            throwErrorTolerant(stricted, message);
        }
        strict = previousStrict;

        return {
            type: Syntax.FunctionExpression,
            id: id,
            params: params,
            defaults: [],
            body: body,
            rest: null,
            generator: false,
            expression: false
        };
    }

    // 14 Program

    function parseSourceElement() {
        var token = lookahead();

        if (token.type === Token.Keyword) {
            switch (token.value) {
            case 'const':
            case 'let':
                return parseConstLetDeclaration(token.value);
            case 'function':
                return parseFunctionDeclaration();
            default:
                return parseStatement();
            }
        }

        if (token.type !== Token.EOF) {
            return parseStatement();
        }
    }

    function parseSourceElements() {
        var sourceElement, sourceElements = [], token, directive, firstRestricted;

        while (index < length) {
            token = lookahead();
            if (token.type !== Token.StringLiteral) {
                break;
            }

            sourceElement = parseSourceElement();
            sourceElements.push(sourceElement);
            if (sourceElement.expression.type !== Syntax.Literal) {
                // this is not directive
                break;
            }
            directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
            if (directive === 'use strict') {
                strict = true;
                if (firstRestricted) {
                    throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                }
            } else {
                if (!firstRestricted && token.octal) {
                    firstRestricted = token;
                }
            }
        }

        while (index < length) {
            sourceElement = parseSourceElement();
            if (typeof sourceElement === 'undefined') {
                break;
            }
            sourceElements.push(sourceElement);
        }
        return sourceElements;
    }

    function parseProgram() {
        var program;
        strict = false;
        program = {
            type: Syntax.Program,
            body: parseSourceElements()
        };
        return program;
    }

    // The following functions are needed only when the option to preserve
    // the comments is active.

    function addComment(type, value, start, end, loc) {
        assert(typeof start === 'number', 'Comment must have valid position');

        // Because the way the actual token is scanned, often the comments
        // (if any) are skipped twice during the lexical analysis.
        // Thus, we need to skip adding a comment if the comment array already
        // handled it.
        if (extra.comments.length > 0) {
            if (extra.comments[extra.comments.length - 1].range[1] > start) {
                return;
            }
        }

        extra.comments.push({
            type: type,
            value: value,
            range: [start, end],
            loc: loc
        });
    }

    function scanComment() {
        var comment, ch, loc, start, blockComment, lineComment;

        comment = '';
        blockComment = false;
        lineComment = false;

        while (index < length) {
            ch = source[index];

            if (lineComment) {
                ch = source[index++];
                if (isLineTerminator(ch)) {
                    loc.end = {
                        line: lineNumber,
                        column: index - lineStart - 1
                    };
                    lineComment = false;
                    addComment('Line', comment, start, index - 1, loc);
                    if (ch === '\r' && source[index] === '\n') {
                        ++index;
                    }
                    ++lineNumber;
                    lineStart = index;
                    comment = '';
                } else if (index >= length) {
                    lineComment = false;
                    comment += ch;
                    loc.end = {
                        line: lineNumber,
                        column: length - lineStart
                    };
                    addComment('Line', comment, start, length, loc);
                } else {
                    comment += ch;
                }
            } else if (blockComment) {
                if (isLineTerminator(ch)) {
                    if (ch === '\r' && source[index + 1] === '\n') {
                        ++index;
                        comment += '\r\n';
                    } else {
                        comment += ch;
                    }
                    ++lineNumber;
                    ++index;
                    lineStart = index;
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    ch = source[index++];
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                    comment += ch;
                    if (ch === '*') {
                        ch = source[index];
                        if (ch === '/') {
                            comment = comment.substr(0, comment.length - 1);
                            blockComment = false;
                            ++index;
                            loc.end = {
                                line: lineNumber,
                                column: index - lineStart
                            };
                            addComment('Block', comment, start, index, loc);
                            comment = '';
                        }
                    }
                }
            } else if (ch === '/') {
                ch = source[index + 1];
                if (ch === '/') {
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart
                        }
                    };
                    start = index;
                    index += 2;
                    lineComment = true;
                    if (index >= length) {
                        loc.end = {
                            line: lineNumber,
                            column: index - lineStart
                        };
                        lineComment = false;
                        addComment('Line', comment, start, index, loc);
                    }
                } else if (ch === '*') {
                    start = index;
                    index += 2;
                    blockComment = true;
                    loc = {
                        start: {
                            line: lineNumber,
                            column: index - lineStart - 2
                        }
                    };
                    if (index >= length) {
                        throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
                    }
                } else {
                    break;
                }
            } else if (isWhiteSpace(ch)) {
                ++index;
            } else if (isLineTerminator(ch)) {
                ++index;
                if (ch ===  '\r' && source[index] === '\n') {
                    ++index;
                }
                ++lineNumber;
                lineStart = index;
            } else {
                break;
            }
        }
    }

    function filterCommentLocation() {
        var i, entry, comment, comments = [];

        for (i = 0; i < extra.comments.length; ++i) {
            entry = extra.comments[i];
            comment = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                comment.range = entry.range;
            }
            if (extra.loc) {
                comment.loc = entry.loc;
            }
            comments.push(comment);
        }

        extra.comments = comments;
    }

    function collectToken() {
        var start, loc, token, range, value;

        skipComment();
        start = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        token = extra.advance();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        if (token.type !== Token.EOF) {
            range = [token.range[0], token.range[1]];
            value = sliceSource(token.range[0], token.range[1]);
            extra.tokens.push({
                type: TokenName[token.type],
                value: value,
                range: range,
                loc: loc
            });
        }

        return token;
    }

    function collectRegex() {
        var pos, loc, regex, token;

        skipComment();

        pos = index;
        loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        regex = extra.scanRegExp();
        loc.end = {
            line: lineNumber,
            column: index - lineStart
        };

        // Pop the previous token, which is likely '/' or '/='
        if (extra.tokens.length > 0) {
            token = extra.tokens[extra.tokens.length - 1];
            if (token.range[0] === pos && token.type === 'Punctuator') {
                if (token.value === '/' || token.value === '/=') {
                    extra.tokens.pop();
                }
            }
        }

        extra.tokens.push({
            type: 'RegularExpression',
            value: regex.literal,
            range: [pos, index],
            loc: loc
        });

        return regex;
    }

    function filterTokenLocation() {
        var i, entry, token, tokens = [];

        for (i = 0; i < extra.tokens.length; ++i) {
            entry = extra.tokens[i];
            token = {
                type: entry.type,
                value: entry.value
            };
            if (extra.range) {
                token.range = entry.range;
            }
            if (extra.loc) {
                token.loc = entry.loc;
            }
            tokens.push(token);
        }

        extra.tokens = tokens;
    }

    function createLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value
        };
    }

    function createRawLiteral(token) {
        return {
            type: Syntax.Literal,
            value: token.value,
            raw: sliceSource(token.range[0], token.range[1])
        };
    }

    function createLocationMarker() {
        var marker = {};

        marker.range = [index, index];
        marker.loc = {
            start: {
                line: lineNumber,
                column: index - lineStart
            },
            end: {
                line: lineNumber,
                column: index - lineStart
            }
        };

        marker.end = function () {
            this.range[1] = index;
            this.loc.end.line = lineNumber;
            this.loc.end.column = index - lineStart;
        };

        marker.applyGroup = function (node) {
            if (extra.range) {
                node.groupRange = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.groupLoc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        marker.apply = function (node) {
            if (extra.range) {
                node.range = [this.range[0], this.range[1]];
            }
            if (extra.loc) {
                node.loc = {
                    start: {
                        line: this.loc.start.line,
                        column: this.loc.start.column
                    },
                    end: {
                        line: this.loc.end.line,
                        column: this.loc.end.column
                    }
                };
            }
        };

        return marker;
    }

    function trackGroupExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();
        expect('(');

        expr = parseExpression();

        expect(')');

        marker.end();
        marker.applyGroup(expr);

        return expr;
    }

    function trackLeftHandSideExpression() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[')) {
            if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function trackLeftHandSideExpressionAllowCall() {
        var marker, expr;

        skipComment();
        marker = createLocationMarker();

        expr = matchKeyword('new') ? parseNewExpression() : parsePrimaryExpression();

        while (match('.') || match('[') || match('(')) {
            if (match('(')) {
                expr = {
                    type: Syntax.CallExpression,
                    callee: expr,
                    'arguments': parseArguments()
                };
                marker.end();
                marker.apply(expr);
            } else if (match('[')) {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: true,
                    object: expr,
                    property: parseComputedMember()
                };
                marker.end();
                marker.apply(expr);
            } else {
                expr = {
                    type: Syntax.MemberExpression,
                    computed: false,
                    object: expr,
                    property: parseNonComputedMember()
                };
                marker.end();
                marker.apply(expr);
            }
        }

        return expr;
    }

    function filterGroup(node) {
        var n, i, entry;

        n = (Object.prototype.toString.apply(node) === '[object Array]') ? [] : {};
        for (i in node) {
            if (node.hasOwnProperty(i) && i !== 'groupRange' && i !== 'groupLoc') {
                entry = node[i];
                if (entry === null || typeof entry !== 'object' || entry instanceof RegExp) {
                    n[i] = entry;
                } else {
                    n[i] = filterGroup(entry);
                }
            }
        }
        return n;
    }

    function wrapTrackingFunction(range, loc) {

        return function (parseFunction) {

            function isBinary(node) {
                return node.type === Syntax.LogicalExpression ||
                    node.type === Syntax.BinaryExpression;
            }

            function visit(node) {
                var start, end;

                if (isBinary(node.left)) {
                    visit(node.left);
                }
                if (isBinary(node.right)) {
                    visit(node.right);
                }

                if (range) {
                    if (node.left.groupRange || node.right.groupRange) {
                        start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                        end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                        node.range = [start, end];
                    } else if (typeof node.range === 'undefined') {
                        start = node.left.range[0];
                        end = node.right.range[1];
                        node.range = [start, end];
                    }
                }
                if (loc) {
                    if (node.left.groupLoc || node.right.groupLoc) {
                        start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                        end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                        node.loc = {
                            start: start,
                            end: end
                        };
                    } else if (typeof node.loc === 'undefined') {
                        node.loc = {
                            start: node.left.loc.start,
                            end: node.right.loc.end
                        };
                    }
                }
            }

            return function () {
                var marker, node;

                skipComment();

                marker = createLocationMarker();
                node = parseFunction.apply(null, arguments);
                marker.end();

                if (range && typeof node.range === 'undefined') {
                    marker.apply(node);
                }

                if (loc && typeof node.loc === 'undefined') {
                    marker.apply(node);
                }

                if (isBinary(node)) {
                    visit(node);
                }

                return node;
            };
        };
    }

    function patch() {

        var wrapTracking;

        if (extra.comments) {
            extra.skipComment = skipComment;
            skipComment = scanComment;
        }

        if (extra.raw) {
            extra.createLiteral = createLiteral;
            createLiteral = createRawLiteral;
        }

        if (extra.range || extra.loc) {

            extra.parseGroupExpression = parseGroupExpression;
            extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
            extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
            parseGroupExpression = trackGroupExpression;
            parseLeftHandSideExpression = trackLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;

            wrapTracking = wrapTrackingFunction(extra.range, extra.loc);

            extra.parseAdditiveExpression = parseAdditiveExpression;
            extra.parseAssignmentExpression = parseAssignmentExpression;
            extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
            extra.parseBitwiseORExpression = parseBitwiseORExpression;
            extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
            extra.parseBlock = parseBlock;
            extra.parseFunctionSourceElements = parseFunctionSourceElements;
            extra.parseCatchClause = parseCatchClause;
            extra.parseComputedMember = parseComputedMember;
            extra.parseConditionalExpression = parseConditionalExpression;
            extra.parseConstLetDeclaration = parseConstLetDeclaration;
            extra.parseEqualityExpression = parseEqualityExpression;
            extra.parseExpression = parseExpression;
            extra.parseForVariableDeclaration = parseForVariableDeclaration;
            extra.parseFunctionDeclaration = parseFunctionDeclaration;
            extra.parseFunctionExpression = parseFunctionExpression;
            extra.parseLogicalANDExpression = parseLogicalANDExpression;
            extra.parseLogicalORExpression = parseLogicalORExpression;
            extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
            extra.parseNewExpression = parseNewExpression;
            extra.parseNonComputedProperty = parseNonComputedProperty;
            extra.parseObjectProperty = parseObjectProperty;
            extra.parseObjectPropertyKey = parseObjectPropertyKey;
            extra.parsePostfixExpression = parsePostfixExpression;
            extra.parsePrimaryExpression = parsePrimaryExpression;
            extra.parseProgram = parseProgram;
            extra.parsePropertyFunction = parsePropertyFunction;
            extra.parseRelationalExpression = parseRelationalExpression;
            extra.parseStatement = parseStatement;
            extra.parseShiftExpression = parseShiftExpression;
            extra.parseSwitchCase = parseSwitchCase;
            extra.parseUnaryExpression = parseUnaryExpression;
            extra.parseVariableDeclaration = parseVariableDeclaration;
            extra.parseVariableIdentifier = parseVariableIdentifier;

            parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
            parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
            parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
            parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
            parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
            parseBlock = wrapTracking(extra.parseBlock);
            parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
            parseCatchClause = wrapTracking(extra.parseCatchClause);
            parseComputedMember = wrapTracking(extra.parseComputedMember);
            parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
            parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
            parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
            parseExpression = wrapTracking(extra.parseExpression);
            parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
            parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
            parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
            parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
            parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
            parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
            parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
            parseNewExpression = wrapTracking(extra.parseNewExpression);
            parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
            parseObjectProperty = wrapTracking(extra.parseObjectProperty);
            parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
            parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
            parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
            parseProgram = wrapTracking(extra.parseProgram);
            parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
            parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
            parseStatement = wrapTracking(extra.parseStatement);
            parseShiftExpression = wrapTracking(extra.parseShiftExpression);
            parseSwitchCase = wrapTracking(extra.parseSwitchCase);
            parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
            parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
            parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
        }

        if (typeof extra.tokens !== 'undefined') {
            extra.advance = advance;
            extra.scanRegExp = scanRegExp;

            advance = collectToken;
            scanRegExp = collectRegex;
        }
    }

    function unpatch() {
        if (typeof extra.skipComment === 'function') {
            skipComment = extra.skipComment;
        }

        if (extra.raw) {
            createLiteral = extra.createLiteral;
        }

        if (extra.range || extra.loc) {
            parseAdditiveExpression = extra.parseAdditiveExpression;
            parseAssignmentExpression = extra.parseAssignmentExpression;
            parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
            parseBitwiseORExpression = extra.parseBitwiseORExpression;
            parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
            parseBlock = extra.parseBlock;
            parseFunctionSourceElements = extra.parseFunctionSourceElements;
            parseCatchClause = extra.parseCatchClause;
            parseComputedMember = extra.parseComputedMember;
            parseConditionalExpression = extra.parseConditionalExpression;
            parseConstLetDeclaration = extra.parseConstLetDeclaration;
            parseEqualityExpression = extra.parseEqualityExpression;
            parseExpression = extra.parseExpression;
            parseForVariableDeclaration = extra.parseForVariableDeclaration;
            parseFunctionDeclaration = extra.parseFunctionDeclaration;
            parseFunctionExpression = extra.parseFunctionExpression;
            parseGroupExpression = extra.parseGroupExpression;
            parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
            parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
            parseLogicalANDExpression = extra.parseLogicalANDExpression;
            parseLogicalORExpression = extra.parseLogicalORExpression;
            parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
            parseNewExpression = extra.parseNewExpression;
            parseNonComputedProperty = extra.parseNonComputedProperty;
            parseObjectProperty = extra.parseObjectProperty;
            parseObjectPropertyKey = extra.parseObjectPropertyKey;
            parsePrimaryExpression = extra.parsePrimaryExpression;
            parsePostfixExpression = extra.parsePostfixExpression;
            parseProgram = extra.parseProgram;
            parsePropertyFunction = extra.parsePropertyFunction;
            parseRelationalExpression = extra.parseRelationalExpression;
            parseStatement = extra.parseStatement;
            parseShiftExpression = extra.parseShiftExpression;
            parseSwitchCase = extra.parseSwitchCase;
            parseUnaryExpression = extra.parseUnaryExpression;
            parseVariableDeclaration = extra.parseVariableDeclaration;
            parseVariableIdentifier = extra.parseVariableIdentifier;
        }

        if (typeof extra.scanRegExp === 'function') {
            advance = extra.advance;
            scanRegExp = extra.scanRegExp;
        }
    }

    function stringToArray(str) {
        var length = str.length,
            result = [],
            i;
        for (i = 0; i < length; ++i) {
            result[i] = str.charAt(i);
        }
        return result;
    }

    function parse(code, options) {
        var program, toString;

        toString = String;
        if (typeof code !== 'string' && !(code instanceof String)) {
            code = toString(code);
        }

        source = code;
        index = 0;
        lineNumber = (source.length > 0) ? 1 : 0;
        lineStart = 0;
        length = source.length;
        buffer = null;
        state = {
            allowIn: true,
            labelSet: {},
            inFunctionBody: false,
            inIteration: false,
            inSwitch: false
        };

        extra = {};
        if (typeof options !== 'undefined') {
            extra.range = (typeof options.range === 'boolean') && options.range;
            extra.loc = (typeof options.loc === 'boolean') && options.loc;
            extra.raw = (typeof options.raw === 'boolean') && options.raw;
            if (typeof options.tokens === 'boolean' && options.tokens) {
                extra.tokens = [];
            }
            if (typeof options.comment === 'boolean' && options.comment) {
                extra.comments = [];
            }
            if (typeof options.tolerant === 'boolean' && options.tolerant) {
                extra.errors = [];
            }
        }

        if (length > 0) {
            if (typeof source[0] === 'undefined') {
                // Try first to convert to a string. This is good as fast path
                // for old IE which understands string indexing for string
                // literals only and not for string object.
                if (code instanceof String) {
                    source = code.valueOf();
                }

                // Force accessing the characters via an array.
                if (typeof source[0] === 'undefined') {
                    source = stringToArray(code);
                }
            }
        }

        patch();
        try {
            program = parseProgram();
            if (typeof extra.comments !== 'undefined') {
                filterCommentLocation();
                program.comments = extra.comments;
            }
            if (typeof extra.tokens !== 'undefined') {
                filterTokenLocation();
                program.tokens = extra.tokens;
            }
            if (typeof extra.errors !== 'undefined') {
                program.errors = extra.errors;
            }
            if (extra.range || extra.loc) {
                program.body = filterGroup(program.body);
            }
        } catch (e) {
            throw e;
        } finally {
            unpatch();
            extra = {};
        }

        return program;
    }

    // Sync with package.json.
    exports.version = '1.0.3';

    exports.parse = parse;

    // Deep copy.
    exports.Syntax = (function () {
        var name, types = {};

        if (typeof Object.create === 'function') {
            types = Object.create(null);
        }

        for (name in Syntax) {
            if (Syntax.hasOwnProperty(name)) {
                types[name] = Syntax[name];
            }
        }

        if (typeof Object.freeze === 'function') {
            Object.freeze(types);
        }

        return types;
    }());

}));
/* vim: set sw=4 ts=4 et tw=80 : */

})()
},{}],14:[function(require,module,exports){
//     treeify.js
//     Luke Plaster <notatestuser@gmail.com>
//     https://github.com/notatestuser/treeify.js

// do the universal module definition dance
(function (root, factory) {

  if (typeof exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory);
  } else {
    root.treeify = factory();
  }

}(this, function() {

  function makePrefix(key, last) {
    var str = (last ? '└' : '├');
    if (key) {
      str += '─ ';
    } else {
      str += '──┐';
    }
    return str;
  }

  function filterKeys(obj, hideFunctions) {
    var keys = [];
    for (var branch in obj) {
      // always exclude anything in the object's prototype
      if (!obj.hasOwnProperty(branch)) {
        continue;
      }
      // ... and hide any keys mapped to functions if we've been told to
      if (hideFunctions && ((typeof obj[branch])==="function")) {
        continue;
      }
      keys.push(branch);
    }
    return keys;
  }

  function growBranch(key, root, last, lastStates, showValues, hideFunctions, callback) {
    var line = '', index = 0, lastKey, circular, lastStatesCopy = lastStates.slice(0);

    if (lastStatesCopy.push([ root, last ]) && lastStates.length > 0) {
      // based on the "was last element" states of whatever we're nested within,
      // we need to append either blankness or a branch to our line
      lastStates.forEach(function(lastState, idx) {
        if (idx > 0) {
          line += (lastState[1] ? ' ' : '│') + '  ';
        }
        if ( ! circular && lastState[0] === root) {
          circular = true;
        }
      });

      // the prefix varies based on whether the key contains something to show and
      // whether we're dealing with the last element in this collection
      line += makePrefix(key, last) + key;

      // append values and the circular reference indicator
      showValues && typeof root !== 'object' && (line += ': ' + root);
      circular && (line += ' (circular ref.)');

      callback(line);
    }

    // can we descend into the next item?
    if ( ! circular && typeof root === 'object') {
      var keys = filterKeys(root, hideFunctions);
      keys.forEach(function(branch){
        // the last key is always printed with a different prefix, so we'll need to know if we have it
        lastKey = ++index === keys.length;

        // hold your breath for recursive action
        growBranch(branch, root[branch], lastKey, lastStatesCopy, showValues, hideFunctions, callback);
      });
    }
  };

  // --------------------

  var Treeify = {};

  // Treeify.asLines
  // --------------------
  // Outputs the tree line-by-line, calling the lineCallback when each one is available.

  Treeify.asLines = function(obj, showValues, hideFunctions, lineCallback) {
    /* hideFunctions and lineCallback are curried, which means we don't break apps using the older form */
    var hideFunctionsArg = typeof hideFunctions !== 'function' ? hideFunctions : false;
    growBranch('.', obj, false, [], showValues, hideFunctionsArg, lineCallback || hideFunctions);
  };

  // Treeify.asTree
  // --------------------
  // Outputs the entire tree, returning it as a string with line breaks.

  Treeify.asTree = function(obj, showValues, hideFunctions) {
    var tree = '';
    growBranch('.', obj, false, [], showValues, hideFunctions, function(line) {
      tree += line + '\n';
    });
    return tree;
  };

  // --------------------

  return Treeify;

}));

},{}],16:[function(require,module,exports){

// TryStatement

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===

  Blockly.core.Language.jslang_try_catch = {
    helpUrl: 'http://www.example.com/',
    init: function() {
      this.setColour(0)
      this.appendStatementInput("TRY")
          .setCheck("null")
          .appendTitle("try")
      this.appendDummyInput()
          .appendTitle("catch (")
          .appendTitle(new Blockly.core.FieldTextInput("error"), "CATCH_VAR")
          .appendTitle(")")
      this.appendStatementInput("CATCH")
          .setCheck("null")
      this.appendStatementInput("FINALLY")
          .appendTitle("finally")
      this.setPreviousStatement(true, "null")
      this.setNextStatement(true, "null")
      this.setTooltip('')
    }
  }

  // ===
  // = JS -> Blocks
  // ===

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'TryStatement',
      handlers: patternMatch.var('handlers'),
      finalizer: patternMatch.var('finalizer')
    },
    // XML generator
    function(node,matchedProps) {
      var output = '<block type="jslang_try_catch">'
      if (matchedProps.handlers.length>0) output += '<title name="CATCH_VAR">'+matchedProps.handlers[0].param.name+'</title>'
      output += '</block>'
      return output
    }
  )

  // ===
  // = Blocks -> JS
  // ===

  Blockly.core.JavaScript.jslang_try_catch = function() {
    var statements_try = Blockly.core.JavaScript.statementToCode(this, 'TRY');
    var statements_catch = Blockly.core.JavaScript.statementToCode(this, 'CATCH');
    var statements_finally = Blockly.core.JavaScript.statementToCode(this, 'FINALLY');
    var text_catch_var = this.getTitleValue('CATCH_VAR');
    // Assemble JavaScript into code variable.
    var code = "try {\n"+statements_try+"\n"
              +"} catch ("+text_catch_var+") {\n"+statements_catch
              +"\n} finally {\n"+statements_finally+"\n}"
    return code;
  };

}

},{}],15:[function(require,module,exports){
(function(){/*
 * Copyright 2008 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview
 * Utility functions and classes for Soy.
 *
 * <p>
 * The top portion of this file contains utilities for Soy users:<ul>
 *   <li> soy.StringBuilder: Compatible with the 'stringbuilder' code style.
 *   <li> soy.renderElement: Render template and set as innerHTML of an element.
 *   <li> soy.renderAsFragment: Render template and return as HTML fragment.
 * </ul>
 *
 * <p>
 * The bottom portion of this file contains utilities that should only be called
 * by Soy-generated JS code. Please do not use these functions directly from
 * your hand-writen code. Their names all start with '$$'.
 *
 * @author Garrett Boyer
 * @author Mike Samuel
 * @author Kai Huang
 * @author Aharon Lanin
 */


// COPIED FROM nogoog_shim.js

// Create closure namespaces.
var goog = goog || {};


goog.DEBUG = false;


goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};


// Just enough browser detection for this file.
if (!goog.userAgent) {
  goog.userAgent = (function() {
    var userAgent = "";
    if ("undefined" !== typeof navigator && navigator
        && "string" == typeof navigator.userAgent) {
      userAgent = navigator.userAgent;
    }
    var isOpera = userAgent.indexOf('Opera') == 0;
    return {
      jscript: {
        /**
         * @type {boolean}
         */
        HAS_JSCRIPT: 'ScriptEngine' in this
      },
      /**
       * @type {boolean}
       */
      OPERA: isOpera,
      /**
       * @type {boolean}
       */
      IE: !isOpera && userAgent.indexOf('MSIE') != -1,
      /**
       * @type {boolean}
       */
      WEBKIT: !isOpera && userAgent.indexOf('WebKit') != -1
    };
  })();
}

if (!goog.asserts) {
  goog.asserts = {
    /**
     * @param {*} condition Condition to check.
     */
    assert: function (condition) {
      if (!condition) {
        throw Error('Assertion error');
      }
    },
    /**
     * @param {...*} var_args
     */
    fail: function (var_args) {}
  };
}


// Stub out the document wrapper used by renderAs*.
if (!goog.dom) {
  goog.dom = {};
  /**
   * @param {Document=} d
   * @constructor
   */
  goog.dom.DomHelper = function(d) {
    this.document_ = d || document;
  };
  /**
   * @return {!Document}
   */
  goog.dom.DomHelper.prototype.getDocument = function() {
    return this.document_;
  };
  /**
   * Creates a new element.
   * @param {string} name Tag name.
   * @return {!Element}
   */
  goog.dom.DomHelper.prototype.createElement = function(name) {
    return this.document_.createElement(name);
  };
  /**
   * Creates a new document fragment.
   * @return {!DocumentFragment}
   */
  goog.dom.DomHelper.prototype.createDocumentFragment = function() {
    return this.document_.createDocumentFragment();
  };
}


if (!goog.format) {
  goog.format = {
    insertWordBreaks: function(str, maxCharsBetweenWordBreaks) {
      str = String(str);

      var resultArr = [];
      var resultArrLen = 0;

      // These variables keep track of important state inside str.
      var isInTag = false;  // whether we're inside an HTML tag
      var isMaybeInEntity = false;  // whether we might be inside an HTML entity
      var numCharsWithoutBreak = 0;  // number of chars since last word break
      var flushIndex = 0;  // index of first char not yet flushed to resultArr

      for (var i = 0, n = str.length; i < n; ++i) {
        var charCode = str.charCodeAt(i);

        // If hit maxCharsBetweenWordBreaks, and not space next, then add <wbr>.
        if (numCharsWithoutBreak >= maxCharsBetweenWordBreaks &&
            // space
            charCode != 32) {
          resultArr[resultArrLen++] = str.substring(flushIndex, i);
          flushIndex = i;
          resultArr[resultArrLen++] = goog.format.WORD_BREAK;
          numCharsWithoutBreak = 0;
        }

        if (isInTag) {
          // If inside an HTML tag and we see '>', it's the end of the tag.
          if (charCode == 62) {
            isInTag = false;
          }

        } else if (isMaybeInEntity) {
          switch (charCode) {
            // Inside an entity, a ';' is the end of the entity.
            // The entity that just ended counts as one char, so increment
            // numCharsWithoutBreak.
          case 59:  // ';'
            isMaybeInEntity = false;
            ++numCharsWithoutBreak;
            break;
            // If maybe inside an entity and we see '<', we weren't actually in
            // an entity. But now we're inside and HTML tag.
          case 60:  // '<'
            isMaybeInEntity = false;
            isInTag = true;
            break;
            // If maybe inside an entity and we see ' ', we weren't actually in
            // an entity. Just correct the state and reset the
            // numCharsWithoutBreak since we just saw a space.
          case 32:  // ' '
            isMaybeInEntity = false;
            numCharsWithoutBreak = 0;
            break;
          }

        } else {  // !isInTag && !isInEntity
          switch (charCode) {
            // When not within a tag or an entity and we see '<', we're now
            // inside an HTML tag.
          case 60:  // '<'
            isInTag = true;
            break;
            // When not within a tag or an entity and we see '&', we might be
            // inside an entity.
          case 38:  // '&'
            isMaybeInEntity = true;
            break;
            // When we see a space, reset the numCharsWithoutBreak count.
          case 32:  // ' '
            numCharsWithoutBreak = 0;
            break;
            // When we see a non-space, increment the numCharsWithoutBreak.
          default:
            ++numCharsWithoutBreak;
            break;
          }
        }
      }

      // Flush the remaining chars at the end of the string.
      resultArr[resultArrLen++] = str.substring(flushIndex);

      return resultArr.join('');
    },
    /**
     * String inserted as a word break by insertWordBreaks(). Safari requires
     * <wbr></wbr>, Opera needs the 'shy' entity, though this will give a
     * visible hyphen at breaks. Other browsers just use <wbr>.
     * @type {string}
     * @private
     */
    WORD_BREAK: goog.userAgent.WEBKIT
        ? '<wbr></wbr>' : goog.userAgent.OPERA ? '&shy;' : '<wbr>'
  };
}


if (!goog.i18n) {
  goog.i18n = {
    bidi: {
      /**
       * Check the directionality of a piece of text, return true if the piece
       * of text should be laid out in RTL direction.
       * @param {string} text The piece of text that need to be detected.
       * @param {boolean=} opt_isHtml Whether {@code text} is HTML/HTML-escaped.
       *     Default: false.
       * @return {boolean}
       * @private
       */
      detectRtlDirectionality: function(text, opt_isHtml) {
        text = soyshim.$$bidiStripHtmlIfNecessary_(text, opt_isHtml);
        return soyshim.$$bidiRtlWordRatio_(text)
            > soyshim.$$bidiRtlDetectionThreshold_;
      }
    }
  };
}

/**
 * Directionality enum.
 * @enum {number}
 */
goog.i18n.bidi.Dir = {
  RTL: -1,
  UNKNOWN: 0,
  LTR: 1
};


/**
 * Convert a directionality given in various formats to a goog.i18n.bidi.Dir
 * constant. Useful for interaction with different standards of directionality
 * representation.
 *
 * @param {goog.i18n.bidi.Dir|number|boolean} givenDir Directionality given in
 *     one of the following formats:
 *     1. A goog.i18n.bidi.Dir constant.
 *     2. A number (positive = LRT, negative = RTL, 0 = unknown).
 *     3. A boolean (true = RTL, false = LTR).
 * @return {goog.i18n.bidi.Dir} A goog.i18n.bidi.Dir constant matching the given
 *     directionality.
 */
goog.i18n.bidi.toDir = function(givenDir) {
  if (typeof givenDir == 'number') {
    return givenDir > 0 ? goog.i18n.bidi.Dir.LTR :
        givenDir < 0 ? goog.i18n.bidi.Dir.RTL : goog.i18n.bidi.Dir.UNKNOWN;
  } else {
    return givenDir ? goog.i18n.bidi.Dir.RTL : goog.i18n.bidi.Dir.LTR;
  }
};


/**
 * Utility class for formatting text for display in a potentially
 * opposite-directionality context without garbling. Provides the following
 * functionality:
 *
 * @param {goog.i18n.bidi.Dir|number|boolean} dir The context
 *     directionality as a number
 *     (positive = LRT, negative = RTL, 0 = unknown).
 * @constructor
 */
goog.i18n.BidiFormatter = function(dir) {
  this.dir_ = goog.i18n.bidi.toDir(dir);
};


/**
 * Returns 'dir="ltr"' or 'dir="rtl"', depending on {@code text}'s estimated
 * directionality, if it is not the same as the context directionality.
 * Otherwise, returns the empty string.
 *
 * @param {string} text Text whose directionality is to be estimated.
 * @param {boolean=} opt_isHtml Whether {@code text} is HTML / HTML-escaped.
 *     Default: false.
 * @return {string} 'dir="rtl"' for RTL text in non-RTL context; 'dir="ltr"' for
 *     LTR text in non-LTR context; else, the empty string.
 */
goog.i18n.BidiFormatter.prototype.dirAttr = function (text, opt_isHtml) {
  var dir = soy.$$bidiTextDir(text, opt_isHtml);
  return dir && dir != this.dir_ ? dir < 0 ? 'dir="rtl"' : 'dir="ltr"' : '';
};

/**
 * Returns the trailing horizontal edge, i.e. "right" or "left", depending on
 * the global bidi directionality.
 * @return {string} "left" for RTL context and "right" otherwise.
 */
goog.i18n.BidiFormatter.prototype.endEdge = function () {
  return this.dir_ < 0 ? 'left' : 'right';
};

/**
 * Returns the Unicode BiDi mark matching the context directionality (LRM for
 * LTR context directionality, RLM for RTL context directionality), or the
 * empty string for neutral / unknown context directionality.
 *
 * @return {string} LRM for LTR context directionality and RLM for RTL context
 *     directionality.
 */
goog.i18n.BidiFormatter.prototype.mark = function () {
  return (
      (this.dir_ > 0) ? '\u200E' /*LRM*/ :
      (this.dir_ < 0) ? '\u200F' /*RLM*/ :
      '');
};

/**
 * Returns a Unicode BiDi mark matching the context directionality (LRM or RLM)
 * if the directionality or the exit directionality of {@code text} are opposite
 * to the context directionality. Otherwise returns the empty string.
 *
 * @param {string} text The input text.
 * @param {boolean=} opt_isHtml Whether {@code text} is HTML / HTML-escaped.
 *     Default: false.
 * @return {string} A Unicode bidi mark matching the global directionality or
 *     the empty string.
 */
goog.i18n.BidiFormatter.prototype.markAfter = function (text, opt_isHtml) {
  var dir = soy.$$bidiTextDir(text, opt_isHtml);
  return soyshim.$$bidiMarkAfterKnownDir_(this.dir_, dir, text, opt_isHtml);
};

/**
 * Formats a string of unknown directionality for use in HTML output of the
 * context directionality, so an opposite-directionality string is neither
 * garbled nor garbles what follows it.
 *
 * @param {string} str The input text.
 * @param {boolean=} placeholder This argument exists for consistency with the
 *     Closure Library. Specifying it has no effect.
 * @return {string} Input text after applying the above processing.
 */
goog.i18n.BidiFormatter.prototype.spanWrap = function(str, placeholder) {
  str = String(str);
  var textDir = soy.$$bidiTextDir(str, true);
  var reset = soyshim.$$bidiMarkAfterKnownDir_(this.dir_, textDir, str, true);
  if (textDir > 0 && this.dir_ <= 0) {
    str = '<span dir="ltr">' + str + '</span>';
  } else if (textDir < 0 && this.dir_ >= 0) {
    str = '<span dir="rtl">' + str + '</span>';
  }
  return str + reset;
};

/**
 * Returns the leading horizontal edge, i.e. "left" or "right", depending on
 * the global bidi directionality.
 * @return {string} "right" for RTL context and "left" otherwise.
 */
goog.i18n.BidiFormatter.prototype.startEdge = function () {
  return this.dir_ < 0 ? 'right' : 'left';
};

/**
 * Formats a string of unknown directionality for use in plain-text output of
 * the context directionality, so an opposite-directionality string is neither
 * garbled nor garbles what follows it.
 * As opposed to {@link #spanWrap}, this makes use of unicode BiDi formatting
 * characters. In HTML, its *only* valid use is inside of elements that do not
 * allow mark-up, e.g. an 'option' tag.
 *
 * @param {string} str The input text.
 * @param {boolean=} placeholder This argument exists for consistency with the
 *     Closure Library. Specifying it has no effect.
 * @return {string} Input text after applying the above processing.
 */
goog.i18n.BidiFormatter.prototype.unicodeWrap = function(str, placeholder) {
  str = String(str);
  var textDir = soy.$$bidiTextDir(str, true);
  var reset = soyshim.$$bidiMarkAfterKnownDir_(this.dir_, textDir, str, true);
  if (textDir > 0 && this.dir_ <= 0) {
    str = '\u202A' + str + '\u202C';
  } else if (textDir < 0 && this.dir_ >= 0) {
    str = '\u202B' + str + '\u202C';
  }
  return str + reset;
};


goog.string = {

  /**
   * Converts \r\n, \r, and \n to <br>s
   * @param {*} str The string in which to convert newlines.
   * @param {boolean=} opt_xml Whether to use XML compatible tags.
   * @return {string} A copy of {@code str} with converted newlines.
   */
  newLineToBr: function(str, opt_xml) {

    str = String(str);

    // This quick test helps in the case when there are no chars to replace,
    // in the worst case this makes barely a difference to the time taken.
    if (!goog.string.NEWLINE_TO_BR_RE_.test(str)) {
      return str;
    }

    return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
  },
  urlEncode: encodeURIComponent,
  /**
   * Regular expression used within newlineToBr().
   * @type {RegExp}
   * @private
   */
  NEWLINE_TO_BR_RE_: /[\r\n]/
};


/**
 * Utility class to facilitate much faster string concatenation in IE,
 * using Array.join() rather than the '+' operator. For other browsers
 * we simply use the '+' operator.
 *
 * @param {Object|number|string|boolean=} opt_a1 Optional first initial item
 *     to append.
 * @param {...Object|number|string|boolean} var_args Other initial items to
 *     append, e.g., new goog.string.StringBuffer('foo', 'bar').
 * @constructor
 */
goog.string.StringBuffer = function(opt_a1, var_args) {
  /**
   * Internal buffer for the string to be concatenated.
   * @type {string|Array}
   * @private
   */
  this.buffer_ = goog.userAgent.jscript.HAS_JSCRIPT ? [] : '';

  if (opt_a1 != null) {
    this.append.apply(this, arguments);
  }
};


/**
 * Length of internal buffer (faster than calling buffer_.length).
 * Only used for IE.
 * @type {number}
 * @private
 */
goog.string.StringBuffer.prototype.bufferLength_ = 0;

/**
 * Appends one or more items to the string.
 *
 * Calling this with null, undefined, or empty arguments is an error.
 *
 * @param {Object|number|string|boolean} a1 Required first string.
 * @param {Object|number|string|boolean=} opt_a2 Optional second string.
 * @param {...Object|number|string|boolean} var_args Other items to append,
 *     e.g., sb.append('foo', 'bar', 'baz').
 * @return {goog.string.StringBuffer} This same StringBuilder object.
 */
goog.string.StringBuffer.prototype.append = function(a1, opt_a2, var_args) {

  if (goog.userAgent.jscript.HAS_JSCRIPT) {
    if (opt_a2 == null) {  // no second argument (note: undefined == null)
      // Array assignment is 2x faster than Array push. Also, use a1
      // directly to avoid arguments instantiation, another 2x improvement.
      this.buffer_[this.bufferLength_++] = a1;
    } else {
      var arr = /**@type {Array.<number|string|boolean>}*/(this.buffer_);
      arr.push.apply(arr, arguments);
      this.bufferLength_ = this.buffer_.length;
    }

  } else {

    // Use a1 directly to avoid arguments instantiation for single-arg case.
    this.buffer_ += a1;
    if (opt_a2 != null) {  // no second argument (note: undefined == null)
      for (var i = 1; i < arguments.length; i++) {
        this.buffer_ += arguments[i];
      }
    }
  }

  return this;
};


/**
 * Clears the string.
 */
goog.string.StringBuffer.prototype.clear = function() {

  if (goog.userAgent.jscript.HAS_JSCRIPT) {
     this.buffer_.length = 0;  // reuse array to avoid creating new object
     this.bufferLength_ = 0;

   } else {
     this.buffer_ = '';
   }
};


/**
 * Returns the concatenated string.
 *
 * @return {string} The concatenated string.
 */
goog.string.StringBuffer.prototype.toString = function() {

  if (goog.userAgent.jscript.HAS_JSCRIPT) {
    var str = this.buffer_.join('');
    // Given a string with the entire contents, simplify the StringBuilder by
    // setting its contents to only be this string, rather than many fragments.
    this.clear();
    if (str) {
      this.append(str);
    }
    return str;

  } else {
    return /** @type {string} */ (this.buffer_);
  }
};


if (!goog.soy) goog.soy = {
  /**
   * Helper function to render a Soy template and then set the
   * output string as the innerHTML of an element. It is recommended
   * to use this helper function instead of directly setting
   * innerHTML in your hand-written code, so that it will be easier
   * to audit the code for cross-site scripting vulnerabilities.
   *
   * @param {Function} template The Soy template defining element's content.
   * @param {Object=} opt_templateData The data for the template.
   * @param {Object=} opt_injectedData The injected data for the template.
   * @param {(goog.dom.DomHelper|Document)=} opt_dom The context in which DOM
   *     nodes will be created.
   */
  renderAsElement: function(
    template, opt_templateData, opt_injectedData, opt_dom) {
    return /** @type {!Element} */ (soyshim.$$renderWithWrapper_(
        template, opt_templateData, opt_dom, true /* asElement */,
        opt_injectedData));
  },
  /**
   * Helper function to render a Soy template into a single node or
   * a document fragment. If the rendered HTML string represents a
   * single node, then that node is returned (note that this is
   * *not* a fragment, despite them name of the method). Otherwise a
   * document fragment is returned containing the rendered nodes.
   *
   * @param {Function} template The Soy template defining element's content.
   * @param {Object=} opt_templateData The data for the template.
   * @param {Object=} opt_injectedData The injected data for the template.
   * @param {(goog.dom.DomHelper|Document)=} opt_dom The context in which DOM
   *     nodes will be created.
   * @return {!Node} The resulting node or document fragment.
   */
  renderAsFragment: function(
    template, opt_templateData, opt_injectedData, opt_dom) {
    return soyshim.$$renderWithWrapper_(
        template, opt_templateData, opt_dom, false /* asElement */,
        opt_injectedData);
  },
  /**
   * Helper function to render a Soy template and then set the output string as
   * the innerHTML of an element. It is recommended to use this helper function
   * instead of directly setting innerHTML in your hand-written code, so that it
   * will be easier to audit the code for cross-site scripting vulnerabilities.
   *
   * NOTE: New code should consider using goog.soy.renderElement instead.
   *
   * @param {Element} element The element whose content we are rendering.
   * @param {Function} template The Soy template defining the element's content.
   * @param {Object=} opt_templateData The data for the template.
   * @param {Object=} opt_injectedData The injected data for the template.
   */
  renderElement: function(
      element, template, opt_templateData, opt_injectedData) {
    element.innerHTML = template(opt_templateData, null, opt_injectedData);
  },
  data: {}
};


/**
 * A type of textual content.
 *
 * This is an enum of type Object so that these values are unforgeable.
 *
 * @enum {!Object}
 */
goog.soy.data.SanitizedContentKind = {

  /**
   * A snippet of HTML that does not start or end inside a tag, comment, entity,
   * or DOCTYPE; and that does not contain any executable code
   * (JS, {@code <object>}s, etc.) from a different trust domain.
   */
  HTML: {},

  /**
   * Executable Javascript code or expression, safe for insertion in a
   * script-tag or event handler context, known to be free of any
   * attacker-controlled scripts. This can either be side-effect-free
   * Javascript (such as JSON) or Javascript that entirely under Google's
   * control.
   */
  JS: goog.DEBUG ? {sanitizedContentJsStrChars: true} : {},

  /**
   * A sequence of code units that can appear between quotes (either kind) in a
   * JS program without causing a parse error, and without causing any side
   * effects.
   * <p>
   * The content should not contain unescaped quotes, newlines, or anything else
   * that would cause parsing to fail or to cause a JS parser to finish the
   * string its parsing inside the content.
   * <p>
   * The content must also not end inside an escape sequence ; no partial octal
   * escape sequences or odd number of '{@code \}'s at the end.
   */
  JS_STR_CHARS: {},

  /** A properly encoded portion of a URI. */
  URI: {},

  /**
   * Repeated attribute names and values. For example,
   * {@code dir="ltr" foo="bar" onclick="trustedFunction()" checked}.
   */
  ATTRIBUTES: goog.DEBUG ? {sanitizedContentHtmlAttribute: true} : {},

  // TODO: Consider separating rules, declarations, and values into
  // separate types, but for simplicity, we'll treat explicitly blessed
  // SanitizedContent as allowed in all of these contexts.
  /**
   * A CSS3 declaration, property, value or group of semicolon separated
   * declarations.
   */
  CSS: {},

  /**
   * Unsanitized plain-text content.
   *
   * This is effectively the "null" entry of this enum, and is sometimes used
   * to explicitly mark content that should never be used unescaped. Since any
   * string is safe to use as text, being of ContentKind.TEXT makes no
   * guarantees about its safety in any other context such as HTML.
   */
  TEXT: {}
};



/**
 * A string-like object that carries a content-type.
 *
 * IMPORTANT! Do not create these directly, nor instantiate the subclasses.
 * Instead, use a trusted, centrally reviewed library as endorsed by your team
 * to generate these objects. Otherwise, you risk accidentally creating
 * SanitizedContent that is attacker-controlled and gets evaluated unescaped in
 * templates.
 *
 * @constructor
 */
goog.soy.data.SanitizedContent = function() {
  throw Error('Do not instantiate directly');
};


/**
 * The context in which this content is safe from XSS attacks.
 * @type {goog.soy.data.SanitizedContentKind}
 */
goog.soy.data.SanitizedContent.prototype.contentKind;


/**
 * The already-safe content.
 * @type {string}
 */
goog.soy.data.SanitizedContent.prototype.content;


/** @override */
goog.soy.data.SanitizedContent.prototype.toString = function() {
  return this.content;
};


var soy = { esc: {} };
var soydata = {};
soydata.VERY_UNSAFE = {};
var soyshim = { $$DEFAULT_TEMPLATE_DATA_: {} };
/**
 * Helper function to render a Soy template into a single node or a document
 * fragment. If the rendered HTML string represents a single node, then that
 * node is returned. Otherwise a document fragment is created and returned
 * (wrapped in a DIV element if #opt_singleNode is true).
 *
 * @param {Function} template The Soy template defining the element's content.
 * @param {Object=} opt_templateData The data for the template.
 * @param {(goog.dom.DomHelper|Document)=} opt_dom The context in which DOM
 *     nodes will be created.
 * @param {boolean=} opt_asElement Whether to wrap the fragment in an
 *     element if the template does not render a single element. If true,
 *     result is always an Element.
 * @param {Object=} opt_injectedData The injected data for the template.
 * @return {!Node} The resulting node or document fragment.
 * @private
 */
soyshim.$$renderWithWrapper_ = function(
    template, opt_templateData, opt_dom, opt_asElement, opt_injectedData) {

  var dom = opt_dom || document;
  var wrapper = dom.createElement('div');
  wrapper.innerHTML = template(
    opt_templateData || soyshim.$$DEFAULT_TEMPLATE_DATA_, undefined,
    opt_injectedData);

  // If the template renders as a single element, return it.
  if (wrapper.childNodes.length == 1) {
    var firstChild = wrapper.firstChild;
    if (!opt_asElement || firstChild.nodeType == 1 /* Element */) {
      return /** @type {!Node} */ (firstChild);
    }
  }

  // If we're forcing it to be a single element, return the wrapper DIV.
  if (opt_asElement) {
    return wrapper;
  }

  // Otherwise, create and return a fragment.
  var fragment = dom.createDocumentFragment();
  while (wrapper.firstChild) {
    fragment.appendChild(wrapper.firstChild);
  }
  return fragment;
};


/**
 * Returns a Unicode BiDi mark matching bidiGlobalDir (LRM or RLM) if the
 * directionality or the exit directionality of text are opposite to
 * bidiGlobalDir. Otherwise returns the empty string.
 * If opt_isHtml, makes sure to ignore the LTR nature of the mark-up and escapes
 * in text, making the logic suitable for HTML and HTML-escaped text.
 * @param {number} bidiGlobalDir The global directionality context: 1 if ltr, -1
 *     if rtl, 0 if unknown.
 * @param {number} dir text's directionality: 1 if ltr, -1 if rtl, 0 if unknown.
 * @param {string} text The text whose directionality is to be estimated.
 * @param {boolean=} opt_isHtml Whether text is HTML/HTML-escaped.
 *     Default: false.
 * @return {string} A Unicode bidi mark matching bidiGlobalDir, or
 *     the empty string when text's overall and exit directionalities both match
 *     bidiGlobalDir, or bidiGlobalDir is 0 (unknown).
 * @private
 */
soyshim.$$bidiMarkAfterKnownDir_ = function(
    bidiGlobalDir, dir, text, opt_isHtml) {
  return (
      bidiGlobalDir > 0 && (dir < 0 ||
          soyshim.$$bidiIsRtlExitText_(text, opt_isHtml)) ? '\u200E' : // LRM
      bidiGlobalDir < 0 && (dir > 0 ||
          soyshim.$$bidiIsLtrExitText_(text, opt_isHtml)) ? '\u200F' : // RLM
      '');
};


/**
 * Strips str of any HTML mark-up and escapes. Imprecise in several ways, but
 * precision is not very important, since the result is only meant to be used
 * for directionality detection.
 * @param {string} str The string to be stripped.
 * @param {boolean=} opt_isHtml Whether str is HTML / HTML-escaped.
 *     Default: false.
 * @return {string} The stripped string.
 * @private
 */
soyshim.$$bidiStripHtmlIfNecessary_ = function(str, opt_isHtml) {
  return opt_isHtml ? str.replace(soyshim.$$BIDI_HTML_SKIP_RE_, ' ') : str;
};


/**
 * Simplified regular expression for am HTML tag (opening or closing) or an HTML
 * escape - the things we want to skip over in order to ignore their ltr
 * characters.
 * @type {RegExp}
 * @private
 */
soyshim.$$BIDI_HTML_SKIP_RE_ = /<[^>]*>|&[^;]+;/g;


/**
 * A practical pattern to identify strong LTR character. This pattern is not
 * theoretically correct according to unicode standard. It is simplified for
 * performance and small code size.
 * @type {string}
 * @private
 */
soyshim.$$bidiLtrChars_ =
    'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF' +
    '\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF';


/**
 * A practical pattern to identify strong neutral and weak character. This
 * pattern is not theoretically correct according to unicode standard. It is
 * simplified for performance and small code size.
 * @type {string}
 * @private
 */
soyshim.$$bidiNeutralChars_ =
    '\u0000-\u0020!-@[-`{-\u00BF\u00D7\u00F7\u02B9-\u02FF\u2000-\u2BFF';


/**
 * A practical pattern to identify strong RTL character. This pattern is not
 * theoretically correct according to unicode standard. It is simplified for
 * performance and small code size.
 * @type {string}
 * @private
 */
soyshim.$$bidiRtlChars_ = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';


/**
 * Regular expressions to check if a piece of text is of RTL directionality
 * on first character with strong directionality.
 * @type {RegExp}
 * @private
 */
soyshim.$$bidiRtlDirCheckRe_ = new RegExp(
    '^[^' + soyshim.$$bidiLtrChars_ + ']*[' + soyshim.$$bidiRtlChars_ + ']');


/**
 * Regular expressions to check if a piece of text is of neutral directionality.
 * Url are considered as neutral.
 * @type {RegExp}
 * @private
 */
soyshim.$$bidiNeutralDirCheckRe_ = new RegExp(
    '^[' + soyshim.$$bidiNeutralChars_ + ']*$|^http://');


/**
 * Check the directionality of the a piece of text based on the first character
 * with strong directionality.
 * @param {string} str string being checked.
 * @return {boolean} return true if rtl directionality is being detected.
 * @private
 */
soyshim.$$bidiIsRtlText_ = function(str) {
  return soyshim.$$bidiRtlDirCheckRe_.test(str);
};


/**
 * Check the directionality of the a piece of text based on the first character
 * with strong directionality.
 * @param {string} str string being checked.
 * @return {boolean} true if all characters have neutral directionality.
 * @private
 */
soyshim.$$bidiIsNeutralText_ = function(str) {
  return soyshim.$$bidiNeutralDirCheckRe_.test(str);
};


/**
 * This constant controls threshold of rtl directionality.
 * @type {number}
 * @private
 */
soyshim.$$bidiRtlDetectionThreshold_ = 0.40;


/**
 * Returns the RTL ratio based on word count.
 * @param {string} str the string that need to be checked.
 * @return {number} the ratio of RTL words among all words with directionality.
 * @private
 */
soyshim.$$bidiRtlWordRatio_ = function(str) {
  var rtlCount = 0;
  var totalCount = 0;
  var tokens = str.split(' ');
  for (var i = 0; i < tokens.length; i++) {
    if (soyshim.$$bidiIsRtlText_(tokens[i])) {
      rtlCount++;
      totalCount++;
    } else if (!soyshim.$$bidiIsNeutralText_(tokens[i])) {
      totalCount++;
    }
  }

  return totalCount == 0 ? 0 : rtlCount / totalCount;
};


/**
 * Regular expressions to check if the last strongly-directional character in a
 * piece of text is LTR.
 * @type {RegExp}
 * @private
 */
soyshim.$$bidiLtrExitDirCheckRe_ = new RegExp(
    '[' + soyshim.$$bidiLtrChars_ + '][^' + soyshim.$$bidiRtlChars_ + ']*$');


/**
 * Regular expressions to check if the last strongly-directional character in a
 * piece of text is RTL.
 * @type {RegExp}
 * @private
 */
soyshim.$$bidiRtlExitDirCheckRe_ = new RegExp(
    '[' + soyshim.$$bidiRtlChars_ + '][^' + soyshim.$$bidiLtrChars_ + ']*$');


/**
 * Check if the exit directionality a piece of text is LTR, i.e. if the last
 * strongly-directional character in the string is LTR.
 * @param {string} str string being checked.
 * @param {boolean=} opt_isHtml Whether str is HTML / HTML-escaped.
 *     Default: false.
 * @return {boolean} Whether LTR exit directionality was detected.
 * @private
 */
soyshim.$$bidiIsLtrExitText_ = function(str, opt_isHtml) {
  str = soyshim.$$bidiStripHtmlIfNecessary_(str, opt_isHtml);
  return soyshim.$$bidiLtrExitDirCheckRe_.test(str);
};


/**
 * Check if the exit directionality a piece of text is RTL, i.e. if the last
 * strongly-directional character in the string is RTL.
 * @param {string} str string being checked.
 * @param {boolean=} opt_isHtml Whether str is HTML / HTML-escaped.
 *     Default: false.
 * @return {boolean} Whether RTL exit directionality was detected.
 * @private
 */
soyshim.$$bidiIsRtlExitText_ = function(str, opt_isHtml) {
  str = soyshim.$$bidiStripHtmlIfNecessary_(str, opt_isHtml);
  return soyshim.$$bidiRtlExitDirCheckRe_.test(str);
};


// =============================================================================
// COPIED FROM soyutils_usegoog.js


// -----------------------------------------------------------------------------
// StringBuilder (compatible with the 'stringbuilder' code style).


/**
 * Utility class to facilitate much faster string concatenation in IE,
 * using Array.join() rather than the '+' operator. For other browsers
 * we simply use the '+' operator.
 *
 * @param {Object} var_args Initial items to append,
 *     e.g., new soy.StringBuilder('foo', 'bar').
 * @constructor
 */
soy.StringBuilder = goog.string.StringBuffer;


// -----------------------------------------------------------------------------
// soydata: Defines typed strings, e.g. an HTML string {@code "a<b>c"} is
// semantically distinct from the plain text string {@code "a<b>c"} and smart
// templates can take that distinction into account.

/**
 * A type of textual content.
 *
 * This is an enum of type Object so that these values are unforgeable.
 *
 * @enum {!Object}
 */
soydata.SanitizedContentKind = goog.soy.data.SanitizedContentKind;


/**
 * Content of type {@link soydata.SanitizedContentKind.HTML}.
 *
 * The content is a string of HTML that can safely be embedded in a PCDATA
 * context in your app.  If you would be surprised to find that an HTML
 * sanitizer produced {@code s} (e.g.  it runs code or fetches bad URLs) and
 * you wouldn't write a template that produces {@code s} on security or privacy
 * grounds, then don't pass {@code s} here.
 *
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.SanitizedHtml = function() {
  goog.soy.data.SanitizedContent.call(this);  // Throws an exception.
};
goog.inherits(soydata.SanitizedHtml, goog.soy.data.SanitizedContent);

/** @override */
soydata.SanitizedHtml.prototype.contentKind = soydata.SanitizedContentKind.HTML;


/**
 * Content of type {@link soydata.SanitizedContentKind.JS}.
 *
 * The content is Javascript source that when evaluated does not execute any
 * attacker-controlled scripts.
 *
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.SanitizedJs = function() {
  goog.soy.data.SanitizedContent.call(this);  // Throws an exception.
};
goog.inherits(soydata.SanitizedJs, goog.soy.data.SanitizedContent);

/** @override */
soydata.SanitizedJs.prototype.contentKind =
    soydata.SanitizedContentKind.JS;


/**
 * Content of type {@link soydata.SanitizedContentKind.JS_STR_CHARS}.
 *
 * The content can be safely inserted as part of a single- or double-quoted
 * string without terminating the string.
 *
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.SanitizedJsStrChars = function() {
  goog.soy.data.SanitizedContent.call(this);  // Throws an exception.
};
goog.inherits(soydata.SanitizedJsStrChars, goog.soy.data.SanitizedContent);

/** @override */
soydata.SanitizedJsStrChars.prototype.contentKind =
    soydata.SanitizedContentKind.JS_STR_CHARS;


/**
 * Content of type {@link soydata.SanitizedContentKind.URI}.
 *
 * The content is a URI chunk that the caller knows is safe to emit in a
 * template.
 *
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.SanitizedUri = function() {
  goog.soy.data.SanitizedContent.call(this);  // Throws an exception.
};
goog.inherits(soydata.SanitizedUri, goog.soy.data.SanitizedContent);

/** @override */
soydata.SanitizedUri.prototype.contentKind = soydata.SanitizedContentKind.URI;


/**
 * Content of type {@link soydata.SanitizedContentKind.ATTRIBUTES}.
 *
 * The content should be safely embeddable within an open tag, such as a
 * key="value" pair.
 *
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.SanitizedHtmlAttribute = function() {
  goog.soy.data.SanitizedContent.call(this);  // Throws an exception.
};
goog.inherits(soydata.SanitizedHtmlAttribute, goog.soy.data.SanitizedContent);

/** @override */
soydata.SanitizedHtmlAttribute.prototype.contentKind =
    soydata.SanitizedContentKind.ATTRIBUTES;


/**
 * Content of type {@link soydata.SanitizedContentKind.CSS}.
 *
 * The content is non-attacker-exploitable CSS, such as {@code color:#c3d9ff}.
 *
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.SanitizedCss = function() {
  goog.soy.data.SanitizedContent.call(this);  // Throws an exception.
};
goog.inherits(soydata.SanitizedCss, goog.soy.data.SanitizedContent);

/** @override */
soydata.SanitizedCss.prototype.contentKind =
    soydata.SanitizedContentKind.CSS;


/**
 * Unsanitized plain text string.
 *
 * While all strings are effectively safe to use as a plain text, there are no
 * guarantees about safety in any other context such as HTML. This is
 * sometimes used to mark that should never be used unescaped.
 *
 * @param {*} content Plain text with no guarantees.
 * @constructor
 * @extends {goog.soy.data.SanitizedContent}
 */
soydata.UnsanitizedText = function(content) {
  /** @override */
  this.content = String(content);
};
goog.inherits(soydata.UnsanitizedText, goog.soy.data.SanitizedContent);

/** @override */
soydata.UnsanitizedText.prototype.contentKind =
    soydata.SanitizedContentKind.TEXT;


/**
 * Creates a factory for SanitizedContent types.
 *
 * This is a hack so that the soydata.VERY_UNSAFE.ordainSanitized* can
 * instantiate Sanitized* classes, without making the Sanitized* constructors
 * publicly usable. Requiring all construction to use the VERY_UNSAFE names
 * helps callers and their reviewers easily tell that creating SanitizedContent
 * is not always safe and calls for careful review.
 *
 * @param {function(new: T, string)} ctor A constructor.
 * @return {!function(*): T} A factory that takes content and returns a
 *     new instance.
 * @template T
 * @private
 */
soydata.$$makeSanitizedContentFactory_ = function(ctor) {
  /** @constructor */
  function InstantiableCtor() {}
  InstantiableCtor.prototype = ctor.prototype;
  return function(content) {
    var result = new InstantiableCtor();
    result.content = String(content);
    return result;
  };
};


// -----------------------------------------------------------------------------
// Sanitized content ordainers. Please use these with extreme caution (with the
// exception of markUnsanitizedText). A good recommendation is to limit usage
// of these to just a handful of files in your source tree where usages can be
// carefully audited.


/**
 * Protects a string from being used in an noAutoescaped context.
 *
 * This is useful for content where there is significant risk of accidental
 * unescaped usage in a Soy template. A great case is for user-controlled
 * data that has historically been a source of vulernabilities.
 *
 * @param {*} content Text to protect.
 * @return {!soydata.UnsanitizedText} A wrapper that is rejected by the
 *     Soy noAutoescape print directive.
 */
soydata.markUnsanitizedText = function(content) {
  return new soydata.UnsanitizedText(content);
};


/**
 * Takes a leap of faith that the provided content is "safe" HTML.
 *
 * @param {*} content A string of HTML that can safely be embedded in
 *     a PCDATA context in your app. If you would be surprised to find that an
 *     HTML sanitizer produced {@code s} (e.g. it runs code or fetches bad URLs)
 *     and you wouldn't write a template that produces {@code s} on security or
 *     privacy grounds, then don't pass {@code s} here.
 * @return {!soydata.SanitizedHtml} Sanitized content wrapper that
 *     indicates to Soy not to escape when printed as HTML.
 */
soydata.VERY_UNSAFE.ordainSanitizedHtml =
    soydata.$$makeSanitizedContentFactory_(soydata.SanitizedHtml);


/**
 * Takes a leap of faith that the provided content is "safe" (non-attacker-
 * controlled, XSS-free) Javascript.
 *
 * @param {*} content Javascript source that when evaluated does not
 *     execute any attacker-controlled scripts.
 * @return {!soydata.SanitizedJs} Sanitized content wrapper that indicates to
 *     Soy not to escape when printed as Javascript source.
 */
soydata.VERY_UNSAFE.ordainSanitizedJs =
    soydata.$$makeSanitizedContentFactory_(soydata.SanitizedJs);


// TODO: This function is probably necessary, either externally or internally
// as an implementation detail. Generally, plain text will always work here,
// as there's no harm to unescaping the string and then re-escaping when
// finally printed.
/**
 * Takes a leap of faith that the provided content can be safely embedded in
 * a Javascript string without re-esacping.
 *
 * @param {*} content Content that can be safely inserted as part of a
 *     single- or double-quoted string without terminating the string.
 * @return {!soydata.SanitizedJsStrChars} Sanitized content wrapper that
 *     indicates to Soy not to escape when printed in a JS string.
 */
soydata.VERY_UNSAFE.ordainSanitizedJsStrChars =
    soydata.$$makeSanitizedContentFactory_(soydata.SanitizedJsStrChars);


/**
 * Takes a leap of faith that the provided content is "safe" to use as a URI
 * in a Soy template.
 *
 * This creates a Soy SanitizedContent object which indicates to Soy there is
 * no need to escape it when printed as a URI (e.g. in an href or src
 * attribute), such as if it's already been encoded or  if it's a Javascript:
 * URI.
 *
 * @param {*} content A chunk of URI that the caller knows is safe to
 *     emit in a template.
 * @return {!soydata.SanitizedUri} Sanitized content wrapper that indicates to
 *     Soy not to escape or filter when printed in URI context.
 */
soydata.VERY_UNSAFE.ordainSanitizedUri =
    soydata.$$makeSanitizedContentFactory_(soydata.SanitizedUri);


/**
 * Takes a leap of faith that the provided content is "safe" to use as an
 * HTML attribute.
 *
 * @param {*} content An attribute name and value, such as
 *     {@code dir="ltr"}.
 * @return {!soydata.SanitizedHtmlAttribute} Sanitized content wrapper that
 *     indicates to Soy not to escape when printed as an HTML attribute.
 */
soydata.VERY_UNSAFE.ordainSanitizedHtmlAttribute =
    soydata.$$makeSanitizedContentFactory_(soydata.SanitizedHtmlAttribute);


/**
 * Takes a leap of faith that the provided content is "safe" to use as CSS
 * in a style attribute or block.
 *
 * @param {*} content CSS, such as {@code color:#c3d9ff}.
 * @return {!soydata.SanitizedCss} Sanitized CSS wrapper that indicates to
 *     Soy there is no need to escape or filter when printed in CSS context.
 */
soydata.VERY_UNSAFE.ordainSanitizedCss =
    soydata.$$makeSanitizedContentFactory_(soydata.SanitizedCss);


// -----------------------------------------------------------------------------
// Public utilities.


/**
 * Helper function to render a Soy template and then set the output string as
 * the innerHTML of an element. It is recommended to use this helper function
 * instead of directly setting innerHTML in your hand-written code, so that it
 * will be easier to audit the code for cross-site scripting vulnerabilities.
 *
 * NOTE: New code should consider using goog.soy.renderElement instead.
 *
 * @param {Element} element The element whose content we are rendering.
 * @param {Function} template The Soy template defining the element's content.
 * @param {Object=} opt_templateData The data for the template.
 * @param {Object=} opt_injectedData The injected data for the template.
 */
soy.renderElement = goog.soy.renderElement;


/**
 * Helper function to render a Soy template into a single node or a document
 * fragment. If the rendered HTML string represents a single node, then that
 * node is returned (note that this is *not* a fragment, despite them name of
 * the method). Otherwise a document fragment is returned containing the
 * rendered nodes.
 *
 * NOTE: New code should consider using goog.soy.renderAsFragment
 * instead (note that the arguments are different).
 *
 * @param {Function} template The Soy template defining the element's content.
 * @param {Object=} opt_templateData The data for the template.
 * @param {Document=} opt_document The document used to create DOM nodes. If not
 *     specified, global document object is used.
 * @param {Object=} opt_injectedData The injected data for the template.
 * @return {!Node} The resulting node or document fragment.
 */
soy.renderAsFragment = function(
    template, opt_templateData, opt_document, opt_injectedData) {
  return goog.soy.renderAsFragment(
      template, opt_templateData, opt_injectedData,
      new goog.dom.DomHelper(opt_document));
};


/**
 * Helper function to render a Soy template into a single node. If the rendered
 * HTML string represents a single node, then that node is returned. Otherwise,
 * a DIV element is returned containing the rendered nodes.
 *
 * NOTE: New code should consider using goog.soy.renderAsElement
 * instead (note that the arguments are different).
 *
 * @param {Function} template The Soy template defining the element's content.
 * @param {Object=} opt_templateData The data for the template.
 * @param {Document=} opt_document The document used to create DOM nodes. If not
 *     specified, global document object is used.
 * @param {Object=} opt_injectedData The injected data for the template.
 * @return {!Element} Rendered template contents, wrapped in a parent DIV
 *     element if necessary.
 */
soy.renderAsElement = function(
    template, opt_templateData, opt_document, opt_injectedData) {
  return goog.soy.renderAsElement(
      template, opt_templateData, opt_injectedData,
      new goog.dom.DomHelper(opt_document));
};


// -----------------------------------------------------------------------------
// Below are private utilities to be used by Soy-generated code only.


/**
 * Builds an augmented map. The returned map will contain mappings from both
 * the base map and the additional map. If the same key appears in both, then
 * the value from the additional map will be visible, while the value from the
 * base map will be hidden. The base map will be used, but not modified.
 *
 * @param {!Object} baseMap The original map to augment.
 * @param {!Object} additionalMap A map containing the additional mappings.
 * @return {!Object} An augmented map containing both the original and
 *     additional mappings.
 */
soy.$$augmentMap = function(baseMap, additionalMap) {

  // Create a new map whose '__proto__' field is set to baseMap.
  /** @constructor */
  function TempCtor() {}
  TempCtor.prototype = baseMap;
  var augmentedMap = new TempCtor();

  // Add the additional mappings to the new map.
  for (var key in additionalMap) {
    augmentedMap[key] = additionalMap[key];
  }

  return augmentedMap;
};


/**
 * Checks that the given map key is a string.
 * @param {*} key Key to check.
 * @return {string} The given key.
 */
soy.$$checkMapKey = function(key) {
  if ((typeof key) != 'string') {
    throw Error(
        'Map literal\'s key expression must evaluate to string' +
        ' (encountered type "' + (typeof key) + '").');
  }
  return key;
};


/**
 * Gets the keys in a map as an array. There are no guarantees on the order.
 * @param {Object} map The map to get the keys of.
 * @return {Array.<string>} The array of keys in the given map.
 */
soy.$$getMapKeys = function(map) {
  var mapKeys = [];
  for (var key in map) {
    mapKeys.push(key);
  }
  return mapKeys;
};


/**
 * Gets a consistent unique id for the given delegate template name. Two calls
 * to this function will return the same id if and only if the input names are
 * the same.
 *
 * <p> Important: This function must always be called with a string constant.
 *
 * <p> If Closure Compiler is not being used, then this is just this identity
 * function. If Closure Compiler is being used, then each call to this function
 * will be replaced with a short string constant, which will be consistent per
 * input name.
 *
 * @param {string} delTemplateName The delegate template name for which to get a
 *     consistent unique id.
 * @return {string} A unique id that is consistent per input name.
 *
 * @consistentIdGenerator
 */
soy.$$getDelTemplateId = function(delTemplateName) {
  return delTemplateName;
};


/**
 * Map from registered delegate template key to the priority of the
 * implementation.
 * @type {Object}
 * @private
 */
soy.$$DELEGATE_REGISTRY_PRIORITIES_ = {};

/**
 * Map from registered delegate template key to the implementation function.
 * @type {Object}
 * @private
 */
soy.$$DELEGATE_REGISTRY_FUNCTIONS_ = {};


/**
 * Registers a delegate implementation. If the same delegate template key (id
 * and variant) has been registered previously, then priority values are
 * compared and only the higher priority implementation is stored (if
 * priorities are equal, an error is thrown).
 *
 * @param {string} delTemplateId The delegate template id.
 * @param {string} delTemplateVariant The delegate template variant (can be
 *     empty string).
 * @param {number} delPriority The implementation's priority value.
 * @param {Function} delFn The implementation function.
 */
soy.$$registerDelegateFn = function(
    delTemplateId, delTemplateVariant, delPriority, delFn) {

  var mapKey = 'key_' + delTemplateId + ':' + delTemplateVariant;
  var currPriority = soy.$$DELEGATE_REGISTRY_PRIORITIES_[mapKey];
  if (currPriority === undefined || delPriority > currPriority) {
    // Registering new or higher-priority function: replace registry entry.
    soy.$$DELEGATE_REGISTRY_PRIORITIES_[mapKey] = delPriority;
    soy.$$DELEGATE_REGISTRY_FUNCTIONS_[mapKey] = delFn;
  } else if (delPriority == currPriority) {
    // Registering same-priority function: error.
    throw Error(
        'Encountered two active delegates with the same priority ("' +
            delTemplateId + ':' + delTemplateVariant + '").');
  } else {
    // Registering lower-priority function: do nothing.
  }
};


/**
 * Retrieves the (highest-priority) implementation that has been registered for
 * a given delegate template key (id and variant). If no implementation has
 * been registered for the key, then the fallback is the same id with empty
 * variant. If the fallback is also not registered, and allowsEmptyDefault is
 * true, then returns an implementation that is equivalent to an empty template
 * (i.e. rendered output would be empty string).
 *
 * @param {string} delTemplateId The delegate template id.
 * @param {string} delTemplateVariant The delegate template variant (can be
 *     empty string).
 * @param {boolean} allowsEmptyDefault Whether to default to the empty template
 *     function if there's no active implementation.
 * @return {Function} The retrieved implementation function.
 */
soy.$$getDelegateFn = function(
    delTemplateId, delTemplateVariant, allowsEmptyDefault) {

  var delFn = soy.$$DELEGATE_REGISTRY_FUNCTIONS_[
      'key_' + delTemplateId + ':' + delTemplateVariant];
  if (! delFn && delTemplateVariant != '') {
    // Fallback to empty variant.
    delFn = soy.$$DELEGATE_REGISTRY_FUNCTIONS_['key_' + delTemplateId + ':'];
  }

  if (delFn) {
    return delFn;
  } else if (allowsEmptyDefault) {
    return soy.$$EMPTY_TEMPLATE_FN_;
  } else {
    throw Error(
        'Found no active impl for delegate call to "' + delTemplateId + ':' +
            delTemplateVariant + '" (and not allowemptydefault="true").');
  }
};


/**
 * Private helper soy.$$getDelegateFn(). This is the empty template function
 * that is returned whenever there's no delegate implementation found.
 *
 * @param {Object.<string, *>=} opt_data
 * @param {soy.StringBuilder=} opt_sb
 * @param {Object.<string, *>=} opt_ijData
 * @return {string}
 * @private
 */
soy.$$EMPTY_TEMPLATE_FN_ = function(opt_data, opt_sb, opt_ijData) {
  return '';
};


// -----------------------------------------------------------------------------
// Escape/filter/normalize.


/**
 * Escapes HTML special characters in a string. Escapes double quote '"' in
 * addition to '&', '<', and '>' so that a string can be included in an HTML
 * tag attribute value within double quotes.
 * Will emit known safe HTML as-is.
 *
 * @param {*} value The string-like value to be escaped. May not be a string,
 *     but the value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeHtml = function(value) {
  // TODO: Perhaps we should just ignore the contentKind property and instead
  // look only at the constructor.
  if (value && value.contentKind &&
      value.contentKind === goog.soy.data.SanitizedContentKind.HTML) {
    goog.asserts.assert(
        value.constructor === soydata.SanitizedHtml);
    return value.content;
  }
  return soy.esc.$$escapeHtmlHelper(value);
};


/**
 * Strips unsafe tags to convert a string of untrusted HTML into HTML that
 * is safe to embed.
 *
 * @param {*} value The string-like value to be escaped. May not be a string,
 *     but the value will be coerced to a string.
 * @return {string} A sanitized and normalized version of value.
 */
soy.$$cleanHtml = function(value) {
  if (value && value.contentKind &&
      value.contentKind === goog.soy.data.SanitizedContentKind.HTML) {
    goog.asserts.assert(
        value.constructor === soydata.SanitizedHtml);
    return value.content;
  }
  return soy.$$stripHtmlTags(value, soy.esc.$$SAFE_TAG_WHITELIST_);
};


/**
 * Escapes HTML special characters in a string so that it can be embedded in
 * RCDATA.
 * <p>
 * Escapes HTML special characters so that the value will not prematurely end
 * the body of a tag like {@code <textarea>} or {@code <title>}. RCDATA tags
 * cannot contain other HTML entities, so it is not strictly necessary to escape
 * HTML special characters except when part of that text looks like an HTML
 * entity or like a close tag : {@code </textarea>}.
 * <p>
 * Will normalize known safe HTML to make sure that sanitized HTML (which could
 * contain an innocuous {@code </textarea>} don't prematurely end an RCDATA
 * element.
 *
 * @param {*} value The string-like value to be escaped. May not be a string,
 *     but the value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeHtmlRcdata = function(value) {
  if (value && value.contentKind &&
      value.contentKind === goog.soy.data.SanitizedContentKind.HTML) {
    goog.asserts.assert(
        value.constructor === soydata.SanitizedHtml);
    return soy.esc.$$normalizeHtmlHelper(value.content);
  }
  return soy.esc.$$escapeHtmlHelper(value);
};


/**
 * Matches any/only HTML5 void elements' start tags.
 * See http://www.w3.org/TR/html-markup/syntax.html#syntax-elements
 * @type {RegExp}
 * @private
 */
soy.$$HTML5_VOID_ELEMENTS_ = new RegExp(
    '^<(?:area|base|br|col|command|embed|hr|img|input' +
    '|keygen|link|meta|param|source|track|wbr)\\b');


/**
 * Removes HTML tags from a string of known safe HTML.
 * If opt_tagWhitelist is not specified or is empty, then
 * the result can be used as an attribute value.
 *
 * @param {*} value The HTML to be escaped. May not be a string, but the
 *     value will be coerced to a string.
 * @param {Object.<string, number>=} opt_tagWhitelist Has an own property whose
 *     name is a lower-case tag name and whose value is {@code 1} for
 *     each element that is allowed in the output.
 * @return {string} A representation of value without disallowed tags,
 *     HTML comments, or other non-text content.
 */
soy.$$stripHtmlTags = function(value, opt_tagWhitelist) {
  if (!opt_tagWhitelist) {
    // If we have no white-list, then use a fast track which elides all tags.
    return String(value).replace(soy.esc.$$HTML_TAG_REGEX_, '')
        // This is just paranoia since callers should normalize the result
        // anyway, but if they didn't, it would be necessary to ensure that
        // after the first replace non-tag uses of < do not recombine into
        // tags as in "<<foo>script>alert(1337)</<foo>script>".
        .replace(soy.esc.$$LT_REGEX_, '&lt;');
  }

  // Escapes '[' so that we can use [123] below to mark places where tags
  // have been removed.
  var html = String(value).replace(/\[/g, '&#91;');

  // Consider all uses of '<' and replace whitelisted tags with markers like
  // [1] which are indices into a list of approved tag names.
  // Replace all other uses of < and > with entities.
  var tags = [];
  html = html.replace(
    soy.esc.$$HTML_TAG_REGEX_,
    function(tok, tagName) {
      if (tagName) {
        tagName = tagName.toLowerCase();
        if (opt_tagWhitelist.hasOwnProperty(tagName) &&
            opt_tagWhitelist[tagName]) {
          var start = tok.charAt(1) === '/' ? '</' : '<';
          var index = tags.length;
          tags[index] = start + tagName + '>';
          return '[' + index + ']';
        }
      }
      return '';
    });

  // Escape HTML special characters. Now there are no '<' in html that could
  // start a tag.
  html = soy.esc.$$normalizeHtmlHelper(html);

  var finalCloseTags = soy.$$balanceTags_(tags);

  // Now html contains no tags or less-than characters that could become
  // part of a tag via a replacement operation and tags only contains
  // approved tags.
  // Reinsert the white-listed tags.
  html = html.replace(
       /\[(\d+)\]/g, function(_, index) { return tags[index]; });

  // Close any still open tags.
  // This prevents unclosed formatting elements like <ol> and <table> from
  // breaking the layout of containing HTML.
  return html + finalCloseTags;
};


/**
 * Throw out any close tags that don't correspond to start tags.
 * If {@code <table>} is used for formatting, embedded HTML shouldn't be able
 * to use a mismatched {@code </table>} to break page layout.
 *
 * @param {Array.<string>} tags an array of tags that will be modified in place
 *    include tags, the empty string, or concatenations of empty tags.
 * @return {string} zero or more closed tags that close all elements that are
 *    opened in tags but not closed.
 * @private
 */
soy.$$balanceTags_ = function(tags) {
  var open = [];
  for (var i = 0, n = tags.length; i < n; ++i) {
    var tag = tags[i];
    if (tag.charAt(1) === '/') {
      var openTagIndex = open.length - 1;
      // NOTE: This is essentially lastIndexOf, but it's not supported in IE.
      while (openTagIndex >= 0 && open[openTagIndex] != tag) {
        openTagIndex--;
      }
      if (openTagIndex < 0) {
        tags[i] = '';  // Drop close tag.
      } else {
        tags[i] = open.slice(openTagIndex).reverse().join('');
        open.length = openTagIndex;
      }
    } else if (!soy.$$HTML5_VOID_ELEMENTS_.test(tag)) {
      open.push('</' + tag.substring(1));
    }
  }
  return open.reverse().join('');
};


/**
 * Escapes HTML special characters in an HTML attribute value.
 *
 * @param {*} value The HTML to be escaped. May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeHtmlAttribute = function(value) {
  if (value && value.contentKind) {
    // NOTE: We don't accept ATTRIBUTES here because ATTRIBUTES is
    // actually not the attribute value context, but instead k/v pairs.
    if (value.contentKind === goog.soy.data.SanitizedContentKind.HTML) {
      // NOTE: After removing tags, we also escape quotes ("normalize") so that
      // the HTML can be embedded in attribute context.
      goog.asserts.assert(
          value.constructor === soydata.SanitizedHtml);
      return soy.esc.$$normalizeHtmlHelper(soy.$$stripHtmlTags(value.content));
    }
  }
  return soy.esc.$$escapeHtmlHelper(value);
};


/**
 * Escapes HTML special characters in a string including space and other
 * characters that can end an unquoted HTML attribute value.
 *
 * @param {*} value The HTML to be escaped. May not be a string, but the
 *     value will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeHtmlAttributeNospace = function(value) {
  if (value && value.contentKind) {
    if (value.contentKind === goog.soy.data.SanitizedContentKind.HTML) {
      goog.asserts.assert(value.constructor ===
          soydata.SanitizedHtml);
      return soy.esc.$$normalizeHtmlNospaceHelper(
          soy.$$stripHtmlTags(value.content));
    }
  }
  return soy.esc.$$escapeHtmlNospaceHelper(value);
};


/**
 * Filters out strings that cannot be a substring of a valid HTML attribute.
 *
 * Note the input is expected to be key=value pairs.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A valid HTML attribute name part or name/value pair.
 *     {@code "zSoyz"} if the input is invalid.
 */
soy.$$filterHtmlAttributes = function(value) {
  // NOTE: Explicitly no support for SanitizedContentKind.HTML, since that is
  // meaningless in this context, which is generally *between* html attributes.
  if (value &&
      value.contentKind === goog.soy.data.SanitizedContentKind.ATTRIBUTES) {
    goog.asserts.assert(value.constructor ===
        soydata.SanitizedHtmlAttribute);
    // Add a space at the end to ensure this won't get merged into following
    // attributes, unless the interpretation is unambiguous (ending with quotes
    // or a space).
    return value.content.replace(/([^"'\s])$/, '$1 ');
  }
  // TODO: Dynamically inserting attributes that aren't marked as trusted is
  // probably unnecessary.  Any filtering done here will either be inadequate
  // for security or not flexible enough.  Having clients use kind="attributes"
  // in parameters seems like a wiser idea.
  return soy.esc.$$filterHtmlAttributesHelper(value);
};


/**
 * Filters out strings that cannot be a substring of a valid HTML element name.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A valid HTML element name part.
 *     {@code "zSoyz"} if the input is invalid.
 */
soy.$$filterHtmlElementName = function(value) {
  // NOTE: We don't accept any SanitizedContent here. HTML indicates valid
  // PCDATA, not tag names. A sloppy developer shouldn't be able to cause an
  // exploit:
  // ... {let userInput}script src=http://evil.com/evil.js{/let} ...
  // ... {param tagName kind="html"}{$userInput}{/param} ...
  // ... <{$tagName}>Hello World</{$tagName}>
  return soy.esc.$$filterHtmlElementNameHelper(value);
};


/**
 * Escapes characters in the value to make it valid content for a JS string
 * literal.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 * @deprecated
 */
soy.$$escapeJs = function(value) {
  return soy.$$escapeJsString(value);
};


/**
 * Escapes characters in the value to make it valid content for a JS string
 * literal.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeJsString = function(value) {
  if (value &&
      value.contentKind === goog.soy.data.SanitizedContentKind.JS_STR_CHARS) {
    // TODO: It might still be worthwhile to normalize it to remove
    // unescaped quotes, null, etc: replace(/(?:^|[^\])['"]/g, '\\$
    goog.asserts.assert(value.constructor ===
        soydata.SanitizedJsStrChars);
    return value.content;
  }
  return soy.esc.$$escapeJsStringHelper(value);
};


/**
 * Encodes a value as a JavaScript literal.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A JavaScript code representation of the input.
 */
soy.$$escapeJsValue = function(value) {
  // We surround values with spaces so that they can't be interpolated into
  // identifiers by accident.
  // We could use parentheses but those might be interpreted as a function call.
  if (value == null) {  // Intentionally matches undefined.
    // Java returns null from maps where there is no corresponding key while
    // JS returns undefined.
    // We always output null for compatibility with Java which does not have a
    // distinct undefined value.
    return ' null ';
  }
  if (value.contentKind == goog.soy.data.SanitizedContentKind.JS) {
    goog.asserts.assert(value.constructor ===
        soydata.SanitizedJs);
    return value.content;
  }
  switch (typeof value) {
    case 'boolean': case 'number':
      return ' ' + value + ' ';
    default:
      return "'" + soy.esc.$$escapeJsStringHelper(String(value)) + "'";
  }
};


/**
 * Escapes characters in the string to make it valid content for a JS regular
 * expression literal.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeJsRegex = function(value) {
  return soy.esc.$$escapeJsRegexHelper(value);
};


/**
 * Matches all URI mark characters that conflict with HTML attribute delimiters
 * or that cannot appear in a CSS uri.
 * From <a href="http://www.w3.org/TR/CSS2/grammar.html">G.2: CSS grammar</a>
 * <pre>
 *     url        ([!#$%&*-~]|{nonascii}|{escape})*
 * </pre>
 *
 * @type {RegExp}
 * @private
 */
soy.$$problematicUriMarks_ = /['()]/g;

/**
 * @param {string} ch A single character in {@link soy.$$problematicUriMarks_}.
 * @return {string}
 * @private
 */
soy.$$pctEncode_ = function(ch) {
  return '%' + ch.charCodeAt(0).toString(16);
};

/**
 * Escapes a string so that it can be safely included in a URI.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeUri = function(value) {
  if (value && value.contentKind === goog.soy.data.SanitizedContentKind.URI) {
    goog.asserts.assert(value.constructor ===
        soydata.SanitizedUri);
    return soy.$$normalizeUri(value);
  }
  // Apostophes and parentheses are not matched by encodeURIComponent.
  // They are technically special in URIs, but only appear in the obsolete mark
  // production in Appendix D.2 of RFC 3986, so can be encoded without changing
  // semantics.
  var encoded = soy.esc.$$escapeUriHelper(value);
  soy.$$problematicUriMarks_.lastIndex = 0;
  if (soy.$$problematicUriMarks_.test(encoded)) {
    return encoded.replace(soy.$$problematicUriMarks_, soy.$$pctEncode_);
  }
  return encoded;
};


/**
 * Removes rough edges from a URI by escaping any raw HTML/JS string delimiters.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$normalizeUri = function(value) {
  return soy.esc.$$normalizeUriHelper(value);
};


/**
 * Vets a URI's protocol and removes rough edges from a URI by escaping
 * any raw HTML/JS string delimiters.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$filterNormalizeUri = function(value) {
  if (value && value.contentKind == goog.soy.data.SanitizedContentKind.URI) {
    goog.asserts.assert(value.constructor ===
        soydata.SanitizedUri);
    return soy.$$normalizeUri(value);
  }
  return soy.esc.$$filterNormalizeUriHelper(value);
};


/**
 * Escapes a string so it can safely be included inside a quoted CSS string.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} An escaped version of value.
 */
soy.$$escapeCssString = function(value) {
  return soy.esc.$$escapeCssStringHelper(value);
};


/**
 * Encodes a value as a CSS identifier part, keyword, or quantity.
 *
 * @param {*} value The value to escape. May not be a string, but the value
 *     will be coerced to a string.
 * @return {string} A safe CSS identifier part, keyword, or quanitity.
 */
soy.$$filterCssValue = function(value) {
  if (value && value.contentKind === goog.soy.data.SanitizedContentKind.CSS) {
    goog.asserts.assert(value.constructor ===
        soydata.SanitizedCss);
    return value.content;
  }
  // Uses == to intentionally match null and undefined for Java compatibility.
  if (value == null) {
    return '';
  }
  return soy.esc.$$filterCssValueHelper(value);
};


/**
 * Sanity-checks noAutoescape input for explicitly tainted content.
 *
 * SanitizedContentKind.TEXT is used to explicitly mark input that was never
 * meant to be used unescaped.
 *
 * @param {*} value The value to filter.
 * @return {string} The value, that we dearly hope will not cause an attack.
 */
soy.$$filterNoAutoescape = function(value) {
  if (value && value.contentKind === goog.soy.data.SanitizedContentKind.TEXT) {
    // Fail in development mode.
    goog.asserts.fail(
        'Tainted SanitizedContentKind.TEXT for |noAutoescape: `%s`',
        [value.content]);
    // Return innocuous data in production.
    return 'zSoyz';
  }
  return String(value);
};


// -----------------------------------------------------------------------------
// Basic directives/functions.


/**
 * Converts \r\n, \r, and \n to <br>s
 * @param {*} str The string in which to convert newlines.
 * @return {string} A copy of {@code str} with converted newlines.
 */
soy.$$changeNewlineToBr = function(str) {
  return goog.string.newLineToBr(String(str), false);
};


/**
 * Inserts word breaks ('wbr' tags) into a HTML string at a given interval. The
 * counter is reset if a space is encountered. Word breaks aren't inserted into
 * HTML tags or entities. Entites count towards the character count; HTML tags
 * do not.
 *
 * @param {*} str The HTML string to insert word breaks into. Can be other
 *     types, but the value will be coerced to a string.
 * @param {number} maxCharsBetweenWordBreaks Maximum number of non-space
 *     characters to allow before adding a word break.
 * @return {string} The string including word breaks.
 */
soy.$$insertWordBreaks = function(str, maxCharsBetweenWordBreaks) {
  return goog.format.insertWordBreaks(String(str), maxCharsBetweenWordBreaks);
};


/**
 * Truncates a string to a given max length (if it's currently longer),
 * optionally adding ellipsis at the end.
 *
 * @param {*} str The string to truncate. Can be other types, but the value will
 *     be coerced to a string.
 * @param {number} maxLen The maximum length of the string after truncation
 *     (including ellipsis, if applicable).
 * @param {boolean} doAddEllipsis Whether to add ellipsis if the string needs
 *     truncation.
 * @return {string} The string after truncation.
 */
soy.$$truncate = function(str, maxLen, doAddEllipsis) {

  str = String(str);
  if (str.length <= maxLen) {
    return str;  // no need to truncate
  }

  // If doAddEllipsis, either reduce maxLen to compensate, or else if maxLen is
  // too small, just turn off doAddEllipsis.
  if (doAddEllipsis) {
    if (maxLen > 3) {
      maxLen -= 3;
    } else {
      doAddEllipsis = false;
    }
  }

  // Make sure truncating at maxLen doesn't cut up a unicode surrogate pair.
  if (soy.$$isHighSurrogate_(str.charAt(maxLen - 1)) &&
      soy.$$isLowSurrogate_(str.charAt(maxLen))) {
    maxLen -= 1;
  }

  // Truncate.
  str = str.substring(0, maxLen);

  // Add ellipsis.
  if (doAddEllipsis) {
    str += '...';
  }

  return str;
};

/**
 * Private helper for $$truncate() to check whether a char is a high surrogate.
 * @param {string} ch The char to check.
 * @return {boolean} Whether the given char is a unicode high surrogate.
 * @private
 */
soy.$$isHighSurrogate_ = function(ch) {
  return 0xD800 <= ch && ch <= 0xDBFF;
};

/**
 * Private helper for $$truncate() to check whether a char is a low surrogate.
 * @param {string} ch The char to check.
 * @return {boolean} Whether the given char is a unicode low surrogate.
 * @private
 */
soy.$$isLowSurrogate_ = function(ch) {
  return 0xDC00 <= ch && ch <= 0xDFFF;
};


// -----------------------------------------------------------------------------
// Bidi directives/functions.


/**
 * Cache of bidi formatter by context directionality, so we don't keep on
 * creating new objects.
 * @type {!Object.<!goog.i18n.BidiFormatter>}
 * @private
 */
soy.$$bidiFormatterCache_ = {};


/**
 * Returns cached bidi formatter for bidiGlobalDir, or creates a new one.
 * @param {number} bidiGlobalDir The global directionality context: 1 if ltr, -1
 *     if rtl, 0 if unknown.
 * @return {goog.i18n.BidiFormatter} A formatter for bidiGlobalDir.
 * @private
 */
soy.$$getBidiFormatterInstance_ = function(bidiGlobalDir) {
  return soy.$$bidiFormatterCache_[bidiGlobalDir] ||
         (soy.$$bidiFormatterCache_[bidiGlobalDir] =
             new goog.i18n.BidiFormatter(bidiGlobalDir));
};


/**
 * Estimate the overall directionality of text. If opt_isHtml, makes sure to
 * ignore the LTR nature of the mark-up and escapes in text, making the logic
 * suitable for HTML and HTML-escaped text.
 * @param {string} text The text whose directionality is to be estimated.
 * @param {boolean=} opt_isHtml Whether text is HTML/HTML-escaped.
 *     Default: false.
 * @return {number} 1 if text is LTR, -1 if it is RTL, and 0 if it is neutral.
 */
soy.$$bidiTextDir = function(text, opt_isHtml) {
  if (!text) {
    return 0;
  }
  return goog.i18n.bidi.detectRtlDirectionality(text, opt_isHtml) ? -1 : 1;
};


/**
 * Returns 'dir="ltr"' or 'dir="rtl"', depending on text's estimated
 * directionality, if it is not the same as bidiGlobalDir.
 * Otherwise, returns the empty string.
 * If opt_isHtml, makes sure to ignore the LTR nature of the mark-up and escapes
 * in text, making the logic suitable for HTML and HTML-escaped text.
 * @param {number} bidiGlobalDir The global directionality context: 1 if ltr, -1
 *     if rtl, 0 if unknown.
 * @param {string} text The text whose directionality is to be estimated.
 * @param {boolean=} opt_isHtml Whether text is HTML/HTML-escaped.
 *     Default: false.
 * @return {soydata.SanitizedHtmlAttribute} 'dir="rtl"' for RTL text in non-RTL
 *     context; 'dir="ltr"' for LTR text in non-LTR context;
 *     else, the empty string.
 */
soy.$$bidiDirAttr = function(bidiGlobalDir, text, opt_isHtml) {
  return soydata.VERY_UNSAFE.ordainSanitizedHtmlAttribute(
      soy.$$getBidiFormatterInstance_(bidiGlobalDir).dirAttr(text, opt_isHtml));
};


/**
 * Returns a Unicode BiDi mark matching bidiGlobalDir (LRM or RLM) if the
 * directionality or the exit directionality of text are opposite to
 * bidiGlobalDir. Otherwise returns the empty string.
 * If opt_isHtml, makes sure to ignore the LTR nature of the mark-up and escapes
 * in text, making the logic suitable for HTML and HTML-escaped text.
 * @param {number} bidiGlobalDir The global directionality context: 1 if ltr, -1
 *     if rtl, 0 if unknown.
 * @param {string} text The text whose directionality is to be estimated.
 * @param {boolean=} opt_isHtml Whether text is HTML/HTML-escaped.
 *     Default: false.
 * @return {string} A Unicode bidi mark matching bidiGlobalDir, or the empty
 *     string when text's overall and exit directionalities both match
 *     bidiGlobalDir, or bidiGlobalDir is 0 (unknown).
 */
soy.$$bidiMarkAfter = function(bidiGlobalDir, text, opt_isHtml) {
  var formatter = soy.$$getBidiFormatterInstance_(bidiGlobalDir);
  return formatter.markAfter(text, opt_isHtml);
};


/**
 * Returns str wrapped in a <span dir="ltr|rtl"> according to its directionality
 * - but only if that is neither neutral nor the same as the global context.
 * Otherwise, returns str unchanged.
 * Always treats str as HTML/HTML-escaped, i.e. ignores mark-up and escapes when
 * estimating str's directionality.
 * @param {number} bidiGlobalDir The global directionality context: 1 if ltr, -1
 *     if rtl, 0 if unknown.
 * @param {*} str The string to be wrapped. Can be other types, but the value
 *     will be coerced to a string.
 * @return {string} The wrapped string.
 */
soy.$$bidiSpanWrap = function(bidiGlobalDir, str) {
  var formatter = soy.$$getBidiFormatterInstance_(bidiGlobalDir);
  return formatter.spanWrap(str + '', true);
};


/**
 * Returns str wrapped in Unicode BiDi formatting characters according to its
 * directionality, i.e. either LRE or RLE at the beginning and PDF at the end -
 * but only if str's directionality is neither neutral nor the same as the
 * global context. Otherwise, returns str unchanged.
 * Always treats str as HTML/HTML-escaped, i.e. ignores mark-up and escapes when
 * estimating str's directionality.
 * @param {number} bidiGlobalDir The global directionality context: 1 if ltr, -1
 *     if rtl, 0 if unknown.
 * @param {*} str The string to be wrapped. Can be other types, but the value
 *     will be coerced to a string.
 * @return {string} The wrapped string.
 */
soy.$$bidiUnicodeWrap = function(bidiGlobalDir, str) {
  var formatter = soy.$$getBidiFormatterInstance_(bidiGlobalDir);
  return formatter.unicodeWrap(str + '', true);
};


// -----------------------------------------------------------------------------
// Generated code.




// START GENERATED CODE FOR ESCAPERS.

/**
 * @type {function (*) : string}
 */
soy.esc.$$escapeUriHelper = function(v) {
  return encodeURIComponent(String(v));
};

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
soy.esc.$$ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ = {
  '\x00': '\x26#0;',
  '\x22': '\x26quot;',
  '\x26': '\x26amp;',
  '\x27': '\x26#39;',
  '\x3c': '\x26lt;',
  '\x3e': '\x26gt;',
  '\x09': '\x26#9;',
  '\x0a': '\x26#10;',
  '\x0b': '\x26#11;',
  '\x0c': '\x26#12;',
  '\x0d': '\x26#13;',
  ' ': '\x26#32;',
  '-': '\x26#45;',
  '\/': '\x26#47;',
  '\x3d': '\x26#61;',
  '`': '\x26#96;',
  '\x85': '\x26#133;',
  '\xa0': '\x26#160;',
  '\u2028': '\x26#8232;',
  '\u2029': '\x26#8233;'
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
soy.esc.$$REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_ = function(ch) {
  return soy.esc.$$ESCAPE_MAP_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_[ch];
};

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
soy.esc.$$ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_ = {
  '\x00': '\\x00',
  '\x08': '\\x08',
  '\x09': '\\t',
  '\x0a': '\\n',
  '\x0b': '\\x0b',
  '\x0c': '\\f',
  '\x0d': '\\r',
  '\x22': '\\x22',
  '\x26': '\\x26',
  '\x27': '\\x27',
  '\/': '\\\/',
  '\x3c': '\\x3c',
  '\x3d': '\\x3d',
  '\x3e': '\\x3e',
  '\\': '\\\\',
  '\x85': '\\x85',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
  '$': '\\x24',
  '(': '\\x28',
  ')': '\\x29',
  '*': '\\x2a',
  '+': '\\x2b',
  ',': '\\x2c',
  '-': '\\x2d',
  '.': '\\x2e',
  ':': '\\x3a',
  '?': '\\x3f',
  '[': '\\x5b',
  ']': '\\x5d',
  '^': '\\x5e',
  '{': '\\x7b',
  '|': '\\x7c',
  '}': '\\x7d'
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
soy.esc.$$REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_ = function(ch) {
  return soy.esc.$$ESCAPE_MAP_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_[ch];
};

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
soy.esc.$$ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_ = {
  '\x00': '\\0 ',
  '\x08': '\\8 ',
  '\x09': '\\9 ',
  '\x0a': '\\a ',
  '\x0b': '\\b ',
  '\x0c': '\\c ',
  '\x0d': '\\d ',
  '\x22': '\\22 ',
  '\x26': '\\26 ',
  '\x27': '\\27 ',
  '(': '\\28 ',
  ')': '\\29 ',
  '*': '\\2a ',
  '\/': '\\2f ',
  ':': '\\3a ',
  ';': '\\3b ',
  '\x3c': '\\3c ',
  '\x3d': '\\3d ',
  '\x3e': '\\3e ',
  '@': '\\40 ',
  '\\': '\\5c ',
  '{': '\\7b ',
  '}': '\\7d ',
  '\x85': '\\85 ',
  '\xa0': '\\a0 ',
  '\u2028': '\\2028 ',
  '\u2029': '\\2029 '
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
soy.esc.$$REPLACER_FOR_ESCAPE_CSS_STRING_ = function(ch) {
  return soy.esc.$$ESCAPE_MAP_FOR_ESCAPE_CSS_STRING_[ch];
};

/**
 * Maps charcters to the escaped versions for the named escape directives.
 * @type {Object.<string, string>}
 * @private
 */
soy.esc.$$ESCAPE_MAP_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_ = {
  '\x00': '%00',
  '\x01': '%01',
  '\x02': '%02',
  '\x03': '%03',
  '\x04': '%04',
  '\x05': '%05',
  '\x06': '%06',
  '\x07': '%07',
  '\x08': '%08',
  '\x09': '%09',
  '\x0a': '%0A',
  '\x0b': '%0B',
  '\x0c': '%0C',
  '\x0d': '%0D',
  '\x0e': '%0E',
  '\x0f': '%0F',
  '\x10': '%10',
  '\x11': '%11',
  '\x12': '%12',
  '\x13': '%13',
  '\x14': '%14',
  '\x15': '%15',
  '\x16': '%16',
  '\x17': '%17',
  '\x18': '%18',
  '\x19': '%19',
  '\x1a': '%1A',
  '\x1b': '%1B',
  '\x1c': '%1C',
  '\x1d': '%1D',
  '\x1e': '%1E',
  '\x1f': '%1F',
  ' ': '%20',
  '\x22': '%22',
  '\x27': '%27',
  '(': '%28',
  ')': '%29',
  '\x3c': '%3C',
  '\x3e': '%3E',
  '\\': '%5C',
  '{': '%7B',
  '}': '%7D',
  '\x7f': '%7F',
  '\x85': '%C2%85',
  '\xa0': '%C2%A0',
  '\u2028': '%E2%80%A8',
  '\u2029': '%E2%80%A9',
  '\uff01': '%EF%BC%81',
  '\uff03': '%EF%BC%83',
  '\uff04': '%EF%BC%84',
  '\uff06': '%EF%BC%86',
  '\uff07': '%EF%BC%87',
  '\uff08': '%EF%BC%88',
  '\uff09': '%EF%BC%89',
  '\uff0a': '%EF%BC%8A',
  '\uff0b': '%EF%BC%8B',
  '\uff0c': '%EF%BC%8C',
  '\uff0f': '%EF%BC%8F',
  '\uff1a': '%EF%BC%9A',
  '\uff1b': '%EF%BC%9B',
  '\uff1d': '%EF%BC%9D',
  '\uff1f': '%EF%BC%9F',
  '\uff20': '%EF%BC%A0',
  '\uff3b': '%EF%BC%BB',
  '\uff3d': '%EF%BC%BD'
};

/**
 * A function that can be used with String.replace..
 * @param {string} ch A single character matched by a compatible matcher.
 * @return {string} A token in the output language.
 * @private
 */
soy.esc.$$REPLACER_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_ = function(ch) {
  return soy.esc.$$ESCAPE_MAP_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_[ch];
};

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_ESCAPE_HTML_ = /[\x00\x22\x26\x27\x3c\x3e]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_NORMALIZE_HTML_ = /[\x00\x22\x27\x3c\x3e]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_ESCAPE_HTML_NOSPACE_ = /[\x00\x09-\x0d \x22\x26\x27\x2d\/\x3c-\x3e`\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_NORMALIZE_HTML_NOSPACE_ = /[\x00\x09-\x0d \x22\x27\x2d\/\x3c-\x3e`\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_ESCAPE_JS_STRING_ = /[\x00\x08-\x0d\x22\x26\x27\/\x3c-\x3e\\\x85\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_ESCAPE_JS_REGEX_ = /[\x00\x08-\x0d\x22\x24\x26-\/\x3a\x3c-\x3f\x5b-\x5e\x7b-\x7d\x85\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_ESCAPE_CSS_STRING_ = /[\x00\x08-\x0d\x22\x26-\x2a\/\x3a-\x3e@\\\x7b\x7d\x85\xa0\u2028\u2029]/g;

/**
 * Matches characters that need to be escaped for the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$MATCHER_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_ = /[\x00- \x22\x27-\x29\x3c\x3e\\\x7b\x7d\x7f\x85\xa0\u2028\u2029\uff01\uff03\uff04\uff06-\uff0c\uff0f\uff1a\uff1b\uff1d\uff1f\uff20\uff3b\uff3d]/g;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$FILTER_FOR_FILTER_CSS_VALUE_ = /^(?!-*(?:expression|(?:moz-)?binding))(?:[.#]?-?(?:[_a-z0-9-]+)(?:-[_a-z0-9-]+)*-?|-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[a-z]{1,2}|%)?|!important|)$/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$FILTER_FOR_FILTER_NORMALIZE_URI_ = /^(?:(?:https?|mailto):|[^&:\/?#]*(?:[\/?#]|$))/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$FILTER_FOR_FILTER_HTML_ATTRIBUTES_ = /^(?!style|on|action|archive|background|cite|classid|codebase|data|dsync|href|longdesc|src|usemap)(?:[a-z0-9_$:-]*)$/i;

/**
 * A pattern that vets values produced by the named directives.
 * @type RegExp
 * @private
 */
soy.esc.$$FILTER_FOR_FILTER_HTML_ELEMENT_NAME_ = /^(?!script|style|title|textarea|xmp|no)[a-z0-9_$:-]*$/i;

/**
 * A helper for the Soy directive |escapeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$escapeHtmlHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_ESCAPE_HTML_,
      soy.esc.$$REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
};

/**
 * A helper for the Soy directive |normalizeHtml
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$normalizeHtmlHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_NORMALIZE_HTML_,
      soy.esc.$$REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
};

/**
 * A helper for the Soy directive |escapeHtmlNospace
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$escapeHtmlNospaceHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_ESCAPE_HTML_NOSPACE_,
      soy.esc.$$REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
};

/**
 * A helper for the Soy directive |normalizeHtmlNospace
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$normalizeHtmlNospaceHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_NORMALIZE_HTML_NOSPACE_,
      soy.esc.$$REPLACER_FOR_ESCAPE_HTML__AND__NORMALIZE_HTML__AND__ESCAPE_HTML_NOSPACE__AND__NORMALIZE_HTML_NOSPACE_);
};

/**
 * A helper for the Soy directive |escapeJsString
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$escapeJsStringHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_ESCAPE_JS_STRING_,
      soy.esc.$$REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_);
};

/**
 * A helper for the Soy directive |escapeJsRegex
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$escapeJsRegexHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_ESCAPE_JS_REGEX_,
      soy.esc.$$REPLACER_FOR_ESCAPE_JS_STRING__AND__ESCAPE_JS_REGEX_);
};

/**
 * A helper for the Soy directive |escapeCssString
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$escapeCssStringHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_ESCAPE_CSS_STRING_,
      soy.esc.$$REPLACER_FOR_ESCAPE_CSS_STRING_);
};

/**
 * A helper for the Soy directive |filterCssValue
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$filterCssValueHelper = function(value) {
  var str = String(value);
  if (!soy.esc.$$FILTER_FOR_FILTER_CSS_VALUE_.test(str)) {
    return 'zSoyz';
  }
  return str;
};

/**
 * A helper for the Soy directive |normalizeUri
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$normalizeUriHelper = function(value) {
  var str = String(value);
  return str.replace(
      soy.esc.$$MATCHER_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_,
      soy.esc.$$REPLACER_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_);
};

/**
 * A helper for the Soy directive |filterNormalizeUri
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$filterNormalizeUriHelper = function(value) {
  var str = String(value);
  if (!soy.esc.$$FILTER_FOR_FILTER_NORMALIZE_URI_.test(str)) {
    return '#zSoyz';
  }
  return str.replace(
      soy.esc.$$MATCHER_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_,
      soy.esc.$$REPLACER_FOR_NORMALIZE_URI__AND__FILTER_NORMALIZE_URI_);
};

/**
 * A helper for the Soy directive |filterHtmlAttributes
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$filterHtmlAttributesHelper = function(value) {
  var str = String(value);
  if (!soy.esc.$$FILTER_FOR_FILTER_HTML_ATTRIBUTES_.test(str)) {
    return 'zSoyz';
  }
  return str;
};

/**
 * A helper for the Soy directive |filterHtmlElementName
 * @param {*} value Can be of any type but will be coerced to a string.
 * @return {string} The escaped text.
 */
soy.esc.$$filterHtmlElementNameHelper = function(value) {
  var str = String(value);
  if (!soy.esc.$$FILTER_FOR_FILTER_HTML_ELEMENT_NAME_.test(str)) {
    return 'zSoyz';
  }
  return str;
};

/**
 * Matches all tags, HTML comments, and DOCTYPEs in tag soup HTML.
 * By removing these, and replacing any '<' or '>' characters with
 * entities we guarantee that the result can be embedded into a
 * an attribute without introducing a tag boundary.
 *
 * @type {RegExp}
 * @private
 */
soy.esc.$$HTML_TAG_REGEX_ = /<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

/**
 * Matches all occurrences of '<'.
 *
 * @type {RegExp}
 * @private
 */
soy.esc.$$LT_REGEX_ = /</g;

/**
 * Maps lower-case names of innocuous tags to 1.
 *
 * @type {Object.<string,number>}
 * @private
 */
soy.esc.$$SAFE_TAG_WHITELIST_ = {'b': 1, 'br': 1, 'em': 1, 'i': 1, 's': 1, 'sub': 1, 'sup': 1, 'u': 1};

// END GENERATED CODE



module.exports = {
  soy: soy
}

})()
},{}],17:[function(require,module,exports){

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
      // expression: patternMatch.var('expression'),
      expression: {
        type: 'CallExpression',
        arguments: patternMatch.var('arguments'),
        callee: patternMatch.var('callee',{
          type: 'MemberExpression',
          object: patternMatch.var('callee_obj',{
            type: 'Identifier',
          }),
          property: patternMatch.var('callee_prop')
        }),
      }
    },
    // XML generator
    function(node,matchedProps) {
      var output = '<block type="jslang_call">'
      output += '<title name="CALLEE">'+matchedProps.callee_obj.name+'</title>'
      output += '<title name="FUNC">'+matchedProps.callee_prop.name+'</title>'
      output += '<value name="ARGS"><block type="lists_create_with" inline="true">'
      output += '<mutation items="'+matchedProps.arguments.length+'"/>'
      matchedProps.arguments.forEach(function(arg,index) {
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

},{}],18:[function(require,module,exports){

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
      // Build body from the inside out, appending each node to the one before it's `next` tag
      // elem0
      // └─next:elem1
      //        └─next:elem2
      matchedProps.body.reverse().forEach(function(node,index) {
        var nodeXml = Blockly.util.convertAstNodeToBlocks(node)+"\n"
        // Append current body inside this node, and set that as the new body
        body = body ? Blockly.util.appendInNewTag(nodeXml,body,'next') : nodeXml
      })
      output += body
      output += '</xml>'
      return output
    }
  )

  // for using a MemberExpression as a statement
  // TODO: this is ugly
  Blockly.core.Language.jslang_statement_nub = {
    helpUrl: 'http://www.example.com/',
    init: function() {
      this.setColour(290);
      this.appendValueInput("CHAIN")
          .setCheck("null");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setTooltip('');
    }
  };

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

  Blockly.core.JavaScript.jslang_statement_nub = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    // Return chain
    return value_chain;
  };

}

},{}],19:[function(require,module,exports){

// MemberExpression

module.exports = function(Blockly,patternMatch) {

  // ===
  // = Block Definition
  // ===

  // For getting a property of an object
  Blockly.core.Language.jslang_member_chain = {
    helpUrl: 'http://www.example.com/',
    init: function() {
      this.setColour(290);
      this.appendValueInput("CHAIN")
          .setCheck("null")
          .appendTitle("get")
          .appendTitle(new Blockly.core.FieldTextInput("prop"), "PROP");
      this.setOutput(true, "null");
      this.setTooltip('');
    }
  };

  // For getting a property of an object
  Blockly.core.Language.jslang_identifier = {
    helpUrl: 'http://www.example.com/',
    init: function() {
      this.setColour(240);
      this.appendValueInput("CHAIN")
          .setCheck("null")
          .appendTitle("object")
          .appendTitle(new Blockly.core.FieldTextInput("prop"), "PROP");
      this.setOutput(true, "null");
      this.setTooltip('');
    }
  };

  // ===
  // = JS -> Blocks
  // ===

// src = "a.b.c"
// ├─ type: Program
// └─ body
//    └─ 0
//       ├─ type: ExpressionStatement
//       └─ expression
//          ├─ type: MemberExpression
//          ├─ computed: false
//          ├─ object
//          │  ├─ type: MemberExpression
//          │  ├─ computed: false
//          │  ├─ object
//          │  │  ├─ type: Identifier
//          │  │  └─ name: a
//          │  └─ property
//          │     ├─ type: Identifier
//          │     └─ name: b
//          └─ property
//             ├─ type: Identifier
//             └─ name: c

// <xml>
//   <block type="jslang_statement_nub" inline="false" x="79" y="132">
//     <value name="CHAIN">
//       <block type="jslang_member_chain" inline="false">
//         <title name="PROP">a</title>
//         <value name="CHAIN">
//           <block type="jslang_member_chain" inline="false">
//             <title name="PROP">b</title>
//             <value name="CHAIN">
//               <block type="jslang_member_chain" inline="false">
//                 <title name="PROP">c</title>
//               </block>
//             </value>
//           </block>
//         </value>
//       </block>
//     </value>
//   </block>
// </xml> 

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'ExpressionStatement',
      // expression: patternMatch.var('expression'),
      expression: patternMatch.var('expression',{
        type: 'MemberExpression',
      }),
    },
    // XML generator
    function(node,matchedProps) {
      var output = ''
      output += '<block type="jslang_statement_nub"><value name="CHAIN">'
      output += Blockly.util.convertAstNodeToBlocks(matchedProps.expression)
      output += '</value></block>'
      return output
    }
  )

  // a.b
  // a.b.c.d
  // a.b().c

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'MemberExpression',
      object: patternMatch.var('object'),
      property: patternMatch.var('property'),
    },
    // XML generator
    function(node,matchedProps) {

      var object = Blockly.util.convertAstNodeToBlocks(matchedProps.object)
      var property = '<block type="jslang_member_chain"><title name="PROP">'+matchedProps.property.name+'</title></block>'
      debugger
      var output = Blockly.util.appendTagDeep(object, property, 'value', 'CHAIN')
      debugger
      return output
    }
  )

  Blockly.util.registerBlockSignature({
    // Pattern
      type: 'Identifier',
      name: patternMatch.var('name'),
    },
    // XML generator
    function(node,matchedProps) {
      var output = '<block type="jslang_identifier"><title name="PROP">'+matchedProps.name+'</title></block>'
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

  Blockly.core.JavaScript.jslang_member_chain = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var text_prop = this.getTitleValue('PROP');
    // Assemble JavaScript into code variable.
    var code = "."+text_prop+value_chain
    return [code, Blockly.core.JavaScript.ORDER_NONE];
  };

  Blockly.core.JavaScript.jslang_identifier = function() {
    var value_chain = Blockly.core.JavaScript.valueToCode(this, 'CHAIN', Blockly.core.JavaScript.ORDER_ATOMIC);
    var text_prop = this.getTitleValue('PROP');
    // Assemble JavaScript into code variable.
    value_chain = value_chain.slice(1,-1)
    var code = text_prop+value_chain
    return [code, Blockly.core.JavaScript.ORDER_NONE];
  };

}

},{}],20:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":1}]