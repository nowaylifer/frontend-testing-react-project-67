import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import process from 'process';
import * as cheerio from 'cheerio';
import fsc from 'fs-cheerio';
import { createWriteStream } from 'fs';

let $;

class PageLoader {
  #url;
  #destFolder;
  #resourceDist;
  #resourceFilePrefix;

  constructor(urlString, destFolder = process.cwd()) {
    this.#url = new URL(urlString);
    this.#destFolder = destFolder;

    this.#resourceDist = path.join(
      this.#destFolder,
      `${this.#generateFileName(this.#url.href)}_files`,
    );

    const { hostname } = this.#url;
    this.#resourceFilePrefix = this.#generateFileName(hostname);
  }

  async load() {
    const { filepath, html } = await this.#loadHtml();
    $ = cheerio.load(html);

    await this.#createResourceDir();
    await this.#loadImages();

    await fsc.writeFile(filepath, $);

    return { filepath };
  }

  async #createResourceDir() {
    try {
      await fs.mkdir(this.#resourceDist);
    } catch (error) {
      console.log(error);
    }
  }

  async #loadHtml() {
    const htmlFilename = this.#generateFileName(this.#url.href) + '.html';
    const filepath = path.join(this.#destFolder, htmlFilename);

    const { data: html } = await axios.get(this.#url.toString());

    await fs.writeFile(filepath, html);

    return { filepath, html };
  }

  async #loadImages() {
    const $images = $('img');
    await Promise.allSettled($images.map((_, img) => this.#loadImage(img)));
  }

  async #loadImage(img) {
    const imgUrl = new URL(img.attribs.src, this.#url.href);
    let resp;

    try {
      resp = await axios.get(imgUrl.href, { responseType: 'stream' });
    } catch (error) {
      return Promise.reject(error);
    }

    const imgPath = this.#generateResourceFilePath(img.attribs.src);
    $(img).attr('src', imgPath.replace(`${this.#destFolder}/`, ''));

    const writer = createWriteStream(imgPath);
    resp.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  #generateResourceFilePath(rawName) {
    return this.#getResourceFilePath(
      this.#resourceFilePrefix + this.#generateFileName(rawName, { saveExt: true }),
    );
  }

  #getResourceFilePath(filename) {
    return path.join(this.#resourceDist, filename);
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
