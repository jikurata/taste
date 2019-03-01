'use strict';
const Context = require('./Context.js');
const setTimeout = Symbol('setTimeout');

class Test extends Context {
  constructor(id, param) {
    super(id, param);
    this._timer = null;
    this._timeout = param.timeout || 5000;
  }

  run() {
    return new Promise((resolve, reject) => {
      this.runResolve = resolve;
      this.target.querySelector('.progress').textContent = 'Running...';
      this[setTimeout](() => {
        const error = new Error(`Test timed out after ${this.timeout}ms.`);
        const view = `<pclass="error">${error}</p>`;
        this.post(view);
        reject(error);
      });
      const result = this.handler(this.forceResolve);
      // If result is falsy and not false, then assume the test is asynchronous
      if ( !result && result !== false ) {
      }
      else resolve();
    })
    .then(() => {
      this.target.querySelector('.progress').textContent = 'Complete';
      this.target.innerHTML += `<p>Source: ${this.handler.toString()}</p>`;
    })
    .catch(err => {
      this.target.querySelector('.progress').textContent = err;
    });
  }

  forceResolve() {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runResolve ) this.runResolve();
  }

  [setTimeout](f) {
    if ( this.timer ) window.clearTimeout(this.timer);
    this._timer = window.setTimeout(f, this.timeout);
  }

  get timer() {
    return this._timer;
  }

  get timeout() {
    return this._timeout;
  }

  set timeout(t) {
    this._timeout = t;
    this[setTimeout]();
  }

  get isTest() {
    return true;
  }
}

module.exports = Test;
