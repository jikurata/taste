'use strict';
const Emitter = require('./Emitter.js');
const State = require('./State.js');
const init = Symbol('init');

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
        'result': null,
        'IS_READY': false,
        'IS_COMPLETE': false,
        'WINDOW_LOADED': false,
        'IS_BROWSER': isBrowser
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
    
    this.state.on('change', (p, v) => {
      if ( !this.state.IS_READY &&
            this.state.WINDOW_LOADED &&
            this.state.evaluator && 
            this.state.comparator) {
        this.state.set('IS_READY', true, false);
        this.emit('ready');
      }
    });

    // When the taste profile emits a value for the evaluator pass the value to the comparator
    this.flavor.taste.profile.once(this.evaluator, (v) => {
      if ( this.isReady ) {
        if ( this.flavor.isComplete ) return;
        const result = this.state.comparator(v);
        this.state.result = (result) ? 'Passed' : 'Failed';
        this.state.IS_COMPLETE = true;
        this.emit('complete', result);
      }
      else {
        this.once('ready', () => {
          if ( this.flavor.isComplete ) return;
          const result = this.state.comparator(v);
          this.state.result = (result) ? 'Passed' : 'Failed';
          this.state.IS_COMPLETE = true;
          this.emit('complete', result);
        });
      }
    });
    if ( this.isBrowser ) {
      window.addEventListener('load', () => this.state.WINDOW_LOADED = true);
    }
    else this.state.WINDOW_LOADED = true;
  }

  update(expression) {
    this.state.expectStatement = expression;
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

  get evaluator() {
    return this.state.evaluator;
  }

  get expression() {
    return this.state.expectStatement;
  }

  get result() {
    return this.state.result;
  }

  get isBrowser() {
    return this.state.IS_BROWSER;
  }

  get isReady() {
    return this.state.IS_READY;
  }

  get isComplete() {
    return this.state.IS_COMPLETE;
  }
}

module.exports = Expectation;
