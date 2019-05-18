'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const Expectation = require('./Expectation.js');
const init = Symbol('init');
const appendToDOM = Symbol('appendToDOM');
const updateProgress = Symbol('updateProgress');

class Flavor extends Emitter {
  constructor(id, title, taste) {
    super();
    this.root = null;
    this.title = title;
    this.description = '';
    Object.defineProperty(this, 'taste', {
      value: taste,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'id', {
      value: id,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'expectation', {
      value: new Expectation(this),
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        IN_DOM: false,
        IN_PROGRESS: false,
        IS_COMPLETE: false,
        ERROR: false
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[init]();
  }

  [init]() {
    this.state.on('change', (p, v) => {
      this.emit(p, v);
      this.update();
    });

    this.expectation.on('complete', (result) => {
      this.state.IS_COMPLETE = true;
    });
    this.expectation.on('error', (err) => {
      this.state.IS_COMPLETE = true;
      this.state.ERROR = err;
    });

    if ( this.taste.isReady ) {
      this[appendToDOM]();
      this.update();
    }
    else this.taste.once('ready', () => {
      this[appendToDOM]();
      this.update();
    });
  }

  /**
   * Adds the flavor to the view
   */
  [appendToDOM]() {
    const node = document.createElement('article');
    node.setAttribute('data-flavor', this.id);
    const html = `
      <header>
        <h3>Flavor: <span data-flavor="title">${this.title}</span></h3>
        <h4>Status: <span data-flavor="status">Preparing...</span></h4>
        <p>Duration: <span data-flavor="duration">0</span>ms</p>
        <p>Timeout: <span data-flavor="timeout">2500</span>ms</p>
      </header>
      <section data-flavor="content">
        <section>
          <p>Description: <span data-flavor="description"></span></p>
        </section>
        <section data-flavor="sample"></section>
        <section>
          <p>Test: <span data-flavor="test"></span></p>
        </section>
        <section>
          <p>Expects: <span data-flavor="expect"></span></p>
        </section>
        <section>
          <p>Result: <span data-flavor="result"></span></p>
        </section>
      </section>
    `;
    node.innerHTML = html;
    this.taste.root.appendChild(node);
    this.root = node;
    this.state.IN_DOM = true;
  }

  [updateProgress]() {
    const status = (this.state.ERROR) ? 'Error' : (this.isComplete) ? 'Complete' :
    (this.isInProgress) ? 'In progress...' : 'Preparing...';
    this.getElement('status').textContent = status;
  }

  /**
   * Synchronize the view with the Flavor object
   */
  update() {
    if ( this.taste.isReady ) {
      this[updateProgress]();
      this.getElement('title').textContent = this.title;
      this.getElement('timeout').textContent = this.expectation.state.timeout;
      this.getElement('description').textContent = this.description;
      this.getElement('test').textContent = this.expectation.testToString();
      this.getElement('result').textContent = (this.state.ERROR) ? this.state.ERROR : 
        (this.isComplete) ? this.expectation.state.result : 'Pending...';
    }
  }

  /**
   * Creates a subtree in the dom to perform a test on
   */
  sample(html) {
    this.sample = html;
    this.update();
    return this;
  }

  /**
   * Defines the descriptor for the flavor
   * @param {String} s 
   */
  describe(s) {
    this.description = s;
    this.update();
    return this;
  }

  /**
   * Performs the defined test 
   */
  test(handler) {
    this.expectation.assign(handler);
    this.update();
    return this;
  }

  /**
   * Verifies the results of the test by comparing a value from model with value from
   * expectation
   * @param {String} arg
   */
  expect(arg) {
    this.expectation.state.evaluator = arg;
    this.taste.profile.set(arg, null);
    this.update();
    return this.expectation;
  }

  timeout(t) {
    this.expectation.state.timeout = t;
    this.update();
    return this;
  }

  getElement(s) {
    if ( this.root ) return this.root.querySelector(`[data-flavor="${s}"]`);
    return null;
  }

  get isInDOM() {
    return this.state.IN_DOM;
  }

  get isInProgress() {
    return this.state.IN_PROGRESS;
  }

  get isComplete() {
    return this.state.IS_COMPLETE;
  }
}

module.exports = Flavor;
