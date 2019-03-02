'use strict';
const Queue = require('./Queue.js');
const Context = require('./Context.js');
const Describe = require('./Describe.js');
const Test = require('./Test.js');
const Expect = require('./Expect.js');
const createContext = Symbol('createContext');
const runContext = Symbol('runContext');
const generateContextRoot = Symbol('generateContextRoot');

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
    const node = this[generateContextRoot](param.target || null);
    node.setAttribute('data-context', id);
    param.root = node;
    if ( param.isDescribe ) this.context[id] = new Describe(id, param);
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

  [generateContextRoot](target = null) {
    if ( !target ) target = (this.currentContext) ? this.currentContext.root : document.body;
    const node = document.createElement('section');
    target.appendChild(node);
    return node;
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

  /**
   * Overrides document to the provided view
   * @param {Node} view 
   */
  sample(view) {
    if ( this.currentContext ) return this.currentContext.sample(view);
    return null;
  }

  [printResults]() {
    const top = this.topLevelContext();
    top.root.innerHTML += `
      <p>${this.result.count} ${(this.result.count === 1) ? 'test' : 'tests'} completed.</p>
      <p>${this.result.pass}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} passed.</p>
    `;
    if ( this.result.fail > 0 ) top.root.innerHTML += `
      <p>${this.result.fail}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} failed.</p>
    `;
    top.root.innerHTML += `
      <p>Elapsed Time: ${performance.now() - this.result.start}ms</p>
    `;
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
