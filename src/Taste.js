'use strict';
const EventEmitter = require('@jikurata/events');
const TasteError = require('./TasteError.js');
const Flavor = require('./Flavor.js');

let instance = null;

class Taste extends EventEmitter {  
  constructor(options = {}) {
    // If test is true, do not use the singleton pattern
    if ( !options.test && instance ) {
      return instance;
    }
    super();
    if ( !options.test ) {
      instance = this;
    }
    Object.defineProperty(this, 'queue', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'flavors', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'errors', {
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
    this.start = null;
    this.elapsedTime = null;
    this.awaitingFlavor = null;

    // Register events 
    this.registerEvent('ready', {persist: true}); // Emits when Taste is done initializing; or when the dom emit 'load' for browsers
    this.registerEvent('complete', {persist: true}); // Emits once all registered flavor tests are complete
    this.registerEvent('error');

    // Record start time
    this.once('ready', () => {
      this.start = Date.now();
    });
    
    // Print the flavor test results
    this.once('complete', (result) => {
      // Don't print if in in test mode
      if ( options.test ) {
        return;
      }
      let expectCount = 0;
      let passedCount = 0;
      let failedCount = 0;
      let fails = [];
      let errors = this.errors;
      for ( let i = 0; i < result.flavors.length; ++i ) {
        const flavor = result.flavors[i];
        for ( let j = 0; j < flavor.expectations.length; ++j ) {
          const expect = flavor.expectations[j];
          ++expectCount;
          if ( !expect.result || expect.result === 'Not Tested' ) {
            ++failedCount;
            fails.push(expect);
          }
          else {
            ++passedCount;
          }
        }
        for ( let j = 0; j < flavor.errors.length; ++j ) {
          errors.push(flavor.errors[j]);
        }
      }
      // Format the results
      const formattedResults = {
        'elapsedTime': result.elapsedTime,
        'Flavors': result.flavors.length,
        'Expectations': expectCount,
        'Passed': passedCount,
        'Failed': failedCount,
        'Errors': errors.length
      };

      if ( fails.length ) {
        console.log('Failed Flavors:\n', fails);
      }
      if ( errors.length ) {
        console.log('Errors:\n', errors);
      }
      console.log('Summary:\n', formattedResults);

      // Add additional summary views if in a browser
      if ( this.isBrowser ) {
        // Create a table of contents
        const nav = document.createElement('nav');
        nav.className = 'taste-navigation';
        let passedLinks = []; // array of hyperlinks to each passed test
        let failedLinks = []; // array of hyperlinks to each failed test
        for ( let i = 0; i < result.flavors.length; ++i ) {
          const flavor = result.flavors[i];
          for ( let j = 0; j < flavor.expectations.length; ++j ) {
            const expect = flavor.expectations[j];
            let a = (expect.result === true) ? passedLinks : failedLinks;
            a.push(`<li class="taste-summary-navigation-item"><a class="taste-summary-navigation-link" href="#${flavor.id}">${a.length + 1}. ${flavor.title}</a></li>`);
          }
        }

        // Create a view for any errors
        let errorList = [];
        for ( let i = 0; i < errors.length; ++i ) {
          errorList.push(`
          <li class="taste-summary-error-item">
            ${errors[i]}
          </li>
          `);
        }

        // Create the summary view
        const node = document.createElement('section');
        node.className = 'taste-summary';
        node.innerHTML = `
          <h2 class="taste-summary-title">Summary:</h2>
          <p class="taste-summary-content">Elapsed Time: <span class="taste-summary-time" data-taste="elapsedTime">${result.elapsedTime}ms</span></p>
          <p class="taste-summary-content">Number of flavors: <span class="taste-summary-count" data-taste="flavorCount">${result.flavors.length}</span></p>
          <p class="taste-summary-content">Number of Expectations: <span class="taste-summary-count" data-taste="expectCount">${expectCount}</span></p>
          <p class="taste-summary-content">Passed: <span class="taste-summary-passed"  data-taste="passed">${passedCount}/${expectCount}</span></p>
          <ul class="taste-summary-passed-list">
            ${passedLinks.join('')}
          </ul>
          <p class="taste-summary-content">Failed: <span class="taste-summary-failed"  data-taste="failed">${failedCount}/${expectCount}</span></p>
          <ul class="taste-summary-failed-list">
            ${failedLinks.join('')}
          </ul>
          <p class="taste-summary-content">Errors: <span class="taste-summary-errors" data-taste="errors">${errors.length}</span></p>
          <ul class="taste-summary-error-list">
            ${errorList.join('')}
          </ul>          
        `;
        this.rootElement.appendChild(node.cloneNode(true));
        this.rootElement.insertAdjacentElement('afterbegin', node.cloneNode(true));
      }
    });

    this.on('error', err => {
      this.errors.push(err);
      if ( !this.isComplete ) {
        this.emit('complete', this.getCurrentResults());
      }
    });

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
      if ( !el ) {
        return this.emit('error', new TasteError.ElementNotFound(querySelector));
      }
      this.rootElement = el;
    }
  }

  /**
   * Inspects the flavor states and determines when to instruct the next Flavor
   * to begin testing
   */
  next() {
    if ( !this.queue.length || this.awaitingFlavor ) {
      return;
    }
    const flavor = this.queue.shift();
    this.awaitingFlavor = flavor;
    flavor.once('complete', () => {
      this.awaitingFlavor = null;
      // Proceed to the next flavor in queue once this awaited flavor completes
      this.next();
    });
    // Begin this flavor's test phase
    flavor.emit('start');
  }

  /**
   * Creates a new Flavor to be tasted
   * @param {String} title
   * @returns {Flavor}
   */
  flavor(title = '') {
    const id = `flavor${this.flavors.length}`;
    const flavor = new Flavor(this, id, title);

    this.flavors.push(flavor);

    // Check if the queue can proceed when a flavor is ready
    flavor.once('ready', () => {
      // Call asynchronously, to ensure it is executed after the Flavor call chain has ended
      setTimeout(() => {
        if ( flavor.isAwaiting ) {
          this.queue.push(flavor);
          this.next();
        }
        else {
          // Run the test normally if the flavor is not awaiting
          flavor.emit('start');
        }
      }, 0);
    });
    
    flavor.once('complete', () => {
      if ( !this.isComplete ) {
        // Check if any other flavors are still incomplete
        if ( !this.allFlavorsAreComplete() ) {
          return;
        }

        // Calculate the elapsed time to completion
        this.elapsedTime = Date.now() - this.start;

        // Taste is done once all registered flavors are finished
        this.emit('complete', this.getCurrentResults());
      }
    });
    return flavor;
  }

  finished(handler) {
    TasteError.TypeError.check(handler, 'function');

    this.once('complete', handler);
  }

  /**
   * Returns a Result object containing details about each Flavor
   * @returns {Object}
   */
  getCurrentResults() {
    const result = {
      flavors: [],
      elapsedTime: (this.elapsedTime) ? this.elapsedTime : Date.now() - this.start
    };
    for ( let i = 0; i < this.flavors.length; ++i ) {
      const flavor = this.flavors[i];
      result.flavors.push(flavor.getCurrentResults());
    }
    return result;
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
  get isComplete() {
    return this.getEvent('complete').hasEmittedAtLeastOnce;
  }
}

module.exports = Taste;
