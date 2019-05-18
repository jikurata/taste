'use strict';
const Taste = require('../lib/Taste.js');

function add(x,y) {
  return x + y;
}

function appendDiv(target) {
  const node = document.createElement('div');
  target.appendChild(node);
}

Taste.prepare('#test');

Taste.flavor('add() function')
  .describe('Calculates the sum of two numbers')
  .test(() => {
    Taste.profile.addResult = add(4,1);
  })
  .expect('addResult').toEqual(5);
Taste.flavor('Asynchronous pass test')
  .timeout(5000)
  .describe('Resolves after 3000ms')
  .test(() => {
    window.setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();

Taste.flavor('Asynchronous fail test')
  .describe('Does not resolve after 2500ms')
  .test(() => {
    window.setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();
