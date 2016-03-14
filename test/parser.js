import { test } from 'tap';
import util from 'util';
import { Parser } from '../src';

const defaults = {};

test('disable nsSeparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: false,
        keySeparator: '.'
    }));
    parser.parseKey('foo:bar', '');

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
    parser.parseKey('Creating...', '');

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
    parser.parseKey('translation:key1.key2', '');

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
    parser.parseKey('key1.key2', '');

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
