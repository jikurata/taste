'use strict';
const Taste = require('./src/Taste.js');
const taste = new Taste();

function flavor(title) {
  return taste.flavor(title);
}

function prepare(querySelector) {
  return taste.prepare(querySelector);
}

function finished(handler) {
  return taste.finished(handler);
}

module.exports = flavor;
module.exports.prepare = prepare;
module.exports.finished = finished;
