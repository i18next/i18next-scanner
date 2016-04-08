import fs from 'fs';
import path from 'path';
import { test } from 'tap';
import { Parser } from '../src';

const defaults = {};

test('parse translation function', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        fallbackLng: 'en'
    });
    const customHandler = function(key) {
        const defaultValue = '__TRANSLATION__'; // optional default value
        parser.set(key, defaultValue);
    };

    // i18next.t('key');
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');
    parser
        .parseFuncFromString(content, customHandler) // pass a custom handler
        .parseFuncFromString(content, { list: ['i18next.t']}) // override `func.list`
        .parseFuncFromString(content, { list: ['i18next.t']}, customHandler)
        .parseFuncFromString(content); // using default options and handler

    t.same(parser.get(), {
        en: {
            translation: {
                "key2": "__TRANSLATION__",
                "key1": "__TRANSLATION__"
          }
        }
    });

    // Sort keys in alphabetical order
    t.same(JSON.stringify(parser.get({ sort: true })), JSON.stringify({
        en: {
            translation: {
                "key1": "__TRANSLATION__",
                "key2": "__TRANSLATION__"
          }
        }
    }));

    t.equal(parser.get('key1', { lng: 'en' }), '__TRANSLATION__');
    t.equal(parser.get('key1', { lng: 'de' }), undefined);
    t.equal(parser.get('nokey', { lng: 'en' }), undefined);

    t.end();
});

test('parse HTML attribute', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        fallbackLng: 'en'
    });
    const customHandler = function(key) {
        const defaultValue = '__TRANSLATION__'; // optional default value
        parser.set(key, defaultValue);
    };

    // <div data-i18n="key"></div>
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
    parser
        .parseAttrFromString(content, customHandler) // pass a custom handler
        .parseAttrFromString(content, { list: ['data-i18n']}) // override `func.list`
        .parseAttrFromString(content, { list: ['data-i18n']}, customHandler)
        .parseAttrFromString(content); // using default options and handler

    t.same(parser.get(), {
        en: {
            translation: {
                "key2": "__TRANSLATION__",
                "key1": "__TRANSLATION__"
          }
        }
    });

    // Sort keys in alphabetical order
    t.same(JSON.stringify(parser.get({ sort: true })), JSON.stringify({
        en: {
            translation: {
                "key1": "__TRANSLATION__",
                "key2": "__TRANSLATION__"
          }
        }
    }));

    t.equal(parser.get('key1', { lng: 'en' }), '__TRANSLATION__');
    t.equal(parser.get('key1', { lng: 'de' }), undefined);
    t.equal(parser.get('nokey', { lng: 'en' }), undefined);

    t.end();
});

test('gettext style i18n', (t) => {
    const parser = new Parser({
        defaultValue: (lng, ns, key) => {
            return key;
        },
        keySeparator: false,
        nsSeparator: false
    });

    // Parse Translation Function
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/modules/index.js'), 'utf8');

    parser.parseFuncFromString(content, { list: ['_t'] });

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
    const parser = new Parser({
        defaultValue: '__NOT_TRANSLATED__',
        nsSeparator: false,
        keySeparator: '.'
    });
    parser.set('foo:bar');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'foo:bar': '__NOT_TRANSLATED__'
            }
        }
    }, 'The key should not use default nsSeparator : to split');
    t.end();
});

test('disable keySeparator', (t) => {
    const parser = new Parser({
        defaultValue: '__NOT_TRANSLATED__',
        nsSeparator: ':',
        keySeparator: false
    });
    parser.set('Creating...');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'Creating...': '__NOT_TRANSLATED__'
            }
        }
    }, 'The key should not use default keySeparator . to split');
    t.end();
});

test('default nsSeparator', (t) => {
    const parser = new Parser({
        defaultValue: '__NOT_TRANSLATED__',
        nsSeparator: ':',
        keySeparator: '.'
    });
    parser.set('translation:key1.key2');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'key1': {
                    'key2': '__NOT_TRANSLATED__'
                }
            }
        }
    }, 'The key should use default nsSeparator : to split');
    t.end();
});

test('default keyseparator', (t) => {
    const parser = new Parser({
        defaultValue: '__NOT_TRANSLATED__',
        nsSeparator: ':',
        keySeparator: '.'
    });
    parser.set('key1.key2');

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'key1': {
                    'key2': '__NOT_TRANSLATED__'
                }
            }
        }
    }, 'The key should use default keySeparator . to split');
    t.end();
});
