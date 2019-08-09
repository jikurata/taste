(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
const Taste = require('./lib/Taste.js');

module.exports = new Taste();

},{"./lib/Taste.js":7}],2:[function(require,module,exports){
'use strict';
const Events = require('@jikurata/events');

class Emitter {
  constructor(config = {enumerable: false}) {
    Object.defineProperty(this, 'events', {
      value: new Events(),
      writable: false,
      configurable: false,
      enumerable: (config.hasOwnProperty('enumerable')) ? config.enumerable : false
    });
  }

  emit(e, ...args) {this.events.emit(e, ...args);}

  on(e, f, options = {}) {this.events.addEventListener(e,f, options);}

  once(e, f, options = {}) {
    options.once = true;
    this.events.addEventListener(e, f, options);
  }
}

module.exports = Emitter;

},{"@jikurata/events":8}],3:[function(require,module,exports){
'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const init = Symbol('init');
const execute = Symbol('execute');

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

/**
 * An Expectation instance is created whenever a Flavor instance is created.
 * Expectation is responsible for overseeing the progress of the test and its results.
 * In order for a test to start running, the Expectation needs a test, evaluator, and
 * comparator defined.
 * However, the test needs to be called through the Flavor instance.
 * 
 * Events:
 * ready: Emits when all parameters for a test are defined
 * start: Emits when the test is executed
 * complete: Emits when the test is evaluated and results have been recorded
 */
class Expectation extends Emitter {
  constructor(flavor, evaluator) {
    if ( !evaluator || typeof evaluator !== 'string' ) {
      this.state.result = new Error(`Expected a string as an argument, but instead received ${typeof evaluator}`);
      this.state.IS_COMPLETE = true;
      return null;
    }
    super();
    Object.defineProperty(this, 'flavor', {
      value: flavor,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        'expectStatement': '',
        'evaluator': evaluator,
        'comparator': null,
        'value': null,
        'result': null,
        'IS_READY': false,
        'IS_COMPLETE': false,
        'IS_RECORDED': false,
        'IS_BROWSER': isBrowser
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[init]();
  }

  [init]() {
    this.events.register('ready', {persist: true});
    this.events.register('complete', {persist: true});
    
    this.state.on('change', (p, v) => {
      if ( v ) {
        switch(p) {
          case 'IS_COMPLETE': return this.emit('complete');
          default: break;
        }
      }

      if ( !this.isReady &&
            this.flavor.isReady &&
            this.evaluator && 
            this.comparator &&
            this.expression ) {
        this.state.set('IS_READY', true, false);
        this.emit('ready');
      }
    });

    // When the taste profile emits a value for the evaluator pass the value to the comparator
    this.flavor.taste.profile.once(this.evaluator, (v) => {
      this.state.value = v;
      if ( this.isReady ) this[execute]();
      else this.once('ready', () => this[execute]());
    });
  }

  [execute]() {
    if ( this.isBrowser && this.flavor.isComplete ) return;
    const result = this.state.comparator(this.value);
    this.state.result = (result) ? 'Passed' : 'Failed';
    this.state.IS_COMPLETE = true;
  }

  toBeLessThan(upperBound, closed = true) {
    this.state.comparator = (v) => {
      let inRange = true;
      if ( closed ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    };
    this.state.expectStatement = `${this.state.evaluator} ${(param.upper === 'closed') ? '<=' : '<'} ${upperBound}`;
    return this.flavor;
  }

  toBeGreaterThan(lowerBound, closed = true) {
    this.state.comparator = (v) => {
      let inRange = true;
      if ( closed ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      return inRange;
    };
    this.state.expectStatement = `${lowerBound} ${(param.lower === 'closed') ? '>=' : '>'} ${this.state.evaluator}`;
    return this.flavor;
  }

  toBeInRange(lowerBound, upperBound, param = {lower: 'closed', upper: 'closed'}) {
    this.state.comparator = (v) => {
      let inRange = true;
      if ( param.lower === 'closed' ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      if ( param.upper === 'closed' ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    };
    this.state.expectStatement = `${lowerBound} ${(param.lower === 'closed') ? '>=' : '>'} ${this.state.evaluator} ${(param.upper === 'closed') ? '<=' : '<'} ${upperBound}`;
    return this.flavor;
  }

  toBeFalsy() {
    this.state.comparator = (v) => { return !(v); };
    this.state.expectStatement = `${this.state.evaluator} to be a falsy value`;
    return this.flavor;
  }

  toBeTruthy() {
    this.state.comparator = (v) => { return (v); };
    this.state.expectStatement = `${this.state.evaluator} to be a truthy value`;
    return this.flavor;
  }

  /**
   * Evaluates loosely typed equality (==)
   * @param {*} value 
   */
  toBe(value) {
    this.state.comparator = (v) => { return v == value; };
    this.state.expectStatement = `${this.state.evaluator} == ${value}`;
    return this.flavor;
  }

  /**
   * Evaluates type-strict equality (===)
   * @param {*} value 
   */
  toEqual(value) {
    this.state.comparator = (v) => { return v === value; };
    this.state.expectStatement = `${this.state.evaluator} === ${value}`;
    return this.flavor;
  }

  toMatch(regex) {
    this.state.comparator = (v) => { return v.match(regex); }
    this.state.expectStatement = `${this.state.evaluator} matches ${regex}`;
    return this.flavor;
  }

  /**
   * Performs a typeof check on the value
   * @param {String} type 
   */
  isTypeOf(type) {
    this.state.comparator = (v) => { return typeof v === type }
    this.state.expectStatement = `${this.state.evaluator} is a ${type}`;
    return this.flavor;
  }

  /**
   * Performs an instanceof check on the value
   * @param {Any} prototype 
   */
  isInstanceOf(prototype) {
    this.state.comparator = (v) => { return v instanceof prototype }
    this.state.expectStatement = `${this.state.evaluator} is an instance of ${prototype}`;
    return this.flavor;
  }

  get comparator() {
    return this.state.comparator;
  }

  get evaluator() {
    return this.state.evaluator;
  }

  get expression() {
    return this.state.expectStatement;
  }

  get value() {
    return this.state.value;
  }

  get result() {
    return this.state.result;
  }

  get isBrowser() {
    return this.state.IS_BROWSER;
  }
  
  get isRecorded() {
    return this.state.IS_RECORDED;
  }

  get isReady() {
    return this.state.IS_READY;
  }

  get isComplete() {
    return this.state.IS_COMPLETE;
  }
}

module.exports = Expectation;

},{"./Emitter.js":2,"./State.js":6}],4:[function(require,module,exports){
(function (process){
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
        'expectCompleteCounter': 0,
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
    this.events.register('ready', {persist: true});
    this.events.register('complete', {persist: true});
    this.state.on('change', (p, v) => {
      this.update();
      switch(p) {
        case 'IS_READY': return this.emit('ready');
        case 'IS_COMPLETE': return this.emit('complete');
        default: return;
      }
    });
    // Stop the timer once the flavor test is complete
    this.on('complete', () => {
      if ( this[timeIncrementer] ) {
        clearInterval(this[timeIncrementer]);
      }
    });

    // Wait for window to finish loading before appending anything to the DOM
    if ( this.isBrowser ) {
      this.taste.once('ready', () => {
        this[appendToDOM]();
        this.state.IS_READY = true;
        this.update();
      });
    }
    else {
      this.state.IS_READY = true;
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
    if ( !this.isReady ) return;

    // Update the status state
    this.state.status = (this.state.ERROR) ? 'Error' : (this.isComplete) ? 'Complete' :
    (this.isInProgress) ? 'In progress...' : 'Preparing...';
    
    // Update result state
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
    else this.state.result = 'Pending...';
    
    if ( this.root && this.isBrowser ) {
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

    this.state.test = handler;
    this.state.IN_PROGRESS = true;
    // Monitor flavor test duration
    const start = Date.now();
    this[timeIncrementer] = setInterval(() => {
      this.state.duration = Date.now() - start;
      if ( this.root && this.isBrowser ) {
        this.getElement('duration').textContent = this.state.duration;
      }
      if ( this.state.duration >= this.state.timeout ) {
        this.state.ERROR = new Error(`Test timed out after ${this.state.timeout} ms`);
        this.state.IS_COMPLETE = true;
      }
    }, 1);
    

      // Pass the sample HTML if available as an argument for the test and execute the test
      if ( this.isBrowser ) {
        // Check if Taste is ready to run tests before executing the test
        this.taste.once('ready', () => {
          const sample = this.getElement('sampleAsHTML');
          if ( sample && !sample.getElementById ) sample.getElementById = (id) => { return sample.querySelector(`#${id}`); };
          handler(sample);
        });
      }
      else handler();
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
      this.state.expectCompleteCounter++;
      this.update();
      this.taste.recordResults(this);
      if ( this.isBrowser ) {
        if ( !this.expectationsAreComplete() ) return;
      }
      else {
        let s = `${this.state.title}\n`;
        s += `\tResult: ${this.state.result}\n`;
        s += `\tDuration: ${this.state.duration}ms\n`;
        s += `\tTimeout: ${this.state.timeout}ms\n`;
        s += `\tTest: ${this.testToString()}\n`;
        s += `\tExpectation\n`;
        s += `\t\tExpected: ${expect.expression}\n`;
        if ( expect.isComplete ) {
          s += `\t\tReceived: ${expect.evaluator} = ${expect.value}\n`;
        }
        process.stdout.write(s + '\n');
        this.taste.printResults();
      }
      this.state.IS_COMPLETE = true;
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

  get title() {
    return this.state.title;
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

}).call(this,require('_process'))
},{"./Emitter.js":2,"./Expectation.js":3,"./State.js":6,"_process":12}],5:[function(require,module,exports){
'use strict';'use strict';
const Emitter = require('./Emitter.js');
const map = Symbol('map');

class Profile extends Emitter {
  constructor(o = {}) {
    super();
    this[map] = {};
    this.setAll(o);
  }

  /**
   * Generates a getter and setter for the key on the State object
   * The value is stored in the map Symbol
   * @param {String} k 
   * @param {*} v 
   */
  set(k, v, emit = true) {
    if ( !this.events.hasEvent(k) ) {
      this.events.register(k, {persist: true});
    }
    if ( !this.hasOwnProperty(k) ) {
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this[map][k],
        set: (val) => this.set(k, val)
      });
    }
    const oldVal = this[map][k];
    if ( v !== oldVal ) {
      this[map][k] = v;
      if ( emit ) this.emit(k, v, oldVal);
    }
  }

  setAll(o) {
    const keys = Object.keys(o);
    for ( let i = 0; i < keys.length; ++i ) this.set(keys[i], o[keys[i]]);
  }

  remove(k) {
    if ( this.has(k) ) {
      delete this[k];
      delete this[map][k];
    }
  }

  has(k) {
    return this[map].hasOwnProperty(k);
  }

  toObject() {
    return this[map];
  }

  keys() {
    return Object.keys(this[map]);
  }
}

module.exports = Profile;

},{"./Emitter.js":2}],6:[function(require,module,exports){
'use strict';
const Emitter = require('./Emitter.js');
const map = Symbol('map');

/**
 * A State object is intended to handle type String keys
 * and primitive type values
 */
class State extends Emitter {
  constructor(o = {}) {
    super();
    this[map] = {};
    this.setAll(o);
  }

  /**
   * Generates a getter and setter for the key on the State object
   * The value is stored in the map Symbol
   * @param {String} k 
   * @param {*} v 
   */
  set(k, v, emit = true) {
    this.registerKey(k,v);
    const oldVal = this[map][k];
    if ( v !== oldVal ) {
      this[map][k] = v;
      if ( emit ) this.emit('change', k, v, oldVal);
    }
  }

  setAll(o) {
    const keys = Object.keys(o);
    for ( let i = 0; i < keys.length; ++i ) this.set(keys[i], o[keys[i]]);
  }

  registerKey(k) {
    if ( !this.hasOwnProperty(k) ) {
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this[map][k],
        set: (val) => this.set(k, val)
      });
    }
  }

  remove(k) {
    if ( this.has(k) ) {
      delete this[k];
      delete this[map][k];
    }
  }

  has(k) {
    return this[map].hasOwnProperty(k);
  }

  toObject() {
    return this[map];
  }

  keys() {
    return Object.keys(this[map]);
  }
}

module.exports = State;

},{"./Emitter.js":2}],7:[function(require,module,exports){
(function (process){
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

}).call(this,require('_process'))
},{"./Emitter.js":2,"./Flavor.js":4,"./Profile.js":5,"./State.js":6,"_process":12}],8:[function(require,module,exports){
'use strict';
module.exports = require('./lib/EventEmitter.js');

},{"./lib/EventEmitter.js":10}],9:[function(require,module,exports){
'use strict';
const EventListener = require('./EventListener.js');

class Event {
  constructor(name, param = {}) {
    Object.defineProperty(this, 'name', {
      value: name,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'listeners', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: {
        'PREVIOUS_ARGS': [],
        'EMITTED_ONCE': false,
        'MAX_POOL_SIZE': (param.hasOwnProperty('limit')) ? param.limit : null,
        'PERSISTED': (param.hasOwnProperty('persist')) ? param.persist : false,
        'SUBSCRIBED': (param.hasOwnProperty('subscribe')) ? param.subscribe : true
      },
      enumerable: true,
      writable: false,
      configurable: false
    });
  }

  runListeners(...args) {
    if ( !this.isSubscribed ) return;
    this.state.EMITTED_ONCE = true;

    const temp = [];
    this.state.PREVIOUS_ARGS = args || [];
    
    for ( let i = 0; i < this.listeners.length; ++i ) {
      const listener = this.listeners[i];
      if ( listener instanceof EventListener ) {
        listener.run(...args);
        if ( !listener.isDeleted ) temp.push(listener);
      }
    }
    
    this.listeners.length = 0;
    temp.forEach(listener => this.listeners.push(listener));
  }

  /**
   * Creates an instance of EventListener for passed listener
   * Returns a generated id for the listener
   * @param {function} f 
   * @param {EventListenerOptions} options
   *  EventListenerOptions properties:
   *    'id': {String} Sets the specified id to the listener
   *    'isOnce' || 'once': {Boolean} Sets the listener to activate only once
   *    'priority': {String} 'first' || 'last': Determine whether to add the listener
   *                to the front or end of the queue
   */
  registerListener(f, options = {isOnce: false}) {
    if ( !f || typeof f !== 'function') {
      throw new Error(`Event ${this.name} expected an argument of type function`);
    }
    else if (this.maxListenerCount > 0 && this.listeners.length >= this.maxListenerCount) {
      throw new Error(`Could not register listener. Event ${this.name} listener pool exceeds its maximum size of ${this.maxListenerCount}`);
    }

    const isOnce = (options.isOnce) ? options.isOnce : (options.once) ? options.once : false;
    const id = (options.hasOwnProperty('id')) ? options.id : `${this.listeners.length}-${Date.now()}`;
    const listener = new EventListener(id, f, isOnce);
    if ( options.priority === 'first' ) this.listeners.unshift(listener);
    else this.listeners.push(listener);
    // Run the listener with the previous event state when persisting
    if ( this.isPersisted && this.isSubscribed && this.hasEmittedAtLeastOnce ) listener.run(...this.state.PREVIOUS_ARGS);
    return id;
  }

  /**
   * Removes the listener with the corresponding id
   * @param {String} id 
   */
  removeListener(id) {
    let index = -1;
    for ( let i = 0; i < this.listeners.length; ++i ) {
      if ( id === this.listeners[i].id ) {
        index = i;
        break;
      };
    }
    if ( index !== -1 ) return this.listeners.splice(index, 1)[0];
    return undefined;
  }

  get maxListenerCount() {
    return this.state.MAX_POOL_SIZE;
  }

  set setMaxListenerCount(val) {
    if ( typeof val === 'number' && val >= 0 ) {
      this.state.MAX_POOL_SIZE = val;
    };
  }

  get hasEmittedAtLeastOnce() {
    return this.state.EMITTED_ONCE;
  }

  get isSubscribed() {
    return this.state.SUBSCRIBED;
  }

  set isSubscribed(bool) {
    this.state.SUBSCRIBED = !!bool;
  }

  get isPersisted() {
    return this.state.PERSISTED;
  }

  set isPersisted(bool) {
    this.state.PERSISTED = !!bool;
  }
}

module.exports = Event;

},{"./EventListener.js":11}],10:[function(require,module,exports){
'use strict';
const Event = require('./Event.js');
const instances = {};

class EventEmitter {
  constructor(options = {enable: true, id: ''}) {
    if ( options.id ) {
      if ( instances.hasOwnProperty(options.id) ) return instances[options.id];
      instances[options.id] = this;
    }
    Object.defineProperty(this, 'id', {
      value: options.id,
      enumerable: true,
      writable: false,
      configurable: false
    });
    this.events = {};
    this._EVENTS_ENABLED = (options.hasOwnProperty('enable')) ? options.enable : true;
  }

  /**
   * Register a new event for the emitter to watch
   * @param {String} eventName 
   * @param {EventOptions} eventName
   *  EventOptions properties:
   *    'persist': {Boolean} Immediately emit its most recent state to any newly added listeners
   *      Default: false
   *    'subscribe': {Boolean} Event will execute its listeners
   *      Default: true
   *    'limit': {Number} Limits the pool size for listeners
   *      Default: null (No limit)
   */
  register(eventName, options = {}) {
    if ( this.hasEvent(eventName) || !this.isValidName(eventName) ) return;
    this.events[eventName] = new Event(eventName, options);
  }

  /**
   * Removes the event object with the specified event name
   * @param {String} eventName 
   */
  unregister(eventName) {
    if ( !this.hasEvent(eventName) ) return;
    delete this.events[eventName];
  }

  /**
   * Sets Event's isSubscribed property to true
   * Emitting the event will cause the Event's listeners to execute
   * @param {String} eventName 
   */
  subscribe(eventName) {
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( !this.isValidName(eventName) ) return;
    this.events[eventName].isSubscribed = true;
  }

  /**
   * Sets Event's isSubscribed property to false
   * Prevents the Event's listeners from executing
   * If the event does not exist yet, it will create the event
   * and then unsubscribe from it
   * @param {String} eventName 
   */
  unsubscribe(eventName) {
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( !this.isValidName(eventName) ) return;
    this.events[eventName].isSubscribed = false;
  }

  /**
   * Register an event listener on an event
   * Returns a generated id for the listener
   * @param {String} eventName 
   * @param {Function} listener 
   * @param {EventListenerOptions} options
   *  EventListenerOptions properties:
   *    'id': {String} Sets the specified id to the listener
   *    'isOnce': {Boolean} Sets the listener to activate only once
   *    'priority': {String} 'first' || 'last': Determine whether to add the listener
   *                to the front or end of the queue
   */
  addEventListener(eventName, listener, options = {once: false, priority: 'last'}) {
    const isOnce = (options.hasOwnProperty('once')) ? options.once : false;
    const priority = (options.hasOwnProperty('priority')) ? options.priority : 'last';
    const id = (options.hasOwnProperty('id')) ? options.id : undefined;
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( !this.isValidName(eventName) ) return;
    return this.events[eventName].registerListener(listener, {once: isOnce, priority: priority, id: id});
  }

  /**
   * Wrapper for addEventListener
   * @param {String} eventName 
   * @param {Function} listener 
   * @param {EventListenerOption} options
   */
  on(eventName, listener, options = undefined) {
    return this.addEventListener(eventName, listener, options);
  }

  /**
   * Wrapper for addEventListener with once option enabled
   * @param {String} eventName 
   * @param {Function} listener 
   */
  once(eventName, listener) {
    return this.addEventListener(eventName, listener, {once: true});
  }

  /**
   * Trigger an event
   * @param {String} eventName 
   */
  dispatchEvent(eventName, ...args) {
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( this.isEventsEnabled ) {
      const event = this.events[eventName];
      event.runListeners(...args);
    }
  }

  /**
   * Wrapper for dispatchEvent
   * @param {String} eventName 
   */
  emit(eventName, ...args) {
    this.dispatchEvent(eventName, ...args);
  }

  /**
   * Removes listener with corresponding id
   * Returns the deleted listener
   * @param {String} eventName 
   * @param {String} id 
   */
  removeEventListener(eventName, id) {
    if ( !this.hasEvent(eventName) ) return;
    return this.events[eventName].removeHandler(id);
  }

  hasEvent(eventName) {
    return this.events.hasOwnProperty(eventName);
  }

  isValidName(eventName) {
    return ( typeof eventName === 'string' && eventName.trim() !== '' );
  }

  enable() {
    this._EVENTS_ENABLED = true;
  }

  disable() {
    this._EVENTS_ENABLED = false;
  }

  getEvent(name) {
    return this.events[name];
  }

  get isEventsEnabled() {
    return this._EVENTS_ENABLED;
  }

  static instanceOf(id) {
    if ( !instances.hasOwnProperty(id) ) return null;
    return instances[id];
  }
}

module.exports = EventEmitter;

},{"./Event.js":9}],11:[function(require,module,exports){
'use strict';

class EventListener {
  constructor(id, handler, isOnce = false) {
    Object.defineProperty(this, 'id', {
      value: id,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'handler', {
      value: handler,
      enumerable: true,
      writable: false,
      configurable: false
    });
    this._IS_ONCE = isOnce;
    this._IS_DELETED = false;
  }

  run(...args) {
    if ( this.isDeleted ) return;
    // Toggle handler for deletion after being executed when set to occur once
    if ( this.isOnce ) this._IS_DELETED = true;
    if ( typeof this.handler === 'function' ) this.handler(...args);
    else this._IS_DELETED = true;
  }

  get isOnce() {
    return this._IS_ONCE;
  }
  get isDeleted() {
    return this._IS_DELETED;
  }
}

module.exports = EventListener;

},{}],12:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],13:[function(require,module,exports){
'use strict';
const Taste = require('../index.js');

function add(x,y) {
  return x + y;
}

function appendDiv(target) {
  const node = document.createElement('div');
  target.appendChild(node);
}

Taste.prepare('#test');

Taste.flavor('Synchronous pass test')
  .describe('Add 4 + 1')
  .test(() => {
    Taste.profile.addResult = add(4,1);
    Taste.profile.addResultAgain = add(6,4);
  })
  .expect('addResult').toEqual(5)
  .expect('addResultAgain').toEqual(10);

Taste.flavor('Synchronous fail test')
  .describe('Add 4 + 1')
  .test(() => {
    Taste.profile.wrongResult = add(4,1);
  })
  .expect('wrongResult').toEqual(3);

Taste.flavor('Asynchronous pass test')
  .timeout(5000)
  .describe('Resolves after 3000ms')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();

Taste.flavor('Asynchronous fail test')
  .timeout(5000)
  .describe('Fails after 3000ms')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncFailed = true;
    }, 3000);
  })
  .expect('asyncFailed').toBeFalsy();

Taste.flavor('Asynchronous timeout test')
  .describe('Test exceeds timeout')
  .test(() => {
    setTimeout(() => {
      Taste.profile.asyncTimeout = true;
    }, 3000);
  })
  .expect('asyncTimeout').toBeTruthy();
  
if ( Taste.isBrowser ) {
  Taste.flavor('Taste sample dom test')
  .describe('Test contains a sample of html to be used in the test')
  .sample(`
    <section class="sample">
      <p>Sample Html Test</p>
    </section>
  `)
  .test((sample) => {
    sample.innerHTML += '<p>This text was added during the test.</p>';
    Taste.profile.childrenLength = sample.children.length;
  })
  .expect('childrenLength').toBe(2);

}

},{"../index.js":1}]},{},[13]);
