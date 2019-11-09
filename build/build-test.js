'use strict';
const browserify = require('browserify');
const fs = require('fs-extra');


const files = [
  'src/test/browser.test.html',
  'src/test/style.css',
  'src/test/browser.test.js'
];

function build() {
  files.forEach(file => {
    console.log(`Building ${file}...`);
    const dist = file.replace('src', 'test');
    const ext = filetype(file);
    if ( ext === 'js' ) {
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

function filetype(file) {
  const name = file.split('.');
  return name[name.length - 1];
}

function dir(path) {
  let a = path.split(/\\|\//g);
  if ( a.length > 1 ) a.splice(a.length - 1, 1);
  return a.join('\\');
}

build();
module.exports = build;
