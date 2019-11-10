'use strict';
const fs = require('fs-extra');

const dist = '_test/example/dist';

function clearBuild() {
  console.info(`Clearing built tests from ${dist}`);
  fs.emptyDirSync(dist);
  console.info(`${dist} has been cleared.`);
}

module.exports = clearBuild;
