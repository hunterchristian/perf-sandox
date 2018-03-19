const fs = require('fs');

module.exports = fileName =>
  new Promise((resolve, reject) => fs.readFile(fileName, 'utf8', (err, data) => {
    if (err) {
      reject(err);
    } else {
      resolve(data);
    }
  }));
