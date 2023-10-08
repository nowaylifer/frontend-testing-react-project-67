import path from 'path';
import fs from 'fs/promises';

const getFixturePath = (filename) => path.join(__dirname, '__fixtures__', filename);
const readFile = (filename) => fs.readFile(getFixturePath(filename), 'utf-8');
const trimHtml = (html) => html.replace(/>\s+</g, '><').trim();

module.exports = {
  readFile,
  getFixturePath,
  trimHtml,
};
