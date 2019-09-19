'use strict';

/**
 * Records the duration of the timeout
 * @extends {Error}
 */
class TimeoutError extends Error {
  constructor(duration, unit = 'ms') {
    super(`Test timed out after ${duration} ${unit}`);
    this.duration = duration;
  }
}

class TasteTypeError extends TypeError {
  constructor(arg, type) {
    super(`Expected type ${type}, instead received ${typeof arg}`);
  }

  /**
   * Does a type check on arg and makes sure it matches type
   * throws TypeError if it does not match
   * @param {Any} arg 
   * @param {String} type
   * @throws {TypeError}
   */
  static check(arg, type) {
    if ( typeof arg !== type ) {
      throw new TasteTypeError(arg, type);
    }
  }
}

module.exports.TimeoutError = TimeoutError;
module.exports.TypeError = TasteTypeError;
