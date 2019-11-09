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
    this.registerEvent('ready', {persist: true});

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

    // Handle flavor events
    flavor.on('update', () => {
      // Update the flavor view
    });

    // Record the flavor test results
    flavor.once('complete', () => {
      // Check if any other flavors are still incomplete
      if ( this.areAllFlavorsComplete() ) {
        console.log('all flavors complete');
        const errors = [];
        this.forAllFlavors((flavor) => {
          // Collect the results of the flavor tests
          console.log(flavor.getCurrentResults());
          // Collect any errors from the flavor tests
          if ( flavor.model.errors.length ) {
            errors.push(flavor.model.errors);
          }

        });
        console.log(`There were ${errors.length} errors`);
      }
      else {
      }
      // Print any errors if all flavors have completed

      // Print results if all flavors have completed
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

  areAllFlavorsComplete() {
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
