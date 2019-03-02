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
    node.setAttribute('data-context', this.id);
    target.appendChild(node);
    this._root = node;
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
