'use strict';
const Context = require('./Context.js');
const initializeView = Symbol('initializeView');

class Sample extends Context {
  constructor(id, param) {
    super(id, param);
    this._htmlText = param.html;
    this._document = null;
    this[initializeView]();
  }

  [initializeView]() {
    const ul = document.createElement('ul');
    ul.style = 'text-wrap: wrap;';
    ul.style = 'border: 1px solid rgb(0,0,0); border-radius: 5px;';
    const node = document.createElement('article');
    node.id = `html-${this.id}`;
    node.style = 'display: block;';
    node.innerHTML = this.htmlText;
    const sample = document.createElement('code');
    sample.id = `code-${this.id}`;
    sample.style = 'white-space: pre-wrap; display: none;';
    sample.textContent = this.htmlText;
    const toggle = document.createElement('button');
    toggle.textContent = 'Toggle HTML Block';
    toggle.addEventListener('click', () => {
      if ( sample.style.display === 'block' ) {
        sample.style.display = 'none';
        node.style.display = 'block';
      }
      else {
        sample.style.display = 'block';
        node.style.display = 'none';
      }
    });
    ul.appendChild(toggle);
    ul.appendChild(node);
    ul.appendChild(sample);
    this.post(ul, {node: true});
    this._document = this.root.getElementsByTagName('article')[0];
    if ( !this.document.getElementById ) this.document.getElementById = (id) => this.document.querySelector(`#${id}`);
  }
  
  get htmlText() {
    return this._htmlText;
  }

  get document() {
    return this._document;
  }
}

module.exports = Sample;
