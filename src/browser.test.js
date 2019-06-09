'use strict';
const Taste = require('../index.js');
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

function add(x,y) {
  return x + y;
}

function appendDiv(target) {
  const node = document.createElement('div');
  target.appendChild(node);
}

Taste.prepare('#test');

Taste.flavor('Synchronous pass test')
  .describe('Add 4 + 1')
  .test(() => {
    Taste.profile.addResult = add(4,1);
  })
  .expect('addResult').toEqual(5);

Taste.flavor('Synchronous fail test')
  .describe('Add 4 + 1')
  .test(() => {
    Taste.profile.addResult = add(4,1);
  })
  .expect('addResult').toEqual(3);

Taste.flavor('Asynchronous pass test')
  .timeout(5000)
  .describe('Resolves after 3000ms')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();

Taste.flavor('Asynchronous fail test')
  .timeout(5000)
  .describe('Does not resolve after 3000ms')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeFalsy();

Taste.flavor('Asynchronous timeout test')
  .describe('Test exceeds timeout')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();
  
if ( this.isBrowser ) {
  Taste.flavor('Taste sample dom test')
  .describe('Test contains a sample of html to be used in the test')
  .sample(`
    <section class="sample">
      <p>Sample Html Test</p>
    </section>
  `)
  .test((sample) => {
    sample.innerHTML += '<p>This text was added during the test.</p>';
    Taste.profile.childrenLength = sample.children.length;
  })
  .expect('childrenLength').toBe(2);

}
