const os = require('os');
const fs = require('fs/promises');
const path = require('path');
const nock = require('nock');
const { readFile } = require('../test-helpers');
const pageLoader = require('../pageLoader');

let tmpFolder;
let responseHtml;

beforeAll(async () => {
  responseHtml = await readFile('response.html');
});

beforeEach(async () => {
  tmpFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('pageLoader', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, responseHtml);

  const returnValue = await pageLoader('https://ru.hexlet.io/courses', tmpFolder);

  const actualContent = await fs.readFile(
    `${tmpFolder}${path.sep}ru-hexlet-io-courses.html`,
    'utf-8',
  );

  expect(actualContent).toBe(responseHtml);
  expect(returnValue.filepath).toBe(`${tmpFolder}${path.sep}ru-hexlet-io-courses.html`);
});
