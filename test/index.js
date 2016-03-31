import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import tap from 'gulp-tap';
import { test } from 'tap';
import scanner from '../src';

const defaults = {
    debug: false,
    func: {
        list: ['_t']
    },
    lngs: ['en','de'],
    ns: [
        'locale',
        'resource'
    ],
    defaultNs: 'resource',
    defaultValue: '__STRING_NOT_TRANSLATED__',
    resource: {
        loadPath: '',
        savePath: 'i18n/__lng__/__ns__.json'
    },
    nsSeparator: false, // namespace separator
    keySeparator: false, // key separator
    interpolation: {
        prefix: '__',
        suffix: '__'
    }
};

test('should get expected result', function(t) {
    const options = _.merge({}, defaults, {
        func: {
            extensions: ['.js'] // with extensions
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            const list = [
                'i18n/de/resource.json',
                'i18n/en/resource.json',
            ];

            if (_.includes(list, file.path)) {
                const found = JSON.parse(contents);
                const wanted = {
                  "Loading...": "Loading...",
                  "This value does not exist.": "This value does not exist.",
                  "YouTube has more than __count__ billion users.": "YouTube has more than __count__ billion users."
                };
                t.same(found, wanted);
            }
        }))
        .on('end', function() {
            t.end();
        });
});

test('should get empty result', function(t) {
    const options = _.merge({}, defaults, {
        func: {
            extensions: [] // without extensions
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            const list = [
                'i18n/de/resource.json',
                'i18n/en/resource.json',
            ];

            if (_.includes(list, file.path)) {
                const found = JSON.parse(contents);
                const wanted = {};
                t.same(found, wanted);
            }
        }))
        .on('end', function() {
            t.end();
        });
});
