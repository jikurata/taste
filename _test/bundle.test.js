(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
const Taste = require('../lib/Taste.js');

function add(x,y) {
  return x + y;
}

function appendDiv(target) {
  const node = document.createElement('div');
  target.appendChild(node);
}

function run() {
  const taste = new Taste();
  const root = document.getElementById('test');
  taste.prepare(root, () => {
    taste.describe('Adds two numbers together', () => {
      taste.test('Add(3,5) returns 8', () => {
        taste.expect(add(3,5)).toBe(8);
      });
      taste.test('Add(-3,5) returns 2', () => {
        taste.expect(add(-3,5)).toBe(2);
      });
    });
    taste.describe('Adds a div element to its target', () => {
      const doc = taste.sample(`
        <section id="test">
          <p>A div element should be added here</p>
        </section>
      `);
      taste.test('Target has one div element', () => {
        const node = doc.getElementById('test');
        appendDiv(node);
        taste.expect(doc.getElementsByTagName('div').length).toBe(1);
      });
    });
    taste.describe('This test is designed to fail', () => {
      taste.test('Returns 1', () => {
        taste.expect(0).toBe(1);
      });
    });
  });
  taste.runTests();
}

window.addEventListener('load', run);

},{"../lib/Taste.js":5}],2:[function(require,module,exports){
'use strict';

class Context {
  constructor(id, param) {
    this._id = id;
    this._root = param.root || document.body;
    this._description = param.description || '';
    this._handler = param.handler || null;
  }

  run() {
    return new Promise((resolve, reject) => {
      if (  typeof this.handler !== 'function' ) return reject(new Error(`Could not run context: ${this.handler} is not type ${Function}.`));
      else if ( this.handler ) return resolve(this.handler());
      resolve();
    });
  }

  sample(view) {
    const sampleView = document.createElement('code');
    const doc = document.createElement('div');
    doc.innerHTML = view;
    sampleView.textContent = view;
    this.root.appendChild(doc);
    this.root.appendChild(sampleView);
    if ( !doc.getElementById ) doc.getElementById = (id) => doc.querySelector(`#${id}`);
    return doc;
  }

  post(html, options = {append: true, node: false}) {
    const isNode = (options.hasOwnProperty('node')) ? options.node : false;
    const append = (options.hasOwnProperty('append')) ? options.append : false;
    if ( !isNode ) {
      if ( append ) this.root.innerHTML += html;
      else this.root.innerHTML = html;
    }
    else this.root.appendChild(html);
  }

  get id() {
    return this._id;
  }
  
  get root() {
    return this._root;
  }

  get description() {
    return this._description;
  }

  get handler() {
    return this._handler;
  }
}

module.exports = Context;

},{}],3:[function(require,module,exports){
'use strict';
const Context = require('./Context.js');

class Expect extends Context {
  constructor(id, param) {
    super(id, param);
    this._value = param.value;
    this._result = param.result;
  }

  toBe(value) {
    const passed = (this.value === value);
    if ( passed ) this.result.pass++;
    else this.result.fail++;
    const result = {
      passed: passed,
      status: (passed) ? 'Passed' : 'Failed'
    };
    const view = `
      <p>Expected ${this.value} to be ${value}</p>
      <p>Status: <span class="${(result.passed) ? 'pass' : 'fail'}">${result.status}</span></p>
    `;
    this.post(view);
  }

  get result() {
    return this._result;
  }

  get value() {
    return this._value;
  }

  get isExpect() {
    return true;
  }
}

module.exports = Expect;

},{"./Context.js":2}],4:[function(require,module,exports){
'use strict';

class Queue {
  constructor() {
    this.queue = [];
  }

  /**
   * Adds item to end of queue;
   * @param {*} item 
   */
  push(item) {
    this.queue.push(item);
  }

  /**
   * Adds item to front of queue;
   * @param {*} item 
   */
  unshift(item) {
    this.queue.unshift(item);
  }

  next() {
    if ( !this.isEmpty() ) return this.queue.shift();
    return null;
  }

  isEmpty() {
    return !(this.queue.length);
  }
}

module.exports = Queue;

},{}],5:[function(require,module,exports){
'use strict';
const Queue = require('./Queue.js');
const Context = require('./Context.js');
const Test = require('./Test.js');
const Expect = require('./Expect.js');
const createContext = Symbol('createContext');
const runContext = Symbol('runContext');
const generateView = Symbol('generateView');

class Taste {
  constructor() {
    this._queue = new Queue();
    this._context = {};
    this._currentContext = null;
    this._result = {
      count: 0,
      pass: 0,
      fail: 0
    };
  }

  [createContext](param) {
    const id = `_${Object.keys(this.context).length}`;
    const node = this[generateView](param);
    node.setAttribute('data-context', id);
    param.root = node;
    if ( param.isTest ) this.context[id] = new Test(id, param);
    else if ( param.isExpect ) this.context[id] = new Expect(id, param);
    else this.context[id] = new Context(id, param);
    return this.context[id];
  }

  [runContext](context) {
    this._currentContext = context;
    context.run();
    this._currentContext = this.upOneContext();
  }

  [generateView](param) {
    const view = param.view || null;
    const target = (param.target) ? param.target : (this.currentContext) ? this.currentContext.root : document.body;
    const node = document.createElement(param.tagName || 'section');
    if ( view ) {
      if ( typeof view === 'string' ) node.innerHTML = view;
      else node.appendChild(view);
    }
    target.appendChild(node);
    return node;
  }

  /**
   * Executes tests in the queue
   */
  runTests() {
    this._currentContext = this.queue.next();
    if ( this.currentContext ) {
      this.currentContext.run()
      .catch(() => this.result.fail++)
      .finally(() => {
        this._currentContext = this.upOneContext();
        this.runTests();
      });
    }
    else {
      const top = this.topLevelContext();
      top.root.innerHTML += `
        <p>${this.result.count} ${(this.result.count === 1) ? 'test' : 'tests'} completed.</p>
        <p>${this.result.pass}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} passed.</p>
      `;
      if ( this.result.fail > 0 ) top.root.innerHTML += `
        <p>${this.result.fail}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} failed.</p>
      `;
    }
  }

  /**
   * Creates a new context that assigns an element as root
   * @param {HTMLElement} element
   * @param {Function} handler
   */
  prepare(element, handler) {
    if ( !element || !(element instanceof HTMLElement) ) throw new Error(`Could not prepare test: ${element} is not type ${HTMLElement}`);
    const context = this[createContext]({target: element, handler: handler});
    this[runContext](context);
  } 

  /**
   * Creates a new context for a descriptor
   * @param {String} desc
   * @param {Function} handler
   */
  describe(desc, handler) {
    const node = document.createElement('section');
    const view = `
      <br>
      <p class="title">${desc}</p>
    `;
    node.innerHTML = view;
    const context = this[createContext]({tagName: 'ul', view: node, description: desc, handler: handler});
    this[runContext](context);
  }

  /**
   * Creates a new test context
   * @param {String} desc
   * @param {Function} handler
   */
  test(desc, handler) {
    const node = document.createElement('section');
    const view = `
      <p class="title">${desc}</p>
      <p>Progress: <span class="progress">In queue...</span()></p>
    `;
    node.innerHTML = view;
    const context = this[createContext]({tagName: 'ul', view: node, description: desc, handler: handler, isTest: true});
    this.queue.push(context);
    this.result.count++;
  }

  expect(value) {
    if ( this.currentContext.isTest ) this.currentContext.forceResolve();
    return this[createContext]({tagName: 'ul', value: value, isExpect: true, result: this.result});
  }

  /**
   * Overrides document to the provided view
   * @param {Node} view 
   */
  sample(view) {
    if ( this.currentContext ) return this.currentContext.sample(view);
    return null;
  }

  timeout(t) {
    if ( this.currentContext.isTest ) this.currentContext.timeout = t;
  }

  topLevelContext() {
    const el = document.querySelector('[data-context]');
    if ( el ) {
      const id = el.getAttribute('data-context');
      if ( this.context[id] ) return this.context[id];
    }
    return null;
  }

  upOneContext() {
    if ( !this._currentContext ) return null;
    let parent = this.currentContext.root.parentNode;
    while ( parent && parent.nodeType === 1) {
      const id = parent.getAttribute('data-context');
      if ( id && this.context[id] ) {
        return this.context[id];
      }
      parent = parent.parentNode;
    }
    return null;
  }

  get currentContext() {
    return this._currentContext;
  }

  get queue() {
    return this._queue;
  }

  get context() {
    return this._context;
  }

  get result() {
    return this._result;
  }
}

module.exports = Taste;

},{"./Context.js":2,"./Expect.js":3,"./Queue.js":4,"./Test.js":6}],6:[function(require,module,exports){
'use strict';
const Context = require('./Context.js');
const setTimeout = Symbol('setTimeout');

class Test extends Context {
  constructor(id, param) {
    super(id, param);
    this._timer = null;
    this._timeout = param.timeout || 5000;
  }

  run() {
    return new Promise((resolve, reject) => {
      this.runResolve = resolve;
      this.root.querySelector('.progress').textContent = 'Running...';
      this[setTimeout](() => {
        const error = new Error(`Test timed out after ${this.timeout}ms.`);
        const view = `<pclass="error">${error}</p>`;
        this.post(view);
        reject(error);
      });
      const result = this.handler(this.forceResolve);
      // If result is falsy and not false, then assume the test is asynchronous
      if ( !result && result !== false ) {
      }
      else resolve();
    })
    .then(() => {
      this.root.querySelector('.progress').textContent = 'Complete';
      this.root.innerHTML += `<p>Source: ${this.handler.toString()}</p>`;
    })
    .catch(err => {
      this.root.querySelector('.progress').textContent = err;
    });
  }

  forceResolve() {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runResolve ) this.runResolve();
  }

  [setTimeout](f) {
    if ( this.timer ) window.clearTimeout(this.timer);
    this._timer = window.setTimeout(f, this.timeout);
  }

  get timer() {
    return this._timer;
  }

  get timeout() {
    return this._timeout;
  }

  set timeout(t) {
    this._timeout = t;
    this[setTimeout]();
  }

  get isTest() {
    return true;
  }
}

module.exports = Test;

},{"./Context.js":2}]},{},[1]);
