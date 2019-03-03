'use strict';
const Context = require('./Context.js');
const initializeView = Symbol('initializeView');
const resolveExpect = Symbol('resolveExpect');

class Expect extends Context {
  constructor(id, param) {
    super(id, param);
    this._value = param.value;
    this._result = param.result;
    this[initializeView]();
  }

  [initializeView]() {
    const ul = document.createElement('ul');
    const view = `
      <p class="expect"></p>
      <p class="status"></p>
    `;
    ul.innerHTML = view;
    this.post(ul, {node: true});
    this.root.style.border = '0';
  }

  [resolveExpect](bool) {
    if ( bool ) {
      this.result.pass++;
      this.root.style.border = '2px solid rgb(60,120,120)';
    }
    else {
      this.result.fail++;
      this.root.style.border = '2px solid rgb(255,120,120)';
    }
    this.root.getElementsByClassName('status')[0].innerHTML = `Status: <span class="${(bool) ? 'pass' : 'fail'}">${(bool) ? 'PASS' : 'FAIL'}</span>`
  }

  toBe(value) {
    this.root.getElementsByClassName('expect')[0].innerHTML = `Expected ${this.value} == ${value}`;
    this[resolveExpect](this.value == value);
  }

  toEqual(value) {
    this.root.getElementsByClassName('expect')[0].innerHTML = `Expected ${this.value} === ${value}`;
    this[resolveExpect](this.value === value);
  }

  get result() {
    return this._result;
  }

  get value() {
    return this._value;
  }

  get isExpect() {
    return true;
  }
}

module.exports = Expect;
