const mkdirp = require('mkdirp');

const pmkdirp = (directory) => {
  return new Promise((resolve, reject) => {
    mkdirp(directory, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

module.exports = pmkdirp;
