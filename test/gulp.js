import path from 'path';
import gulp from 'gulp';
import { test } from 'tap';
import scanner from '../src';
import customTransform from './utils/transform';

test('Gulp usage', function(t) {
    const options = {
        debug: false,
        func: {
            list: ['_t']
        },
        lngs: ['en','de'],
        ns: ['resource'],
        defaultNs: 'resource',
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resource: {
            loadPath: path.resolve(__dirname, 'fixtures/i18n/__lng__/__ns__.json'),
            savePath: 'i18n/__lng__/__ns__.json'
        },
        nsSeparator: ':', // namespace separator
        keySeparator: '.', // key separator
        interpolation: {
            prefix: '__',
            suffix: '__'
        }
    };

    gulp.src('test/fixtures/modules/**/*.{js,hbs}')
        .pipe(scanner(options, customTransform))
        .pipe(gulp.dest('./output'))
        .on('end', function() {
            t.end();
        });
});
