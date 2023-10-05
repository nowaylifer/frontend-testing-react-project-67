const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const nock = require('nock');
const process = require('process');
const { readFile } = require('../test-helpers');
const PageLoader = require('../page-loader');

let tmpFolder;
let responseHtml;

beforeAll(async () => {
  responseHtml = await readFile('response.html');
});

beforeEach(async () => {
  tmpFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, responseHtml);
});

test('downloads a site to the specified folder', async () => {
  const returnValue = await new PageLoader('https://ru.hexlet.io/courses', tmpFolder).load();

  const actualContent = await fs.readFile(
    `${tmpFolder}${path.sep}ru-hexlet-io-courses.html`,
    'utf-8',
  );

  expect(actualContent).toBe(responseHtml);
  expect(returnValue.filepath).toBe(`${tmpFolder}${path.sep}ru-hexlet-io-courses.html`);
});

test('downloads a site to the current working folder, if the folder parameter is not defined', async () => {
  process.cwd = jest.fn(() => tmpFolder);

  const returnValue = await new PageLoader('https://ru.hexlet.io/courses').load();

  const actualContent = await fs.readFile(
    `${tmpFolder}${path.sep}ru-hexlet-io-courses.html`,
    'utf-8',
  );

  expect(actualContent).toBe(responseHtml);
  expect(returnValue.filepath).toBe(`${tmpFolder}${path.sep}ru-hexlet-io-courses.html`);
});
