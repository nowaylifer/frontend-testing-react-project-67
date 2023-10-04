const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');
const process = require('process');

async function pageLoader(url, destFolder = process.cwd()) {
  const response = await axios.get(url);

  const fileName = url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '-')
    .concat('.html');

  const filepath = `${destFolder}${path.sep}${fileName}`;

  await fs.writeFile(filepath, response.data);

  return { filepath };
}

module.exports = pageLoader;
