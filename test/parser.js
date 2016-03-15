import fs from 'fs';
import path from 'path';
import { test } from 'tap';
import { Parser } from '../src';

const defaults = {};

test('parse translation function', (t) => {
    const parser = new Parser();
    const customHandler = function(key) {
        const defaultValue = '__TRANSLATION__'; // optional default value
        parser.set(key, defaultValue);
    };

    // i18next.t('key');
    const content = '
    content = fs.readFileSync('./app.js', 'utf-8');
    parser
        .parseFuncFromString(content, customHandler) // pass a custom handler
        .parseFuncFromString(content, { list: ['i18next.t']}) // override `func.list`
        .parseFuncFromString(content, { list: ['i18next.t']}, customHandler)
        .parseFuncFromString(content); // using default options and handler

    t.same(parset.get(), {
        en: {
            translation: {
                "key2": "__TRANSLATION__",
                "key1": "__TRANSLATION__"
          }
        }
    });
    t.end();
});

test('gettext style i18n', (t) => {
    const parser = new Parser({
        keySeparator: false,
        nsSeparator: false
    });

    // Parse Translation Function
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/modules/index.js'), 'utf8');

    parser.parseFuncFromString(content, { list: ['i18n._'] });

    const resStore = parser.get();
    t.same(resStore, {
        en: {
            translation: {
                "Loading...": "Loading...",
                "This value does not exist.": "This value does not exist.",
                "YouTube has more than __count__ billion users.": "YouTube has more than __count__ billion users."
          }
        }
    });
    t.end();
});

test('disable nsSeparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: false,
        keySeparator: '.'
    }));
    parser.set('foo:bar', '');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'foo:bar': ''
            }
        }
    }, 'The key should not use default nsSeparator : to split');
    t.end();
});

test('disable keySeparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: false
    }));
    parser.set('Creating...', '');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'Creating...': 'Creating...'
            }
        }
    }, 'The key should not use default keySeparator . to split');
    t.end();
});

test('default nsSeparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: '.'
    }));
    parser.set('translation:key1.key2', '');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The key should use default nsSeparator : to split');
    t.end();
});

test('default keyseparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: '.'
    }));
    parser.set('key1.key2', '');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The key should use default keySeparator . to split');
    t.end();
});
