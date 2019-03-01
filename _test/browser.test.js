'use strict';
const Taste = require('../lib/Taste.js');

function add(x,y) {
  return x + y;
}

function appendDiv(target) {
  const node = document.createElement('div');
  target.appendChild(node);
}

function run() {
  const taste = new Taste();
  const root = document.getElementById('test');
  taste.prepare(root, () => {
    taste.describe('Adds two numbers together', () => {
      taste.test('Add(3,5) returns 8', () => {
        taste.expect(add(3,5)).toBe(8);
      });
      taste.test('Add(-3,5) returns 2', () => {
        taste.expect(add(-3,5)).toBe(2);
      });
    });
    taste.describe('Adds a div element to its target', () => {
      const doc = taste.sample(`
        <section id="test">
          <p>A div element should be added here</p>
        </section>
      `);
      taste.test('Target has one div element', () => {
        const node = doc.getElementById('test');
        appendDiv(node);
        taste.expect(doc.getElementsByTagName('div').length).toBe(1);
      });
    });
    taste.describe('This test is designed to fail', () => {
      taste.test('Returns 1', () => {
        taste.expect(0).toBe(1);
      });
    });
  });
  taste.runTests();
}

window.addEventListener('load', run);
