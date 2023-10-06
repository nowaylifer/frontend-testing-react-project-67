#!/usr/bin/env node

const { loadPage } = require('./page-loader');
const { program } = require('commander');

program.option('-o, --output <path>', 'output path');
program.parse(process.argv);

const options = program.opts();
const { output } = options;
const { args } = program;

loadPage(args[0], output);
