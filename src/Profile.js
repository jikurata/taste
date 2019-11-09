'use strict';
const TasteError = require('./TasteError.js');
const Model = require('./Model.js');

/**
 * Mapped values to profile are immutable
 */
class Profile extends Model {
  constructor(o = {}) {
    super(o);
  }

  /**
   * Overwrites the setter for Model
   * Ensures that all values are immutable in profile
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

    // Throw if the value has been mutated once already
    TasteError.ImmutableProfileValue.check(this, k);

    const oldVal = this._get(k);
    this._map[k] = v;
    if ( emit ) {
      this.emit(k, v, oldVal);
    }
  }
}

module.exports = Profile;
