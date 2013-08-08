Example
=======

See the (example app)[https://github.com/kumavis/node-blockly-js-editor-example] for implementation


Notes
=====

exposes `window.Blockly` to communciate through iframes

its `Blockly` not `Blocky` (this was the source of numerous bugs during development) 0_0


Start
=====
```bash
browserify index.js -o bundle.js
npm start
```

use `node compile_soy.js` if you make a change to the template in `templates/template.soy`


Attribs (these need to be added to the app)
=======
<a href="http://thenounproject.com/noun/trash-can/#icon-No3875" target="_blank">Trash Can</a> designed by <a href="http://thenounproject.com/nifanic" target="_blank">Nick Nifadéff</a> from The Noun Project