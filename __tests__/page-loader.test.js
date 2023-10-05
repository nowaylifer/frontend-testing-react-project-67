const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const nock = require('nock');
const process = require('process');
const { readFile } = require('../test-helpers');
const { loadPage } = require('../page-loader');

let tmpFolder;
let responseHtml;
let image;

beforeAll(async () => {
  nock.disableNetConnect();
  responseHtml = await readFile('response.html');
});

beforeEach(async () => {
  tmpFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  image = await readFile('nodejs.png');

  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, responseHtml);

  nock(/ru\.hexlet\.io/)
    .get(/\/assets\/professions\/nodejs.png/)
    .reply(200, image);
});

describe('downloads html', () => {
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

test('downloads images', async () => {
  const imagePath = path.join(
    tmpFolder,
    'ru-hexlet-io-courses_files',
    'ru-hexlet-io-assets-professions-nodejs.png',
  );

  await loadPage('https://ru.hexlet.io/courses', tmpFolder);

  const downloadedImage = await fs.readFile(imagePath, 'utf-8');

  expect(downloadedImage).toBe(image);
});
