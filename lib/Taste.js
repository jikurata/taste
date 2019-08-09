'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const Profile = require('./Profile.js');
const Flavor = require('./Flavor.js');
const init = Symbol('init');
const start = Symbol('start');
const recordResults = Symbol('recordResults');
const printResults = Symbol('printResults');

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
let instance = null;

class Taste extends Emitter {
  constructor() {
    if ( instance ) return instance;
    super();
    instance = this;
    Object.defineProperty(this, 'flavors', {
      value: {},
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'profile', {
      value: new Profile(),
      enumerable: true,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        'root': null,
        'IS_READY': false,
        'IS_COMPLETE': false,
        'IS_BROWSER': isBrowser
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'result', {
      value: {
        'flavorCount': 0,
        'expectCount': 0,
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
    this.events.register('ready', {persist: true});
    this.events.register('complete', {persist: true});
    this.state.on('change', (p, v) => {
      if ( v ) {
        switch(p) {
          case 'IS_READY': return this.emit('ready');
          case 'IS_COMPLETE': return this.emit('complete');
          default: return;
        }
      }
    });

    if ( this.isBrowser ) {
      window.addEventListener('load', () => {
        this.state.root = document.body;
        this.state.IS_READY = true;
      });
    }
    else this.state.IS_READY = true;
    this[start] = Date.now();
  }

  /**
   * Searches DOM for a single match with the selector
   * Sets the root to the element found
   * @param {String} selector 
   */
  prepare(selector) {
    if ( this.isBrowser ) {
      if ( !this.isReady ) return this.once('ready', () => this.prepare(selector));
      this.state.root = document.querySelector(selector);
    }
  }

  /**
   * Creates a new Flavor to be tasted
   */
  flavor(title) {
    const id = `flavor${Object.keys(this.flavors).length}`;
    const flavor = new Flavor(id, title, this);
    flavor.on('complete', () => {
      this.result.flavorCount++;
    });
    this.flavors[id] = flavor;
    return flavor;
  }

  recordResults(flavor) {
    flavor.forEachExpectation((expect) => {
      if ( expect.isRecorded ) return;
      this.result.expectCount++;
      if ( expect.state.result === 'Passed' ) this.result.pass++;
      else if ( expect.state.result === 'Failed' ) this.result.fail++;
      else this.result.error++;
      expect.state.IS_RECORDED = true;
    });
    if ( this.isBrowser && this.result.flavorCount === this.flavorCount) {
      this.printResults();
    }
  }

  printResults() {
    this.result.elapsedTime = Date.now() - this[start];
    if ( this.isBrowser ) {
      const nav = document.createElement('nav');
      nav.className = 'taste-navigation';
      let passed = [];
      let failed = [];
      let error = [];
      const ids = Object.keys(this.flavors);
      for ( let i = 0; i < ids.length; ++i ) {
        const flavor = this.flavors[ids[i]];
        flavor.forEachExpectation((except) => {
          let a = error;
          if ( except.result === 'Passed' ) a = passed;
          else if ( except.result === 'Failed' ) a = failed;
          a.push(`<a class="taste-navigation-link" href="#${flavor.id}">${a.length + 1}. ${flavor.title}</a><br>`);
        });
      }
      const node = document.createElement('section');
      node.className = 'taste-summary';
      node.innerHTML = `
        <h2 class="taste-summary-title">Summary:</h2>
        <p class="taste-summary-content">Number of flavors: <span class="taste-summary-count" data-taste="flavorCount">${this.result.flavorCount}</span></p>
        <p class="taste-summary-content">Number of Expectations: <span class="taste-summary-count" data-taste="expectCount">${this.result.expectCount}</span></p>
        <p class="taste-summary-content">Passed: <span class="taste-summary-passed"  data-taste="passed">${this.result.pass}/${this.result.expectCount}</span></p>
        ${passed.join('')}
        <p class="taste-summary-content">Failed: <span class="taste-summary-failed"  data-taste="failed">${this.result.fail}/${this.result.expectCount}</span></p>
        ${failed.join('')}
        <p class="taste-summary-content">Errors: <span class="taste-summary-errors" data-taste="errors">${this.result.error}/${this.result.expectCount}</span></p>
        ${error.join('')}
        <p class="taste-summary-content">Elapsed Time: <span class="taste-summary-time" data-taste="elapsedTime">${this.result.elapsedTime}ms</span></p>
      `;
      this.root.appendChild(node.cloneNode(true));
      this.root.insertAdjacentElement('afterbegin', node.cloneNode(true));
    }
    else {
      let s = `Number of flavors: ${this.flavorCount}\n`;
      s += `Number of Expectations: ${this.result.expectCount}\n`;
      s += `Passed: ${this.result.pass}/${this.result.expectCount}\n`;
      s += `Failed: ${this.result.fail}/${this.result.expectCount}\n`;
      s += `Errors: ${this.result.error}/${this.result.expectCount}\n`;
      s += `Elapsed Time: ${this.result.elapsedTime}ms\n`;
      process.stdout.write(s + '\n');
    }
    this.state.IS_COMPLETE = true;
  }

  get root() {
    return this.state.root;
  }

  get flavorCount() {
    return Object.keys(this.flavors).length;
  }

  get isReady() {
    return this.state.IS_READY;
  }

  get isComplete() {
    return this.state.IS_COMPLETE;
  }

  get isBrowser() {
    return this.state.IS_BROWSER;
  }
}

module.exports = Taste;
