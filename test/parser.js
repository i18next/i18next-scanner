import tap from 'tap';
import util from 'util';
import { Parser } from '../lib';

const defaults = {
    lngs: ['en'],
};

const t = tap;

t.plan(4);

t.test('disabled nsseparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: false,
        keySeparator: '.'
    }));
    parser.parseKey('foo:bar', '');
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'foo:bar': ''
            }
        }
    }, 'The ns should not use default nsseparator : to split');
    t.end();
});

t.test('disabled keyseparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: false
    }));
    parser.parseKey('Creating...', '');
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'Creating...': 'Creating...'
            }
        }
    }, 'The key should not use default keyseparator . to split');
    t.end();
});

t.test('default nsseparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: '.'
    }));
    parser.parseKey('translation:key1.key2', '');
    console.log(util.inspect(parser.getResourceStore()));
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The ns should use default nsseparator : to split');
    t.end();
});

t.test('default keyseparator', (t) => {
    const parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: '.'
    }));
    parser.parseKey('key1.key2', '');
    console.log(util.inspect(parser.getResourceStore()));
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The key should use default keyseparator . to split');
    t.end();
});
