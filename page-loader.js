const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');
const process = require('process');
const cheerio = require('cheerio');

class PageLoader {
  #url;
  #destFolder;
  #resourceDist;
  #resourceFilePrefix;
  $;

  constructor(urlString, destFolder = process.cwd()) {
    this.#url = new URL(urlString);
    this.#destFolder = destFolder;

    this.#resourceDist = path.join(
      this.#destFolder,
      `${this.#generateFileName(this.#url.toString())}_files`,
    );

    const { hostname } = this.#url;
    this.#resourceFilePrefix = this.#generateFileName(hostname);
  }

  async load() {
    const { filepath, html } = await this.#loadHtml();
    this.$ = cheerio.load(html);
    await this.#loadImages();

    return { filepath };
  }

  async #loadHtml() {
    const htmlFilename = this.#generateFileName(this.#url.toString()) + '.html';
    const filepath = path.join(this.#destFolder, htmlFilename);

    const { data: html } = await axios.get(this.#url.toString());

    await fs.writeFile(filepath, html);

    return { filepath, html };
  }

  async #loadImages() {
    const $images = this.$('img');

    await Promise.allSettled(
      $images.map(async (i, img) => {
        const { origin } = this.#url;

        let resp;

        try {
          resp = await axios.get(`${origin}${img.attribs.src}`, { responseType: 'stream' });
        } catch (error) {
          console.log('Error downloading image:\n' + error);
          return;
        }

        const imgPath = this.#generateResourceFilePath(img.attribs.src);

        resp.data.pipe(fs.createWriteStream(imgPath));

        return new Promise((resolve, reject) => {
          resp.data.on('end', resolve);
          resp.data.on('error', reject);
        });
      }),
    );
  }

  #getResourceFilePath(filename) {
    return path.join(this.#resourceDist, filename);
  }

  #generateResourceFilePath(rawName) {
    return this.#getResourceFilePath(
      this.#resourceFilePrefix + this.#generateFileName(rawName, { saveExt: true }),
    );
  }

  #generateFileName(string, { saveExt = false } = {}) {
    const dotIndex = string.lastIndexOf('.');
    const ext = string.slice(dotIndex);

    let filename = string.trim();

    if (saveExt) {
      filename = filename.slice(0, dotIndex);
    }

    filename = filename.replace(/^https?:\/\//, '').replace(/[^a-z0-9]/gi, '-');

    if (saveExt) {
      filename = filename.concat(ext);
    }

    return filename;
  }
}

const loadPage = (url, destFolder) => {
  return new PageLoader(url, destFolder).load();
};

module.exports = {
  PageLoader,
  loadPage,
};
