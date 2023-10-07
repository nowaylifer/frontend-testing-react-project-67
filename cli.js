#!/usr/bin/env node

import { loadPage } from './page-loader.js';
import { program } from 'commander';

program.option('-o, --output <path>', 'output path');
program.parse(process.argv);

const options = program.opts();
const { output } = options;
const { args } = program;

loadPage(args[0], output);
