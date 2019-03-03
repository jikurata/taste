# Taste v0.0.0
Test client-side code directly in a web browser
---
## Install
```
npm install @jikurata/taste
```
## Usage
Taste utilizes familiar syntaxes from Jest and Mocha.
```
const Taste = require('@jikurata/taste');
const taste = new Taste();

// test these
function add(x,y) { return x+y; }
function div(el) { el.appendChild(document.createElement('div')); }

taste.describe('Returns the sum of two numbers', () => {
    taste.describe('Returns 8', () => {
        const sum = add(3,5);
        taste.expect(sum).tobe(8);
    });
});
taste.describe('Appends a div element to its target', () => {
    taste.describe('target has one div element', () => {
        const doc = taste.sample(`
            <section id="foo"></section>
        `);
        const target = doc.getElementById('foo');
        div(target);
        taste.expect(target.getElementsByTagName('div').length).toBe(1);
    });
});
```
Testing asynchronous code is no problem
```
function asyncFn() {
    window.setTimeout(() => {
        taste.expect(1).toBe(1);
    }, 6000);
}

taste.test('Resolves test in 6000ms', () => {
    asyncFn(); // test resolves after timeout fn triggers
    taste.timeout(7000); // Change test timeout to 7000ms to prevent the test from throwing before the timer triggers. Default timeout is 5000ms
});
```
## Plans
- Make compatible with Internet Explorer
- Implement more resolution methods for expect
- Implement before and after
- Improve organization of the test view

## Version Log
---
