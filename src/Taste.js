'use strict';
const EventEmitter = require('@jikurata/events');
const TasteError = require('./TasteError.js');
const Flavor = require('./Flavor.js');

let instance = null;

class Taste extends EventEmitter {  
  constructor() {
    if ( instance ) {
      return instance;
    }
    super();
    instance = this;
    Object.defineProperty(this, 'flavors', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'isBrowser', {
      value: !(process && process.version && process.versions && process.versions.node),
      enumerable: true,
      writable: false,
      configurable: false,
    });


    // Register events 
    this.registerEvent('ready', {persist: true}); // Emits when Taste is done initializing; or when the dom emit 'load' for browsers
    this.registerEvent('complete', {persist: true}); // Emits once all registered flavor tests are complete

    if ( this.isBrowser ) {
      // Add browser related properties
      this.rootElement = null;
      
      window.addEventListener('load', () => {
        this.rootElement = document.body;
        this.emit('ready');
      });
    }
    else {
      this.emit('ready');
    }
  }

  /**
   * Searches DOM for a single match with the selector
   * Sets the root to the element found
   * @param {String} querySelector 
   */
  prepare(querySelector) {
    if ( this.isBrowser ) {
      if ( !this.isReady ) {
        return this.once('ready', () => this.prepare(querySelector));
      }
      const el = document.querySelector(querySelector);
      // Throw if el is null
    }
  }

  /**
   * Creates a new Flavor to be tasted
   * @param {String} title
   * @returns {Flavor}
   */
  flavor(title = '') {
    const id = `flavor${this.flavors.length}`;
    const flavor = new Flavor(this, id, title);

    flavor.once('complete', () => {
      // Check if any other flavors are still incomplete
      if ( !this.allFlavorsAreComplete() ) {
        return;
      }
      
      // Record the flavor test results
      const results = [];
      this.forAllFlavors((flavor) => {
        results.push(flavor.getCurrentResults());
      });

      let expectCount = 0;
      let passedCount = 0;
      let failedCount = 0;
      let errorCount = 0;
      let fails = [];
      let errors = [];
      for ( let i = 0; i < results.length; ++i ) {
        const result = results[i];
        for ( let j = 0; j < result.expectations.length; ++j ) {
          ++expectCount;
          const expect = result.expectations[j];
          if ( !expect.result || expect.result === 'Not Tested' ) {
            ++failedCount;
            fails.push(expect);
          }
          else {
            ++passedCount;
          }
        }
        for ( let j = 0; j < result.errors.length; ++j ) {
          ++errorCount;
          errors.push(result.errors[j]);
        }
      }
      // Format the results
      const formattedResults = {
        'Flavors': results.length,
        'Expectations': expectCount,
        'Passed': passedCount,
        'Failed': failedCount,
        'Errors': errorCount
      };

      if ( fails.length ) {
        console.log('Failed Flavors:\n', fails);
      }
      if ( errors.length ) {
        console.log('Errors:\n', errors);
      }
      console.log('Summary:\n', formattedResults);
      this.emit('complete', results);
    });

    this.flavors.push(flavor);
    return flavor;
  }

  /**
   * Returns an object containing details about each Flavor
   * @returns {Object}
   */
  getCurrentResults() {
    const length = this.flavors.length;
    const o = {
      'flavorCount': length,
      'expectationCount': 0,
      'passed': 0,
      'failed': 0,
      'error': 0,
      'elapsedTime': 0
    };
    for ( let i = 0; i < length; ++i ) {
      const flavor = this.flavors[i];
      flavor.forEachExpectation(expect => {
        expect
      });
    }
    return o;
  }
  
  forAllFlavors(fn) {
    TasteError.TypeError.check(fn, 'function');

    for ( let i = 0; i < this.flavors.length; ++i ) {
      ((flavor) => {
        fn(flavor);
      })(this.flavors[i])
    }
  }

  allFlavorsAreComplete() {
    for ( let i = 0; i < this.flavors.length; ++i ) {
      if ( !this.flavors[i].isComplete ) {
        return false;
      }
    }
    return true;
  }

  get isReady() {
    return this.getEvent('ready').hasEmittedAtLeastOnce;
  }
}

module.exports = Taste;
