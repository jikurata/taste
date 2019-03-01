'use strict';
const Context = require('./Context.js');

class Expect extends Context {
  constructor(id, param) {
    super(id, param);
    this._value = param.value;
    this._result = param.result;
  }

  toBe(value) {
    const passed = (this.value === value);
    if ( passed ) this.result.pass++;
    else this.result.fail++;
    const result = {
      passed: passed,
      status: (passed) ? 'Passed' : 'Failed'
    };
    const view = `
      <p>Expected ${this.value} to be ${value}</p>
      <p>Status: <span class="${(result.passed) ? 'pass' : 'fail'}">${result.status}</span></p>
    `;
    this.post(view);
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
