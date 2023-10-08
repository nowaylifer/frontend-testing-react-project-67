const setNamespace = require('debug');
const axios = require('axios');
const path = require('path');
const fs = require('fs/promises');
const process = require('process');
const cheerio = require('cheerio');
const fsc = require('fs-cheerio');
const mime = require('mime-types');
const { createWriteStream } = require('fs');

const debug = setNamespace('page-loader');

let $;

class PageLoader {
  #url;
  #outputDir;
  #resourceDir;

  constructor(urlString, outputDir = process.cwd()) {
    this.#url = new URL(urlString);
    this.#outputDir = this.#normalizeDirPath(outputDir);
    this.#resourceDir = `${this.#generateFileName(this.#url.href)}_files`;
  }

  async load() {
    await this.#loadDom();
    await this.#ensureDirExists(this.#outputDir);
    await this.#createResourceDir();
    await this.#loadResources();

    const filepath = await this.#saveHtml();

    return { filepath };
  }

  async #saveHtml() {
    const htmlFilename = this.#generateFileName(this.#url.href) + '.html';
    const filepath = path.join(this.#outputDir, htmlFilename);

    await fsc.writeFile(filepath, $);

    return filepath;
  }

  async #ensureDirExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dirPath, { recursive: true });
      } else {
        throw error;
      }
    }
  }

  #normalizeDirPath(pathToFolder) {
    return path.resolve(process.cwd(), pathToFolder);
  }

  async #createResourceDir() {
    await fs.mkdir(path.join(this.#outputDir, this.#resourceDir), { recursive: true });
  }

  async #loadDom() {
    const { data } = await axios.get(this.#url.toString());
    $ = cheerio.load(data);
  }

  async #loadResources() {
    const $links = $('link');
    const $images = $('img');
    const $scripts = $('script');

    const results = await Promise.allSettled(
      [$links, $images, $scripts].flatMap(($elements) =>
        $elements.toArray().reduce((promises, el) => {
          const resourceUrl = this.#getResourceUrl(el);

          if (!this.#isResourceLocal(resourceUrl)) {
            return promises;
          }

          return promises.concat(
            this.#loadResource(resourceUrl.href).then((resp) => ({ el, resp })),
          );
        }, []),
      ),
    );

    await Promise.allSettled(
      results
        .reduce((acc, res) => (res.value ? acc.concat(res.value) : acc), [])
        .map(({ el, resp }) => {
          const { url } = resp.config;
          const extname = path.extname(url) || `.${mime.extension(resp.headers['content-type'])}`;
          const resourcePath = this.#getResourceFilePath(url, extname);
          console.log(resourcePath);

          this.#changeElementUrl(el, resourcePath);

          return this.#saveResource(resp.data, path.join(this.#outputDir, resourcePath));
        }),
    );
  }

  #getResourceUrl(element) {
    const urlAttr = this.#getUrlAttr(element);
    return new URL(element.attribs[urlAttr], this.#url.href);
  }

  #isResourceLocal(resourceUrl) {
    return resourceUrl.origin === this.#url.origin;
  }

  async #loadResource(url) {
    try {
      const resp = await axios.get(url, { responseType: 'stream' });
      return resp;
    } catch (error) {
      console.error(`Error downloading ${url}`, error);
      throw error;
    }
  }

  #changeElementUrl(element, newUrl) {
    const urlAttr = this.#getUrlAttr(element);
    $(element).attr(urlAttr, newUrl);
  }

  async #saveResource(data, path) {
    const writer = createWriteStream(path);
    data.pipe(writer);

    debug(`start writing to path: ${path}`);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        debug(`finish writing to path: ${path}`);
        resolve();
      });
      writer.on('error', (error) => {
        debug(`error writing to path: ${path}\n`, error);
        reject(error);
      });
    });
  }

  #getUrlAttr(element) {
    return element.name === 'link' ? 'href' : 'src';
  }

  #getResourceFilePath(rawName, extname) {
    return path.join(this.#resourceDir, this.#generateFileName(rawName, extname));
  }

  #generateFileName(string, extname = null) {
    const regex = new RegExp(`${extname ? `(?!\\${extname})` : ''}[^a-z0-9]`, 'gi');

    let filename = string
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(regex, '-');

    if (extname && !path.extname(filename)) {
      filename = filename.concat(extname);
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
