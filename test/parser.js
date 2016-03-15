import fs from 'fs';
import path from 'path';
import { test } from 'tap';
import { Parser } from '../src';

const defaults = {};

test('gettext style i18n', (t) => {
    const parser = new Parser({
        keySeparator: false,
        nsSeparator: false
    });

    // Parse Translation Function
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/modules/index.js'), 'utf8');

    parser.parseFuncFromString(content, { list: ['i18n._'] });

    const resStore = parser.getResourceStore();
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

    const resStore = parser.getResourceStore();

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

    const resStore = parser.getResourceStore();

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

    const resStore = parser.getResourceStore();

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

    const resStore = parser.getResourceStore();

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
