const pageLoader = require('./pageLoader');
const { program } = require('commander');

program.option('-o, --output <path>', 'output path');
program.parse(process.argv);

const options = program.opts();
const { output } = options;
const { args } = program;

pageLoader(args[0], output);
