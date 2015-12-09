'use strict';

var gulp = require('gulp');
var path = require('path');
var test = require('tap').test;
var scanner = require('../');

var toFixturePath = function(fileName) {
    var args = Array.prototype.slice.call(arguments);
    return path.resolve.apply(null, [__dirname, 'fixtures'].concat(args));
};

test('setup', function(t) {
    t.end();
});

test('teardown', function(t) {
    t.end();
});

test('Gulp usage', function(t) {
    gulp.src(toFixturePath('modules/**/*.{js,hbs}'), {base: 'fixtures'})
        .pipe(scanner({
            lngs: ['en','de'],
            defaultValue: '__STRING_NOT_TRANSLATED__',
            resGetPath: 'i18n/__lng__/__ns__.json',
            resSetPath: 'i18n/__lng__/__ns__.savedMissing.json',
            nsseparator: ':', // namespace separator
            keyseparator: '.', // key separator
            interpolationPrefix: '__',
            interpolationSuffix: '__',
            ns: {
                namespaces: [],
                defaultNs: 'translation'
            }
        }))
        .pipe(gulp.dest('./output'))
        .on('end', function() {
            t.end();
        });
});
