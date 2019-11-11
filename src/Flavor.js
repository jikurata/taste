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
    this.registerEvent('ready', {persist: true}); // Emits
    this.registerEvent('before');
    this.registerEvent('start'); 
    this.registerEvent('after');
    this.registerEvent('complete', {persist: true});
    this.registerEvent('test'); // Emits when a new test is added
    this.registerEvent('expect'); // Emits when a new expectation is added
    this.registerEvent('error');

    // Flavor is ready to start Taste is ready and once a test has been registered
    this.once('test', () => {
      try { 
        if ( !taste.isReady ) {
          this.taste.once('ready', () => {
            this.emit('ready');
          });
        }
        else {
          this.emit('ready');
        }
      }
      catch(err) {
        this.emit('error', err);
      }
    });

    // Execute flavor lifecycle
    this.once('ready', () => {
      try {
        this.model.status = 'Preparing';
        this.update();
        this.emit('before', this.profile)
        .then(errors => {
          if ( !errors && !this.isComplete ) {
            this.model.status = 'In Progress';
            this.update();
            return this.emit('start');
          }
        })
        .then(errors => {
          if ( !errors && !this.isComplete ) {
            this.model.status = 'Resolving';
            this.update();
            return this.emit('after', this.profile);
          }
        })
        .then(errors => {
          if ( !errors && !this.isComplete ) {
            this.model.status = 'Complete';
            this.update();
            return this.emit('complete', this.getCurrentResults());
          }
        });
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
    this.on('test', (test) => {
      try {
        const runTest = () => {
          setTimeout(() => {
            test.run(this.profile)
            .then(() => {
              ++this.model.completedTests;
            })
            .catch(err => {
              this.emit('error', err);
              ++this.model.completedTests;
            });
          }, 0);
        };
        // Run the test if the start state has been emitted
        if ( this.hasStarted ) {
          runTest();
        }
        // Otherwise, wait until it starts
        else {
          this.once('start', () => {
            runTest();
          });
        }
      }
      catch(err) {
        this.emit('error', err);
      }
    });

    this.once('start', () => new Promise((resolve, reject) => {
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
        this.update();
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
      this.model.errors.push(err);
      if ( !this.isComplete ) {
        this.emit('complete', this.getCurrentResults());
      }
    });

    // Wait for window to finish loading before appending anything to the DOM
    if ( this.isBrowser ) {
      this.taste.once('ready', () => {
        if ( this.isBrowser ) {
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
              <h3 class="taste-flavor-content">Result: <span class="taste-flavor-result" data-flavor="result"></span></h3>
              <p class="taste-flavor-content">Duration: <span class="taste-flavor-duration" data-flavor="duration"></span>ms</p>
              <p class="taste-flavor-content">Timeout: <span class="taste-flavor-timeout" data-flavor="timeout"></span>ms</p>
              <section>
                <p>DOM:</p>
                <section class="taste-flavor-sample" data-flavor="sampleAsHTML"></section>
                <section class="taste-flavor-sample" data-flavor="sampleAsText"></section>
              </section>
              <p class="taste-flavor-content">Test: <span class="taste-flavor-test" data-flavor="test"></span></p>
              <div class="taste-flavor-content">
                Expectations:
                <section class="taste-flavor-expectation" data-flavor="expectation"></section>
              </div>
            </section>
          </a>`;

          flavorRoot.innerHTML = html;
          this.model.rootElement = flavorRoot;
          this.taste.rootElement.appendChild(flavorRoot);
        }
      });
    }
  }

  update() {
    if ( !this.isReady ) {
      return;
    }

    // Update the status state
    
    if ( this.isBrowser ) {
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
      this.getElement('description').textContent = this.model.description;
      this.getElement('test').textContent = this.testToString();
      const results = [];
      this.getElement('expectation').innerHTML = '';
      this.forEachExpectation((expect) => {
        let received = '';
        if ( expect.isComplete ) {
          results.push(expect.result);
          received = `${expect.evaluator} = ${expect.value}`;
        }
        else if ( this.model.ERROR ) {
          results.push(this.model.ERROR);
        }
        const html = `
        <p class="taste-flavor-content">Expects: <span class="taste-flavor-expect">${expect.expression}</span></p>
        <p class="taste-flavor-content">Received: <span class="taste-flavor-received">${received}</span></p>`;
        this.getElement('expectation').innerHTML += html;
      });
      this.getElement('result').textContent = results.join(' ');
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
      // Do stuff to initialize the sample

      this.update();
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
      // Emit that a test has been added
      this.emit('test', test);
      this.update();
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
        this.update();
        ++this.model.completedExpectations;
      });
  
      // Register the argument as a property in profile
      if ( !this.profile._has(arg) ) {
        // If the property already exists, but not in the map, register it in the map and emit the value
        if ( this.profile.hasOwnProperty(arg) ) {
          this.profile._set(arg, this.profile[arg], true);
        }
        else {
          // Otherwise register the event normally
          this.profile._set(arg, undefined, false);
        }
      }
  
      this.expectations.push(expect);
      // Emit that an expectation has been added
      this.emit('expect', expect);
      this.update();
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
      this.update();
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

      this.on('before', (profile) => new Promise((resolve, reject) => {
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

      this.on('after', (profile) => new Promise((resolve, reject) => {
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

      this.on('complete', (profile) => new Promise((resolve, reject) => {
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

  forEachExpectation(fn) {
    TasteError.TypeError.check(fn, 'function');

    for ( let i = 0; i < this.expectations.length; ++i ) {
      const expect = this.expectations[i];
      fn(expect);
    }
  }

  getElement(s) {
    if ( this.taste.rootElement ) return this.model.rootElement.querySelector(`[data-flavor="${s}"]`);
    return null;
  }

  getCurrentResults() {
    const o = {
      'title': this.model.title,
      'status': this.model.status,
      'duration': this.model.duration,
      'timeout': this.model.timeout,
      'tests': this.tests,
      'expectations': [],
      'errors': this.model.errors
    }
    this.forEachExpectation((expect) => {
      o.expectations.push(expect.getCurrentResults());
    });
    return o;
  }

  get isReady() {
    return this.getEvent('ready').hasEmittedAtLeastOnce;
  }

  get hasStarted() {
    return this.getEvent('start').hasEmittedAtLeastOnce;
  }

  get isComplete() {
    return this.getEvent('complete').hasEmittedAtLeastOnce;
  }

  get isBrowser() {
    return this.taste.isBrowser;
  }
}

module.exports = Flavor;
