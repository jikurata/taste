'use strict';
const EventEmitter = require('@jikurata/events');

class Model extends EventEmitter {
  constructor(o = {}) {
    super();
    this._map = {};
    this._setAll(o, false);
  }

  /**
   * Generates a getter and setter for the key on the State object
   * The value is stored in the map Symbol
   * @param {String} k 
   * @param {*} v 
   */
  _set(k, v, emit = true) {
    // Register the key as an emittable event if it does not exist
    if ( !this.hasEvent(k) ) {
      this.registerEvent(k, {persist: true});
    }
    if ( !this.hasOwnProperty(k) ) {
      // Define getters and setters for the key
      Object.defineProperty(this, k, {
        configurable: false,
        get: () => this._get(k),
        set: (val) => this._set(k, val)
      });
    }

    const oldVal = this._get(k);
    this._map[k] = v;
    if ( emit ) {
      this.emit(k, v, oldVal);
    }
  }

  _setAll(o, emit = true) {
    const keys = Object.keys(o);
    for ( let i = 0; i < keys.length; ++i ) {
      this._set(keys[i], o[keys[i]], emit);
    }
  }

  _get(k) {
    return this._map[k];
  }

  _remove(k) {
    if ( this._has(k) ) {
      this._map[k] = undefined;
    }
  }

  _has(k) {
    return this._map.hasOwnProperty(k);
  }
}

module.exports = Model;
