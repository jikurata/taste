# Taste v1.1.0
Lightweight testing framework
---
## Install
```
npm install @jikurata/taste
```
## Usage
Taste utilizes chainable functions to produce straightforward, organized code structures
```
const Taste = require('@jikurata/taste');

// Create a new Flavor
Taste('Some Flavor Test')
    .test('some description', profile => {
        profile.foo = 'bar';
    })
    .expect('foo').toEqual('bar');

Taste('Another Flavor Test')
    .test(profile => {
        profile.bar = 'baz';
    })
    .expect('bar').toEqual('baz');
```
Asynchronous Tests are OK
```
Taste('Async test')
    .test(profile => {
        setTimeout(() => {
            profile.asyncTest = true;
        }, 500);
    })
    .expect('asyncTest').toBeTruthy();
```
Flavors with multiple test cases and expected results are OK
```
Taste('meaning of life')
    .test(profile => {
        profile.life = 42;
    })
    .test(profile => {
        profile.actually = null;
    })
    .expect('life').toEqual(42)
    .expect('actually').toBeFalsy();
```
The Profile object is passed to the before, test and after handlers. This allows the scope of a flavor to be contained in a single object, so pre-test/post-test operations can be performed on a Flavor test:
```
Taste('Hook me up')
    .before(profile => {
        profile.before = 1;
    })
    .test(profile => {
        profile.test = 33;
    })
    .expect('test').toEqual(33)
    .after(profile => {
        profile.after = 7;
        console.log(`${profile.before}${profile.test}${profile.after}) // 1337
    })
    .finished(result => {
        // Some stats about the flavor test
    })
```
Flavors with external variable dependencies can be controlled with await()
```
const server = http.createServer();
const port = 3000;

Flavor('server test 1')
    .before(profile => {
        profile.server = server;
        server.listen(port);
    })
    .test(...)
    .expect...
    .after(profile => {
        return new Promise((resolve, reject) => {
            server.close(() => {
                resolve();
            });
        })
    })
    .await() // Instructs Taste to wait for this flavor to finish before executing any other flavors that called await()

// Will not start until the previous flavor completes
Flavor('server test 2')
    .before(profile => {
        profile.server = server;
        server.listen(port);
    })
    .test(...)
    .expect...
    .after(profile => {
        return new Promise((resolve, reject) => {
            server.close(() => {
                resolve();
            });
        })
    })
    .await()

Flavor('sync test')... // await does not interupt unawaited Flavors
```
Adjust the timeout duration for a test
```
Taste('Need more time')
    .timeout(2501) // Default: 2500
    ...
```
### Browser Support
Taste tests have basic support for web browsers. But keep in mind that the source code is written with es6 syntaxes, so the tests may need to be transpiled for compatibility.
```
Taste.prepare(selector); // Use queryselector string to choose a root element for test view

Taste('Test in browser')
    .sample(`
        <h1>Testing</h1>
        <p>Html to perform a test on</p>
    `)
    .test((profile, sample) => {
        sample.getElementsByTagName('p')[0].textContent = 'foobar';
        profile.changedHtml = sample.getElementsByTagName('p')[0].textContent;
    })
    .expect('changedHtml').toMatch('foobar');
```
### Merging Multiple Test Files
Taste tests can be merged with Taste tests from other files.
Just export the Taste object and import where it needs to go.
```
// test1.js
const Taste = require('@jikurata/taste');

Taste('test1')
.test(...)
.expect...

module.exports = Taste;

// test2.js
const Taste = require('@jikurata/taste');

Taste('test2')
.test(...)
.expect...

module.exports = Taste;

// merged-tests.js
require('test1.js');
require('test2.js');
// Executes both test1 and test2
```
## Documentation
---
### **Function taste(*description*)** ###
#### Arguments ####
- description {String}: A descriptor for the Flavor
#### Returns {Flavor} #### 
#### Description ####
- Exported by the @jikurata/taste module. Creates a new Flavor instance with the descriptor as the title. Returns the Flavor object.

### **Function taste.finished(*handler*)** ###
#### Arguments ####
- handler {Function}: A function to be executed when Taste emits "complete".
#### Returns {Void} #### 
#### Description ####
- The function receives a single argument, an Object containing the comprehensive results of the taste tests.

### **Function taste.prepare(*querySelector*)** ###
#### Arguments ####
- querySelector {String}: A querySelector string
#### Returns {Void} #### 
#### Description ####
- Sets the resulting Element as the root element for the test view. Only available in browser environments
---
### **Class Flavor** ###
#### Methods ####

#### Flavor.after(*handler*) ####
#### Arguments ####
- handler {String}: A function to pass to the "after" event
#### Returns {Flavor} #### 
#### Description ####
- Define a code block to execute after ending the test phase. The function receives a single argument, the Profile object. Returns its flavor.

#### Flavor.before(*handler*) ####
#### Arguments ####
- handler {Function}: A function to pass to the "before" event
#### Returns {Flavor} #### 
#### Description ####
- Define a code block to execute before starting the test phase. The function receives a single argument, the Profile object. Returns its Flavor.

#### Flavor.expect(*arg*) ####
#### Arguments ####
- arg {String}: A profile map key to evaluate
#### Returns {Expectation} #### 
#### Description ####
- Creates a new Expectation for Flavor to resolve. The key passed into this function should match the Profile property that requires evaluation. Returns an instance of Expectation.

#### Flavor.finished(*handler*) ####
#### Arguments ####
- handler {String}: A function to pass to the "complete" event
#### Returns {Flavor} #### 
#### Description ####
- Define a code block to execute after the Flavor finishes. Receives a single argument, a Result object containing details about the test results. Returns its Flavor.

#### Flavor.sample(*html*) ####
#### Arguments ####
- html {String}: A html string to set to the Flavor's innerHTML.
#### Returns {Flavor} #### 
#### Description ####
- This method will only work in browser environments. If it is detected in Node.js, the test will throw an error and its expectations will not be resolved. Returns its Flavor.

#### Flavor.test(*description*, *handler*) ####
#### Arguments ####
- description {String}: An additional description to append to a test
- handler {Function}: A function to execute during the test phase
#### Returns {Flavor} #### 
#### Description ####
- Create a new block of test code for the Flavor to execute. The handler receives two arguments, a Profile object and a HTMLElement. The handler will only receive the HTMLElement if running the test in a browser environment. Returns its Flavor.

#### Flavor.timeout(*time*) ####
#### Arguments ####
- time {Number}: A value in milliseconds
#### Returns {Flavor} #### 
#### Description ####
- Sets the timeout of the flavor. Returns its Flavor.
---
### Class Expectation ###
#### Methods ####

#### Expectation.toBe(*value*) ####
#### Arguments ####
- value {Any}: The value to be compared with the Profile value
#### Returns {Flavor} #### 
#### Description ####
- Performs a loose equality (==) comparison between the Profile value and value. Returns its Flavor.

#### Expectation.toBeArray() ####
#### Returns {Flavor} #### 
#### Description ####
- Evaluates whether the Profile value is an Array. Returns its Flavor.

#### Expectation.toBeComparative(*comparator*, *statement*) ####
#### Arguments ####
- comparator {Function}: A comparative function to evaluate its argument
- statement {String}: A string representation of the comparison being performed by comparator
#### Returns {Flavor} #### 
#### Description ####
- Takes the test value from Profile and passes it into the comparator function. The comparator should return a boolean. Returns its Flavor.

#### Expectation.toBeFalsy() ####
#### Returns {Flavor} #### 
#### Description ####
- Performs a loose check for a falsy value. Returns its Flavor.

#### Expectation.toBeGreaterThan(*lowerBound*, *closed*) ####
#### Arguments ####
- lowerBound {Number}
- closed {Boolean}: (Default: true) Sets the bounding number to be open or closed
#### Returns {Flavor} #### 
#### Description ####
- Performs a greater than (or equal to) comparison on the Profile value. Returns its Flavor.

#### Expectation.toBeLessThan(*upperBound*, *closed*) ####
#### Arguments ####
- lowerBound {Number}
- closed {Boolean}: (Default: true) Sets the bounding number to be open or closed
#### Returns {Flavor} #### 
#### Description ####
- Performs a less than (or equal to) comparison on the Profile value. Returns its Flavor.

#### Expectation.toBeInRange(*lowerBound*, *upperBound*, options) ####
#### Arguments ####
- lowerBound {Number}
- options {Object}:
    - options.lower {String}: "open" || "closed"
    - options.upper {String}: "open" || "closed"
#### Returns {Flavor} #### 
#### Description ####
- Checks if the Profile value is within the range. Returns its Flavor.

#### Expectation.toBeTruthy() ####
#### Returns {Flavor} #### 
#### Description ####
- Performs a loose check for a truthy value. Returns its Flavor.

#### Expectation.toBeTypeOf(*type*) ####
#### Arguments ####
- type {String}
#### Returns {Flavor} #### 
#### Description ####
- Performs a typeof check on the Profile value. Returns its Flavor.

#### Expectation.toBeInstanceOf(*prototype*) ####
#### Arguments ####
- prototype {Object}
#### Returns {Flavor} #### 
#### Description ####
- Performs a instanceof check on the Profile value. Returns its Flavor.

#### Expectation.toContain(*value*) ####
#### Arguments ####
- value {String|Array<Any>}
#### Returns {Flavor} #### 
#### Description ####
- Checks if the test value contains the value as a substring/subarray.

#### Expectation.toEqual(*value*) ####
#### Arguments ####
- value {Any}
#### Returns {Flavor} #### 
#### Description ####
- Performs a strict equality (===) comparison on the Profile value and value. Returns its Flavor.

#### Expectation.toHaveProperty(*property*) ####
#### Arguments ####
- property {String|Array<String>}: Object keys to test for in the Profile value
#### Returns {Flavor} #### 
#### Description ####
- Checks if the Profile value has a property. Uses Object.hasOwnProperty(). Returns its Flavor.

#### Expectation.toMatch(*regex*) ####
#### Arguments ####
- regex {String|RegExp}
#### Returns {Flavor} #### 
#### Description ####
- Checks if regex or string matches any part of the Profile value. Uses RegExp.test(). Returns its Flavor.

#### Expectation.toMatchArray(*array*, *ordered = true*) ####
#### Arguments ####
- array {Array<Any>}
- ordered {Boolean}
#### Returns {Flavor} #### 
#### Description ####
- Checks if the test value is an array that matches the provided array. The ordered boolean determines whether the comparison should acknowledge sequential equality when comparing the two arrays

## Version Log
---
### v1.1.0
- Implemented Flavor.await() to instruct Taste to wait for that Flavor to finish before starting other awaited Flavors.
- Implemented Expectation.toMatchArray() to handle array comparisons
- Implemented Expectation.toContain() to handle substring/subarray comparisons

### v1.0.1
- Implemented Taste.finished() to expose the object containing the comprehensive results of the taste tests.
 

### v1.0.0
- Taste changes
    - Now emits complete when all Flavors are complete
- Flavors changes
    - Now resolves on timeout or error.
    - Implemented Flavor.before() and Flavor.after() to perform pre-test/post-test operations
    - A single Flavor instance now supports multiple tests
- Expectation changes
    - Resolves when an error occurs
    - Expectation.isTypeOf() has been changed to Expectation.toBeTypeOf()
    - Expectation.isInstanceOf() has been changed to Expectation.toBeInstanceOf()
    - added Expectation.toBeArray() and Expectation.toHaveProperty()
    - added Expectation.toBeComparative(), which allows you to implement your own comparative functions

### v0.0.6
- Implement custom Error types
- Flavors now print errors instead of suppressing them
- Flavors now have a finished() method that executes when a Flavor test is complete
- Plans for next update:
    - Provide a more constructive and semantic environment for error handling to provide easier debugging
- Known Bugs:
    - Taste 'complete' state emits true before all Flavors can be resolved when executing synchronous code. For the time being, use the newly implemented finished() method to handle post code execution

### v0.0.5
- Add navigation menu to summary
- Flavors can now handle multiple Expectations
- Decoupled Flavor logic for a nodejs environment to NodeFlavor

### v0.0.4
- Add github repo link

### v0.0.3
- Detects whether to run the tests in a browser or Node.js environment

### v0.0.2
- Fix index.js to properly export Taste
- Add src/ to npmignore
### v0.0.1
- Refactored Taste to utilize chainable functions
- Replaced Context class with Flavor class
- Added @dweomercraft/events as a dependency
