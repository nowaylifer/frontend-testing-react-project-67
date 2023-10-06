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

  beforeEach(() => {
    nock(/ru\.hexlet\.io/)
      .get(/\/courses/)
      .reply(200, html);
  });

  test('to the specified folder', async () => {
    const returnValue = await loadPage('https://ru.hexlet.io/courses', tmpFolder);

    const expectedFilePath = path.join(tmpFolder, 'ru-hexlet-io-courses.html');

    const actualContent = await fs.readFile(expectedFilePath, 'utf-8');

    expect(trimHtml(actualContent)).toBe(html);
    expect(returnValue.filepath).toBe(expectedFilePath);
  });

  test('to the current working directory, if the destFolder parameter is not defined', async () => {
    process.cwd = jest.fn(() => tmpFolder);

    const returnValue = await loadPage('https://ru.hexlet.io/courses');

    const expectedFilePath = path.join(tmpFolder, 'ru-hexlet-io-courses.html');

    const actualContent = await fs.readFile(expectedFilePath, 'utf-8');

    expect(trimHtml(actualContent)).toBe(trimHtml(html));
    expect(returnValue.filepath).toBe(expectedFilePath);
  });
});

describe('downloads images', () => {
  let htmlWithImg;
  let imageBuf;

  beforeAll(async () => {
    imageBuf = await fs.readFile(getFixturePath('nodejs.png'));
    htmlWithImg = await readFile('img.html');
  });

  beforeEach(() => {
    nock(/ru\.hexlet\.io/)
      .get(/\/courses/)
      .reply(200, htmlWithImg);

    nock(/ru\.hexlet\.io/)
      .get(/\/assets\/professions\/nodejs.png/)
      .reply(200, imageBuf, {
        'Content-Type': 'image/png',
        'Content-Length': (_, __, body) => body.length,
      });
  });

  test('sucessful', async () => {
    const imagePath = path.join(
      tmpFolder,
      'ru-hexlet-io-courses_files',
      'ru-hexlet-io-assets-professions-nodejs.png',
    );

    await loadPage('https://ru.hexlet.io/courses', tmpFolder);

    const actualImgBuf = await fs.readFile(imagePath);

    const isEqual = imageBuf.equals(actualImgBuf);

    expect(isEqual).toBe(true);
  });

  test('src attribute in <img> tags reference path of the downloaded images', async () => {
    await loadPage('https://ru.hexlet.io/courses', tmpFolder);

    const html = await fs.readFile(path.join(tmpFolder, 'ru-hexlet-io-courses.html'), 'utf-8');
    const $ = cheerio.load(html);

    const { src } = $('img')[0].attribs;

    expect(src).toBe('ru-hexlet-io-courses_files/ru-hexlet-io-assets-professions-nodejs.png');
  });
});
