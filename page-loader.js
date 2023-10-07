import './log.js';
import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import process from 'process';
import * as cheerio from 'cheerio';
import fsc from 'fs-cheerio';
import { createWriteStream } from 'fs';

let $;

export class PageLoader {
  #url;
  #destFolder;
  #resourceDist;

  constructor(urlString, destFolder = process.cwd()) {
    this.#url = new URL(urlString);
    this.#destFolder = destFolder;
    this.#resourceDist = `${this.#generateFileName(this.#url.href)}_files`;
  }

  async load() {
    const { filepath, html } = await this.#loadHtml();
    $ = cheerio.load(html);

    await this.#createResourceDir();
    await this.#loadResources();

    await fsc.writeFile(filepath, $);

    return { filepath };
  }

  async #createResourceDir() {
    try {
      await fs.mkdir(path.join(this.#destFolder, this.#resourceDist));
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

  async #loadResources() {
    const $links = $('link');
    const $images = $('img');
    const $scripts = $('script');

    const promises = [$links, $images, $scripts].flatMap(($elements) =>
      $elements.toArray().map((el) => this.#loadResource(el)),
    );

    await Promise.allSettled(promises);
  }

  #getUrlAttr(element) {
    return element.name === 'link' ? 'href' : 'src';
  }

  #isResourceLocal(resourceUrl) {
    return resourceUrl.origin === this.#url.origin;
  }

  async #loadResource(element) {
    const urlAttr = this.#getUrlAttr(element);
    const resourceUrl = new URL(element.attribs[urlAttr], this.#url.href);

    if (!this.#isResourceLocal(resourceUrl)) {
      return Promise.resolve();
    }

    let resp;

    try {
      resp = await axios.get(resourceUrl.href, { responseType: 'stream' });
    } catch (error) {
      return Promise.reject(error);
    }

    const resourcePath = this.#getResourceFilePath(resourceUrl.href);
    $(element).attr(urlAttr, resourcePath);

    const writer = createWriteStream(path.join(this.#destFolder, resourcePath));
    resp.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  #getResourceFilePath(rawName) {
    return path.join(this.#resourceDist, this.#generateFileName(rawName, { saveExt: true }));
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

export const loadPage = (url, destFolder) => {
  return new PageLoader(url, destFolder).load();
};
