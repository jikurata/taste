'use strict';
const EventEmitter = require('@jikurata/events');
const TasteError = require('./TasteError.js');

class Test extends EventEmitter {
  constructor(description, handler) {
    TasteError.TypeError.check(description, 'string');
    TasteError.TypeError.check(handler, 'function');
    super();
    Object.defineProperty(this, 'description', {
      value: description,
      enumerable: true,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(this, 'handler', {
      value: handler,
      enumerable: true,
      writable: false,
      configurable: false,
    });

    this.registerEvent('ready', {persist: true});
    this.registerEvent('start', {persist: true});
    this.registerEvent('complete', {persist: true});
    this.registerEvent('error');

    this.emit('ready');
  }

  /**
   * Run the test handler
   * @param {Profile} profile 
   * @returns {Promise<Void>}
   */
  run(profile) {
    return new Promise((resolve, reject) => {
      try {
        this.emit('start');
        const returnValue = this.handler(profile)
        if ( returnValue instanceof Promise ) {
          returnValue.then(() => resolve())
          .catch(err => {
            this.emit('error', err);
            reject(err);
          });
        }
        else {
          resolve();
        }
      }
      catch(err) {
        this.emit('error', err);
        reject(err);
      }
    })
    .then(() => this.emit('complete'));
  }

  get isReady() {
    return this.getEvent('ready').hasEmittedAtLeastOnce
  }

  get threwError() {
    return this.getEvent('error').hasEmittedAtLeastOnce;
  }

  get isComplete() {
    return this.getEvent('complete').hasEmittedAtLeastOnce;
  }
}

module.exports = Test;
