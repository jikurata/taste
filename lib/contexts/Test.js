'use strict';
const Context = require('./Context.js/index.js');
const updateProgress = Symbol('updateProgress');
const setTimeout = Symbol('setTimeout');
const initializeView = Symbol('initializeView');
const printSource = Symbol('printSource');

const TEST_STATE = {
  0: 'In queue',
  1: 'Running',
  2: 'Complete',
  3: 'Error'
}

class Test extends Context {
  constructor(id, param) {
    super(id, param);
    this._duration = 0;
    this._interval = null;
    this._timer = null;
    this.runResolve = null;
    this.runReject = null;
    this._timeout = param.timeout || 5000;
    this[initializeView]();
    this[updateProgress](0);
  }

  [initializeView]() {
    const ul = document.createElement('ul');
    const view = `
      <p class="title">${this.description}</p>
      <ul class="info">
        <p>Progress: <span class="progress">In queue</span></p>
        <p>Duration: <span class="duration"></span>ms</p>
        <p class="source"></p>
      </ul>
    `;
    ul.innerHTML = view;
    this.post(ul, {node: true});
  }

  run() {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      this._interval = window.setInterval(() => {
        this.duration = Date.now() - start;
      }, 1);
      this[updateProgress](1);
      this.runResolve = resolve;
      this.runReject = reject;
      this[setTimeout]();
      this.handler();
    })
    .then(() => {
      this[updateProgress](2);
    })
    .catch(err => {
      this[updateProgress](3);
      const view = `<p class="error">${err}</p>`;
      this.post(view);
    })
    .finally(() => {
      window.clearInterval(this.interval);
      this[printSource]();
      this.runResolve = null;
      this.runReject = null;
    });
  }

  [printSource]() {
    this.root.querySelector('.source').innerHTML = `
      <p>Source:</p>
      <code>${this.handler.toString()}</code>
    `;
  }

  [updateProgress](n) {
    this.root.querySelector('.progress').textContent = TEST_STATE[n];
  }

  [setTimeout]() {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runReject ) this._timer = window.setTimeout(() => {
      const error = new Error(`Test timed out after ${this.timeout}ms.`);
      this.forceReject(error);
    }, this.timeout);
  }

  forceResolve(val) {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runResolve ) this.runResolve(val);
  }

  forceReject(err) {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runReject ) this.runReject(err);
  }

  get duration() {
    return this._duration;
  }

  set duration(t) {
    this._duration = t;
    this.root.querySelector('.duration').textContent = this._duration;
  }

  get interval() {
    return this._interval;
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
