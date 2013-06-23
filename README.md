Notes
=====

exposes `window.Blockly` to communciate through iframes

its `Blockly` not `Blocky` (this was the source of numerous bugs during development) 0_0


Start
=====
`node compile_soy.js`
`browserify index.js >>| bundle.js`
`npm start`