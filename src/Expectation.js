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
    TasteError.TypeError.check(evaluator, 'string');
      
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
        'result': 'Not Tested'
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });

    this.registerEvent('ready', {persist: true});
    this.registerEvent('evaluate');
    this.registerEvent('complete', {persist: true});

    // Listen for when the flavor profile emits a value for the evaluator
    this.flavor.profile.once(this.model.evaluator, (v) => {
      this.model.value = v;
    });

    // Check ready state conditions when comparator changes
    this.model.on('comparator', (p, v, oldVal) => {
      if ( !this.isReady &&
            this.model.getEvent('value').hasEmittedAtLeastOnce &&
            this.model.getEvent('comparator').hasEmittedAtLeastOnce ) {
        this.emit('ready');
      }
    });

    // Check ready state conditions when value changes
    this.model.on('value', (p, v, oldVal) => {
      if ( !this.isReady &&
            this.model.getEvent('value').hasEmittedAtLeastOnce &&
            this.model.getEvent('comparator').hasEmittedAtLeastOnce ) {
        this.emit('ready');
      }
    });

    this.once('ready', () => {
      this.emit('evaluate')
      .then(errors => {
        if ( !this.isComplete ) {
          return this.emit('complete', this.getCurrentResults());
        }
      })
      .catch(err => this.emit('error', err));
    });

    this.once('evaluate', () => new Promise((resolve, reject) => {
      try {
        if ( !this.isComplete ) {
          try {
            this.model.result = this.model.comparator(this.model.value);
            resolve();
          }
          catch(err) {
            this.emit('error', err);
            resolve();
          }
        }
        else {
          resolve();
        }
      }
      catch(err) {
        this.emit('error', err);
      }
    }));

    // Propagate errors to its Flavor
    this.on('error', (err) => {
      this.emit('complete', this.getCurrentResults());
      this.flavor.emit('error', err);
    });

    // Cancel the expectation if the flavor times out
    this.flavor.once('error', () => {
      if ( !this.isComplete ) {
        this.emit('complete', this.getCurrentResults());
      }
    });
  }

  /**
   * Define a comparative function to evaluate the test value
   * The comparative function should accept a single argument, the test value.
   * statement should be a written representation of the comparative function,
   * otherwise it will be the comparative function stringified
   * Example:
   *  comparator: (v) => {
   *    return typeof(v) === 'string'
   *  }
   *  statement: 'v is a string'
   * @param {Function} comparator
   * @param {String} statement
   * @returns {Flavor}
   */
  toBeComparative(comparator, statement = '') {
    try{
      TasteError.TypeError.check(comparator, 'function');
      TasteError.TypeError.check(statement, 'string');

      this.model.comparator = comparator;
      this.model.statement = statement || comparator.toString();
      return this.flavor;
    }
    catch(err) {
      this.emit('error', err);
    }
  }

  /**
   * Evaluates type-strict equality (===)
   * @param {Any} value 
   * @returns {Flavor}
   */
  toEqual(value) {
    return this.toBeComparative(v => v === value, `${this.model.evaluator} === ${value}`);
  }

  /**
   * Evaluates loosely typed equality (==)
   * @param {Any} value 
   * @returns {Flavor}
   */
  toBe(value) {
    return this.toBeComparative(v => v == value, `${this.model.evaluator} == ${value}`);
  }

  /**
   * Checks if the test value is an array
   * @returns {Flavor}
   */
  toBeArray() {
    return this.toBeComparative(v => Array.isArray(v), `${this.model.evaluator} is an Array`);
  }

  /**
   * Check if the test value matches the contents of another array
   * If ordered is true, enforce sequential equality as well
   * @param {Array} array
   * @param {Boolean} ordered
   * @returns {Flavor}
   */
  toMatchArray(array, ordered = true) {
    return this.toBeComparative(v => {
      if ( array.length !== v.length ) {
        return false;
      }

      for ( let i = 0; i < array.length; ++i ) {
        const item = array[i];
        if ( v.indexOf(item) === -1 ) {
          return false;
        }
        if ( ordered && v[i] !== item ) {
          return false;
        }
      }
      return true;
    }, `${this.model.evaluator} matches array [${array}]`)
  }

  /**
   * Check if the test value contains the argument as a substring or subarray
   * @param {String|Array} value
   * @returns {Flavor}
   */
  toContain(value) {
    return this.toBeComparative(v => {
      if ( typeof value === 'string' ) {
        return v.indexOf(value) > -1;
      }
      else {
        for ( let i = 0; i < v.length; ++i ) {
          // Immediately return false if the value array is longer than the remaining indexes
          if ( value.length > v.length - i ) {
            return false;
          }
          
          if ( v[i] === value[0] ) {
            let match = true;
            for ( let j = 1; j <= value.length; ++j ) {
              if ( v[i + j] !== value[j] ) {
                match = false;
                break;
              }
            }
            if ( match ) {
              return match;
            }
          }
        }
      }
      return false;
    }, `${this.model.evaluator} contains ${value}`);
  }

  /**
   * Check if the test value has the provided property or array of properties
   * @param {String|Array<String>} value 
   */
  toHaveProperty(value) {
    return this.toBeComparative(v => {
      if ( !value ) {
        return false;
      }
      if ( !Array.isArray(value) ) {
        value = [value];
      }
      for ( let i = 0; i < value.length; ++i ) {
        if ( !v.hasOwnProperty(value[i]) ) {
          return false;
        }
      }
      return true;
    }, `${this.model.evaluator} has ${(value.length > 1) ? 'properties' : 'property'} ${value}`);
  }

  /**
   * Evaluator must be greater than lowerBound
   * @param {Number} lowerBound 
   * @param {Boolean} closed 
   * @returns {Flavor}
   */
  toBeGreaterThan(lowerBound, closed = true) {
    return this.toBeComparative(v => {
      let inRange = true;
      if ( closed ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      return inRange;
    }, `${lowerBound} ${(closed) ? '>=' : '>'} ${this.model.evaluator}`);
  }

  /**
   * Evaluator must be less than upperBound
   * @param {Number} upperBound 
   * @param {Boolean} closed 
   * @returns {Flavor}
   */
  toBeLessThan(upperBound, closed = true) {
    return this.toBeComparative(v => {
      let inRange = true;
      if ( closed ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    }, `${this.model.evaluator} ${(closed) ? '<=' : '<'} ${upperBound}`);
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
  toBeInRange(lowerBound, upperBound, options = {lower: 'open', upper: 'open'}) {
    return this.toBeComparative(v => {
      let inRange = true;
      if ( options.lower === 'closed' && options.upper === 'closed' ) {
        inRange = v >= lowerBound && v <= upperBound;
      }
      else if ( options.lower !== 'closed' && options.upper === 'closed' ) {
        inRange = v > lowerBound && v <= upperBound;
      }
      else if ( options.lower === 'closed' && options.upper !== 'closed' ) {
        inRange = v >= lowerBound && v < upperBound;
      }
      else if ( options.lower !== 'closed' && options.upper !== 'closed' ) {
        inRange = v > lowerBound && v < upperBound;
      }
      return inRange;
    }, `${lowerBound} ${(options.lower === 'closed') ? '>=' : '>'} ${this.model.evaluator} ${(options.upper === 'closed') ? '<=' : '<'} ${upperBound}`);
  }

  /**
   * Evaluator must be a falsy value
   * @returns {Flavor}
   */
  toBeFalsy() {
    return this.toBeComparative(v => { return !v; }, `${this.model.evaluator} to be a falsy value`);
  }

  /**
   * Evaluator must be a truthy value
   * @returns {Flavor}
   */
  toBeTruthy() {
    return this.toBeComparative(v => { return !!v; }, `${this.model.evaluator} to be a truthy value`);
  }

  /**
   * Evaluator contains the regular expression or string
   * @param {String|RegExp} regex 
   * @returns {Flavor}
   */
  toMatch(regex) {
    return this.toBeComparative(v => { return new RegExp(regex).test(v); }, `${this.model.evaluator} matches ${regex}`);
  }

  /**
   * Evaluator typeof value must match type
   * @param {String} type 
   * @returns {Flavor}
   */
  toBeTypeOf(type) {
    return this.toBeComparative(v => { return typeof v === type }, `${this.model.evaluator} is a ${type}`);
  }

  /**
   * Evaluator instanceof must be prototype
   * @param {Object} obj 
   * @returns {Flavor}
   */
  toBeInstanceOf(obj) {
    const className = ( obj.hasOwnProperty('prototype') ) ? obj.prototype.constructor.name : `${obj.prototype}`;
    return this.toBeComparative(v => {
      return v instanceof obj;
    }, `${this.model.evaluator} is an instance of ${className.replace(/\{[\s\S]*\}/g, '')}`);
  }

  getCurrentResults() {
    const o = {
      'test': this.flavor.model.title,
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
