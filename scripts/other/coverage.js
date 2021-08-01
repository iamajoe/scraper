#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const stdin = process.openStdin();

// ------------------------------------------------------
// variables

const docMdPath = path.resolve(path.join(__dirname, '../..', 'code-coverage.md'));
const srcPath = path.resolve(path.join(__dirname, '../..', 'src'));
let data = "";

// ------------------------------------------------------
// methods

/**
 * Saves translations to the documentation
 * @param {string} data
 */
const saveDoc = (data) => {
  let parsedData = data
  .split('\n')
  .filter(v => v !== null && v.trim().length > 0)
  .map((v) => {
    let parsedV = v;

    for (let i = 10; i > 0; i -= 1) {
      const str = ' '.repeat(i);

      if (parsedV.indexOf(str) === 0) {
        parsedV = parsedV.replace(str, `${'-'.repeat(i)} `);
      }
    }

    return `| ${parsedV} |`;
  });

  while(parsedData[0].indexOf('| -------') === 0) {
    parsedData.shift();
  }
  while(parsedData[parsedData.length - 1].indexOf('| -------') === 0) {
    parsedData.pop();
  }

  // time to construct the final data
  const sep = parsedData.find(l => l.indexOf('| -------') !== -1);
  let finalData = [];
  for (let i = 0; i < parsedData.length; i += 1) {
    let single = parsedData[i];

    // DEV: ignore the first two lines because they're the headers
    if (i < 2 || single.indexOf('All files') !== -1) {
      finalData.push(single);
      continue;
    }

    // remove the first level
    single = single.replace('| -', '| ').replace('|  ', '| ');

    if (single.indexOf('| -') === -1) {
      finalData.push(sep);
    }

    finalData.push(single);
  }

  const fileParsed = `${finalData.join('\n')}`;

  fs.writeFileSync(docMdPath, fileParsed);
};

// ------------------------------------------------------
// runtime

stdin.on('data', function(chunk) {
  data += chunk;
});

stdin.on('end', function() {
  saveDoc(data);
});
