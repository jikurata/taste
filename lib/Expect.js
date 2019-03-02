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
    const view = `
      <ul>
        <p class="expect"></p>
        <p class="status"></p>
      </ul>
    `;
    this.post(view);
  }

  [resolveExpect](bool) {
    if ( bool ) this.result.pass++;
    else this.result.fail++;
    this.root.getElementsByClassName('status')[0].innerHTML = `Status: <span class="${(bool) ? 'pass' : 'fail'}">${(bool) ? 'PASS' : 'FAIL'}</span>`
  }

  toBe(value) {
    this._expectValue = value;
    this.root.getElementsByClassName('expect')[0].innerHTML = `Expected ${this.value} to be ${value}`;
    this[resolveExpect](this.value == value);
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
