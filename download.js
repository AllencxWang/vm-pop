const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const download = async (url, filePath) => {
  if(fs.existsSync(filePath)) {
    console.log(`${filePath} is skipped`);
    return Promise.resolve();
  }

  filePath = filePath.replace(/ /g, '\\ ');
  const { stdout, stderr } = await exec(`curl ${url} --output ${filePath}`);
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
};

module.exports = download;
