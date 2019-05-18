'use strict';
const Context = require('../Context.js');
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
