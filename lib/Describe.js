'use strict';
const Context = require('./Context.js');
const initializeView = Symbol('initializeView');

class Describe extends Context {
  constructor(id, param) {
    super(id, param);
    this[initializeView]();
  }

  [initializeView]() {
    const view = `
      <br>
      <h1 class="title">${this.description}</h1>
    `;
    this.post(view);
  }
}

module.exports = Describe;
