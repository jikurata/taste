(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
const Events = require('@dweomercraft/events');

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

  on(e, f) {this.events.on(e,f);}

  once(e, f) {this.events.once(e, f);}
}

module.exports = Emitter;

},{"@dweomercraft/events":6}],2:[function(require,module,exports){
'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const init = Symbol('init');
const execute = Symbol('execute');
const timeoutId = Symbol('timeoutId');
const timeIncrementer = Symbol('timeIncrementer');

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
 * error: Emits when an error occurs in the test process
 */
class Expectation extends Emitter {
  constructor(flavor) {
    super();
    this[timeoutId] = null;
    Object.defineProperty(this, 'flavor', {
      value: flavor,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: new State({
        timeout: 2500,
        evaluator: null,
        comparator: null,
        test: null,
        result: null,
        IS_READY: false,
        WINDOW_LOADED: false,
        IS_COMPLETE: false
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });
    this[init]();
  }

  [init]() {
    this.events.register('ready');
    this.events.register('start');
    this.events.register('complete');
    this.events.register('error');
    
    this.state.on('change', (p, v) => {
      if ( !this.state.IS_READY &&
            this.state.WINDOW_LOADED &&
            this.state.evaluator && 
            this.state.comparator && 
            this.state.test ) {
        this.state.set('IS_READY', true, false);
        this.emit('ready');
      }
    });
    this.on('ready', () => this[execute]());
    window.addEventListener('load', () => this.state.WINDOW_LOADED = true);
  }

  /**
   * Calls once the evaluator, comparator and test are defined
   */
  [execute]() {
    return new Promise((resolve, reject) => {
      this.emit('start');
      if ( typeof this.state.test !== 'function' ) return reject('Test handler is not a function');

      this.flavor.taste.once(this.state.evaluator, (v) => resolve(v));
      this.flavor.state.IN_PROGRESS = true;

      // Monitor flavor test duration
      const start = Date.now();
      let duration = 0;
      this[timeIncrementer] = window.setInterval(() => {
        duration = Date.now() - start;
        this.flavor.getElement('duration').textContent = duration;
        if ( duration >= this.state.timeout ) reject(`Test timed out after ${duration} ms`);
      }, 1);
      
      // Pass the sample HTML if available as an argument for the test
      const sample = this.flavor.getElement('sampleAsHTML');
      sample.getElementById = (id) => { return sample.querySelector(`#${id}`); }
      this.state.test(sample);
    })
    .then((value) => {
      const result = this.state.comparator(value);
      this.state.result = (result) ? 'Passed' : 'Failed';
      this.emit('complete', result);
    })
    .catch(err => {
      this.emit('error', err);
    })
    .finally(() => {
      this.flavor.state.IS_COMPLETE = true;
      window.clearInterval(this[timeIncrementer]);
    });
  }

  update(expression) {
    if ( !this.flavor.isReady ) return this.flavor.once('IS_READY', () => this.update(expression));
    this.flavor.getElement('expect').textContent = `${expression}`;
  }

  toBeLessThan(upperBound, closed = true) {
    this.state.comparator = (v) => {
      let inRange = true;
      if ( closed ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    };
    this.update(`${this.state.evaluator} ${(param.upper === 'closed') ? '<=' : '<'} ${upperBound}`);
    return this.flavor;
  }

  toBeGreaterThan(lowerBound, closed = true) {
    this.state.comparator = (v) => {
      let inRange = true;
      if ( closed ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      return inRange;
    };
    this.update(`${lowerBound} ${(param.lower === 'closed') ? '>=' : '>'} ${this.state.evaluator}`);
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
    this.update(`${lowerBound} ${(param.lower === 'closed') ? '>=' : '>'} ${this.state.evaluator} ${(param.upper === 'closed') ? '<=' : '<'} ${upperBound}`);
    return this.flavor;
  }

  toBeFalsy() {
    this.state.comparator = (v) => { return !(v) };
    this.update(`${this.state.evaluator} to be a falsy value`);
    return this.flavor;
  }

  toBeTruthy() {
    this.state.comparator = (v) => { return (v) };
    this.update(`${this.state.evaluator} to be a truthy value`);
    return this.flavor;
  }

  /**
   * Evaluates loosely typed equality (==)
   * @param {*} value 
   */
  toBe(value) {
    this.state.comparator = (v) => { return v == value };
    this.update(`${this.state.evaluator} == ${value}`);
    return this.flavor;
  }

  /**
   * Evaluates type-strict equality (===)
   * @param {*} value 
   */
  toEqual(value) {
    this.state.comparator = (v) => { return v === value };
    this.update(`${this.state.evaluator} === ${value}`);
    return this.flavor;
  }

  assign(test) {
    this.state.test = test;
  }

  testToString() {
    if ( this.state.test ) return this.state.test.toString();
    return '';
  }
}

module.exports = Expectation;

},{"./Emitter.js":1,"./State.js":4}],3:[function(require,module,exports){
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

    // Wait for window to finish loading before appending anything to the DOM
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

},{"./Emitter.js":1,"./Expectation.js":2,"./State.js":4}],4:[function(require,module,exports){
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
    if ( !this[map].hasOwnProperty(k) ) {
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this[map][k],
        set: (val) => this.set(k, val)
      });
    }
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

},{"./Emitter.js":1}],5:[function(require,module,exports){
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

},{"./Emitter.js":1,"./Flavor.js":3,"./State.js":4}],6:[function(require,module,exports){
'use strict';
module.exports = require('./lib/EventEmitter.js');

},{"./lib/EventEmitter.js":8}],7:[function(require,module,exports){
'use strict';
const EventHandler = require('./EventHandler.js');

class Event {
  constructor(name) {
    this._name = name;
    this._handlers = [];
    this._isActive = true;
  }

  runHandlers(...args) {
    if ( !this.isActive ) return;
    const temp = [];
    for ( let i = 0; i < this.handlers.length; ++i ) {
      this.handlers[i].run(...args);
      if ( !this.handlers[i].isOnce ) temp.push(this.handlers[i]);
    }
    this._handlers = temp;
  }

  /**
   * Creates an instance of EventHandler for passed handler
   * Returns a generated id for the handler
   * @param {function} handler 
   * @param {Object} options
   *  properties:
   *    'id': (String) Sets the specified id to the handler
   *    'isOnce': (Boolean) Sets the handler to activate only once
   *    'priority': (String) 'first' || 'last': Determine whether to add the handler
   *                to the front or end of the queue
   */
  registerHandler(handler, options = {isOnce: false}) {
    if ( !handler || typeof handler !== 'function' ) return null;
    const isOnce = (options.hasOwnProperty('isOnce')) ? options.isOnce : false;
    const id = (options.hasOwnProperty('id')) ? options.id : `${this.handlers.length}-${Date.now()}`;
    if ( options.priority === 'first' ) this.handlers.unshift(new EventHandler(id, handler, isOnce));
    else this.handlers.push(new EventHandler(id, handler, isOnce));
    return id;
  }

  /**
   * Removes the handler with the corresponding id
   * @param {String} id 
   */
  removeHandler(id) {
    let index = -1;
    for ( let i = 0; i < this.handlers.length; ++i ) {
      if ( id === this.handlers[i].id ) {
        index = i;
        break;
      };
    }
    if ( index !== -1 ) return this.handlers.splice(index, 1)[0];
    return undefined;
  }

  get name() {
    return this._name;
  }

  get handlers() {
    return this._handlers;
  }

  get isActive() {
    return this._isActive;
  }

  set isActive(bool) {
    this._isActive = bool;
  }
}

module.exports = Event;

},{"./EventHandler.js":9}],8:[function(require,module,exports){
'use strict';
const Event = require('./Event.js');
const instances = {};

class EventEmitter {
  constructor(options = {enable: true, id: ''}) {
    this._id = options.id;
    this._events = {};
    this._isEnabled = (options.hasOwnProperty('enable')) ? options.enable : true;
    if ( options.id ) {
      if ( instances.hasOwnProperty(options.id) ) return instances[options.id];
      instances[options.id] = this;
    }
  }

  /**
   * Register a new event for the emitter to watch
   * @param {String} eventName 
   */
  register(eventName) {
    if ( this.hasEvent(eventName) || !this.isValidName(eventName) ) return;
    this.events[eventName] = new Event(eventName);
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
   * Sets Event's isActive property to true
   * Emitting the event will cause the Event's handlers to execute
   * @param {String} eventName 
   */
  subscribe(eventName) {
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( !this.isValidName(eventName) ) return;
    this.events[eventName].isActive = true;
  }

  /**
   * Sets Event's isActive property to false
   * Prevents the Event's handlers from executing
   * If the event does not exist yet, it will create the event
   * and then unsubscribe from it
   * @param {String} eventName 
   */
  unsubscribe(eventName) {
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( !this.isValidName(eventName) ) return;
    this.events[eventName].isActive = false;
  }

  /**
   * Register an event handler on an event
   * Returns a generated id for the listener
   * @param {String} eventName 
   * @param {Function} handler 
   */
  addEventListener(eventName, handler, options = {once: false, priority: 'last'}) {
    const isOnce = (options.hasOwnProperty('once')) ? options.once : false;
    const priority = (options.hasOwnProperty('priority')) ? options.priority : 'last';
    const id = (options.hasOwnProperty('id')) ? options.id : undefined;
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( !this.isValidName(eventName) ) return;
    return this.events[eventName].registerHandler(handler, {isOnce: isOnce, priority: priority, id: id});
  }

  /**
   * Wrapper for addEventListener
   * @param {String} eventName 
   * @param {Function} handler 
   */
  on(eventName, handler, options = undefined) {
    return this.addEventListener(eventName, handler, options);
  }

  /**
   * Wrapper for addEventListener with once option enabled
   * @param {String} eventName 
   * @param {Function} handler 
   */
  once(eventName, handler) {
    return this.addEventListener(eventName, handler, {once: true});
  }

  /**
   * Trigger an event
   * @param {String} eventName 
   */
  dispatchEvent(eventName, ...args) {
    if ( !this.hasEvent(eventName) ) this.register(eventName);
    if ( this.isEnabled ) this.events[eventName].runHandlers(...args);
  }

  /**
   * Wrapper for dispatchEvent
   * @param {String} eventName 
   */
  emit(eventName, ...args) {
    this.dispatchEvent(eventName, ...args);
  }

  /**
   * Removes handler with corresponding id
   * Returns the deleted handler
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
    this._isEnabled = true;
  }

  disable() {
    this._isEnabled = false;
  }

  static instanceOf(id) {
    if ( !instances.hasOwnProperty(id) ) return null;
    return instances[id];
  }

  get id() {
    return this._id;
  }

  get events() {
    return this._events;
  }

  get isEnabled() {
    return this._isEnabled;
  }
}

module.exports = EventEmitter;

},{"./Event.js":7}],9:[function(require,module,exports){
'use strict';

class EventHandler {
  constructor(id, handler, isOnce = false) {
    this._id = id
    this._handler = handler;
    this._isOnce = isOnce;
  }

  run(...args) {
    return this.handler(...args);
  }

  get id() {
    return this._id;
  }

  get handler() {
    return this._handler;
  }

  get isOnce() {
    return this._isOnce;
  }
}

module.exports = EventHandler;

},{}],10:[function(require,module,exports){
'use strict';
const Taste = require('../lib/Taste.js');

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
  })
  .expect('addResult').toEqual(5);

Taste.flavor('Synchronous fail test')
  .describe('Add 4 + 1')
  .test(() => {
    Taste.profile.addResult = add(4,1);
  })
  .expect('addResult').toEqual(3);

Taste.flavor('Asynchronous pass test')
  .timeout(5000)
  .describe('Resolves after 3000ms')
  .test(() => {
    window.setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();

Taste.flavor('Asynchronous fail test')
  .timeout(5000)
  .describe('Does not resolve after 3000ms')
  .test(() => {
    window.setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeFalsy();

Taste.flavor('Asynchronous timeout test')
  .describe('Test exceeds timeout')
  .test(() => {
    window.setTimeout(() => {
      Taste.profile.asyncResult = true;
    }, 3000);
  })
  .expect('asyncResult').toBeTruthy();

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

},{"../lib/Taste.js":5}]},{},[10]);
