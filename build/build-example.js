'use strict';
const Path = require('path');
const browserify = require('browserify');
const fs = require('fs-extra');
const buildClear = require('./build-clear.js');


const files = [
  '_test/example/src/browser.test.html',
  '_test/example/src/style.css',
  '_test/example/src/browser.test.js'
];

function build() {
  buildClear();
  files.forEach(file => {
    console.log(`Building ${file}...`);
    const dist = file.replace('src', 'dist');
    const filepath = Path.parse(file);
    const ext = filepath.ext
    if ( ext === '.js' ) {
      const b = browserify(file);
      b.bundle((err, buff) => {
        if ( err ) return console.error(err);
        fs.writeFileSync(dist, buff);
        console.log(`Successfully built ${file}`);
      });
    }
    else {
      fs.copyFileSync(file, dist);
      console.log(`Successfully built ${file}`);
    }
  });
}

build();
module.exports = build;
