'use strict';
const Events = require('@dweomercraft/events');

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

  on(e, f) {this.events.on(e,f);}

  once(e, f) {this.events.once(e, f);}
}

module.exports = Emitter;
