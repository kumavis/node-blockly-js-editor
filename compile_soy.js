var fs = require('fs')
var soynode = require('soynode')
var path = require('path')
var blocklyPath = path.dirname( require.resolve('blockly') )

var tmpDir = './tmp/templates'
var outputDir = './templates'

soynode.setOptions({
    tmpDir: tmpDir
  , allowDynamicRecompile: true
  , uniqueDir: false
  , eraseTemporaryFiles: true
})

soynode.compileTemplates(__dirname, function (err) {
  if (err) {
    throw err
    process.exit(1)
  }

  var target = tmpDir+"/templates/template.soy.js"
  var dest = outputDir+"/template.soy.js"

  // set template object to module.exports


  var templateContent = fs.readFileSync(target);

  // append deps + prepend exports
  var prepend = "var soy = require('"+blocklyPath+"/lib/_soy/soyutils.js').soy;\n\n"
  var append = '\n\n;; module.exports=blockly_js_editor;'
  templateContent = prepend + templateContent + append

  fs.writeFileSync( dest, templateContent )

  // Templates are now ready to use.  
  console.log('template compile complete')
  process.exit()
})