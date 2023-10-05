const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');
const process = require('process');
const cheerio = require('cheerio');

class PageLoader {
  #url;
  #getFilePath;
  $;

  constructor(urlString, destFolder = process.cwd()) {
    this.#url = new URL(urlString);

    this.#getFilePath = function (fileName) {
      return `${destFolder}${path.sep}${fileName}`;
    };
  }

  async load() {
    const html = await this.#loadHtml();

    this.$ = cheerio.load(html);

    const filepath = await this.#saveHtml(html);

    return { filepath };
  }

  async #loadHtml() {
    const response = await axios.get(this.#url.toString());
    return response.data;
  }

  #saveHtml(html) {
    const htmlFileName = this.#generateFileName(this.#url.toString(), 'html');
    return this.#saveFile(htmlFileName, html);
  }

  async #saveFile(filename, content) {
    const filepath = this.#getFilePath(filename);
    await fs.writeFile(filepath, content);
    return filepath;
  }

  #generateFileName(string, extension) {
    return string
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '-')
      .concat(`.${extension}`);
  }
}

module.exports = PageLoader;
