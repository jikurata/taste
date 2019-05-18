
{
  [createContext](param) {
    const id = `_${Object.keys(this.contexts).length}`;
    if ( !param.target ) param.target = (this[currentContext]) ? this[currentContext].root : document.body;
    if ( param.isDescribe ) this.contexts[id] = new Describe(id, param);
    else if ( param.isSample ) this.contexts[id] = new Sample(id, param);
    else if ( param.isTest ) this.contexts[id] = new Test(id, param);
    else if ( param.isExpect ) this.contexts[id] = new Expect(id, param);
    else this.contexts[id] = new Context(id, param);
    return this.contexts[id];
  }

  [runContext](context) {
    this[currentContext] = context;
    context.run();
    this[currentContext] = this.upOneContext();
  }

  /**
   * Executes tests in the queue
   */
  runTests() {
    if ( !this.result.start ) this.result.start = performance.now();
    this._currentContext = this.queue.next();
    if ( this[currentContext] ) {
      this[currentContext].run()
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
    this[runContext](context);
    this.result.count++;
  }

  expect(value) {
    if ( this[currentContext].isTest ) this[currentContext].forceResolve();
    return this[createContext]({target: this[currentContext].root.getElementsByTagName('ul')[0], value: value, isExpect: true, result: this.result});
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
    if ( this[currentContext].isTest ) this[currentContext].timeout = t;
  }

  topLevelContext() {
    const el = document.querySelector('[data-context]');
    if ( el ) {
      const id = el.getAttribute('data-context');
      if ( this.contexts[id] ) return this.contexts[id];
    }
    return null;
  }

  upOneContext() {
    if ( !this._currentContext ) return null;
    let parent = this[currentContext].root.parentNode;
    while ( parent && parent.nodeType === 1) {
      const id = parent.getAttribute('data-context');
      if ( id && this.contexts[id] ) {
        return this.contexts[id];
      }
      parent = parent.parentNode;
    }
    return null;
  }

  get result() {
    return this._result;
  }
}

// Test a function that adds 5 to the input
function addFive(x) { return x + 5; }

  Taste.flavor('addFive')
    .describe('Adds five to a integer')
    .test('Passing 3 results in 8', () => {
      this.profile.taste = addFive(3);
    })
    .expect('taste').toBe(8);
