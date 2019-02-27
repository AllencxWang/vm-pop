const fs = require('fs');
const pexec = require('./pexec');
const esc = require('./utils').esc;

const download = async (url, filePath) => {
  if(fs.existsSync(filePath)) {
    console.log(`${filePath} is skipped`);
    return Promise.resolve();
  }
  await pexec(`curl ${url} --output ${esc(filePath)}`);
};

module.exports = download;
