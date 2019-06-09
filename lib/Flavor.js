'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const Expectation = require('./Expectation.js');
const init = Symbol('init');
const appendToDOM = Symbol('appendToDOM');
const updateSample = Symbol('updateSample');

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

class Flavor extends Emitter {
  constructor(id, title, taste) {
    super();
    this.root = null;
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
        title: title,
        description: '',
        status: '',
        result: '',
        sample: null,
        IS_READY: false,
        IN_PROGRESS: false,
        IS_COMPLETE: false,
        ERROR: false,
        IS_BROWSER: isBrowser
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[init]();
  }

  [init]() {
    this.state.on('change', (p, v) => {
      this.update();
      this.emit(p, v);
    });

    this.expectation.on('complete', (result) => {
      this.state.IS_COMPLETE = true;
    });
    this.expectation.on('error', (err) => {
      this.state.ERROR = err;
      this.state.IS_COMPLETE = true;
    });

    // Wait for window to finish loading before appending anything to the DOM
    if ( this.isBrowser ) {
      if ( this.taste.isReady ) {
        this[appendToDOM]();
        this.update();
      }
      else this.taste.once('ready', () => {
        this[appendToDOM]();
        this.update();
      });
    }
    else {
      this.on('IS_COMPLETE', (bool) => {
        if ( bool ) {
          let s = `${this.state.title}\n`;
          s += `\tStatus: ${this.state.status}\n`;
          s += `\tResult: ${this.state.result}\n`;
          s += `\tDuration: ${this.expectation.state.duration}ms\n`;
          s += `\tTimeout: ${this.expectation.state.timeout}ms\n`;
          s += `\tTest: ${this.expectation.testToString()}\n`;
          s += `\tExpects: ${this.expectation.state.expectStatement}\n`;
          s += `\tReceived: ${this.expectation.state.evaluator} = ${this.taste.profile[this.expectation.state.evaluator]}\n`;
          process.stdout.write(s + '\n');
        }
      });
    }
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
        <h2 class="taste-flavor-title" data-flavor="title">${this.state.title}</h2>
      </header>
      <section data-flavor="content">
        <h3 class="taste-flavor-content">Status: <span class="taste-flavor-status" data-flavor="status">Preparing...</span></h4>
        <h3 class="taste-flavor-content">Result: <span class="taste-flavor-result" data-flavor="result"></span></h3>
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
        <p class="taste-flavor-content">Received: <span class="taste-flavor-received" data-flavor="received"></span></p>
      </section>
    `;
    node.innerHTML = html;
    this.taste.root.appendChild(node);
    this.root = node;
    this.state.IS_READY = true;
  }

  [updateSample]() {
    if ( this.isBrowser ) {
      const sampleAsHTML = this.getElement('sampleAsHTML');
      const sampleAsText = this.getElement('sampleAsText');
      const sampleRoot = sampleAsHTML.children[0];
  
      // Only overwrite innerHTML of sampleAsHTML when there is no sample root
      if ( !sampleRoot ) sampleAsHTML.innerHTML = this.state.sample;
      else sampleAsText.textContent = sampleAsHTML.innerHTML;
    }
  }

  /**
   * Synchronize the view with the Flavor object
   */
  update() {
    if ( this.taste.isReady ) {
      this.state.status = (this.state.ERROR) ? 'Error' : (this.isComplete) ? 'Complete' :
      (this.isInProgress) ? 'In progress...' : 'Preparing...';
      this.state.result = (this.state.ERROR) ? this.state.ERROR : 
      (this.isComplete) ? this.expectation.state.result : 'Pending...';
      if ( this.isBrowser ) {
        this.getElement('status').textContent = this.state.status;
        this.getElement('title').textContent = this.state.title;
        this.getElement('timeout').textContent = this.expectation.state.timeout;
        this.getElement('description').textContent = this.state.description;
        this[updateSample]();
        this.getElement('test').textContent = this.expectation.testToString();
        this.getElement('result').textContent = this.state.result;
        this.getElement('received').textContent = (this.isComplete) ? `${this.expectation.state.evaluator} = ${this.taste.profile[this.expectation.state.evaluator]}` : '';
      }
    }
  }

  /**
   * Creates a subtree in the dom to perform a test on
   * @param {String} html
   */
  sample(html) {
    if ( this.isBrowser ) {
      this.state.sample = `${html}`;
      this.update();
    }
    return this;
  }

  /**
   * Defines the descriptor for the flavor
   * @param {String} s 
   */
  describe(s) {
    this.state.description = s;
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
    if ( this.isBrowser && this.root ) return this.root.querySelector(`[data-flavor="${s}"]`);
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

  get isBrowser() {
    return this.state.IS_BROWSER;
  }
}

module.exports = Flavor;
