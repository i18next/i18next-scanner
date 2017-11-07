#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var program = require('commander');
var scanner = require('../lib');
var vfs = require('vinyl-fs');
var sort = require('gulp-sort');
var pkg = require('../package.json');

program
    .version(pkg.version)
    .usage('[options] <file ...>')
    .option('--config <config>', 'Path to the config file (default: i18next-scanner.config.js)', 'i18next-scanner.config.js')
    .option('--output <path>', 'Path to the output directory (default: .)', '.');

program.on('--help', function() {
    console.log('');
    console.log('  Examples:');
    console.log('');
    console.log('    $ i18next-scanner --config i18next-scanner.config.js --output /path/to/output \'src/**/*.{js,jsx}\'');
    console.log('    $ i18next-scanner --config i18next-scanner.config.js \'src/**/*.{js,jsx}\'');
    console.log('    $ i18next-scanner \'/path/to/src/app.js\' \'/path/to/assets/index.html\'');
    console.log('');
});

program.parse(process.argv);

var src = [].concat(program.args || []);

if (!program.config || !program.output || src.length === 0) {
    program.help();
    return;
}

var config = {};
try {
    config = require(path.resolve(program.config));
} catch (err) {
    console.error('i18next-scanner:', err);
    return;
}

vfs.src(src)
    .pipe(sort()) // Sort files in stream by path
    .pipe(scanner(config.options, config.transform, config.flush))
    .pipe(vfs.dest(program.output))
