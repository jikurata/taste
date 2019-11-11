'use strict';
const Taste = require('../index.js');
const taste = require('../src/Taste.js');
const Flavor = require('../src/Flavor.js');
const Expectation = require('../src/Expectation.js');
const Model = require('../src/Model.js');
const TasteError = require('../src/TasteError.js');

Taste('Expectation Properties')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', 'test');
  profile.expect = new Expectation(profile.flavor, 'foo');
})
.test(profile => {
  profile.propFlavor = profile.expect.flavor;
  profile.propModel = profile.expect.model;
})
.expect('propFlavor').toBeInstanceOf(Flavor)
.expect('propModel').toBeInstanceOf(Model);

Taste('Expectation Model Properties')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', 'test');
  profile.expect = new Expectation(profile.flavor, 'foo');
})
.test(profile => {
  profile.model = profile.expect.model;
  profile.statement = profile.expect.model.statement;
  profile.evaluator = profile.expect.model.evaluator;
  profile.comparator = profile.expect.model.comparator;
  profile.value = profile.expect.model.value;
  profile.result = profile.expect.model.result;
})
.expect('model').hasOwnProperty('statement')
.expect('model').hasOwnProperty('evaluator')
.expect('model').hasOwnProperty('comparator')
.expect('model').hasOwnProperty('value')
.expect('model').hasOwnProperty('result');

Taste('Expectation Events')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', 'test');
  profile.expect = new Expectation(profile.flavor, 'foo');
})
.test(profile => {
  profile.ready = profile.expect.getEvent('ready');
  profile.evaluate = profile.expect.getEvent('evaluate');
  profile.complete = profile.expect.getEvent('complete');
  profile.error = profile.expect.getEvent('error');
})
.expect('ready').toBeTruthy()
.expect('evaluate').toBeTruthy()
.expect('complete').toBeTruthy()
.expect('error').toBeTruthy();

Taste('Expectation Event State')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
  profile.expect = new Expectation(profile.flavor, 'test');
})
.test('An expectation is ready once it receives a comparator and test value', profile => {
  profile.expect.once('ready', () => profile.ready = true);
})
.test('An expectation evaluates after emitting ready', profile => {
  profile.expect.once('evaluate', () => profile.evaluate = true);
})
.test('An expectation is completed after it evaluates the comaparator', profile => {
  profile.expect.once('complete', () => profile.complete = true);
  profile.expect.model.value = 'foo';
  profile.expect.toMatch('foo');
})
.expect('ready').toBeTruthy()
.expect('evaluate').toBeTruthy()
.expect('complete').toBeTruthy();

Taste('Expectation enters complete state if it emits an error')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
  profile.expect = new Expectation(profile.flavor, 'test');
})
.test(profile => {
  profile.expect.once('complete', () => profile.complete = true);
})
.test('Complete passes a Result object to listeners', profile => {
  profile.expect.once('complete', (result) => profile.result = result);
  profile.expect.emit('ready'); // Will emit error because comparator and test value have not been defined
})
.expect('complete').toBeTruthy()
.expect('result').hasOwnProperty('test')
.expect('result').hasOwnProperty('evaluator')
.expect('result').hasOwnProperty('statement')
.expect('result').hasOwnProperty('received')
.expect('result').hasOwnProperty('result');

Taste('Comparator: toBeTruthy')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = true;
  expect1.toBeTruthy();

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 1;
  expect2.toBeTruthy();

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = '';
  expect3.toBeTruthy();
})
.expect('result1').toEqual(true)
.expect('result2').toEqual(true)
.expect('result3').toEqual(false);

Taste('Comparator: toBeFalsy')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = false;
  expect1.toBeFalsy();

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 0;
  expect2.toBeFalsy();

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = {};
  expect3.toBeFalsy();
})
.expect('result1').toEqual(true)
.expect('result2').toEqual(true)
.expect('result3').toEqual(false);

Taste('Comparator: toBe')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 1;
  expect1.toBe(1);
  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 1;
  expect2.toBe('1');
})
.expect('result1').toBeTruthy()
.expect('result2').toBeTruthy();

Taste('Comparator: toEqual')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 1;
  expect1.toEqual(1);
  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 1;
  expect2.toEqual('1');
})
.expect('result1').toBeTruthy()
.expect('result2').toBeFalsy();

Taste('Comparator: toBeArray')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = [];
  expect1.toBeArray();
})
.expect('result1').toBeTruthy();

Taste('Comparator: hasOwnProperty')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = {
    'foo': 0,
    1: 'bar'
  };
  expect1.hasOwnProperty('foo');

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = {
    'foo': 0,
    1: 'bar'
  };
  expect2.hasOwnProperty(1);
})
.expect('result1').toBeTruthy()
.expect('result2').toBeTruthy();

Taste('Comparator: toBeGreaterThan')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 5;
  expect1.toBeGreaterThan(5, true);

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 5;
  expect2.toBeGreaterThan(5, false);

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = 4;
  expect3.toBeGreaterThan(5);
})
.expect('result1').toBeTruthy()
.expect('result2').toBeFalsy()
.expect('result3').toBeFalsy();

Taste('Comparator: toBeLessThan')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 5;
  expect1.toBeLessThan(5, true);

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 5;
  expect2.toBeLessThan(5, false);

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = 6;
  expect3.toBeLessThan(5);
})
.expect('result1').toBeTruthy()
.expect('result2').toBeFalsy()
.expect('result3').toBeFalsy();

Taste('Comparator: toBeInRange')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 5;
  expect1.toBeInRange(4, 6);

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 3;
  expect2.toBeInRange(4, 6);

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = 7;
  expect3.toBeInRange(4, 6);

  const expect4 = new Expectation(profile.flavor, 'value');
  expect4.on('complete', () => {
    profile.result4 = expect4.model.result === true;
  });
  expect4.model.value = 4;
  expect4.toBeInRange(4, 6, {lower: 'closed'});

  const expect5 = new Expectation(profile.flavor, 'value');
  expect5.on('complete', () => {
    profile.result5 = expect5.model.result === true;
  });
  expect5.model.value = 6;
  expect5.toBeInRange(4, 6, {upper: 'closed'});
})
.expect('result1').toBeTruthy()
.expect('result2').toBeFalsy()
.expect('result3').toBeFalsy()
.expect('result4').toBeTruthy()
.expect('result5').toBeTruthy();

Taste('Comparator: toMatch')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 'foobar hello world';
  expect1.toMatch('foobar hello world');

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = 'foobar hello world';
  expect2.toMatch('foobar');

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = 'foobar hello world';
  expect3.toMatch(/^foobar/);
})
.expect('result1').toBeTruthy()
.expect('result2').toBeTruthy()
.expect('result3').toBeTruthy();

Taste('Comparator: toBeTypeOf')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = 'foo';
  expect1.toBeTypeOf('string');

  const expect2 = new Expectation(profile.flavor, 'value');
  expect2.on('complete', () => {
    profile.result2 = expect2.model.result === true;
  });
  expect2.model.value = {};
  expect2.toBeTypeOf('object');

  const expect3 = new Expectation(profile.flavor, 'value');
  expect3.on('complete', () => {
    profile.result3 = expect3.model.result === true;
  });
  expect3.model.value = new Model();
  expect3.toBeTypeOf('object');
})
.expect('result1').toBeTruthy()
.expect('result2').toBeTruthy()
.expect('result3').toBeTruthy();

Taste('Comparator: toBeInstanceOf')
.before(profile => {
  profile.flavor = new Flavor(new taste(), '1', '');
})
.test(profile => {
  const expect1 = new Expectation(profile.flavor, 'value');
  expect1.on('complete', () => {
    profile.result1 = expect1.model.result === true;
  });
  expect1.model.value = new Model();
  expect1.toBeInstanceOf(Model);
})
.expect('result1').toBeTruthy();

module.exports = Taste;
