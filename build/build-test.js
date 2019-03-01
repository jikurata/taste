'use strict';
const browserify = require('browserify');
const fs = require('fs');

const files = [
  '_test/browser.test.js'
];

files.forEach(file => {
  const b = browserify(file);
  b.bundle((err, buff) => {
    if ( err ) return console.error(err);
    const dirpath = dir(file);
    fs.writeFileSync(`${dirpath}\\bundle.test.js`, buff);
  });
});

function dir(path) {
  let a = path.split(/\\|\//g);
  if ( a.length > 1 ) a.splice(a.length - 1, 1);
  return a.join('\\');
}
