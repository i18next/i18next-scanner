#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var program = require('commander');
var ensureArray = require('ensure-array');
var sort = require('gulp-sort');
var vfs = require('vinyl-fs');
var scanner = require('../lib');
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
    console.log('    $ i18next-scanner --config i18next-scanner.config.js "src/**/*.{js,jsx}"');
    console.log('    $ i18next-scanner "/path/to/src/app.js" "/path/to/assets/index.html"');
    console.log('');
});

program.parse(process.argv);

var src = ensureArray(program.args)
    .map(function(s) {
        s = s.trim();

        // On Windows, arguments contain spaces must be enclosed with double quotes, not single quotes.
        if (s.match(/(^'.*'$|^".*"$)/)) {
            // Remove first and last character
            s = s.slice(1, -1);
        }
        return s;
    });

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
