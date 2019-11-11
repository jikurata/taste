'use strict';
const Taste = require('../index.js');
const taste = require('../src/Taste.js');
const Flavor = require('../src/Flavor.js');
const Profile = require('../src/Profile.js');
const Model = require('../src/Model.js');
const TasteError = require('../src/TasteError.js');

Taste('Flavor Properties')
.test(profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  profile.taste = flavor.taste;
  profile.id = flavor.id;
  profile.tests = flavor.tests;
  profile.expectations = flavor.expectations;
  profile.profile = flavor.profile;
  profile.model = flavor.model;
})
.expect('taste').toBeInstanceOf(taste)
.expect('id').toBeTypeOf('string')
.expect('tests').toBeComparative((v) => Array.isArray(v))
.expect('expectations').toBeComparative((v) => Array.isArray(v))
.expect('profile').toBeInstanceOf(Profile)
.expect('model').toBeInstanceOf(Model)

Taste('Flavor Model properties')
.test(profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  profile.rootElement = flavor.model.hasOwnProperty('rootElement');
  profile.title = flavor.model.hasOwnProperty('title');
  profile.status = flavor.model.hasOwnProperty('status');
  profile.start = flavor.model.hasOwnProperty('start');
  profile.duration = flavor.model.hasOwnProperty('duration');
  profile.timeout = flavor.model.hasOwnProperty('timeout');
  profile.timeoutRef = flavor.model.hasOwnProperty('timeoutRef');
  profile.sample = flavor.model.hasOwnProperty('sample');
  profile.errors = flavor.model.hasOwnProperty('errors');
  profile.completedTests = flavor.model.hasOwnProperty('completedTests');
  profile.completedExpectations = flavor.model.hasOwnProperty('completedExpectations');
})
.expect('rootElement').toBeTruthy()
.expect('title').toBeTruthy()
.expect('status').toBeTruthy()
.expect('start').toBeTruthy()
.expect('duration').toBeTruthy()
.expect('timeout').toBeTruthy()
.expect('timeoutRef').toBeTruthy()
.expect('sample').toBeTruthy()
.expect('errors').toBeTruthy()
.expect('completedTests').toBeTruthy()
.expect('completedExpectations').toBeTruthy();

Taste('Flavor events')
.test(profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  profile.ready = flavor.getEvent('ready');
  profile.before = flavor.getEvent('before');
  profile.start = flavor.getEvent('start');
  profile.after = flavor.getEvent('after');
  profile.complete = flavor.getEvent('complete');
  profile.error = flavor.getEvent('error');
  profile.test = flavor.getEvent('test');
  profile.expect = flavor.getEvent('expect');
})
.expect('ready').toBeTruthy()
.expect('before').toBeTruthy()
.expect('ready').toBeTruthy()
.expect('start').toBeTruthy()
.expect('after').toBeTruthy()
.expect('complete').toBeTruthy()
.expect('error').toBeTruthy()
.expect('test').toBeTruthy()
.expect('expect').toBeTruthy();

Taste('Define operations before starting tests')
.test('Register a function as a listener to the "before" event', profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  flavor.before(() => {})
  profile.beforeListenerCount = flavor.getEvent('before').listeners.length;
})
.expect('beforeListenerCount').toEqual(2);

Taste('Define operations after tests finish')
.test('Register a function as a listener to the "after" event', profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  flavor.after(() => {})
  profile.afterListenerCount = flavor.getEvent('after').listeners.length;
})
.expect('afterListenerCount').toEqual(2);

Taste('Adding tests to a Flavor')
.before(profile => {
  profile.flavor = new Flavor(new taste(), 'foo', 'bar');
})
.test('tests are pushed to the tests array', profile => {
  profile.flavor.test(p => {});
  profile.testLength = profile.flavor.tests.length;
})
.test('Adding test emits "test"', profile => {
  profile.flavor.on('test', () => {
    profile.emittedTest = true;
  });
  profile.flavor.test(p => {});
})
.test('Errors are caught and passed to the error event', profile => {
  profile.flavor.on('error', err => {
    profile.threwError = err;
  })
  profile.flavor.test(); // Will throw a TypeError for handler argument
})
.expect('testLength').toEqual(1)
.expect('emittedTest').toBeTruthy()
.expect('threwError').toBeInstanceOf(TasteError.TypeError);

Taste('Adding expectations to a Flavor')
.before(profile => {
  profile.flavor = new Flavor(new taste(), 'foo', 'bar');
})
.test(profile => {
  profile.flavor.expect('foo');
  profile.expectationLength = profile.flavor.expectations.length;
})
.test('Emits "expect" when an expectation is added', profile => {
  profile.flavor.on('expect', () => {
    profile.expectEmitted = true;
  })
  profile.flavor.expect('bar');
})
.test('Errors are caught and passed to error event', profile => {
  profile.flavor.on('error', err => {
    profile.errorCaught = err;
  })
  profile.flavor.expect({throw:'error'});
})
.expect('expectationLength').toEqual(1)
.expect('expectEmitted').toBeTruthy()
.expect('errorCaught').toBeInstanceOf(TasteError.TypeError);

const flavor = Taste('Flavor Event State');
flavor
.before(profile => {
  profile.flavor = new Flavor(new taste(), 'eventTest', 'bar');
})
.test('Emits "ready" once Taste is ready and a test has been registered', profile => {
  profile.flavor.once('ready', () => {
    profile.readyEmitted = true;
  });
})
.test('Emits "before" once the Flavor is ready', profile => {
  profile.flavor.once('before', () => {
    profile.beforeEmitted = true;
  });
})
.test('Emits "start" once the listeners to "before" are finished', profile => {
  profile.flavor.once('start', () => {
    profile.startEmitted = true;
  });
})
.test('Emits "after" once all registered tests are complete', profile => {
  profile.flavor.once('after', () => {
    profile.afterEmitted = true;
  });
})
.test('Emits "complete" once all registered expectations are complete', profile => {
  profile.flavor.once('complete', () => {
    profile.completeEmitted = true;
  });
  
  profile.flavor.test(p => p.test = true);
  profile.flavor.expect('test').toBeTruthy();
})
.expect('readyEmitted').toBeTruthy()
.expect('beforeEmitted').toBeTruthy()
.expect('startEmitted').toBeTruthy()
.expect('afterEmitted').toBeTruthy()
.expect('completeEmitted').toBeTruthy();

Taste('Configuring Flavor Timeout')
.test(profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  flavor.timeout(4200);
  profile.timeoutValue = flavor.model.timeout;
})
.expect('timeoutValue').toEqual(4200);

Taste('Get the results of the test once the flavor is complete')
.test(profile => {
  const flavor = new Flavor(new taste(), 'foo', 'bar');
  flavor.test(p => p.test = true);
  flavor.expect('test').toBeTruthy();
  flavor.finished(result => {
    profile.title = result.title;
    profile.status = result.status;
    profile.duration = result.duration;
    profile.timeout = result.timeout;
    profile.tests = result.tests;
    profile.expectations = result.expectations;
    profile.errors = result.errors;
  });
})
.expect('title').toBeTypeOf('string')
.expect('status').toBeTypeOf('string')
.expect('duration').toBeTypeOf('number')
.expect('timeout').toBeTypeOf('number')
.expect('tests').toBeComparative(v => Array.isArray(v))
.expect('expectations').toBeComparative(v => Array.isArray(v))
.expect('errors').toBeComparative(v => Array.isArray(v));

module.exports = Taste;
