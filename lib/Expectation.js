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
      this.state.test(this.flavor.getElement('sampleAsHTML'));
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
