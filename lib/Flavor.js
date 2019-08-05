'use strict';
const Emitter = require('./Emitter.js');
const Expectation = require('./Expectation.js');
const State = require('./State.js');
const init = Symbol('init');
const appendToDOM = Symbol('appendToDOM');
const updateSample = Symbol('updateSample');
const timeoutId = Symbol('timeoutId');
const timeIncrementer = Symbol('timeIncrementer');

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

class Flavor extends Emitter {
  constructor(id, title, taste) {
    super();
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
    Object.defineProperty(this, 'expectations', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        'title': title,
        'description': '',
        'status': '',
        'result': '',
        'sample': null,
        'test': null,
        'root': null,
        'timeout': 2500,
        'duration': 0,
        'IS_READY': false,
        'IN_PROGRESS': false,
        'IS_COMPLETE': false,
        'ERROR': false,
        'IS_BROWSER': isBrowser
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[timeoutId] = null;
    this[init]();
  }

  [init]() {
    this.state.on('change', (p, v) => {
      this.update();
      switch(p) {
        case 'IS_COMPLETE':
          if ( v ) this.emit('complete');
          break;
      }
      this.emit(p, v);
    });
    // Stop the timer once the flavor test is complete
    this.on('complete', () => {
      if ( this[timeIncrementer] ) {
        clearInterval(this[timeIncrementer]);
      }
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
      this.once('IS_COMPLETE', () => {
        // TODO: Refactor to handle multiple expectations
        let s = `${this.state.title}\n`;
        s += `\tStatus: ${this.state.status}\n`;
        s += `\tResult: ${this.state.result}\n`;
        s += `\tDuration: ${this.state.duration}ms\n`;
        s += `\tTimeout: ${this.state.timeout}ms\n`;
        s += `\tTest: ${this.testToString()}\n`;
        this.forEachExpectation((expect) => {
          s += `\tExpects: ${expect.expression}\n`;
          s += `\tReceived: ${expect.evalauator} = ${this.taste.profile[expect.evalauator]}\n`;
        });
        process.stdout.write(s + '\n');
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
        <div class="taste-flavor-content">
          Expectations:
          <section class="taste-flavor-expectation" data-flavor="expectation"></section>
        </div>
      </section>
    `;
    node.innerHTML = html;
    this.taste.root.appendChild(node);
    this.state.root = node;
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
      
      if ( this.state.ERROR ) {
        this.state.result = this.state.ERROR;
      }
      else if ( this.isComplete ) {
        const results = [];
        this.forEachExpectation((expect) => {
          results.push(expect.state.result);
        });
        this.state.result = results.join(' ');
      }
      else {
        this.state.result = 'Pending...';
      }
      
      if ( this.isBrowser ) {
        this.getElement('status').textContent = this.state.status;
        this.getElement('title').textContent = this.state.title;
        this.getElement('timeout').textContent = this.state.timeout;
        this.getElement('description').textContent = this.state.description;
        this[updateSample]();
        this.getElement('test').textContent = this.testToString();
        const results = [];
        this.getElement('expectation').innerHTML = '';
        this.forEachExpectation((expect) => {
          let received = '';
          if ( expect.isComplete ) {
            results.push(expect.result);
            received = `${expect.evaluator} = ${this.taste.profile[expect.evaluator]}`;
          }
          else results.push('Pending');
          const html = `
          <p class="taste-flavor-content">Expects: <span class="taste-flavor-expect">${expect.expression}</span></p>
          <p class="taste-flavor-content">Received: <span class="taste-flavor-received">${received}</span></p>`;
          this.getElement('expectation').innerHTML += html;
        });
        this.getElement('result').textContent = results.join(' ');
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
      if ( typeof handler !== 'function' ) {
        this.state.ERROR = new Errror('Test handler is not a function');
        return this;
      }

      this.emit('start');
      this.state.test = handler;
      this.state.IN_PROGRESS = true;

      // Monitor flavor test duration
      const start = Date.now();
      this[timeIncrementer] = setInterval(() => {
        this.state.duration = Date.now() - start;
        if ( this.isBrowser ) {
          this.getElement('duration').textContent = this.state.duration;
        }
        if ( this.state.duration >= this.state.timeout ) {
          this.state.ERROR = new Error(`Test timed out after ${this.state.timeout} ms`);
          this.state.IS_COMPLETE = true;
          return this;
        }
      }, 1);
      
      // Pass the sample HTML if available as an argument for the test and execute the test
      if ( this.isBrowser ) {
        // Check if Taste is ready to run tests before executing the test
        if ( this.taste.isReady ) {
          const sample = this.getElement('sampleAsHTML');
          if ( !sample.getElementById ) sample.getElementById = (id) => { return sample.querySelector(`#${id}`); };
          handler(sample);
        }
        else this.taste.once('ready', () => {
          const sample = this.getElement('sampleAsHTML');
          if ( !sample.getElementById ) sample.getElementById = (id) => { return sample.querySelector(`#${id}`); };
          handler(sample);
        });
      }
      else handler(undefined);
    this.update();
    return this;
  }

  /**
   * Verifies the results of the test by comparing a value from model with value from
   * expectation
   * @param {String} arg
   */
  expect(arg) {
    const expect = new Expectation(this, arg);
    // When all expectations are complete, then the flavor's state is complete
    expect.on('complete', () => {
      console.log('done', this.expectationsAreComplete());
      this.update();
      if ( this.expectationsAreComplete() ) {
        this.state.IS_COMPLETE = true;
      }
    });
    this.taste.profile.set(arg, null, false);
    this.expectations.push(expect);
    this.update();
    return expect;
  }

  timeout(t) {
    this.state.timeout = t;
    this.update();
    return this;
  }

  getElement(s) {
    if ( this.isBrowser && this.root ) return this.root.querySelector(`[data-flavor="${s}"]`);
    return null;
  }

  expectationsAreComplete() {
    for ( let i = 0; i < this.expectations.length; ++i ) {
      const expect = this.expectations[i];
      if ( !expect.isComplete ) return false;
    }
    return true;
  }

  forEachExpectation(fn) {
    if ( typeof fn !== 'function' ) throw new Error(`Expected a function as an argument, but instead received a type ${typeof fn}`);
    for ( let i = 0; i < this.expectations.length; ++i ) {
      const expect = this.expectations[i];
      fn(expect);
    }
  }

  testToString() {
    if ( this.state.test ) return this.state.test.toString();
    return '';
  }

  get root() {
    return this.state.root;
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
