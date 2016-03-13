import gulp from 'gulp';
import tap from 'tap';
import scanner from '../lib';
import customTransform from './utils/transform';

const test = tap.test;

test('setup', function(t) {
    t.end();
});

test('teardown', function(t) {
    t.end();
});

test('Gulp usage', function(t) {
    const options = {
        lngs: ['en','de'],
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resGetPath: 'i18n/__lng__/__ns__.json',
        resSetPath: 'i18n/__lng__/__ns__.savedMissing.json',
        nsSeparator: ':', // namespace separator
        keySeparator: '.', // key separator
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
        .pipe(scanner(options, customTransform))
        .pipe(gulp.dest('./output'))
        .on('end', function() {
            t.end();
        });
});
