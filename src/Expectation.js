'use strict';
const TasteError = require('./TasteError.js');
const EventEmitter = require('@jikurata/events');
const Model = require('./Model.js');

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
class Expectation extends EventEmitter {
  constructor(flavor, evaluator) {
    super();
    try {
      TasteError.TypeError.check(evaluator, 'string');
    }
    catch(err) {
      // Resolve the expectation with an error
    }
      
    Object.defineProperty(this, 'flavor', {
      value: flavor,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'model', {
      value: new Model({
        'statement': '',
        'evaluator': evaluator,
        'comparator': null,
        'value': null,
        'result': null
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });

    this.registerEvent('ready', {persist: true});
    this.registerEvent('evaluate');
    this.registerEvent('complete', {persist: true});

    this.model.on('comparator', (p, v, oldVal) => {
      if ( !this.isReady &&
            this.model.getEvent('value').hasEmittedAtLeastOnce &&
            this.model.getEvent('comparator').hasEmittedAtLeastOnce ) {
        this.emit('ready');
      }
    });

    // Listen for when the flavor profile emits a value for evaluator
    this.flavor.profile.once(this.model.evaluator, (v) => {
      this.model.value = v;
      if ( !this.isReady &&
            this.model.getEvent('value').hasEmittedAtLeastOnce &&
            this.model.getEvent('comparator').hasEmittedAtLeastOnce ) {
        this.emit('ready');
      }
    });

    this.once('ready', () => {
      this.emit('evaluate')
      .then(errors => {
        return this.emit('complete');
      })
      .catch(err => this.emit('error', err));
    });

    this.once('evaluate', () => {
      this.model.result = this.model.comparator(this.model.value);
    });

    this.once('complete', () => {
      
    });

    // Propagate errors to its Flavor
    this.on('error', (err) => {
      this.flavor.emit('error', err);
    });
  }

  /**
   * Evaluator must be less than upperBound
   * @param {Number} upperBound 
   * @param {Boolean} closed 
   * @returns {Flavor}
   */
  toBeLessThan(upperBound, closed = true) {
    this.model.comparator = (v) => {
      let inRange = true;
      if ( closed ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    };
    this.model.statement = `${this.model.evaluator} ${(param.upper === 'closed') ? '<=' : '<'} ${upperBound}`;
    return this.flavor;
  }

  /**
   * Evaluator must be greater than lowerBound
   * @param {Number} lowerBound 
   * @param {Boolean} closed 
   * @returns {Flavor}
   */
  toBeGreaterThan(lowerBound, closed = true) {
    this.model.comparator = (v) => {
      let inRange = true;
      if ( closed ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      return inRange;
    };
    this.model.statement = `${lowerBound} ${(param.lower === 'closed') ? '>=' : '>'} ${this.model.evaluator}`;
    return this.flavor;
  }

  /**
   * Evaluator must be within lowerBound and upperBound
   * @param {Number} lowerBound 
   * @param {Number} upperBound 
   * @param {Object} options
   * param.lower: 'closed' | 'open' (default: 'open')
   * param.upper: 'closed' | 'open' (default: 'open')
   * @returns {Flavor}
   */
  toBeInRange(lowerBound, upperBound, options = {lower: 'closed', upper: 'closed'}) {
    this.model.comparator = (v) => {
      let inRange = true;
      if ( options.lower === 'closed' ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      if ( options.upper === 'closed' ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    };
    this.model.statement = `${lowerBound} ${(options.lower === 'closed') ? '>=' : '>'} ${this.model.evaluator} ${(param.upper === 'closed') ? '<=' : '<'} ${upperBound}`;
    return this.flavor;
  }

  /**
   * Evaluator must be a falsy value
   * @returns {Flavor}
   */
  toBeFalsy() {
    this.model.comparator = (v) => { return !v; };
    this.model.statement = `${this.model.evaluator} to be a falsy value`;
    return this.flavor;
  }

  /**
   * Evaluator must be a truthy value
   * @returns {Flavor}
   */
  toBeTruthy() {
    this.model.comparator = (v) => { return !!v; };
    this.model.statement = `${this.model.evaluator} to be a truthy value`;
    return this.flavor;
  }

  /**
   * Evaluates loosely typed equality (==)
   * @param {Any} value 
   * @returns {Flavor}
   */
  toBe(value) {
    this.model.comparator = (v) => { return v == value; };
    this.model.statement = `${this.model.evaluator} == ${value}`;
    return this.flavor;
  }

  /**
   * Evaluates type-strict equality (===)
   * @param {Any} value 
   * @returns {Flavor}
   */
  toEqual(value) {
    this.model.comparator = (v) => { return v === value; };
    this.model.statement = `${this.model.evaluator} === ${value}`;
    return this.flavor;
  }

  /**
   * Evaluator must match the regular expression
   * @param {RegExp} regex 
   * @returns {Flavor}
   */
  toMatch(regex) {
    this.model.comparator = (v) => { return v.match(regex); }
    this.model.statement = `${this.model.evaluator} matches ${regex}`;
    return this.flavor;
  }

  /**
   * Evaluator typeof value must match type
   * @param {String} type 
   * @returns {Flavor}
   */
  toBeTypeOf(type) {
    this.model.comparator = (v) => { return typeof v === type }
    this.model.statement = `${this.model.evaluator} is a ${type}`;
    return this.flavor;
  }

  /**
   * Evaluator instanceof must be prototype
   * @param {Any} prototype 
   * @returns {Flavor}
   */
  toBeInstanceOf(prototype) {
    const classname = ( prototype && prototype.constructor ) ? prototype.constructor.name : prototype;
    this.model.comparator = (v) => { return v instanceof prototype }
    this.model.statement = `${this.model.evaluator} is an instance of ${classname}`;
    return this.flavor;
  }

  getCurrentResults() {
    const o = {
      'evaluator': this.model.evaluator,
      'statement': this.model.statement,
      'received': this.model.value,
      'result': this.model.result
    };
    return o;
  }

  get isReady() {
    return this.getEvent('ready').hasEmittedAtLeastOnce;
  }

  get isComplete() {
    return this.getEvent('complete').hasEmittedAtLeastOnce;
  }
}

module.exports = Expectation;
