(function() {
  'use strict';
  const buildExample = require('./build-example.js');
  const nodemon = require('nodemon');
  const config = require('../nodemon.json');
  nodemon(config);
  nodemon.on('restart', function(files) {
    console.log('App restarted due to: ', files);
    buildExample();
  });
})();
