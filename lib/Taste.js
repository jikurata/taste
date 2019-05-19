'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const Flavor = require('./Flavor.js');
const init = Symbol('init');
const start = Symbol('start');
const recordResults = Symbol('recordResults');
const printResults = Symbol('printResults');

let instance = null;

class Taste extends Emitter {
  constructor() {
    if ( instance ) return instance;

    super();
    instance = this;
    this.root = null;
    Object.defineProperty(this, 'flavors', {
      value: {},
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'profile', {
      value: new State(),
      enumerable: true,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        IS_READY: false
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'result', {
      value: {
        'count': 0,
        'pass': 0,
        'fail': 0,
        'error': 0,
        'elapsedTime': 0
      },
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[start] = null;
    this[init]();
  }

  [init]() {
    this.profile.on('change', (p, v) => this.emit(p, v));
    this.state.on('change', (p, v) => {
      if ( v ) {
        switch(p) {
          case 'IS_READY': return this.emit('ready');
          default: return;
        }
      }
    });

    window.addEventListener('load', () => {
      this.root = document.body;
      this.state.IS_READY = true;
    });
    this[start] = Date.now();
  }

  /**
   * Searches DOM for a single match with the selector
   * Sets the root to the element found
   * @param {String} selector 
   */
  prepare(selector) {
    if ( !this.isReady ) return this.once('ready', () => this.prepare(selector));
    this.root = document.querySelector(selector);
  }

  /**
   * Creates a new Flavor to be tasted
   */
  flavor(title) {
    const id = `flavor${Object.keys(this.flavors).length}`;
    const flavor = new Flavor(id, title, this);
    flavor.once('IS_COMPLETE', () => this[recordResults](flavor));
    this.flavors[id] = flavor;
    return flavor;
  }

  [recordResults](flavor) {
    this.result.count++;
    if ( flavor.expectation.state.result === 'Passed' ) this.result.pass++;
    else if ( flavor.expectation.state.result === 'Failed' ) this.result.fail++;
    else this.result.error++;
    if ( this.result.count === Object.keys(this.flavors).length ) {
      this.result.elapsedTime = Date.now() - this[start];
      this[printResults]();
    }
  }

  [printResults]() {
    const node = document.createElement('section');
    node.className = 'taste-summary';
    node.innerHTML = `
      <h2 class="taste-summary-title">Summary:</h2>
      <p class="taste-summary-content">Number of tests: <span class="taste-summary-count" data-taste="testCount">${this.result.count}</span></p>
      <p class="taste-summary-content">Passed: <span class="taste-summary-passed"  data-taste="passed">${this.result.pass}/${this.result.count}</span></p>
      <p class="taste-summary-content">Failed: <span class="taste-summary-failed"  data-taste="failed">${this.result.fail}/${this.result.count}</span></p>
      <p class="taste-summary-content">Errors: <span class="taste-summary-errors" data-taste="errors">${this.result.error}/${this.result.count}</span></p>
      <p class="taste-summary-content">Elapsed Time: <span class="taste-summary-time" data-taste="elapsedTime">${this.result.elapsedTime}ms</span></p>
    `;
    this.root.appendChild(node.cloneNode(true));
    this.root.insertAdjacentElement('afterbegin', node.cloneNode(true));
  }

  get isReady() {
    return this.state.IS_READY;
  }
}

module.exports = new Taste();
