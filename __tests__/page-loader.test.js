const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const nock = require('nock');
const process = require('process');
const cheerio = require('cheerio');
const fsc = require('fs-cheerio');
const { readFile, getFixturePath } = require('../test-helpers');
const { loadPage } = require('../page-loader');

let tmpFolder;
let responseHtml;
let imageBuf;

beforeAll(async () => {
  nock.disableNetConnect();
  imageBuf = await fs.readFile(getFixturePath('nodejs.png'));
  responseHtml = await readFile('response.html');
});

beforeEach(async () => {
  tmpFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, responseHtml);

  nock(/ru\.hexlet\.io/)
    .get(/\/assets\/professions\/nodejs.png/)
    .reply(200, imageBuf, {
      'Content-Type': 'image/png',
      'Content-Length': (_, __, body) => body.length,
    });
});

describe('downloads html', () => {
  let fscWriteMock;

  beforeAll(() => {
    fscWriteMock = jest.spyOn(fsc, 'writeFile');
    fscWriteMock.mockImplementation(() => Promise.resolve());
  });

  afterAll(() => {
    fscWriteMock.mockRestore();
  });

  test('to the specified folder', async () => {
    const returnValue = await loadPage('https://ru.hexlet.io/courses', tmpFolder);

    const expectedFilePath = path.join(tmpFolder, 'ru-hexlet-io-courses.html');

    const actualContent = await fs.readFile(expectedFilePath, 'utf-8');

    expect(actualContent).toBe(responseHtml);
    expect(returnValue.filepath).toBe(expectedFilePath);
  });

  test('to the current working directory, if the destFolder parameter is not defined', async () => {
    process.cwd = jest.fn(() => tmpFolder);

    const returnValue = await loadPage('https://ru.hexlet.io/courses');

    const expectedFilePath = path.join(tmpFolder, 'ru-hexlet-io-courses.html');

    const actualContent = await fs.readFile(expectedFilePath, 'utf-8');

    expect(actualContent).toBe(responseHtml);
    expect(returnValue.filepath).toBe(expectedFilePath);
  });
});

describe('downloads images', () => {
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
