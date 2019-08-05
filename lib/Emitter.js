'use strict';
const Events = require('@jikurata/events');

class Emitter {
  constructor(config = {enumerable: false}) {
    Object.defineProperty(this, 'events', {
      value: new Events(),
      writable: false,
      configurable: false,
      enumerable: (config.hasOwnProperty('enumerable')) ? config.enumerable : false
    });
  }

  emit(e, ...args) {this.events.emit(e, ...args);}

  on(e, f, options = {}) {this.events.addEventListener(e,f, options);}

  once(e, f, options = {}) {
    options.once = true;
    this.events.addEventListener(e, f, options);
  }
}

module.exports = Emitter;
