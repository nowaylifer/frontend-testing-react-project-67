import 'debug';
import 'axios-debug-log';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import nock from 'nock';
import process from 'process';
import * as cheerio from 'cheerio';
import { readFile, getFixturePath, trimHtml } from '../test-helpers';
import { loadPage } from '../page-loader';

let tmpFolder;

beforeAll(async () => {
  nock.disableNetConnect();
});

beforeEach(async () => {
  tmpFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

afterEach(async () => {
  await fs.rm(tmpFolder, { recursive: true, force: true });
});

describe('downloads html', () => {
  let html;

  beforeAll(async () => {
    html = await readFile('just.html').then(trimHtml);
  });

  beforeEach(async () => {
    nock(/ru\.hexlet\.io/)
      .get(/\/courses/)
      .reply(200, html, { 'Content-Type': 'text/html' });
  });

  test('to the specified folder', async () => {
    const returnValue = await loadPage('https://ru.hexlet.io/courses', tmpFolder);

    const expectedFilePath = path.join(tmpFolder, 'ru-hexlet-io-courses.html');

    const actualContent = await fs.readFile(expectedFilePath, 'utf-8');

    expect(trimHtml(actualContent)).toBe(html);
    expect(returnValue.filepath).toBe(expectedFilePath);
  });

  test('to the current working directory, if the destFolder parameter is not defined', async () => {
    const cwdMock = jest.spyOn(process, 'cwd');
    cwdMock.mockImplementation(() => tmpFolder);

    const returnValue = await loadPage('https://ru.hexlet.io/courses');

    const expectedFilePath = path.join(tmpFolder, 'ru-hexlet-io-courses.html');

    const actualContent = await fs.readFile(expectedFilePath, 'utf-8');

    expect(trimHtml(actualContent)).toBe(trimHtml(html));
    expect(returnValue.filepath).toBe(expectedFilePath);

    cwdMock.mockRestore();
  });
});

describe('downloads local resources', () => {
  let htmlWithResources;
  let css;
  let script;
  let imageBuf;

  beforeAll(async () => {
    imageBuf = await fs.readFile(getFixturePath('nodejs.png'));
    htmlWithResources = await readFile('resources.html');
    css = await readFile('application.css');
    script = await readFile('runtime.js');
  });

  beforeEach(async () => {
    nock(/ru\.hexlet\.io/)
      .persist()
      .get(/\/courses/)
      .reply(200, htmlWithResources, { 'Content-type': 'text/html' });

    nock(/ru\.hexlet\.io/)
      .get(/\/assets\/professions\/nodejs.png/)
      .reply(200, imageBuf, {
        'Content-Type': 'image/png',
        'Content-Length': (_, __, body) => body.length,
      });

    nock(/ru\.hexlet\.io/)
      .get(/\/assets\/application.css/)
      .reply(200, css, {
        'Content-Type': 'text/css',
        'Content-Length': (_, __, body) => body.length,
      });

    nock(/ru\.hexlet\.io/)
      .get(/\/packs\/js\/runtime.js/)
      .reply(200, script, {
        'Content-Type': 'application/javascript',
        'Content-Length': (_, __, body) => body.length,
      });

    await loadPage('https://ru.hexlet.io/courses', tmpFolder);
  });

  test('images', async () => {
    const imagePath = path.join(
      tmpFolder,
      'ru-hexlet-io-courses_files',
      'ru-hexlet-io-assets-professions-nodejs.png',
    );

    const actualImgBuf = await fs.readFile(imagePath);

    const isEqual = imageBuf.equals(actualImgBuf);

    expect(isEqual).toBe(true);
  });

  test('links', async () => {
    const cssPath = path.join(
      tmpFolder,
      'ru-hexlet-io-courses_files',
      'ru-hexlet-io-assets-application.css',
    );

    const canonHtmlPath = path.join(
      tmpFolder,
      'ru-hexlet-io-courses_files',
      'ru-hexlet-io-courses.html',
    );

    const actualCss = await fs.readFile(cssPath, 'utf-8');
    const actualCanonHtml = await fs.readFile(canonHtmlPath, 'utf-8');

    expect(css).toBe(actualCss);
    expect(htmlWithResources).toBe(actualCanonHtml);
  });

  test('scripts', async () => {
    const scriptPath = path.join(
      tmpFolder,
      'ru-hexlet-io-courses_files',
      'ru-hexlet-io-packs-js-runtime.js',
    );

    const actualScript = await fs.readFile(scriptPath, 'utf-8');

    expect(script).toBe(actualScript);
  });

  test('src/href attributes of local resources should reference paths to downloaded files', async () => {
    const html = await fs.readFile(path.join(tmpFolder, 'ru-hexlet-io-courses.html'), 'utf-8');
    const $ = cheerio.load(html);

    const imgSrc = $('img')[0].attribs.src;
    const scriptSrc = $('script')[1].attribs.src;
    const cssHref = $('link')[1].attribs.href;

    expect(imgSrc).toBe('ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png');
    expect(cssHref).toBe('ru-hexlet-io-courses_files/ru-hexlet-io-assets-application.css');
    expect(scriptSrc).toBe('ru-hexlet-io-courses_files/ru-hexlet-io-packs-js-runtime.js');
  });

  test('src/href attributes of external resources should not be changed', async () => {
    const html = await fs.readFile(path.join(tmpFolder, 'ru-hexlet-io-courses.html'), 'utf-8');
    const $ = cheerio.load(html);

    const cssHref = $('link')[0].attribs.href;
    const scriptSrc = $('script')[0].attribs.src;

    expect(cssHref).toBe('https://cdn2.hexlet.io/assets/menu.css');
    expect(scriptSrc).toBe('https://js.stripe.com/v3/');
  });
});
