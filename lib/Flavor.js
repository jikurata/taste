'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const Expectation = require('./Expectation.js');
const init = Symbol('init');
const appendToDOM = Symbol('appendToDOM');
const updateProgress = Symbol('updateProgress');
const updateSample = Symbol('updateSample');

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
        sample: null,
        IS_READY: false,
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
      this.state.ERROR = err;
      this.state.IS_COMPLETE = true;
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
    node.className = 'taste-flavor';
    const html = `
      <header>
        <h2 class="taste-flavor-title" data-flavor="title">${this.title}</h2>
      </header>
      <section data-flavor="content">
        <h3 class="taste-flavor-content">Status: <span class="taste-flavor-status" data-flavor="status">Preparing...</span></h4>
        <p class="taste-flavor-content">Duration: <span class="taste-flavor-duration" data-flavor="duration">0</span>ms</p>
        <p class="taste-flavor-content">Timeout: <span class="taste-flavor-timeout" data-flavor="timeout">2500</span>ms</p>
        <p class="taste-flavor-content">Description: <span class="taste-flavor-description" data-flavor="description"></span></p>
        <section>
          <p>DOM:</p>
          <section class="taste-flavor-sample" data-flavor="sampleAsHTML"></section>
          <section class="taste-flavor-sample" data-flavor="sampleAsText"></section>
        </section>
        <p class="taste-flavor-content">Test: <span class="taste-flavor-test" data-flavor="test"></span></p>
        <p class="taste-flavor-content">Expects: <span class="taste-flavor-expect" data-flavor="expect"></span></p>
        <h3 class="taste-flavor-content">Result: <span class="taste-flavor-result" data-flavor="result"></span></h3>
      </section>
    `;
    node.innerHTML = html;
    this.taste.root.appendChild(node);
    this.root = node;
    this.state.IS_READY = true;
  }

  [updateProgress]() {
    const status = (this.state.ERROR) ? 'Error' : (this.isComplete) ? 'Complete' :
    (this.isInProgress) ? 'In progress...' : 'Preparing...';
    this.getElement('status').textContent = status;
  }

  [updateSample]() {
    const sampleAsHTML = this.getElement('sampleAsHTML');
    const sampleAsText = this.getElement('sampleAsText');
    const sampleRoot = sampleAsHTML.children[0];

    // Only overwrite innerHTML of sampleAsHTML when there is no sample root
    if ( !sampleRoot ) sampleAsHTML.innerHTML = this.state.sample;
    else sampleAsText.textContent = sampleAsHTML.innerHTML;
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
      this[updateSample]();
      this.getElement('test').textContent = this.expectation.testToString();
      this.getElement('result').textContent = (this.state.ERROR) ? this.state.ERROR : 
        (this.isComplete) ? this.expectation.state.result : 'Pending...';
    }
  }

  /**
   * Creates a subtree in the dom to perform a test on
   * @param {String} html
   */
  sample(html) {
    this.state.sample = `${html}`;
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

  get isReady() {
    return this.state.IS_READY;
  }

  get isInProgress() {
    return this.state.IN_PROGRESS;
  }

  get isComplete() {
    return this.state.IS_COMPLETE;
  }
}

module.exports = Flavor;
