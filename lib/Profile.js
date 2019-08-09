'use strict';'use strict';
const Emitter = require('./Emitter.js');
const map = Symbol('map');

class Profile extends Emitter {
  constructor(o = {}) {
    super();
    this[map] = {};
    this.setAll(o);
  }

  /**
   * Generates a getter and setter for the key on the State object
   * The value is stored in the map Symbol
   * @param {String} k 
   * @param {*} v 
   */
  set(k, v, emit = true) {
    if ( !this.events.hasEvent(k) ) {
      this.events.register(k, {persist: true});
    }
    if ( !this.hasOwnProperty(k) ) {
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this[map][k],
        set: (val) => this.set(k, val)
      });
    }
    const oldVal = this[map][k];
    if ( v !== oldVal ) {
      this[map][k] = v;
      if ( emit ) this.emit(k, v, oldVal);
    }
  }

  setAll(o) {
    const keys = Object.keys(o);
    for ( let i = 0; i < keys.length; ++i ) this.set(keys[i], o[keys[i]]);
  }

  remove(k) {
    if ( this.has(k) ) {
      delete this[k];
      delete this[map][k];
    }
  }

  has(k) {
    return this[map].hasOwnProperty(k);
  }

  toObject() {
    return this[map];
  }

  keys() {
    return Object.keys(this[map]);
  }
}

module.exports = Profile;
