#!/usr/bin/env node

import program from 'commander';
import { loadPage } from './page-loader.js';

program
  .description('Loads page')
  .arguments('<pageUrl>')
  .option('-o, --output [path]', 'choose output path', process.cwd())
  .action(async (pageUrl, options) => {
    console.log(await loadPage(pageUrl, options.output));
  })
  .parse(process.argv);

if (!program.args.length) program.help();
