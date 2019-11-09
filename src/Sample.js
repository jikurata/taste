'use strict';

class Sample {
  constructor(flavor) {
    if ( !flavor.isBrowser ) {
      return null;
    }
    Object.defineProperty(this, 'flavor', {
      value: flavor,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.defineProperty(this, 'root', {
      value: document.createElement('article'),
      enumerable: true,
      writable: false,
      configurable: false
    });

    this.root.setAttribute('data-sample', this.model.samples.length);
    this.root.className = 'taste-flavor-sample';
  }

  innerHTML(html) {
    if ( this.isBrowser ) {
      this.root.innerHTML = html;
    }
  }

  get isBrowser() {
    return this.flavor.isBrowser;
  }
}

module.exports = Sample;
