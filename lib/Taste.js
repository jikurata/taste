'use strict';
const Queue = require('./Queue.js');
const Context = require('./Context.js');
const Test = require('./Test.js');
const Expect = require('./Expect.js');
const createContext = Symbol('createContext');
const runContext = Symbol('runContext');

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
    console.log('s', this.currentContext, this.upOneContext());
    const id = `_${Object.keys(this.context).length}`;
    if ( param.target ) param.target.setAttribute('data-context', id);
    else if ( param.view ) {
      param.view.setAttribute('data-context', id);
      this.currentContext.post(param.view, {node: true});
      param.target = document.querySelector(`[data-context="${id}"]`);
    }
    if ( param.isTest ) this.context[id] = new Test(id, param);
    else if ( param.isExpect ) this.context[id] = new Expect(id, param);
    else this.context[id] = new Context(id, param);
    return this.context[id];
  }

  [runContext](context) {
    this._currentContext = context;
    context.run()
    .finally(() => {
      this._currentContext = this.upOneContext();
    });
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
      top.target.innerHTML += `
        <p>${this.result.count} ${(this.result.count === 1) ? 'test' : 'tests'} completed.</p>
        <p>${this.result.pass}/${this.result.count} ${(this.result.pass === 1) ? 'test' : 'tests'} passed.</p>
      `;
      if ( this.result.fail > 0 ) top.target.innerHTML += `
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
    const node = document.createElement('ul');
    const view = `
      <br>
      <p class="title">${desc}</p>
    `;
    node.innerHTML = view;
    if ( this.currentContext && this.currentContext.isTest ) this.currentContext = this.upOneContext();
    const context = this[createContext]({view: node, description: desc, handler: handler});
    this[runContext](context);
  }

  /**
   * Creates a new test context
   * @param {String} desc
   * @param {Function} handler
   */
  test(desc, handler) {
    const node = document.createElement('ul');
    const view = `
      <p class="title">${desc}</p>
      <p>Progress: <span class="progress">In queue...</span()></p>
    `;
    node.innerHTML = view;
    const context = this[createContext]({view: node, description: desc, handler: handler, isTest: true});
    this.queue.push(context);
    this.result.count++;
  }

  expect(value) {
    const node = document.createElement('section');
    if ( this.currentContext.isTest ) this.currentContext.forceResolve();
    return this[createContext]({view: node, value: value, isExpect: true, result: this.result});
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
    if ( !this._currentContext ) return;
    let parent = this.currentContext.target.parentNode;
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
