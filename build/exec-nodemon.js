(function() {
  'use strict';
  const clearBuild = require('./build-clear.js');
  const buildTests = require('./build-test.js');
  const nodemon = require('nodemon');
  const config = require('../nodemon.json');
  nodemon(config);
  nodemon.on('restart', function(files) {
    console.log('App restarted due to: ', files);
    clearBuild();
    buildTests();
  });
})();
