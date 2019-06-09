'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const init = Symbol('init');
const execute = Symbol('execute');
const timeoutId = Symbol('timeoutId');
const timeIncrementer = Symbol('timeIncrementer');

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
        expectStatement: '',
        duration: 0,
        timeout: 2500,
        evaluator: null,
        comparator: null,
        test: null,
        result: null,
        IS_READY: false,
        WINDOW_LOADED: false,
        IS_COMPLETE: false,
        IS_BROWSER: isBrowser
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
    if ( this.isBrowser ) {
      window.addEventListener('load', () => this.state.WINDOW_LOADED = true);
    }
    else this.state.WINDOW_LOADED = true;
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
      this[timeIncrementer] = setInterval(() => {
        this.state.duration = Date.now() - start;
        if ( this.isBrowser ) {
          this.flavor.getElement('duration').textContent = this.state.duration;
        }
        if ( this.state.duration >= this.state.timeout ) reject(`Test timed out after ${this.state.duration} ms`);
      }, 1);
      
      // Pass the sample HTML if available as an argument for the test
      if ( this.isBrowser ) {
        const sample = this.flavor.getElement('sampleAsHTML');
        sample.getElementById = (id) => { return sample.querySelector(`#${id}`); };
        this.state.test(sample);
      }
      else this.state.test(undefined);
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
      this.state.IS_COMPLETE = true;
      clearInterval(this[timeIncrementer]);
    });
  }

  update(expression) {
    if ( this.isBrowser ) {
      if ( !this.flavor.isReady ) return this.flavor.once('IS_READY', () => this.update(expression));
      this.flavor.getElement('expect').textContent = expression;
    }
    this.state.expectStatement = expression;
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
    this.state.comparator = (v) => { return !(v); };
    this.update(`${this.state.evaluator} to be a falsy value`);
    return this.flavor;
  }

  toBeTruthy() {
    this.state.comparator = (v) => { return (v); };
    this.update(`${this.state.evaluator} to be a truthy value`);
    return this.flavor;
  }

  /**
   * Evaluates loosely typed equality (==)
   * @param {*} value 
   */
  toBe(value) {
    this.state.comparator = (v) => { return v == value; };
    this.update(`${this.state.evaluator} == ${value}`);
    return this.flavor;
  }

  /**
   * Evaluates type-strict equality (===)
   * @param {*} value 
   */
  toEqual(value) {
    this.state.comparator = (v) => { return v === value; };
    this.update(`${this.state.evaluator} === ${value}`);
    return this.flavor;
  }

  toMatch(regex) {
    this.state.comparator = (v) => { return v.match(regex); }
    this.update(`${this.state.evaluator} matches ${regex}`);
    return this.flavor;
  }

  /**
   * Performs a typeof check on the value
   * @param {String} type 
   */
  isTypeOf(type) {
    this.state.comparator = (v) => { return typeof v === type }
    this.update(`${this.state.evaluator} is a ${type}`);
    return this.flavor;
  }

  /**
   * Performs an instanceof check on the value
   * @param {Any} prototype 
   */
  isInstanceOf(prototype) {
    this.state.comparator = (v) => { return v instanceof prototype }
    this.update(`${this.state.evaluator} is an instance of ${prototype}`);
    return this.flavor;
  }

  assign(test) {
    this.state.test = test;
  }

  testToString() {
    if ( this.state.test ) return this.state.test.toString();
    return '';
  }

  get isBrowser() {
    return this.state.IS_BROWSER;
  }
}

module.exports = Expectation;
