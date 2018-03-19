const fs = require('fs');

module.exports = (fileName, data) =>
  new Promise((resolve, reject) => fs.writeFile(fileName, data, 'utf8', err => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  }));
