'use strict';
const fs = require('fs-extra');

const dist = 'test/';

function clearBuild() {
  console.info(`Clearing built tests from ${dist}`);
  fs.emptyDirSync(dist);
  console.info(`${dist} has been cleared.`);
}

clearBuild();
module.exports = clearBuild;
