'use strict';

/**
 * Records the duration of the timeout
 * @extends {Error}
 */
class TimeoutError extends Error {
  constructor(duration, msg) {
    super(msg)
    this.duration = duration;
    Error.captureStackTrace(this);
  }
}
