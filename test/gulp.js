import gulp from 'gulp';
import { test } from 'tap';
import scanner from '../src';
import customTransform from './utils/transform';

test('Gulp usage', function(t) {
    const options = {
        lngs: ['en','de'],
        ns: ['translation', 'locale'],
        defaultNs: 'translation',
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resource: {
            loadPath: 'i18n/__lng__/__ns__.json',
            savePath: 'i18n/__lng__/__ns__.savedMissing.json'
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
