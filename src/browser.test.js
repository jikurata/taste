'use strict';
const Taste = require('../index.js');
const Flavor = require('../lib/Flavor.js');

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
    Taste.profile.addResultAgain = add(6,4);
  })
  .expect('addResult').toEqual(5)
  .expect('addResultAgain').toEqual(10);

Taste.flavor('Synchronous fail test')
  .describe('Add 4 + 1')
  .test(() => {
    Taste.profile.wrongResult = add(4,1);
  })
  .expect('wrongResult').toEqual(3);

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
  .describe('Fails after 3000ms')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncFailed = true;
    }, 3000);
  })
  .expect('asyncFailed').toBeFalsy();

Taste.flavor('Asynchronous timeout test')
  .describe('Test exceeds timeout')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncTimeout = true;
    }, 3000);
  })
  .expect('asyncTimeout').toBeTruthy();

Taste.flavor('Pass Flavor instance to test')
.describe('this is the current Flavor in the test scope')
.test((flavor) => {
  console.log('flavor', flavor, this);
  Taste.profile.thisIsFlavor = this instanceof Flavor;
})
.expect('thisIsFlavor').toBeTruthy()
.finished((flavor) => {
  console.log('done', flavor);
});
  
if ( Taste.isBrowser ) {
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
