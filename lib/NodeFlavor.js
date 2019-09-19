'use strict';
const Errors = require('./Error.js');
const Emitter = require('./Emitter.js');
const Profile = require('./Profile.js');
const Expectation = require('./Expectation.js');
const State = require('./State.js');
const init = Symbol('init');
const appendToDOM = Symbol('appendToDOM');
const updateSample = Symbol('updateSample');
const timeoutId = Symbol('timeoutId');
const timeIncrementer = Symbol('timeIncrementer');


/**
 * A Flavor instance in Nodejs
 * Does not support html samples
 */
class NodeFlavor extends Emitter {
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
        'result': '',
        'sample': null,
        'test': null,
        'root': null,
        'timeout': 2500,
        'start': 0,
        'duration': 0,
        'expectCompleteCounter': 0,
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
      
      this.state.IS_COMPLETE = true;
    });
    // Stop the timer once the flavor test is complete
    this.on('complete', () => {
      if ( this[timeIncrementer] ) {
        clearInterval(this[timeIncrementer]);
      }
      this.update();
    });
    
    this.state.IS_READY = true;
  }

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
  }

  sample() {
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
      this.state.ERROR = new Errors.TypeError(handler, 'function');
      return this;
    }

    this.state.test = handler;
    this.state.IN_PROGRESS = true;

    // Monitor flavor test duration
    this.state.start = Date.now();
    this[timeIncrementer] = setInterval(() => {
      this.state.duration = Date.now() - this.state.start;
      if ( this.state.duration >= this.state.timeout ) {
        this.state.ERROR = new Errors.TimeoutError(this.state.timeout);
        // Force complete flavor expectations on timeout
        this.forEachExpectation(expect => {
          expect.state.IS_COMPLETE = true;
        });
      }
    }, 1);
    
    // Execute the test function
    try {
      handler(this.profile, null);
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
   * @param {String|Any} arg
   */
  expect(arg) {
    const expect = new Expectation(this, arg);
    // When all expectations are complete, then the flavor's state is complete
    expect.on('complete', () => {
      this.state.expectCompleteCounter++;
      this.update();
      this.taste.recordResults(this);
      
      // Print expect results
      let s = `${this.state.title}\n`;
      s += `\tResult: ${expect.state.result || this.state.ERROR}\n`;
      s += `\tDuration: ${expect.state.duration}ms\n`;
      s += `\tTimeout: ${this.state.timeout}ms\n`;
      s += `\tTest: ${this.testToString()}\n`;
      s += `\tExpectation\n`;
      s += `\t\tExpected: ${expect.expression}\n`;
      s += `\t\tReceived: ${expect.evaluator} = ${expect.value}\n`;
      process.stdout.write(s + '\n');

      this.taste.printResults();
      this.state.IS_COMPLETE = true;
    });

    // Initialize profile fields 
    const profile = this.profile;
    if ( !profile.has(arg)) {
      if ( profile.hasOwnProperty(arg) ) {
        profile.emit(arg, profile[arg]);
      }
      else profile.set(arg, undefined, false);
    }
    this.expectations.push(expect);
    this.update();
    return expect;
  }

  finished(handler) {
    Errors.TypeError.check(handler, 'function');
    this.on('complete', () => {
      handler(profile, null);
    });
    return this;
  }

  timeout(t) {
    this.state.timeout = t;
    this.update();
    return this;
  }

  getElement(s) {
  }

  expectationsAreComplete() {
    for ( let i = 0; i < this.expectations.length; ++i ) {
      const expect = this.expectations[i];
      if ( !expect.isComplete ) return false;
    }
    return true;
  }

  forEachExpectation(fn) {
    Errors.TypeError.check(fn, 'function');
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
}

module.exports = NodeFlavor;
