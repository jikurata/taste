# Taste v0.0.4
Test client-side code directly in a web browser
---
## Install
```
npm install @jikurata/taste
```
## Usage
Taste utilizes chainable functions to produce simple, organized code structures
```
const Taste = require('../lib/Taste.js');

// Test these two functions
function add(x,y) {
    return x + y;
}
function appendDiv(target) {
    const node = document.createElement('div');
    target.appendChild(node);
}

// Taste.flavor() creates a new context for testing
Taste.flavor('Sample Test: add()')
    .describe('Returns the sum of two numbers')
    .test(() => {
        // Taste.profile is an object meant for storing the results of a test
        Taste.profile.addResult = add(4,1);
    })
    .expect('addResult').toEqual(5); // Pass the property used in Taste.profile into expect()

// New context for a new test
Taste.flavor('Sample Test: appendDiv()')
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
    .expect('childrenLength').toBe(2);
```
Asynchronous code is OK
```
Taste.flavor('Sample Test: Asynchronous Code')
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
