(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
const Taste = require('../../../index.js');
const Profile = require('../../../src/Profile.js');

function add(x,y) {
  return x + y;
}

Taste.prepare('#test');

Taste('Synchronous pass test')
.test('Add 4 + 1', profile => {
  profile.addResult = add(4,1);
  profile.addResultAgain = add(6,4);
})
.expect('addResult').toEqual(5)
.expect('addResultAgain').toEqual(10);

Taste('Synchronous fail test')
.test('Add 4 + 1', profile => {
  profile.wrongResult = add(4,1);
})
.expect('wrongResult').toEqual(3);

Taste('Asynchronous pass test')
.test('Resolves after 1000ms', profile => {
  setTimeout(() => {
    profile.asyncResult = true;
  }, 1000);
})
.timeout(5000)
.expect('asyncResult').toBeTruthy();

Taste('Asynchronous fail test')
.test('Fails after 1000ms', profile => {
  setTimeout(() => {
    profile.asyncFailed = true;
  }, 1000);
})
.timeout(5000)
.expect('asyncFailed').toBeFalsy();

Taste('Asynchronous timeout test')
.test('Test exceeds timeout', profile => {
  setTimeout(() => {
    profile.asyncTimeout = true;
  }, 1000);
})
.timeout(500)
.expect('asyncTimeout').toBeTruthy();

Taste('Pass Flavor profile instance to test')
.test('profile is the current Flavor profile in the test scope', profile => {
  profile.thisIsFlavor = profile instanceof Profile;
})
.expect('thisIsFlavor').toBeTruthy();

// DOM Test
Taste('Taste sample dom test')
.sample(`
  <section class="sample">
    <p>Sample Html Test</p>
  </section>
`)
.test('Test contains a sample of html to be used in the test', (profile, sample) => {
  sample.innerHTML += '<p>This text was added during the test.</p>';
  profile.childrenLength = sample.children.length;
})
.expect('childrenLength').toBe(2);

},{"../../../index.js":2,"../../../src/Profile.js":12}],2:[function(require,module,exports){
'use strict';
const Taste = require('./src/Taste.js');
const taste = new Taste();

function flavor(title) {
  return taste.flavor(title);
}

function prepare(querySelector) {
  return taste.prepare(querySelector);
}
module.exports = flavor;
module.exports.prepare = prepare;

},{"./src/Taste.js":13}],3:[function(require,module,exports){
'use strict';
module.exports = require('./src/EventEmitter.js');

},{"./src/EventEmitter.js":5}],4:[function(require,module,exports){
'use strict';
const EventListener = require('./EventListener.js');
const EventError = require('./EventError.js');

// TODO: Refactor listener execution resolution logic to Event from EventEmitter
class Event {
  constructor(name, param = {}) {
    EventError.InvalidEventName.throwCheck(name);
    
    Object.defineProperty(this, 'name', {
      value: name,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'listeners', {
      value: [],
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'state', {
      value: {
        'PREVIOUS_ARGS': [],
        'EMITTED_ONCE': false,
        'MAX_POOL_SIZE': (param.hasOwnProperty('limit')) ? param.limit : 0,
        'PERSISTED': (param.hasOwnProperty('persist')) ? param.persist : false
      },
      enumerable: true,
      writable: false,
      configurable: false
    });
  }

  /**
   * Runs the listeners provided as an argument
   * Any errors thrown by a listener are safely caught and resolved 
   * @param {Array<EventListener>} listeners 
   * @param  {...any} args 
   * @returns {Promise<Array<Error>>}
   */
  run(listeners, ...args) {
    // Update event state
    this.state.EMITTED_ONCE = true;
    this.state.PREVIOUS_ARGS = args || [];
    
    const errors = [];
    const promises = [];
    // Execute each listener on the event
    for ( let i = 0; i < listeners.length; ++i ) {
      const promise = new Promise((resolveListener, rejectListener) => {
        listeners[i].run(...args)
        .then(() => resolveListener())
        .catch(err => {
          errors.push(err);
          resolveListener();
        });
      })
      promises.push(promise);
    }

    return Promise.all(promises)
    .then(() => {
      
      // TODO: Figure out an algorithm that allows for safe deletion of listeners
      // Without creating race conditions between overwriting the array of listeners
      // and iterating through that array in a situation where an event is being
      // called many times in a short period of time

      // Check for any listeners set to be deleted once resolved
      // this.removeListener();
      
      // If listeners threw any errors, pass them down the promise chain
      return (errors.length) ? errors : undefined;
    });
  }

  /**
   * Wrapper for event's run method
   * Executes all listeners on the event
   * @param {...any} args
   * @returns {Promise<Array<Error>>}
   */
  runListeners(...args) {
    const listeners = [].concat(this.listeners);
    return this.run(listeners, ...args);
  }

  /**
   * Creates an instance of EventListener for passed listener
   * Returns a generated id for the listener
   * @param {function} f 
   * @param {EventListenerOptions} options
   *  EventListenerOptions properties:
   *    'id': {String} Sets the specified id to the listener
   *    'isOnce' || 'once': {Boolean} Sets the listener to activate only once
   *    'priority': {String} 'first' || 'last': Determine whether to add the listener
   *                to the front or end of the queue
   */
  registerListener(f, options = {once: false}) {
    // Throw if invalidated
    EventError.ExceedsMaxListeners.throwCheck(this);

    const isOnce = (options.once) ? options.once : false;
    const id = (options.hasOwnProperty('id')) ? options.id : `${this.listeners.length}-${Date.now()}`;
    const listener = new EventListener(id, f, isOnce);

    if ( options.priority === 'first' ) this.listeners.unshift(listener);
    else this.listeners.push(listener);

    // Run the listener with the previous event state when persisting
    if ( this.isPersisted && this.hasEmittedAtLeastOnce ) {
      this.run([listener], ...this.state.PREVIOUS_ARGS);
    }
    return id;
  }

  /**
   * Removes listeners with a matching id
   * When the argument is undefined, it will search for listeners set to be deleted still
   * @param {String|Array<String>} id 
   */
  removeListener(id) {
    if ( !Array.isArray(id) ) {
      id = [id];
    }

    const temp = [];
    const listeners = [].concat(this.listeners);
    for (let i = 0; i < listeners.length; ++i ) {
      const listener = listeners[i];
      if ( !listener.isDeleted && id.indexOf(listener.id) === -1 ) {
        temp.push(listener);
      }
    }
    // Replace the current set of listeners with the new set
    if ( temp.length !== listeners.length ) {
      this.listeners.length = 0;
      for ( let i = 0; i < temp.length; ++i ) {
        this.listeners.push(temp[i]);
      }
    }
  }

  get maxListenerCount() {
    return this.state.MAX_POOL_SIZE;
  }

  set maxListenerCount(val) {
    if ( typeof val === 'number' ) {
      this.state.MAX_POOL_SIZE = val;
    };
  }

  get hasEmittedAtLeastOnce() {
    return this.state.EMITTED_ONCE;
  }

  get isPersisted() {
    return this.state.PERSISTED;
  }

  set isPersisted(bool) {
    this.state.PERSISTED = !!bool;
  }
}

module.exports = Event;

},{"./EventError.js":6,"./EventListener.js":7}],5:[function(require,module,exports){
'use strict';
const EventError = require('./EventError.js');
const Event = require('./Event.js');

class EventEmitter {
  constructor() {
    Object.defineProperty(this, '_events', {
      value: {},
      enumerable: true,
      writable: false,
      configurable: false
    });

    this.registerEvent('error');
  }

  /**
   * Register a new event for the emitter to watch
   * @param {String} eventName 
   * @param {EventOptions} eventName
   *  EventOptions properties:
   *    'persist': {Boolean} Immediately emit its most recent state to any newly added listeners
   *      Default: false
   *    'limit': {Number} Limits the pool size for listeners
   *      Default: 0 (No limit)
   */
  registerEvent(eventName, options = {}) {
    if ( this.hasEvent(eventName) ) return;
    const event = new Event(eventName, options);
    this._events[eventName] = event;
  }

  /**
   * Removes the event object with the specified event name
   * @param {String} eventName 
   */
  unregisterEvent(eventName) {
    if ( !this.hasEvent(eventName) ) return;
    delete this._events[eventName];
  }

  /**
   * Register an event listener on an event
   * Returns a generated id for the listener
   * @param {String} eventName 
   * @param {Function} listener 
   * @param {EventListenerOptions} options
   *  EventListenerOptions properties:
   *    'id': {String} Sets the specified id to the listener
   *    'once': {Boolean} Sets the listener to activate only once
   *    'priority': {String} 'first' || 'last': Determine whether to add the listener
   *                to the front or end of the queue (Default: 'last')
   */
  addEventListener(eventName, listener, options = {once: false, priority: 'last'}) {
    const isOnce = (options.hasOwnProperty('once')) ? options.once : false;
    const priority = (options.hasOwnProperty('priority')) ? options.priority : 'last';
    const id = (options.hasOwnProperty('id')) ? options.id : undefined;
    if ( !this.hasEvent(eventName) ) this.registerEvent(eventName);
    try {
      this.getEvent(eventName).registerListener(listener, {once: isOnce, priority: priority, id: id});
    }
    catch (err) {
      this.emit('error', err);
    }
  }

  /**
   * Wrapper for addEventListener
   * @param {String} eventName 
   * @param {Function} listener 
   * @param {EventListenerOption} options
   */
  on(eventName, listener, options = {}) {
    return this.addEventListener(eventName, listener, options);
  }

  /**
   * Wrapper for addEventListener with once option enabled
   * @param {String} eventName 
   * @param {Function} listener 
   */
  once(eventName, listener) {
    return this.addEventListener(eventName, listener, {once: true});
  }

  /**
   * Trigger an event and its listeners
   * @param {String} eventName 
   * @param {...Any} args
   * @returns {Promise<Void>}
   */
  dispatchEvent(eventName, ...args) {
    return new Promise((resolve, reject) => {
      const event = this.getEvent(eventName);

      if ( event ) {
        event.runListeners(...args)
        .then(errors => {
          if ( errors ) {
            // Emit any errors that the listeners threw
            for ( let i = 0; i < errors.length; ++i ) {
              this.dispatchEvent('error', errors[i]);
            }
          }
          return resolve(errors);
        })
        .catch(err => reject(err)); // Throw any unexpected errors
      }
      else {
        // Register the event if it does not exist
        this.registerEvent(eventName);
        return resolve();
      }
    })
    .catch(err => this.dispatchEvent('error', err));
  }

  /**
   * Wrapper for dispatchEvent
   * @param {String} eventName 
   * @param {...Any} args
   */
  emit(eventName, ...args) {
    return this.dispatchEvent(eventName, ...args);
  }

  /**
   * Removes listener with corresponding id
   * Returns the deleted listener
   * @param {String} eventName 
   * @param {String} id 
   */
  removeEventListener(eventName, id) {
    if ( !this.hasEvent(eventName) ) return;
    return this.getEvent(eventName).removeListener(id);
  }

  hasEvent(eventName) {
    return this._events.hasOwnProperty(eventName);
  }

  getEvent(name) {
    return this._events[name];
  }
}

module.exports = EventEmitter;

},{"./Event.js":4,"./EventError.js":6}],6:[function(require,module,exports){
'use strict';

class InvalidEventName extends TypeError {
  constructor(arg) {
    super(`Invalid Event Name: Expected a truthy String as an argument, received ${typeof arg} instead`);
  }

  static throwCheck(arg) {
    if ( typeof arg !== 'string' || arg.trim() === '' ) {
      throw new InvalidEventName(arg);
    }
  }
}

class InvalidListener extends TypeError {
  constructor(arg) {
    super(`Invalid Listener: Expected a Function as an argument, received ${typeof arg} instead`);
  }

  static throwCheck(arg) {
    if ( typeof arg !== 'function' ) {
      throw new InvalidListener(arg);
    }
  }
}

class ExceedsMaxListeners extends Error {
  constructor(event) {
    super(`Exceeds Max Listeners: ${event.name} has a maximum listener count of ${event.maxListenerCount}. Manually set the event's maximum pool by using its "setMaxListenerCount" setter.`);
  }

  static throwCheck(event) {
    // If the event's maximum listeners is set to 0 or any falsy value, then it has no limit
    if ( event.maxListenerCount > 0 && event.listeners.length >= event.maxListenerCount ) {
      throw new ExceedsMaxListeners(event);
    }
  }
}

module.exports.InvalidEventName = InvalidEventName;
module.exports.InvalidListener = InvalidListener;
module.exports.ExceedsMaxListeners = ExceedsMaxListeners;

},{}],7:[function(require,module,exports){
'use strict';
const EventError = require('./EventError.js');

class EventListener {
  constructor(id, handler, isOnce = false) {
    // Throw if handler is not a function
    EventError.InvalidListener.throwCheck(handler);

    Object.defineProperty(this, 'id', {
      value: id,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'handler', {
      value: handler,
      enumerable: true,
      writable: false,
      configurable: false
    });
    this._IS_ONCE = isOnce;
    this._IS_DELETED = false;
  }

  /**
   * Executes the handler as a function and passes any arguments into
   * the handler
   * @param  {...any} args
   * @returns {Promise<Void>}
   */
  run(...args) {
    return new Promise((resolve, reject) => {
      if ( this.isDeleted ) {
        return resolve();
      };
      
      // Toggle handler for deletion after being executed when set to occur once
      if ( this.isOnce ) {
        this._IS_DELETED = true;
      }

      // Pass any arguments into the handler function
      const returnValue = this.handler(...args);
      if ( returnValue instanceof Promise ) {
        // If the handler returns a Promise, wait for it to complete
        returnValue
        .then(() => resolve())
        .catch(err => reject(err));
      }
      else {
        return resolve();
      }
    });
  }

  get isOnce() {
    return this._IS_ONCE;
  }
  get isDeleted() {
    return this._IS_DELETED;
  }
}

module.exports = EventListener;

},{"./EventError.js":6}],8:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
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
          setTimeout(() => {
            try {
              this.model.result = this.model.comparator(this.model.value);
              resolve();
            }
            catch(err) {
              this.emit('error', err);
              resolve();
            }
          }, 0)
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
    this.toBeComparative(v => v === value, `${this.model.evaluator} === ${value}`);
    return this.flavor;
  }

  /**
   * Evaluates loosely typed equality (==)
   * @param {Any} value 
   * @returns {Flavor}
   */
  toBe(value) {
    this.toBeComparative(v => v == value, `${this.model.evaluator} == ${value}`);
    return this.flavor;
  }

  /**
   * Checks if the test value is an array
   * @returns {Flavor}
   */
  toBeArray() {
    this.toBeComparative(v => Array.isArray(v), `${this.model.evaluator} is an Array`);
    return this.flavor;
  }

  /**
   * Check if the test value has the provided property or array of properties
   * @param {String|Array<String>} value 
   */
  hasOwnProperty(value) {
    this.toBeComparative(v => {
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
    return this.flavor;
  }

  /**
   * Evaluator must be greater than lowerBound
   * @param {Number} lowerBound 
   * @param {Boolean} closed 
   * @returns {Flavor}
   */
  toBeGreaterThan(lowerBound, closed = true) {
    this.toBeComparative(v => {
      let inRange = true;
      if ( closed ) inRange = v >= lowerBound;
      else inRange = v > lowerBound;
      return inRange;
    }, `${lowerBound} ${(closed) ? '>=' : '>'} ${this.model.evaluator}`);
    return this.flavor;
  }

  /**
   * Evaluator must be less than upperBound
   * @param {Number} upperBound 
   * @param {Boolean} closed 
   * @returns {Flavor}
   */
  toBeLessThan(upperBound, closed = true) {
    this.toBeComparative(v => {
      let inRange = true;
      if ( closed ) inRange = v <= upperBound;
      else inRange = v < upperBound;
      return inRange;
    }, `${this.model.evaluator} ${(closed) ? '<=' : '<'} ${upperBound}`);
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
  toBeInRange(lowerBound, upperBound, options = {lower: 'open', upper: 'open'}) {
    this.toBeComparative(v => {
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
    return this.flavor;
  }

  /**
   * Evaluator must be a falsy value
   * @returns {Flavor}
   */
  toBeFalsy() {
    this.toBeComparative(v => { return !v; }, `${this.model.evaluator} to be a falsy value`);
    return this.flavor;
  }

  /**
   * Evaluator must be a truthy value
   * @returns {Flavor}
   */
  toBeTruthy() {
    this.toBeComparative(v => { return !!v; }, `${this.model.evaluator} to be a truthy value`);
    return this.flavor;
  }

  /**
   * Evaluator contains the regular expression or string
   * @param {String|RegExp} regex 
   * @returns {Flavor}
   */
  toMatch(regex) {
    this.toBeComparative(v => { return new RegExp(regex).test(v); }, `${this.model.evaluator} matches ${regex}`);
    return this.flavor;
  }

  /**
   * Evaluator typeof value must match type
   * @param {String} type 
   * @returns {Flavor}
   */
  toBeTypeOf(type) {
    this.toBeComparative(v => { return typeof v === type }, `${this.model.evaluator} is a ${type}`);
    return this.flavor;
  }

  /**
   * Evaluator instanceof must be prototype
   * @param {Object} obj 
   * @returns {Flavor}
   */
  toBeInstanceOf(obj) {
    const className = ( obj.hasOwnProperty('prototype') ) ? obj.prototype.constructor.name : `${obj.prototype}`;
    this.toBeComparative(v => {
      return v instanceof obj;
    }, `${this.model.evaluator} is an instance of ${className.replace(/\{[\s\S]*\}/g, '')}`);
    return this.flavor;
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

},{"./Model.js":11,"./TasteError.js":14,"@jikurata/events":3}],10:[function(require,module,exports){
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
        })
        .then(() => this.update());
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
            test.run(this.profile, this.model.sample)
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
      else {
        this.model.status = "Error";
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
        }
      });
    }
  }

  /**
   * If in browser, updates the current view
   */
  update() {
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
    return this.model.rootElement.querySelector(`[data-flavor="${s}"]`);
  }

  getCurrentResults() {
    const o = {
      'id': this.id,
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

},{"./Expectation.js":9,"./Model.js":11,"./Profile.js":12,"./TasteError.js":14,"./Test.js":15,"@jikurata/events":3}],11:[function(require,module,exports){
'use strict';
const EventEmitter = require('@jikurata/events');

class Model extends EventEmitter {
  constructor(o = {}) {
    super();
    this._map = {};
    this._setAll(o, false);
  }

  /**
   * Generates a getter and setter for the key on the State object
   * The value is stored in the map Symbol
   * @param {String} k 
   * @param {*} v 
   */
  _set(k, v, emit = true) {
    // Register the key as an emittable event if it does not exist
    if ( !this.hasEvent(k) ) {
      this.registerEvent(k, {persist: true});
    }
    if ( !this.hasOwnProperty(k) ) {
      // Define getters and setters for the key
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this._get(k),
        set: (val) => this._set(k, val)
      });
    }

    const oldVal = this._get(k);
    this._map[k] = v;
    if ( emit ) {
      this.emit(k, v, oldVal);
    }
  }

  _setAll(o, emit = true) {
    const keys = Object.keys(o);
    for ( let i = 0; i < keys.length; ++i ) {
      this._set(keys[i], o[keys[i]], emit);
    }
  }

  _get(k) {
    return this._map[k];
  }

  _remove(k) {
    if ( this._has(k) ) {
      this._map[k] = undefined;
    }
  }

  _has(k) {
    return this._map.hasOwnProperty(k);
  }
}

module.exports = Model;

},{"@jikurata/events":3}],12:[function(require,module,exports){
'use strict';
const TasteError = require('./TasteError.js');
const Model = require('./Model.js');

/**
 * Mapped values to profile are immutable
 */
class Profile extends Model {
  constructor(o = {}) {
    super(o);
  }

  /**
   * Overwrites the setter for Model
   * Ensures that all values are immutable in profile
   * @param {String} k 
   * @param {*} v 
   */
  _set(k, v, emit = true) {
    // Register the key as an emittable event if it does not exist
    if ( !this.hasEvent(k) ) {
      this.registerEvent(k, {persist: true});
    }
    if ( !this.hasOwnProperty(k) ) {
      // Define getters and setters for the key
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this._get(k),
        set: (val) => this._set(k, val)
      });
    }

    // Throw if the value has been mutated once already
    TasteError.ImmutableProfileValue.check(this, k);

    const oldVal = this._get(k);
    this._map[k] = v;
    if ( emit ) {
      this.emit(k, v, oldVal);
    }
  }
}

module.exports = Profile;

},{"./Model.js":11,"./TasteError.js":14}],13:[function(require,module,exports){
(function (process){
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
    Object.defineProperty(this, 'testMode', {
      value: !(process && process.version && process.versions && process.versions.node),
      enumerable: true,
      writable: false,
      configurable: false,
    });


    // Register events 
    this.registerEvent('ready', {persist: true}); // Emits when Taste is done initializing; or when the dom emit 'load' for browsers
    this.registerEvent('complete', {persist: true}); // Emits once all registered flavor tests are complete
    this.registerEvent('error');

    // Record start time
    this.once('ready', () => {
      this.start = Date.now();
    });
    
    // Print the flavor test results
    this.once('complete', (results) => {
      // Don't print if in in test mode
      if ( options.test ) {
        return;
      }
      let expectCount = 0;
      let passedCount = 0;
      let failedCount = 0;
      let fails = [];
      let errors = this.errors;
      for ( let i = 0; i < results.length; ++i ) {
        const result = results[i];
        for ( let j = 0; j < result.expectations.length; ++j ) {
          const expect = result.expectations[j];
          ++expectCount;
          if ( !expect.result || expect.result === 'Not Tested' ) {
            ++failedCount;
            fails.push(expect);
          }
          else {
            ++passedCount;
          }
        }
        for ( let j = 0; j < result.errors.length; ++j ) {
          errors.push(result.errors[j]);
        }
      }
      // Format the results
      const formattedResults = {
        'Flavors': results.length,
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
        for ( let i = 0; i < results.length; ++i ) {
          const result = results[i];
          for ( let j = 0; j < result.expectations.length; ++j ) {
            const expect = result.expectations[j];
            let a = (expect.result === true) ? passedLinks : failedLinks;
            a.push(`<li class="taste-summary-navigation-item"><a class="taste-summary-navigation-link" href="#${result.id}">${a.length + 1}. ${result.title}</a></li>`);
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
          <p class="taste-summary-content">Elapsed Time: <span class="taste-summary-time" data-taste="elapsedTime">${results.elapsedTime}ms</span></p>
          <p class="taste-summary-content">Number of flavors: <span class="taste-summary-count" data-taste="flavorCount">${results.length}</span></p>
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
   * Creates a new Flavor to be tasted
   * @param {String} title
   * @returns {Flavor}
   */
  flavor(title = '') {
    const id = `flavor${this.flavors.length}`;
    const flavor = new Flavor(this, id, title);

    flavor.once('complete', () => {
      if ( !this.isComplete ) {
        // Check if any other flavors are still incomplete
        if ( !this.allFlavorsAreComplete() ) {
          return;
        }
        // Taste is done once all registered flavors are finished
        this.emit('complete', this.getCurrentResults());
      }
    });

    this.flavors.push(flavor);
    return flavor;
  }

  /**
   * Returns a Result object containing details about each Flavor
   * @returns {Object}
   */
  getCurrentResults() {
    const results = [];
    this.forAllFlavors((flavor) => {
      results.push(flavor.getCurrentResults());
    });
    results.elapsedTime = Date.now() - this.start;
    return results;
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

}).call(this,require('_process'))
},{"./Flavor.js":10,"./TasteError.js":14,"@jikurata/events":3,"_process":8}],14:[function(require,module,exports){
'use strict';

/**
 * Records the duration of the timeout
 * @param {Flavor} flavor
 */
class FlavorTimedOut extends Error {
  constructor(flavor) {
    super(`Flavor Timed Out: Flavor "${flavor.model.title}" timed out after ${flavor.model.duration} ms.`);
  }

  /**
   * @param {Flavor} flavor 
   */
  static check(flavor) {
    if ( flavor.model.duration >= flavor.model.timeout ) {
      throw new FlavorTimedOut(flavor);
    }
  }
}

/**
 * @param {Any} arg
 * @param {String} type
 */
class TasteTypeError extends TypeError {
  constructor(arg, type) {
    super(`Expected type ${type}, instead received ${typeof arg}`);
  }

  /**
   * Does a type check on arg and makes sure it matches type
   * throws TypeError if it does not match
   * @param {Any} arg 
   * @param {String} type
   * @throws {TypeError}
   */
  static check(arg, type) {
    if ( typeof arg !== type ) {
      throw new TasteTypeError(arg, type);
    }
  }
}

/**
 * @param {Profile} profile
 * @param {String} arg
 */
class ImmutableProfileValue extends Error {
  constructor(profile, arg) {
    super(`Immutable Profile Value: ${arg} already has a value of ${profile[arg]}`);
  }

  /**
   * Profile extends EventEmitter and maps out each property to an event
   * When a particular event has been emitted once, that means the property in Profile
   * has been set
   * @param {Profile} profile 
   * @param {String} arg 
   */
  static check(profile, arg) {
    const event = profile.getEvent(arg);
    if ( event && event.hasEmittedAtLeastOnce ) {
      throw new ImmutableProfileValue(profile, arg);
    }
  }
}

class EnvironmentNotBrowser extends Error {
  constructor(flavor) {
    super(`Environment Not Browser: Flavor "${flavor.model.title}" cannot be executed outside of a browser environment.`);
  }
}

class ElementNotFound extends Error {
  constructor(selector) {
    super(`Element Not Found: Could not find an element with the queryselector ${selector}`);
  }
}

module.exports.TypeError = TasteTypeError;
module.exports.FlavorTimedOut = FlavorTimedOut;
module.exports.ImmutableProfileValue = ImmutableProfileValue;
module.exports.EnvironmentNotBrowser = EnvironmentNotBrowser;
module.exports.ElementNotFound = ElementNotFound;

},{}],15:[function(require,module,exports){
'use strict';
const EventEmitter = require('@jikurata/events');
const TasteError = require('./TasteError.js');

class Test extends EventEmitter {
  constructor(description, handler) {
    TasteError.TypeError.check(description, 'string');
    TasteError.TypeError.check(handler, 'function');
    super();
    Object.defineProperty(this, 'description', {
      value: description,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, 'handler', {
      value: handler,
      enumerable: true,
      writable: false,
      configurable: false,
    });

    this.registerEvent('ready', {persist: true});
    this.registerEvent('start', {persist: true});
    this.registerEvent('complete', {persist: true});
    this.registerEvent('error');

    this.emit('ready');
  }

  /**
   * Run the test handler
   * @param {Profile} profile
   * @param {Element} sample
   * @returns {Promise<Void>}
   */
  run(profile, sample) {
    return new Promise((resolve, reject) => {
      try {
        this.emit('start');
        const returnValue = this.handler(profile, sample)
        if ( returnValue instanceof Promise ) {
          returnValue.then(() => resolve())
          .catch(err => {
            this.emit('error', err);
            reject(err);
          });
        }
        else {
          resolve();
        }
      }
      catch(err) {
        this.emit('error', err);
        reject(err);
      }
    })
    .then(() => this.emit('complete'));
  }

  get isReady() {
    return this.getEvent('ready').hasEmittedAtLeastOnce
  }

  get threwError() {
    return this.getEvent('error').hasEmittedAtLeastOnce;
  }

  get isComplete() {
    return this.getEvent('complete').hasEmittedAtLeastOnce;
  }
}

module.exports = Test;

},{"./TasteError.js":14,"@jikurata/events":3}]},{},[1]);
