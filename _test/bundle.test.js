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
  taste.describe('This runs an asynchronous test for 7 seconds', () => {
    taste.test('This test sets the timeout to 8000ms to pass the test before timeout', () => {
      window.setTimeout(() => {
        taste.expect(1).toBe(1);
      }, 7000);
      taste.timeout(8000);
    });
  });
  taste.describe('Adds two numbers together', () => {
    taste.test('Add(3,5) returns 8', () => {
      taste.expect(add(3,5)).toBe(8);
    });
    taste.test('Add(-3,5) returns 2', () => {
      taste.expect(add(-3,5)).toBe(2);
    });
  });
  taste.describe('This test uses sample to create a dom tree for the test', () => {
    const doc = taste.sample(`
      <section id="test">
        <p>0</p>
      </section>
    `);
    taste.test('Target has one div element', () => {
      const node = doc.getElementById('test');
      appendDiv(node);
      taste.expect(doc.getElementsByTagName('div').length).toBe(1);
    });
  });
  taste.describe('This test uses sample to create a dom tree for the test', () => {
    const doc = taste.sample(`
      <section id="test">
        <p>1</p>
      </section>
    `);
    taste.test('Sample creates a separate context from the previous sample', () => {
      const node = doc.getElementById('test');
      taste.expect(node.textContent.trim()).toBe(1);
    });
  });
  taste.describe('This test is designed to fail', () => {
    taste.test('Returns 1', () => {
      taste.expect(0).toBe(1);
    });
  });
  taste.runTests();
}

window.addEventListener('load', run);

},{"../lib/Taste.js":7}],2:[function(require,module,exports){
'use strict';
const generateContextRoot = Symbol('generateContextRoot');

class Context {
  constructor(id, param) {
    this._id = id;
    this._root = null;
    this._description = param.description || '';
    this._handler = param.handler || null;
    this[generateContextRoot](param.target || document.body);
  }

  [generateContextRoot](target) {
    const node = document.createElement('section');
    node.style.position = 'relative';
    node.style.padding = '5px';
    node.style.borderRadius = '5px';
    const root = document.createElement('section');
    root.setAttribute('data-context', this.id);
    root.style.overflow = 'hidden';
    root.style.height = '100%';
    root.style.padding = '5px';
    const toggle = document.createElement('button');
    toggle.style.position = 'relative';
    toggle.style.top = '0';
    toggle.style.right = '0';
    toggle.textContent = '-';
    toggle.addEventListener('click', () => {
      if ( root.style.height === '100%' ) {
        root.style.height = '0';
        toggle.textContent = 'v';
      }
      else {
        root.style.height = '100%';
        toggle.textContent = '-';
      }
    });
    node.appendChild(toggle);
    node.appendChild(root);
    target.appendChild(node);
    this._root = root;
  }

  run() {
    return new Promise((resolve, reject) => {
      if (  typeof this.handler !== 'function' ) return reject(new Error(`Could not run context: ${this.handler} is not type Function.`));
      else if ( this.handler ) return resolve(this.handler());
      resolve();
    });
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
const initializeView = Symbol('initializeView');

class Describe extends Context {
  constructor(id, param) {
    super(id, param);
    this[initializeView]();
  }

  [initializeView]() {
    const node = document.createElement('section');
    const view = `
      <br>
      <p class="title">${this.description}</p>
    `;
    node.innerHTML = view;
    this.post(node, {node: true});
  }
}

module.exports = Describe;

},{"./Context.js":2}],4:[function(require,module,exports){
'use strict';
const Context = require('./Context.js');
const initializeView = Symbol('initializeView');
const resolveExpect = Symbol('resolveExpect');

class Expect extends Context {
  constructor(id, param) {
    super(id, param);
    this._value = param.value;
    this._result = param.result;
    this[initializeView]();
  }

  [initializeView]() {
    const ul = document.createElement('ul');
    const view = `
      <p class="expect"></p>
      <p class="status"></p>
    `;
    ul.innerHTML = view;
    this.post(ul, {node: true});
    this.root.style.border = '0';
  }

  [resolveExpect](bool) {
    if ( bool ) {
      this.result.pass++;
      this.root.style.border = '2px solid rgb(60,120,120)';
    }
    else {
      this.result.fail++;
      this.root.style.border = '2px solid rgb(255,120,120)';
    }
    this.root.getElementsByClassName('status')[0].innerHTML = `Status: <span class="${(bool) ? 'pass' : 'fail'}">${(bool) ? 'PASS' : 'FAIL'}</span>`
  }

  toBe(value) {
    this.root.getElementsByClassName('expect')[0].innerHTML = `Expected ${this.value} == ${value}`;
    this[resolveExpect](this.value == value);
  }

  toEqual(value) {
    this.root.getElementsByClassName('expect')[0].innerHTML = `Expected ${this.value} === ${value}`;
    this[resolveExpect](this.value === value);
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

},{"./Context.js":2}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
'use strict';
const Context = require('./Context.js');
const initializeView = Symbol('initializeView');

class Sample extends Context {
  constructor(id, param) {
    super(id, param);
    this._htmlText = param.html;
    this._document = null;
    this[initializeView]();
  }

  [initializeView]() {
    const ul = document.createElement('ul');
    ul.style = 'text-wrap: wrap;';
    ul.style = 'border: 1px solid rgb(0,0,0); border-radius: 5px;';
    const node = document.createElement('article');
    node.id = `html-${this.id}`;
    node.style = 'display: block;';
    node.innerHTML = this.htmlText;
    const sample = document.createElement('code');
    sample.id = `code-${this.id}`;
    sample.style = 'white-space: pre-wrap; display: none;';
    sample.textContent = this.htmlText;
    const toggle = document.createElement('button');
    toggle.textContent = 'Toggle HTML Block';
    toggle.addEventListener('click', () => {
      if ( sample.style.display === 'block' ) {
        sample.style.display = 'none';
        node.style.display = 'block';
      }
      else {
        sample.style.display = 'block';
        node.style.display = 'none';
      }
    });
    ul.appendChild(toggle);
    ul.appendChild(node);
    ul.appendChild(sample);
    this.post(ul, {node: true});
    this._document = this.root.getElementsByTagName('article')[0];
    if ( !this.document.getElementById ) this.document.getElementById = (id) => this.document.querySelector(`#${id}`);
  }
  
  get htmlText() {
    return this._htmlText;
  }

  get document() {
    return this._document;
  }
}

module.exports = Sample;

},{"./Context.js":2}],7:[function(require,module,exports){
'use strict';
const Queue = require('./Queue.js');
const Context = require('./Context.js');
const Describe = require('./Describe.js');
const Sample = require('./Sample.js');
const Test = require('./Test.js');
const Expect = require('./Expect.js');
const createContext = Symbol('createContext');
const runContext = Symbol('runContext');
const printResults = Symbol('printResults');

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
    if ( !param.target ) param.target = (this.currentContext) ? this.currentContext.root : document.body;
    if ( param.isDescribe ) this.context[id] = new Describe(id, param);
    else if ( param.isSample ) this.context[id] = new Sample(id, param);
    else if ( param.isTest ) this.context[id] = new Test(id, param);
    else if ( param.isExpect ) this.context[id] = new Expect(id, param);
    else this.context[id] = new Context(id, param);
    return this.context[id];
  }

  [runContext](context) {
    this._currentContext = context;
    context.run();
    this._currentContext = this.upOneContext();
  }

  /**
   * Executes tests in the queue
   */
  runTests() {
    if ( !this.result.start ) this.result.start = performance.now();
    this._currentContext = this.queue.next();
    if ( this.currentContext ) {
      this.currentContext.run()
      .catch(() => this.result.fail++)
      .finally(() => {
        this._currentContext = this.upOneContext();
        this.runTests();
      });
    }
    else this[printResults]();
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
    const context = this[createContext]({description: desc, handler: handler, isDescribe: true});
    this[runContext](context);
  }

  /**
   * Overrides document to the provided view
   * @param {String} html 
   */
  sample(html) {
    return this[createContext]({html: html, isSample: true}).document;
  }

  /**
   * Creates a new test context
   * @param {String} desc
   * @param {Function} handler
   */
  test(desc, handler) {
    const context = this[createContext]({description: desc, handler: handler, isTest: true});
    this.queue.push(context);
    this.result.count++;
  }

  expect(value) {
    if ( this.currentContext.isTest ) this.currentContext.forceResolve();
    return this[createContext]({target: this.currentContext.root.getElementsByTagName('ul')[0], value: value, isExpect: true, result: this.result});
  }

  [printResults]() {
    const top = this.topLevelContext();
    const node = document.createElement('section');
    node.innerHTML += `
      <p>${this.result.count} ${(this.result.count === 1) ? 'test' : 'tests'} completed.</p>
      <p>${this.result.pass}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} passed.</p>
    `;
    if ( this.result.fail > 0 ) node.innerHTML += `
      <p>${this.result.fail}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} failed.</p>
    `;
    node.innerHTML += `
      <p>Elapsed Time: ${performance.now() - this.result.start}ms</p>
    `;
    top.post(node, {node: true});
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

},{"./Context.js":2,"./Describe.js":3,"./Expect.js":4,"./Queue.js":5,"./Sample.js":6,"./Test.js":8}],8:[function(require,module,exports){
'use strict';
const Context = require('./Context.js');
const updateProgress = Symbol('updateProgress');
const setTimeout = Symbol('setTimeout');
const initializeView = Symbol('initializeView');
const printSource = Symbol('printSource');

const TEST_STATE = {
  0: 'In queue',
  1: 'Running',
  2: 'Complete',
  3: 'Error'
}

class Test extends Context {
  constructor(id, param) {
    super(id, param);
    this._duration = 0;
    this._interval = null;
    this._timer = null;
    this.runResolve = null;
    this.runReject = null;
    this._timeout = param.timeout || 5000;
    this[initializeView]();
    this[updateProgress](0);
  }

  [initializeView]() {
    const ul = document.createElement('ul');
    const view = `
      <p class="title">${this.description}</p>
      <ul class="info">
        <p>Progress: <span class="progress">In queue</span></p>
        <p>Duration: <span class="duration"></span>ms</p>
        <p class="source"></p>
      </ul>
    `;
    ul.innerHTML = view;
    this.post(ul, {node: true});
  }

  run() {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      this._interval = window.setInterval(() => {
        this.duration = Date.now() - start;
      }, 1);
      this[updateProgress](1);
      this.runResolve = resolve;
      this.runReject = reject;
      this[setTimeout]();
      this.handler();
    })
    .then(() => {
      this[updateProgress](2);
    })
    .catch(err => {
      this[updateProgress](3);
      const view = `<p class="error">${err}</p>`;
      this.post(view);
    })
    .finally(() => {
      window.clearInterval(this.interval);
      this[printSource]();
      this.runResolve = null;
      this.runReject = null;
    });
  }

  [printSource]() {
    this.root.querySelector('.source').innerHTML = `
      <p>Source:</p>
      <code>${this.handler.toString()}</code>
    `;
  }

  [updateProgress](n) {
    this.root.querySelector('.progress').textContent = TEST_STATE[n];
  }

  [setTimeout]() {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runReject ) this._timer = window.setTimeout(() => {
      const error = new Error(`Test timed out after ${this.timeout}ms.`);
      this.forceReject(error);
    }, this.timeout);
  }

  forceResolve(val) {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runResolve ) this.runResolve(val);
  }

  forceReject(err) {
    if ( this.timer ) window.clearTimeout(this.timer);
    if ( this.runReject ) this.runReject(err);
  }

  get duration() {
    return this._duration;
  }

  set duration(t) {
    this._duration = t;
    this.root.querySelector('.duration').textContent = this._duration;
  }

  get interval() {
    return this._interval;
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
