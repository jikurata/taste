'use strict';

/**
 * Records the duration of the timeout
 * @param {Flavor} flavor
 */
class FlavorTimedOut extends Error {
  constructor(flavor) {
    super(`Flavor Timed Out: Flavor "${flavor.model.title}" timed out after ${flavor.model.duration} ms.`);
  }

  /**
   * @param {Flavor} flavor 
   */
  static check(flavor) {
    if ( flavor.model.duration >= flavor.model.timeout ) {
      throw new FlavorTimedOut(flavor);
    }
  }
}

/**
 * @param {Any} arg
 * @param {String} type
 */
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

/**
 * @param {Profile} profile
 * @param {String} arg
 */
class ImmutableProfileValue extends Error {
  constructor(profile, arg) {
    super(`Immutable Profile Value: ${arg} already has a value of ${profile[arg]}`);
  }

  /**
   * Profile extends EventEmitter and maps out each property to an event
   * When a particular event has been emitted once, that means the property in Profile
   * has been set
   * @param {Profile} profile 
   * @param {String} arg 
   */
  static check(profile, arg) {
    const event = profile.getEvent(arg);
    if ( event && event.hasEmittedAtLeastOnce ) {
      throw new ImmutableProfileValue(profile, arg);
    }
  }
}

class EnvironmentNotBrowser extends Error {
  constructor(flavor) {
    super(`Environment Not Browser: Flavor "${flavor.model.title}" cannot be executed outside of a browser environment.`);
  }
}

class ElementNotFound extends Error {
  constructor(selector) {
    super(`Element Not Found: Could not find an element with the queryselector ${selector}`);
  }
}

module.exports.TypeError = TasteTypeError;
module.exports.FlavorTimedOut = FlavorTimedOut;
module.exports.ImmutableProfileValue = ImmutableProfileValue;
module.exports.EnvironmentNotBrowser = EnvironmentNotBrowser;
module.exports.ElementNotFound = ElementNotFound;
