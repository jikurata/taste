# Taste v0.0.5
Test client-side code directly in a web browser
---
## Install
```
npm install @jikurata/taste
```
## Usage
Taste utilizes chainable functions to produce simple, organized code structures
```
    Taste.flavor('test title')
        .describe('test description')
        .test(() => {
            Taste.profile.foo = 'bar';
        })
        .expect('foo').toMatch('bar');
```
## Example
Testing two functions:
```
function add(x,y) {
    return x + y;
}

function appendDiv(target) {
    const node = document.createElement('div');
    target.appendChild(node);
}
```
```
const Taste = require('@jikurata/taste');

// Taste.flavor() creates a new context for testing
Taste.flavor('add(x,y)')
    .describe('Returns the sum of two numbers')
    .test(() => {
        // Taste.profile is an object meant for storing the results of a test
        Taste.profile.addResult = add(4,1);
        Taste.profile.addStrings = add('4',1);
    })
    .expect('addResult').toEqual(5) // Pass the property used in Taste.profile into expect()
    .expect('addStrings').toEqual(5); // Include as many expectations as needed for the test

// New context for a new test
Taste.flavor('appendDiv()')
    .describe('Appends a div element to the target')
    // Creates a subtree in the DOM made specifically for this test
    .sample(`
        <section id="someSampleRoot">
            <div>Just one div</div>
        </section>
    `) 
    // Add an argument to the test function to reference the sample
    .test((sample) => {
        const root = sample.getElementById('someSampleRoot);
        appendDiv(root);
        Taste.profile.childrenLength = root.children.length;
    })
    .expect('childrenLength').toEqual(2);
```
Asynchronous code is OK
```
Taste.flavor('Asynchronous Code')
    .describe('Resolves after 3000ms')
    .timeout(5000) // Adjust the timeout on the test to an appropriate duration (default = 2500)
    .test(() => {
        window.setTimeout(() => {
            Taste.profile.asyncResult = true;
        }, 3000);
    })
    .expect('asyncResult').toBeTruthy();

```
## Version Log
---
### v0.0.5
- Add navigation menu to summary
- Flavors can now handle multiple Expectations

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
