'use strict';
const Errors = require('./error.js');
const Emitter = require('./Emitter.js');
const Profile = require('./Profile.js');
const Expectation = require('./Expectation.js');
const State = require('./State.js');
const init = Symbol('init');
const appendToDOM = Symbol('appendToDOM');
const updateSample = Symbol('updateSample');
const timeoutId = Symbol('timeoutId');
const timeIncrementer = Symbol('timeIncrementer');

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
    Object.defineProperty(this, 'profile', {
      value: new Profile(),
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        'title': title,
        'description': '',
        'status': '',
        'sample': null,
        'test': null,
        'root': null,
        'timeout': 2500,
        'start': 0,
        'duration': 0,
        'IS_READY': false,
        'IN_PROGRESS': false,
        'IS_COMPLETE': false,
        'ERROR': false
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[timeoutId] = null;
    this[init]();
  }

  [init]() {
    this.events.register('ready', {persist: true});
    this.events.register('complete', {persist: true});
    this.state.on('change', (p, v) => {
      this.update();
      switch(p) {
        case 'ERROR': return this.emit('error', v);
        case 'IS_READY': return this.emit('ready');
        case 'IS_COMPLETE': return this.emit('complete');
        default: return;
      }
    });
    this.on('error', (err) => {
      this.forEachExpectation((expect) => {
        if ( !expect.isComplete ) {
          expect.state.result = err;
          expect.state.IS_COMPLETE = true;
        }
      });
      this.state.IS_COMPLETE = true;
    });
    // Stop the timer once the flavor test is complete
    this.on('complete', () => {
      if ( this[timeIncrementer] ) {
        clearInterval(this[timeIncrementer]);
      }
      this.taste.result.flavorCount++;
      this.taste.recordResults(this);
      this.update();
    });

    // Wait for window to finish loading before appending anything to the DOM
    this.taste.once('ready', () => {
      this[appendToDOM]();
      this.state.IS_READY = true;
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
      <a name="${this.id}">
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
      </a>
    `;
    node.innerHTML = html;
    this.state.root = node;
    this.taste.root.appendChild(node);
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
    if ( !this.isReady ) return;

    // Update the status state
    this.state.status = (this.state.ERROR) ? 'Error' : (this.isComplete) ? 'Complete' :
    (this.isInProgress) ? 'In progress...' : 'Preparing...';
    
    if ( this.root ) {
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
          received = `${expect.evaluator} = ${expect.value}`;
        }
        else if ( this.state.ERROR ) {
          results.push(this.state.ERROR);
        }
        const html = `
        <p class="taste-flavor-content">Expects: <span class="taste-flavor-expect">${expect.expression}</span></p>
        <p class="taste-flavor-content">Received: <span class="taste-flavor-received">${received}</span></p>`;
        this.getElement('expectation').innerHTML += html;
      });
      this.getElement('result').textContent = results.join(' ');
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
    this.state.description = s;
    this.update();
    return this;
  }

  /**
   * Performs the defined test 
   */
  test(handler) {
    if ( this.isInProgress || this.isComplete ) return this;
    if ( typeof handler !== 'function' ) {
      this.state.ERROR = new Error('Test handler is not a function');
      return this;
    }
    

    this.state.test = handler;
    this.state.IN_PROGRESS = true;

    // Monitor flavor test duration
    this.state.start = Date.now();
    this[timeIncrementer] = setInterval(() => {
      this.state.duration = Date.now() - this.state.start;
      if ( this.root ) {
        this.getElement('duration').textContent = this.state.duration;
      }
      if ( this.state.duration >= this.state.timeout ) {
        this.state.ERROR = new Error(`Test timed out after ${this.state.timeout} ms`);
      }
    }, 1);
    
    try {
      // Check if Taste is ready to run tests before executing the test
      this.taste.once('ready', () => {
        // Pass the sample HTML if available as an argument for the test and execute the test
        handler(this, this.sample);
      });
    }
    catch(err) {
      this.state.ERROR = err;
    }
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
      this.update();
      this.taste.recordResults(this);
      if ( this.expectationsAreComplete() ) {
        this.state.IS_COMPLETE = true;
      };
    });

    const profile = this.taste.profile;
    if ( !profile.has(arg)) {
      if ( profile.hasOwnProperty(arg) ) {
        profile.emit(arg, profile[arg]);
      }
      else this.taste.profile.set(arg, undefined, false);
    }

    this.expectations.push(expect);
    this.update();
    return expect;
  }

  finished(handler) {
    if ( typeof handler !== 'function' ) {
      throw new TypeError(`Expected type function for argument, instead received ${typeof handler}`);
    }
    else {
      this.on('complete', () => {
        handler(this, this.sample);
      });
    }
    return this;
  }

  timeout(t) {
    this.state.timeout = t;
    this.update();
    return this;
  }

  getElement(s) {
    if ( this.root ) return this.root.querySelector(`[data-flavor="${s}"]`);
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

  get title() {
    return this.state.title;
  }

  get sample() {
    const sample = this.getElement('sampleAsHTML');
    if ( sample && !sample.getElementById ) sample.getElementById = (id) => { return sample.querySelector(`#${id}`); };
    return sample;
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
