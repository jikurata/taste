'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const Flavor = require('./Flavor.js');
const init = Symbol('init');
const writeResults = Symbol('writeResults');
const runContext = Symbol('runContext');
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
        'fail': 0
      },
      enumerable: true,
      writable: false,
      configurable: false
    });
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
  }

  /**
   * Searches DOM for a single match with the selector
   * Sets the root to the element found
   * @param {String} selector 
   */
  prepare(selector) {
    if ( !this.isReady ) return this.once('IS_READY', () => this.prepare(selector));
    this.root = document.querySelector(selector);
  }

  /**
   * Creates a new Flavor to be tasted
   */
  flavor(title) {
    const id = `flavor${Object.keys(this.flavors).length}`;
    const flavor = new Flavor(id, title, this);
    flavor.on('done', (result) => this[writeResults](result));
    this.flavors[id] = flavor;
    return flavor;
  }

  [writeResults]() {

  }

  get isReady() {
    return this.state.IS_READY;
  }
}

module.exports = new Taste();
