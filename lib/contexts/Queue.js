'use strict';

class Queue {
  constructor() {
    this.queue = [];
  }

  /**
   * Adds item to end of queue;
   * @param {*} item 
   */
  push(item) {
    this.queue.push(item);
  }

  /**
   * Adds item to front of queue;
   * @param {*} item 
   */
  unshift(item) {
    this.queue.unshift(item);
  }

  next() {
    if ( !this.isEmpty() ) return this.queue.shift();
    return null;
  }

  isEmpty() {
    return !(this.queue.length);
  }
}

module.exports = Queue;
