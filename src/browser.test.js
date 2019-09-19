'use strict';
const Taste = require('../index.js');
const Profile = require('../lib/Profile.js');

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
.test(profile => {
  profile.addResult = add(4,1);
  profile.addResultAgain = add(6,4);
})
.expect('addResult').toEqual(5)
.expect('addResultAgain').toEqual(10);

Taste.flavor('Synchronous fail test')
.describe('Add 4 + 1')
.test(profile => {
  profile.wrongResult = add(4,1);
})
.expect('wrongResult').toEqual(3);

Taste.flavor('Asynchronous pass test')
.timeout(5000)
.describe('Resolves after 3000ms')
.test(profile => {
  setTimeout(() => {
    profile.asyncResult = true;
  }, 3000);
})
.expect('asyncResult').toBeTruthy();

Taste.flavor('Asynchronous fail test')
.timeout(5000)
.describe('Fails after 3000ms')
.test(profile => {
  setTimeout(() => {
    profile.asyncFailed = true;
  }, 3000);
})
.expect('asyncFailed').toBeFalsy();

Taste.flavor('Asynchronous timeout test')
.describe('Test exceeds timeout')
.test(profile => {
  setTimeout(() => {
    profile.asyncTimeout = true;
  }, 3000);
})
.expect('asyncTimeout').toBeTruthy();

Taste.flavor('Pass Flavor profile instance to test')
.describe('profile is the current Flavor profile in the test scope')
.test(profile => {
  profile.thisIsFlavor = profile instanceof Profile;
})
.expect('thisIsFlavor').toBeTruthy();
  
if ( Taste.isBrowser ) {
  Taste.flavor('Taste sample dom test')
  .describe('Test contains a sample of html to be used in the test')
  .sample(`
    <section class="sample">
      <p>Sample Html Test</p>
    </section>
  `)
  .test((profile, sample) => {
    sample.innerHTML += '<p>This text was added during the test.</p>';
    profile.childrenLength = sample.children.length;
  })
  .expect('childrenLength').toBe(2);

}
