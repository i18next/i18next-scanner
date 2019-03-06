#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const program = require('commander');
const ensureArray = require('ensure-array');
const sort = require('gulp-sort');
const vfs = require('vinyl-fs');
const scanner = require('../lib');
const pkg = require('../package.json');

program
    .version(pkg.version)
    .usage('[options] <file ...>')
    .option('--config <config>', 'Path to the config file (default: i18next-scanner.config.js)', 'i18next-scanner.config.js')
    .option('--output <path>', 'Path to the output directory (default: .)');

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

if (!program.config) {
    program.help();
    return;
}

let config = {};
try {
    config = require(path.resolve(program.config));
} catch (err) {
    console.error('i18next-scanner:', err);
    return;
}

{ // Input
    config.input = (program.args.length > 0) ? program.args : ensureArray(config.input);
    config.input = config.input.map(function(s) {
        s = s.trim();

        // On Windows, arguments contain spaces must be enclosed with double quotes, not single quotes.
        if (s.match(/(^'.*'$|^".*"$)/)) {
            // Remove first and last character
            s = s.slice(1, -1);
        }
        return s;
    });

    if (config.input.length === 0) {
        program.help();
        return;
    }
}

{ // Output
    config.output = program.output || config.output;

    if (!config.output) {
        config.output = '.';
    }
}

vfs.src(config.input)
    .pipe(sort()) // Sort files in stream by path
    .pipe(scanner(config.options, config.transform, config.flush))
    .pipe(vfs.dest(config.output))
