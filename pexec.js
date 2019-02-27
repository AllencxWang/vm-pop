const util = require('util');
const exec = util.promisify(require('child_process').exec);

const pexec = async (cmd) => {
  console.log('------------------------------');
  console.log('command:', cmd);
  const { stdout, stderr } = await exec(cmd);
  console.log('stdout:', stdout);
  console.log('stderr:', stderr);
  console.log('------------------------------');
};

module.exports = pexec;