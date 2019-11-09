'use strict';
const Taste = require('../../index.js');
const Profile = require('../../lib/Profile.js');

function add(x,y) {
  return x + y;
}

function appendDiv(target) {
  const node = document.createElement('div');
  target.appendChild(node);
} 

Taste.prepare('#test');

Taste('Synchronous pass test')
.test('Add 4 + 1', profile => {
  profile.addResult = add(4,1);
  profile.addResultAgain = add(6,4);
})
.expect('addResult').toEqual(5)
.expect('addResultAgain').toEqual(10);

Taste('Synchronous fail test')
.test('Add 4 + 1', profile => {
  profile.wrongResult = add(4,1);
})
.expect('wrongResult').toEqual(3);

Taste('Asynchronous pass test')
.test('Resolves after 1000ms', profile => {
  setTimeout(() => {
    profile.asyncResult = true;
  }, 1000);
})
.timeout(5000)
.expect('asyncResult').toBeTruthy();

Taste('Asynchronous fail test')
.test('Fails after 1000ms', profile => {
  setTimeout(() => {
    profile.asyncFailed = true;
  }, 1000);
})
.timeout(5000)
.expect('asyncFailed').toBeFalsy();

Taste('Asynchronous timeout test')
.test('Test exceeds timeout', profile => {
  setTimeout(() => {
    profile.asyncTimeout = true;
  }, 1000);
})
.timeout(500)
.expect('asyncTimeout').toBeTruthy();

Taste('Pass Flavor profile instance to test')
.test('profile is the current Flavor profile in the test scope', profile => {
  profile.thisIsFlavor = profile instanceof Profile;
})
.expect('thisIsFlavor').toBeTruthy();

// DOM Test
Taste('Taste sample dom test')
.sample(`
  <section class="sample">
    <p>Sample Html Test</p>
  </section>
`)
.test('Test contains a sample of html to be used in the test', (profile, sample) => {
  sample.innerHTML += '<p>This text was added during the test.</p>';
  profile.childrenLength = sample.children.length;
})
.expect('childrenLength').toBe(2);
