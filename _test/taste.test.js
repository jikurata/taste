'use strict';
const Taste = require('../index.js');
const taste = require('../src/Taste.js');

Taste('Taste behaves as a singleton')
.test(profile => {
  const t1 = new taste();
  const t2 = new taste();
  profile.sameTaste = t1 === t2;
})
.expect('sameTaste').toBeTruthy();

Taste('Taste Properties')
.test(profile => {
  const t = new taste();
  profile.flavors = t.flavors;
  profile.errors = t.errors;
  profile.isBrowser = t.isBrowser;
})
.expect('flavors').toBeArray()
.expect('errors').toBeArray()
.expect('isBrowser').toBeTypeOf('boolean');

Taste('Taste Events')
.test(profile => {
  const t = new taste({test: true});
  profile.ready = t.getEvent('ready');
  profile.complete = t.getEvent('complete');
  profile.error = t.getEvent('error');
})
.expect('ready').toBeTruthy()
.expect('complete').toBeTruthy()
.expect('error').toBeTruthy();

Taste('flavor registers a flavor')
.test(profile => {
  const t = new taste({test: true});
  t.flavor('test')
  .emit('complete');

  profile.flavors = t.flavors.length;
  
})
.expect('flavors').toEqual(1);

Taste('Emits ready once Taste finishes initializing')
.test(profile => {
  const t = new taste();
  t.once('ready', () => {
    profile.ready = true;
  });
})
.expect('ready').toBeTruthy();

Taste('Emits complete once all Flavors are finished')
.test(profile => {
  const t = new taste({test: true});
  t.flavor('foo')
  .test(p => p.foo = 'foo')
  .expect('foo').toEqual('foo');
  
  t.once('complete', () => {
    profile.complete = true;
  });
})
.expect('complete').toBeTruthy();

Taste('Taste handles asynchronous and synchronous tests')
.test(profile => {
  const t = new taste({test: true});
  t.flavor('sync')
  .test(p => p.foo = 'foo')
  .expect('foo').toEqual('foo');

  t.flavor('async')
  .test(p => setTimeout(() => {
    p.async = true;
  }, 250))
  .expect('async').toBeTruthy();

  t.once('complete', () => {
    profile.complete = true;
  });
})
.expect('complete').toBeTruthy();

Taste('Awaited flavors occur procedurally')
.test(profile => {
  const t = new taste({test: true});
  const order = [];
  t.flavor('await1')
  .test(p => {
    setTimeout(() => {
      p.foo = 'foo';
    }, 250)
    order.push(1);
  })
  .expect('foo').toBeTruthy()
  .await();

  t.flavor('await2')
  .test(p => {
    p.foo = 'foo';
    order.push(2);
  })
  .expect('foo').toBeTruthy()
  .await();

  t.flavor('await3')
  .test(p => {
    setTimeout(() => {
      p.foo = 'foo';
    }, 100);
    order.push(3);
  })
  .expect('foo').toBeTruthy()
  .await();

  t.finished(() => {
    profile.order = order;
  });
})
.expect('order').toMatchArray([1,2,3]);

Taste('Retrieve comprehensive taste test results')
.test(profile => {
  const t = new taste({test: true});
  t.flavor('sync')
  .test(p => p.foo = 'foo')
  .expect('foo').toEqual('foo');

  t.flavor('async')
  .test(p => setTimeout(() => {
    p.async = true;
  }, 250))
  .expect('async').toBeTruthy();

  t.finished(result => {
    profile.result = result;
  })
})
.expect('result').toBeTruthy();

module.exports = Taste;
