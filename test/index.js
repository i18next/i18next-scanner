'use strict';

var gulp = require('gulp');
var test = require('tap').test;
var i18nextScanner = require('../');
var customTransform = require('./utils/transform');

test('setup', function(t) {
    t.end();
});

test('teardown', function(t) {
    t.end();
});

test('Gulp usage', function(t) {
    var options = {
        lngs: ['en','de'],
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resGetPath: 'i18n/__lng__/__ns__.json',
        resSetPath: 'i18n/__lng__/__ns__.savedMissing.json',
        nsseparator: ':', // namespace separator
        keyseparator: '.', // key separator
        interpolationPrefix: '__',
        interpolationSuffix: '__',
        ns: {
            namespaces: [
                'translation',
                'locale'
            ],
            defaultNs: 'translation'
        }
    };
    gulp.src('test/fixtures/modules/**/*.{js,hbs}')
        .pipe(i18nextScanner(options, customTransform))
        .pipe(gulp.dest('./output'))
        .on('end', function() {
            t.end();
        });
});
