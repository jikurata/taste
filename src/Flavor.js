'use strict';
const EventEmitter = require('@jikurata/events');
const TasteError = require('./TasteError.js');
const Model = require('./Model.js');
const Profile = require('./Profile.js');
const Test = require('./Test.js');
const Expectation = require('./Expectation.js');

class Flavor extends EventEmitter {
  constructor(taste, id, title) {
    super();
    Object.defineProperty(this, 'taste', {
      value: taste,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, 'id', {
      value: id,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, 'tests', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false,
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
    Object.defineProperty(this, 'model', {
      value: new Model({
        'await': false,
        'rootElement': null,
        'title': title,
        'status': 'Initializing',
        'start': 0,
        'duration': 0,
        'timeout': 2500,
        'timeoutRef': null,
        'sample': null,
        'errors': [],
        'completedTests': 0,
        'completedExpectations': 0
      }),
      enumerable: true,
      writable: false,
      configurable: false
    });

    // Register events
    this.registerEvent('ready', {persist: true});
    this.registerEvent('start', {persist: true}); 
    this.registerEvent('before');
    this.registerEvent('test', {persist: true});
    this.registerEvent('after');
    this.registerEvent('complete', {persist: true});
    this.registerEvent('add-test'); // Emits when a new test is added
    this.registerEvent('add-expect'); // Emits when a new expectation is added
    this.registerEvent('error');

    // Execute flavor lifecycle
    this.once('start', () => {
      try {
        if ( this.isComplete ) {
          return;
        }
        this.model.status = 'Preparing';
        this.emit('update');
        this.emit('before', this.profile)
        .then(errors => {
          if ( !errors && !this.isComplete ) {
            this.model.status = 'In Progress';
            this.emit('update');
            return this.emit('test');
          }
        })
        .then(errors => {
          if ( !errors && !this.isComplete ) {
            this.model.status = 'Resolving';
            this.emit('update');
            return this.emit('after', this.profile);
          }
        })
        .then(errors => {
          if ( !errors && !this.isComplete ) {
            this.model.status = 'Complete';
            this.emit('update');
            return this.emit('complete', this.getCurrentResults());
          }
        })
        .then(() => this.emit('update'));
      }
      catch(err) {
        this.emit('error', err);
      }
    });

    this.once('before', () => {
      // Monitor flavor duration
      try {
        this.model.start = Date.now();
        this.model.timeoutRef = setInterval(() => {
          // Update the current elapsed time
          const delta = Date.now() - this.model.start;
          this.model._set('duration', delta, false);
    
          if ( this.isBrowser ) {
            this.getElement('duration').textContent = this.model.duration;
          }
          
          // Handle timeout
          try {
            TasteError.FlavorTimedOut.check(this);
          }
          catch(err) {
            this.emit('error', err);
          }
        }, 1);
      }
      catch(err) {
        this.emit('error', err);
      }
    });

    // Handle test execution conditions
    this.on('add-test', (test) => {
      try {
        // Execute once the start phase has begun
        this.once('test', () => {
          // Call tests asynchronously
          setTimeout(() => {
            test.run(this.profile, this.model.sample)
            .then(() => {
              ++this.model.completedTests;
            })
            .catch(err => {
              this.emit('error', err);
              ++this.model.completedTests;
            });
          }, 0);
        });
      }
      catch(err) {
        this.emit('error', err);
      }
    });

    this.once('test', () => new Promise((resolve, reject) => {
      try {
      if ( this.model.completedTests === this.tests.length ) {
          return resolve();
        }
        else {
          this.model.on('completedTests', (v) => {
            if ( v === this.tests.length ) {
              return resolve();
            }
          });
        }
      }
      catch(err) {
        this.emit('error', err);
      }
    }));

    // Wait for expectations to resolve after tests resolve
    this.once('after', () => new Promise((resolve, reject) => {
      try {
        if ( this.expectations.length && this.model.completedExpectations === this.expectations.length ) {
          return resolve();
        }
        
        // If the expectations are not completed, listen to the expectation counter
        this.model.on('completedExpectations', (v) => {
          if ( v === this.expectations.length ) {
            return resolve();
          }
        });
      }
      catch(err) {
        this.emit('error', err);
      }
    }));
    
    // Stop the timer once the flavor test is complete
    this.once('complete', () => {
      try {
        // End the timeout
        if ( this.model.timeoutRef ) {
          clearInterval(this.model.timeoutRef);
          this.model._set('timeoutRef', null, false);
        }
        this.emit('update');
      }
      catch(err) {
        this.emit('error', err);
      }
    });

    // Handle thrown errors
    this.on('error', (err) => {
      if ( err instanceof TasteError.EnvironmentNotBrowser ) {
        this.model.status = 'Error: Requires a browser to test';
      }
      else if ( err instanceof TasteError.FlavorTimedOut ) {
        this.model.status = 'Error: Timed out';
        // Inspect object states to determine the reason why the timeout occurred
      }
      else {
        this.model.status = "Error";
      }
      this.model.errors.push(err);
      if ( !this.isComplete ) {
        this.emit('complete', this.getCurrentResults());
      }
    });

    // Update the view if in browser
    this.on('update', () => {
      if ( !this.isReady ) {
        return;
      }
  
      if ( this.isBrowser  && this.model.rootElement ) {
        // Update the sample
        const sampleAsHTML = this.getElement('sampleAsHTML');
        const sampleAsText = this.getElement('sampleAsText');
        const sampleRoot = sampleAsHTML.children[0];
    
        // Only overwrite innerHTML of sampleAsHTML when there is no sample root
        if ( !sampleRoot ) sampleAsHTML.innerHTML = this.model.sample;
        else sampleAsText.textContent = sampleAsHTML.innerHTML;
  
        // Update the view
        this.getElement('title').textContent = this.model.title;
        this.getElement('status').textContent = this.model.status;
        this.getElement('timeout').textContent = this.model.timeout;
  
        let testHtml = '';
        // Print test sources
        for ( let i = 0; i < this.tests.length; ++i ) {
          const test = this.tests[i];
          testHtml +=`
            <li class="taste-flavor-test">
              <p class="taste-flavor-test-description">Description: ${test.description}</p>
              <p class="taste-flavor-test-source">${test.handler.toString()}</p>
            </li>
          `;
        }
        this.getElement('test').innerHTML = testHtml;
  
        // Print expectations
        let expectHtml = '';
        this.forEachExpectation((expect) => {
          expectHtml += `
          <p class="taste-flavor-content">Expects: <span class="taste-flavor-expect">${expect.model.statement}</span></p>
          <p class="taste-flavor-content">Received: <span class="taste-flavor-received">${expect.model.evaluator} = ${expect.model.value}</span></p>
          `;
          if ( expect.isComplete ) {
            const result = expect.model.result;
            let s = (result === true) ? 'Passed' : (typeof result === 'string') ? result : 'Failed';
            expectHtml += `<h4 class="taste-flavor-content">Result: <span class="taste-flavor-result" data-flavor="result">${s}</span></h4>`
          }
  
        });
        this.getElement('expectation').innerHTML = expectHtml;
      }
    });

    // Wait for window to finish loading before appending anything to the DOM
    if ( this.isBrowser ) {
      this.taste.once('ready', () => {
        // Create the view for the flavor
        const flavorRoot = document.createElement('article');
        flavorRoot.setAttribute('data-flavor', this.id);
        const html = `
        <a name="${this.id}">
          <header>
            <h2 class="taste-flavor-title" data-flavor="title"></h2>
          </header>
          <section data-flavor="content">
            <h3 class="taste-flavor-content">Status: <span class="taste-flavor-status" data-flavor="status">Preparing...</span></h4>
            <p class="taste-flavor-content">Duration: <span class="taste-flavor-duration" data-flavor="duration"></span>ms</p>
            <p class="taste-flavor-content">Timeout: <span class="taste-flavor-timeout" data-flavor="timeout"></span>ms</p>
            <section>
              <p>DOM:</p>
              <section class="taste-flavor-sample" data-flavor="sampleAsHTML"></section>
              <section class="taste-flavor-sample" data-flavor="sampleAsText"></section>
            </section>
            <div class="taste-flavor-content">
              <h4>Test:</h4>
              <ul data-flavor="test"></ul>
            </div>
            <div class="taste-flavor-content">
              <h4>Expectation:</h4>
              <section class="taste-flavor-expectation" data-flavor="expectation"></section>
            </div>
          </section>
        </a>`;

        flavorRoot.innerHTML = html;
        this.model.rootElement = flavorRoot;
        this.taste.rootElement.appendChild(flavorRoot);
        this.emit('ready');
      });
    }
    else {
      this.emit('ready');
    }
  }
  
  /**
   * Creates a subtree in the dom to perform a test on
   * @param {String} html
   * @returns {Flavor}
   */
  sample(html) {
    if ( this.isBrowser ) {
      if ( !this.taste.isReady ) {
        this.taste.once('ready', () => this.sample(html));
      }
      // Create a view for the sample
      const sampleRoot = document.createElement('article');
      sampleRoot.className = '';
      sampleRoot.innerHTML = html;

      // Append document methods to sample
      sampleRoot.getElementById = (id) => {
        return sampleRoot.querySelector(`#${id}`);
      };

      this.model.sample = sampleRoot;
      this.emit('update');
    }
    else {
      // Skip the flavor test if not in a browser
      this.emit('error', new TasteError.EnvironmentNotBrowser(this));
    }
    return this;
  }

  /**
   * Performs the defined test
   * @param {String} description
   * @param {Function} handler
   * @param {String} html
   * @returns {Flavor}
   */
  test(description, handler) {
    try {
      if ( typeof arguments[0] === 'function' ) {
        handler = arguments[0];
        description = '';
      }
      const test = new Test(description, handler);
      this.tests.push(test);
      // Create the test asynchronously so the entire flavor function chain can execute first
      setTimeout(() => {
        try {
          
          // Emit that a test has been added
          this.emit('add-test', test);
          this.emit('update');
        }
        catch(err) {
          this.emit('error', err);
        }
      }, 0);
      return this;
    }
    catch(err) {
      this.emit('error', err);
    }
  }

  /**
   * Verifies the results of the test by comparing a value from model with value from
   * expectation
   * @param {String} arg
   * @returns {Flavor}
   */
  expect(arg) {
    try {
      const expect = new Expectation(this, arg);
      // When all expectations are complete, then the flavor's state is complete
      expect.once('complete', () => {
        // Retrieve expectation results
        this.emit('update');
        ++this.model.completedExpectations;
      });
  
      this.expectations.push(expect);
      // Emit that an expectation has been added
      setTimeout(() => {
        // Register the argument as a property in profile
        if ( !this.profile._has(arg) ) {
          // If the property already exists, but not in the profile map, register it in the map and emit the value
          if ( this.profile.hasOwnProperty(arg) ) {
            this.profile._set(arg, this.profile[arg]);
          }
          else {
            // Otherwise register the event normally
            this.profile._set(arg, undefined, false);
          }
        }
        this.emit('add-expect', expect);
        this.emit('update');
      }, 0);
      return expect;
    }
    catch(err) {
      this.emit('error', err);
    }
  }

  /**
   * Sets the time out limit for the flavor
   * Default: 2500
   * @param {Number} t 
   * @returns {Flavor}
   */
  timeout(t) {
    try {
      this.model.timeout = t;
      this.emit('update');
      return this;
    }
    catch(err) {
      this.emit('error', err);
    }
  }

  /**
   * Executes the provided function before enterng the test phase
   * The Flavor Profile is passed as an argument into the handler
   * @param {Function} handler 
   * @returns {Flavor}
   */
  before(handler) {
    try {
      TasteError.TypeError.check(handler, 'function');

      this.once('before', (profile) => new Promise((resolve, reject) => {
        const returnValue = handler(profile);
        if ( returnValue instanceof Promise ) {
          returnValue.then(() => resolve())
          .catch(err => this.emit('error', err));
        }
        else {
          resolve();
        }
      }));
      return this;
    }
    catch(err) {
      this.emit('error', err);
    }
  }

  /**
   * Executes the provided function after all tests finish
   * The Flavor Profile is passed as an argument into the handler
   * @param {Function} handler 
   * @returns {Flavor}
   */
  after(handler) {
    try {
      TasteError.TypeError.check(handler, 'function');

      this.once('after', (profile) => new Promise((resolve, reject) => {
        const returnValue = handler(profile);
        if ( returnValue instanceof Promise ) {
          returnValue.then(() => resolve())
          .catch(err => this.emit('error', err));
        }
        else {
          resolve();
        }
      }));
      return this;
    }
    catch(err) {
      this.emit('error');
    }
  }

  /**
   * Executes the provided function after the flavor is complete
   * A Result object is passed as an argument to the function
   * @param {Function} handler 
   * @returns {Flavor}
   */
  finished(handler) {
    try {
      TasteError.TypeError.check(handler, 'function');

      this.once('complete', (profile) => new Promise((resolve, reject) => {
        const returnValue = handler(profile);
        if ( returnValue instanceof Promise ) {
          returnValue.then(() => resolve())
          .catch(err => this.emit('error', err));
        }
        else {
          resolve();
        }
      }));
      return this;
    }
    catch(err) {
      this.emit('error', err);
    }
  }

  /**
   * Toggles await mode for the Flavor
   * When called, any subsequent flavors will wait for this flavor to complete
   * before starting
   */
  await() {
    this.model.await = true;
  }

  forEachExpectation(fn) {
    TasteError.TypeError.check(fn, 'function');

    for ( let i = 0; i < this.expectations.length; ++i ) {
      const expect = this.expectations[i];
      fn(expect);
    }
  }

  getElement(s) {
    return this.model.rootElement.querySelector(`[data-flavor="${s}"]`);
  }

  getCurrentResults() {
    const o = {
      'id': this.id,
      'title': this.model.title,
      'status': this.model.status,
      'duration': this.model.duration,
      'timeout': this.model.timeout,
      'tests': [],
      'expectations': [],
      'errors': this.model.errors
    }

    for ( let i = 0; i < this.tests.length; ++i ) {
      o.tests.push(this.tests[i].toObject());
    }
    
    this.forEachExpectation((expect) => {
      o.expectations.push(expect.getCurrentResults());
    });
    return o;
  }

  get isReady() {
    return this.getEvent('ready').hasEmittedAtLeastOnce;
  }

  get isTesting() {
    return this.getEvent('test').hasEmittedAtLeastOnce;
  }

  get isComplete() {
    return this.getEvent('complete').hasEmittedAtLeastOnce;
  }

  get isAwaiting() {
    return this.model.await;
  }

  get isBrowser() {
    return this.taste.isBrowser;
  }
}

module.exports = Flavor;
