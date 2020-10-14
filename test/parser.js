import fs from 'fs';
import path from 'path';
import sha1 from 'sha1';
import { test } from 'tap';
import { Parser } from '../src';

test('set merges defaults', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    parser.set('key1', { defaultValue: 'Default text' });
    parser.set('key1');
    t.same(parser.get('key1'), 'Default text');

    parser.set('key2');
    parser.set('key2', { defaultValue: 'Default text' });
    t.same(parser.get('key2'), 'Default text');
    t.end();
});

test('set merges defaults (plural case)', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    parser.set('key1', { defaultValue: 'Default text', defaultValue_plural: 'Default plural text', count: 2 });
    parser.set('key1');
    parser.set('key1_plural');
    t.same(parser.get('key1'), 'Default text');
    t.same(parser.get('key1_plural'), 'Default plural text');

    parser.set('key2');
    parser.set('key2_plural');
    parser.set('key2', { defaultValue: 'Default text', defaultValue_plural: 'Default plural text', count: 2 });
    t.same(parser.get('key2'), 'Default text');
    t.same(parser.get('key2_plural'), 'Default plural text');
    t.end();
});

test('set merges defaults (plural case without default plural value)', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    parser.set('key2', { count: 2 });
    t.same(parser.get('key2_plural'), '');
    parser.set('key2', { defaultValue: 'Default text', count: 2 });
    t.same(parser.get('key2_plural'), 'Default text');
    t.end();
});

test('set warns about conflicting defaults', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    let logText;
    parser.log = (msg) => {
        logText = msg;
    };
    parser.set('key', { defaultValue: 'Default text' });
    parser.set('key', { defaultValue: 'Another text' });
    t.same(parser.get('key'), 'Default text');
    t.match(logText, /different default value/);
    t.end();
});

test('set warns about conflicting defaults (plural case)', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    let logText;
    parser.log = (msg) => {
        logText = msg;
    };
    parser.set('key', { defaultValue: 'Default text', defaultValue_plural: 'Default plural text', count: 2 });
    parser.set('key', { defaultValue: 'Default text', defaultValue_plural: 'Another plural text', count: 2 });
    t.same(parser.get('key'), 'Default text');
    t.same(parser.get('key_plural'), 'Default plural text');
    t.match(logText, /different default value/);
    t.end();
});

test('Skip undefined namespace', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    const content = `
        i18next.t('none:key2'); // "none" does not exist in the namespaces
        i18next.t('key1');
    `;
    const wanted = {
        en: {
            translation: {
                key1: ''
            }
        }
    };

    parser.parseFuncFromString(content);
    t.same(parser.get(), wanted);
    t.end();
});

test('Parse translation function', (t) => {
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
        .parseFuncFromString(content, { list: ['i18next.t'] }) // override `func.list`
        .parseFuncFromString(content, { list: ['i18next.t'] }, customHandler)
        .parseFuncFromString(content); // using default options and handler

    t.same(parser.get(), {
        en: {
            translation: {
                'key2': '__TRANSLATION__',
                'key1': '__TRANSLATION__'
            }
        }
    });

    // Sort keys in alphabetical order
    t.same(JSON.stringify(parser.get({ sort: true })), JSON.stringify({
        en: {
            translation: {
                'key1': '__TRANSLATION__',
                'key2': '__TRANSLATION__'
            }
        }
    }));

    t.equal(parser.get('key1', { lng: 'en' }), '__TRANSLATION__');
    t.equal(parser.get('key1', { lng: 'de' }), undefined);
    t.equal(parser.get('nokey', { lng: 'en' }), undefined);

    t.end();
});

test('Parse Trans components', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        ns: [
            'dev',
            'translation'
        ],
        trans: {
            fallbackKey: true
        },
        nsSeparator: false,
        keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
        fallbackLng: 'en'
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans.jsx'), 'utf-8');
    parser.parseTransFromString(content);
    t.same(parser.get(), {
        en: {
            dev: {
                'Hello <1>World</1>, you have <3>{{count}}</3> unread message.': 'Hello <1>World</1>, you have <3>{{count}}</3> unread message.',
                'Hello <1>World</1>, you have <3>{{count}}</3> unread message._plural': 'Hello <1>World</1>, you have <3>{{count}}</3> unread message.'
            },
            translation: {
                // quote style
                'jsx-quotes-double': 'Use double quotes for the i18nKey attribute',
                'jsx-quotes-single': 'Use single quote for the i18nKey attribute',

                // plural
                'plural': 'You have <1>{{count}}</1> apples',
                'plural_plural': 'You have <1>{{count}}</1> apples',

                // context
                'context': 'A boyfriend',
                'context_male': 'A boyfriend',

                // i18nKey
                'multiline-text-string': 'multiline text string',
                'string-literal': 'This is a <1>test</1>',
                'object-expression': 'This is a <1><0>{{test}}</0></1>',
                'arithmetic-expression': '2 + 2 = <1>{{result}}</1>',
                'components': 'Go to <1>Administration > Tools</1> to download administrative tools.',
                'lorem-ipsum': '<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',
                'lorem-ipsum-nested': 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',

                // fallback key
                'Hello, World!': 'Hello, World!',
                'multiline text string': 'multiline text string',
                'This is a <1>test</1>': 'This is a <1>test</1>',
                'This is a <1><0>{{test}}</0></1>': 'This is a <1><0>{{test}}</0></1>',
                '2 + 2 = <1>{{result}}</1>': '2 + 2 = <1>{{result}}</1>',
                'Go to <1>Administration > Tools</1> to download administrative tools.': 'Go to <1>Administration > Tools</1> to download administrative tools.',
                '<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>': '<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',
                'Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>': 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',

                // defaults
                'The component might be self-closing': 'The component might be self-closing',
                'Some <0>{variable}</0>': 'Some <0>{variable}</0>',
                'Hello <1>{{planet}}</1>!': 'Hello <1>{{planet}}</1>!',

                // props
                'translation from props': 'translation from props',
                'translation from nested props': 'translation from nested props',
                'translation from deeply nested props': 'translation from deeply nested props',
                'tooltip1': 'Some tooltip text',
                'tooltip2': 'Some tooltip text'
            }
        }
    });
    t.end();
});

test('Parse Trans components with fallback key', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        ns: [
            'dev',
            'translation'
        ],
        trans: {
            fallbackKey: (ns, value) => {
                return sha1(value); // return a sha1 as the key
            }
        },
        nsSeparator: false,
        keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
        fallbackLng: 'en'
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans.jsx'), 'utf-8');
    parser.parseTransFromString(content);
    t.same(parser.get(), {
        en: {
            dev: {
                '2290678f8f33c49494499fe5e32b4ebd124d9292': 'Hello <1>World</1>, you have <3>{{count}}</3> unread message.',
                '2290678f8f33c49494499fe5e32b4ebd124d9292_plural': 'Hello <1>World</1>, you have <3>{{count}}</3> unread message.'
            },
            translation: {
                // quote style
                'jsx-quotes-double': 'Use double quotes for the i18nKey attribute',
                'jsx-quotes-single': 'Use single quote for the i18nKey attribute',

                // plural
                'plural': 'You have <1>{{count}}</1> apples',
                'plural_plural': 'You have <1>{{count}}</1> apples',

                // context
                'context': 'A boyfriend',
                'context_male': 'A boyfriend',

                // i18nKey
                'multiline-text-string': 'multiline text string',
                'string-literal': 'This is a <1>test</1>',
                'object-expression': 'This is a <1><0>{{test}}</0></1>',
                'arithmetic-expression': '2 + 2 = <1>{{result}}</1>',
                'components': 'Go to <1>Administration > Tools</1> to download administrative tools.',
                'lorem-ipsum': '<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',
                'lorem-ipsum-nested': 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',

                // fallback key
                '0a0a9f2a6772942557ab5355d76af442f8f65e01': 'Hello, World!',
                '32876cbad378f3153c900c297ed2efa06243e0e2': 'multiline text string',
                'e4ca61dff6bc759d214e32c4e37c8ae594ca163d': 'This is a <1>test</1>',
                '0ce90193dd25c93cdc12f25a36d31004a74c63de': 'This is a <1><0>{{test}}</0></1>',
                '493781e20cd3cfd5b3137963519571c3d97ab383': '2 + 2 = <1>{{result}}</1>',
                '083eac6b4f73ec317824caaaeea57fba3b83c1d9': 'Go to <1>Administration > Tools</1> to download administrative tools.',
                '938c04be9e14562b7532a19458fe92b65c6ef941': '<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',
                '9c3ca5d5d8089e96135c8c7c9f42ba34a635fb47': 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s</2>',

                // defaults
                '7551746c2d33a1d0a24658c22821c8700fa58a0d': 'Hello <1>{{planet}}</1>!',
                '253344d83465052dd6573c8c0abcd76f02fc3a97': 'Some <0>{variable}</0>',
                '7e514af8f77b74e74f86dc22a2cb173680462e34': 'The component might be self-closing',

                // props
                'c38f91deba88fc3bb582cc73dc658210324b01ec': 'translation from props',
                '5bf216b4068991e3a2f5e55ae36c03add490a63f': 'translation from nested props',
                '6fadff01c49d0ebe862a3aa33688735c03728197': 'translation from deeply nested props',
                'tooltip1': 'Some tooltip text',
                'tooltip2': 'Some tooltip text'
            }
        }
    });
    t.end();
});

test('Parse wrapped Trans components', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        ns: [
            'dev',
            'translation'
        ],
        trans: {
            component: 'I18n',
            i18nKey: '__t',
            fallbackKey: true
        },
        nsSeparator: false,
        keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
        fallbackLng: 'en',
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans.jsx'), 'utf-8');
    parser.parseTransFromString(content);
    t.same(parser.get(), {
        en: {
            dev: {},
            translation: {
                'mykey': 'A wrapper component with key',
                'A wrapper component without key': 'A wrapper component without key'
            }
        }
    });
    t.end();
});

test('Parse Trans components with modern acorn features', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        trans: {
            fallbackKey: true
        },
        nsSeparator: false,
        keySeparator: '.', // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
        fallbackLng: 'en'
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/trans-acorn.jsx'), 'utf-8');
    parser.parseTransFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                // Passing keys to <Trans> via object spread is not yet supported:
                'Spread i18nKey': 'Spread i18nKey',
                // 'spread': 'Spread i18nKey', // this would be expected.
                'simple': 'Simple i18nKey'
            }
        }
    });
    t.end();
});

test('Parse HTML attribute', (t) => {
    test('parseAttrFromString(content)', (t) => {
        const parser = new Parser({
            lngs: ['en'],
            fallbackLng: 'en'
        });

        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
        parser.parseAttrFromString(content);

        t.same(parser.get(), {
            en: {
                translation: {
                    'key1': '',
                    'key2': '',
                    'key3': '',
                    'key4': ''
                }
            }
        });

        t.end();
    });

    test('parseAttrFromString(content, { list: ["data-i18n"] })', (t) => {
        const parser = new Parser({
            lngs: ['en'],
            fallbackLng: 'en'
        });

        // <div data-i18n="key"></div>
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
        parser.parseAttrFromString(content, { list: ['data-i18n'] });

        t.same(parser.get(), {
            en: {
                translation: {
                    'key1': '',
                    'key2': '',
                    'key3': '',
                    'key4': ''
                }
            }
        });

        t.end();
    });

    test('parseAttrFromString(content, customHandler)', (t) => {
        const parser = new Parser({
            lngs: ['en'],
            fallbackLng: 'en'
        });
        const customHandler = function(key) {
            const defaultValue = '__TRANSLATION__'; // optional default value
            parser.set(key, defaultValue);
        };

        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
        parser.parseAttrFromString(content, customHandler);

        t.same(parser.get(), {
            en: {
                translation: {
                    'key4': '__TRANSLATION__',
                    'key3': '__TRANSLATION__',
                    'key2': '__TRANSLATION__',
                    'key1': '__TRANSLATION__'
                }
            }
        });

        // Sort keys in alphabetical order
        t.same(JSON.stringify(parser.get({ sort: true })), JSON.stringify({
            en: {
                translation: {
                    'key1': '__TRANSLATION__',
                    'key2': '__TRANSLATION__',
                    'key3': '__TRANSLATION__',
                    'key4': '__TRANSLATION__'
                }
            }
        }));

        t.equal(parser.get('key1', { lng: 'en' }), '__TRANSLATION__');
        t.equal(parser.get('key1', { lng: 'de' }), undefined);
        t.equal(parser.get('nokey', { lng: 'en' }), undefined);

        t.end();
    });

    test('parseAttrFromString(content, { list: ["data-i18n"] }, customHandler)', (t) => {
        const parser = new Parser({
            lngs: ['en'],
            fallbackLng: 'en'
        });
        const customHandler = function(key) {
            const defaultValue = '__TRANSLATION__'; // optional default value
            parser.set(key, defaultValue);
        };

        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.html'), 'utf-8');
        parser.parseAttrFromString(content, { list: ['data-i18n'] }, customHandler);

        t.same(parser.get(), {
            en: {
                translation: {
                    'key4': '__TRANSLATION__',
                    'key3': '__TRANSLATION__',
                    'key2': '__TRANSLATION__',
                    'key1': '__TRANSLATION__'
                }
            }
        });

        // Sort keys in alphabetical order
        t.same(JSON.stringify(parser.get({ sort: true })), JSON.stringify({
            en: {
                translation: {
                    'key1': '__TRANSLATION__',
                    'key2': '__TRANSLATION__',
                    'key3': '__TRANSLATION__',
                    'key4': '__TRANSLATION__'
                }
            }
        }));

        t.equal(parser.get('key1', { lng: 'en' }), '__TRANSLATION__');
        t.equal(parser.get('key1', { lng: 'de' }), undefined);
        t.equal(parser.get('nokey', { lng: 'en' }), undefined);

        t.end();
    });

    t.end();
});

test('Gettext style i18n', (t) => {
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
                'Loading...': 'Loading...',
                'This value does not exist.': 'This value does not exist.',
                'YouTube has more than {{count}} billion users.': 'YouTube has more than {{count}} billion users.',
                'YouTube has more than {{count}} billion users._plural': 'YouTube has more than {{count}} billion users.',
                'You have {{count}} messages.': 'You have {{count}} messages.',
                'You have {{count}} messages._plural': 'You have {{count}} messages.'
            }
        }
    });
    t.end();
});

test('Quotes', (t) => {
    const parser = new Parser({
        defaultValue: function(lng, ns, key) {
            if (lng === 'en') {
                return key;
            }
            return '__NOT_TRANSLATED__';
        },
        keySeparator: false,
        nsSeparator: false
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/quotes.js'), 'utf8');
    const wanted = {
        'en': {
            'translation': {
                'Primary \'email\' activation': 'Primary \'email\' activation',
                'Primary "email" activation': 'Primary "email" activation',
                'name=\'email\' value=\'{{email}}\'': 'name=\'email\' value=\'{{email}}\'',
                'name="email" value="{{email}}"': 'name="email" value="{{email}}"',
                'name="email" value=\'{{email}}\'': 'name="email" value=\'{{email}}\'',
                'name=\'email\' value="{{email}}"': 'name=\'email\' value="{{email}}"',
            }
        }
    };

    parser.parseFuncFromString(content);
    t.same(parser.get(), wanted);

    t.end();
});

test('Disable nsSeparator', (t) => {
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

test('Disable keySeparator', (t) => {
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

test('Default nsSeparator', (t) => {
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

test('Default keySeparator', (t) => {
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

test('Override nsSeparator with a false value', (t) => {
    const parser = new Parser({
        defaultValue: '__NOT_TRANSLATED__',
        nsSeparator: ':',
        keySeparator: '.'
    });
    parser.set('translation:key1.key2', {
        nsSeparator: false
    });

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'translation:key1': {
                    'key2': '__NOT_TRANSLATED__'
                }
            }
        }
    }, 'Override nsSeparator with a false value');
    t.end();
});

test('Override keySeparator with a false value', (t) => {
    const parser = new Parser({
        defaultValue: '__NOT_TRANSLATED__',
        nsSeparator: ':',
        keySeparator: '.'
    });
    parser.set('translation:key1.key2', {
        keySeparator: false
    });

    const resStore = parser.get();

    t.same(resStore, {
        en: {
            translation: {
                'key1.key2': '__NOT_TRANSLATED__'
            }
        }
    }, 'Override keySeparator with a false value');
    t.end();
});

test('Multiline (Line Endings: LF)', (t) => {
    const parser = new Parser({
        nsSeparator: false
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/multiline-unix.js'), 'utf-8');
    parser.parseFuncFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                'this is a multiline string': '',
                'this is another multiline string': ''
            }
        }
    });
    t.end();
});

test('Multiline (Line Endings: CRLF)', (t) => {
    const parser = new Parser({
        nsSeparator: false
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/multiline-dos.js'), 'utf-8');
    parser.parseFuncFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                'this is a multiline string': '',
                'this is another multiline string': ''
            }
        }
    });
    t.end();
});

test('Plural', (t) => {
    test('Default options', (t) => {
        const parser = new Parser();
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            en: {
                translation: {
                    'key': '',
                    'key_plural': '',
                    'keyWithCountAndDefaultValues': '{{count}} item',
                    'keyWithCountAndDefaultValues_plural': '{{count}} items',
                    'keyWithCount': '',
                    'keyWithCount_plural': '',
                    'keyWithDefaultValueAndCount': '{{count}} item',
                    'keyWithDefaultValueAndCount_plural': '{{count}} item',
                    'keyWithVariable': '',
                    'keyWithVariable_plural': '',
                    'keyWithDefaultValueAndVariable': '{{count}} item',
                    'keyWithDefaultValueAndVariable_plural': '{{count}} item'
                }
            }
        });
        t.end();
    });

    test('Languages with multiple plurals', (t) => {
        const parser = new Parser({ lngs: ['ru'] });
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            ru: {
                translation: {
                    'key_0': '',
                    'key_1': '',
                    'key_2': '',
                    'keyWithCount_0': '',
                    'keyWithCount_1': '',
                    'keyWithCount_2': '',
                    'keyWithVariable_0': '',
                    'keyWithVariable_1': '',
                    'keyWithVariable_2': '',
                    'keyWithCountAndDefaultValues_0': '{{count}} item',
                    'keyWithCountAndDefaultValues_1': '{{count}} item',
                    'keyWithCountAndDefaultValues_2': '{{count}} item',
                    'keyWithDefaultValueAndCount_0': '{{count}} item',
                    'keyWithDefaultValueAndCount_1': '{{count}} item',
                    'keyWithDefaultValueAndCount_2': '{{count}} item',
                    'keyWithDefaultValueAndVariable_0': '{{count}} item',
                    'keyWithDefaultValueAndVariable_1': '{{count}} item',
                    'keyWithDefaultValueAndVariable_2': '{{count}} item'
                }
            }
        });
        t.end();
    });

    test('Languages with multiple plurals: non existing language', (t) => {
        const parser = new Parser({ lngs: ['zz'] });
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            zz: {
                translation: {}
            }
        });
        t.end();
    });

    test('Languages with multiple plurals: languages with single rule', (t) => {
        const parser = new Parser({ lngs: ['ko'] });
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            ko: {
                translation: {
                    'key_0': '',
                    'keyWithCount_0': '',
                    'keyWithVariable_0': '',
                    'keyWithCountAndDefaultValues_0': '{{count}} item',
                    'keyWithDefaultValueAndCount_0': '{{count}} item',
                    'keyWithDefaultValueAndVariable_0': '{{count}} item',
                }
            }
        });
        t.end();
    });

    test('User defined function', (t) => {
        const parser = new Parser({
            plural: (lng, ns, key, options) => {
                if (key === 'key') {
                    return false;
                }
                if (key === 'keyWithCount') {
                    return true;
                }
                if (key === 'keyWithVariable') {
                    return true;
                }
                return true;
            }
        });
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            en: {
                translation: {
                    'key': '',
                    'keyWithCount': '',
                    'keyWithCountAndDefaultValues': '{{count}} item',
                    'keyWithCountAndDefaultValues_plural': '{{count}} items',
                    'keyWithCount_plural': '',
                    'keyWithDefaultValueAndCount': '{{count}} item',
                    'keyWithDefaultValueAndCount_plural': '{{count}} item',
                    'keyWithVariable': '',
                    'keyWithVariable_plural': '',
                    'keyWithDefaultValueAndVariable': '{{count}} item',
                    'keyWithDefaultValueAndVariable_plural': '{{count}} item'
                }
            }
        });
        t.end();
    });

    t.end();
});

test('Namespace', (t) => {
    const parser = new Parser({
        ns: ['translation', 'othernamespace']
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/namespace.js'), 'utf-8');
    parser.parseFuncFromString(content);
    t.same(parser.get(), {
        en: {
            othernamespace: {
                'friend': ''
            },
            translation: {}
        }
    });
    t.end();
});

test('Context', (t) => {
    test('Default options', (t) => {
        const parser = new Parser();
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_male': '',
                    'friend_female': '',
                    'friendDynamic': '',
                }
            }
        });
        t.end();
    });

    test('User defined function', (t) => {
        const parser = new Parser({
            context: (lng, ns, key, options) => {
                if (options.context === 'male') {
                    return true;
                }
                if (options.context === 'female') {
                    return false;
                }
                return true;
            }
        });
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_male': '',
                    'friendDynamic': '',
                }
            }
        });
        t.end();
    });

    t.end();
});

test('Context with plural combined', (t) => {
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context-plural.js'), 'utf-8');

    test('Default options', (t) => {
        const parser = new Parser({
            contextDefaultValues: ['male', 'female'],
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_plural': '',
                    'friend_male': '',
                    'friend_male_plural': '',
                    'friend_female': '',
                    'friend_female_plural': '',
                    'friendWithDefaultValue': '{{count}} boyfriend',
                    'friendWithDefaultValue_plural': '{{count}} boyfriend',
                    'friendWithDefaultValue_male': '{{count}} boyfriend',
                    'friendWithDefaultValue_male_plural': '{{count}} boyfriend',
                    'friendWithDefaultValue_female': '{{count}} girlfriend',
                    'friendWithDefaultValue_female_plural': '{{count}} girlfriend',
                    'friendDynamic': '',
                    'friendDynamic_plural': '',
                    'friendDynamic_male': '',
                    'friendDynamic_male_plural': '',
                    'friendDynamic_female': '',
                    'friendDynamic_female_plural': '',
                }
            }
        });
        t.end();
    });

    test('Default options w/ contextList', (t) => {
        const parser = new Parser({
            contextList: {'gender': {list: ['male', 'female'], fallback: true}},
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_plural': '',
                    'friend_male': '',
                    'friend_male_plural': '',
                    'friend_female': '',
                    'friend_female_plural': '',
                    'friendWithDefaultValue': '{{count}} boyfriend',
                    'friendWithDefaultValue_plural': '{{count}} boyfriend',
                    'friendWithDefaultValue_male': '{{count}} boyfriend',
                    'friendWithDefaultValue_male_plural': '{{count}} boyfriend',
                    'friendWithDefaultValue_female': '{{count}} girlfriend',
                    'friendWithDefaultValue_female_plural': '{{count}} girlfriend',
                    'friendDynamic': '',
                    'friendDynamic_plural': '',
                    'friendDynamic_male': '',
                    'friendDynamic_male_plural': '',
                    'friendDynamic_female': '',
                    'friendDynamic_female_plural': '',
                }
            }
        });
        t.end();
    });

    test('Context form only', (t) => {
        const parser = new Parser({
            context: true,
            plural: false
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_male': '',
                    'friend_female': '',
                    'friendWithDefaultValue': '{{count}} boyfriend',
                    'friendWithDefaultValue_male': '{{count}} boyfriend',
                    'friendWithDefaultValue_female': '{{count}} girlfriend',
                    'friendDynamic': '',
                }
            }
        });
        t.end();
    });

    test('No context fallback', (t) => {
        const parser = new Parser({
            context: true,
            contextFallback: false,
            contextDefaultValues: ['male', 'female'],
            plural: false
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend_male': '',
                    'friend_female': '',
                    'friendWithDefaultValue_male': '{{count}} boyfriend',
                    'friendWithDefaultValue_female': '{{count}} girlfriend',
                    'friendDynamic_male': '',
                    'friendDynamic_female': '',
                }
            }
        });
        t.end();
    });

    test('No context fallback w/ contextList', (t) => {
        const parser = new Parser({
            context: true,
            contextFallback: true,
            contextList: {'gender': {list: ['male', 'female'], fallback: false}},
            plural: false
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_male': '',
                    'friend_female': '',
                    'friendWithDefaultValue': '{{count}} boyfriend',
                    'friendWithDefaultValue_male': '{{count}} boyfriend',
                    'friendWithDefaultValue_female': '{{count}} girlfriend',
                    'friendDynamic_male': '',
                    'friendDynamic_female': '',
                }
            }
        });
        t.end();
    });

    test('Plural form only', (t) => {
        const parser = new Parser({
            context: false,
            plural: true
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend': '',
                    'friend_plural': '',
                    'friendWithDefaultValue': '{{count}} boyfriend',
                    'friendWithDefaultValue_plural': '{{count}} boyfriend',
                    'friendDynamic': '',
                    'friendDynamic_plural': '',
                }
            }
        });
        t.end();
    });

    test('No plural fallback', (t) => {
        const parser = new Parser({
            context: false,
            plural: true,
            pluralFallback: false
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    'friend_plural': '',
                    'friendWithDefaultValue_plural': '{{count}} boyfriend',
                    'friendDynamic_plural': '',
                }
            }
        });
        t.end();
    });

    t.end();
});

test('parser.toJSON()', (t) => {
    const parser = new Parser();
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');

    parser.parseFuncFromString(content);

    t.same(parser.toJSON(), '{"en":{"translation":{"key2":"","key1":""}}}');
    t.end();
});

test('parser.toJSON({ sort: true })', (t) => {
    const parser = new Parser();
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');

    parser.parseFuncFromString(content);

    t.same(parser.toJSON({ sort: true }), '{"en":{"translation":{"key1":"","key2":""}}}');
    t.end();
});

test('parser.toJSON({ sort: true, space: 2 })', (t) => {
    const parser = new Parser();
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.js'), 'utf-8');
    const wanted = JSON.stringify({
        en: {
            translation: {
                key1: '',
                key2: ''
            }
        }
    }, null, 2);

    parser.parseFuncFromString(content);
    t.same(parser.toJSON({ sort: true, space: 2 }), wanted);
    t.end();
});

test('Extract properties from template literals', (t) => {
    const parser = new Parser({
        defaultValue: function(lng, ns, key) {
            if (lng === 'en') {
                return key;
            }
            return '__NOT_TRANSLATED__';
        },
        keySeparator: false,
        nsSeparator: false
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/template-literals.js'), 'utf8');
    const wanted = {
        'en': {
            'translation': {
                'property in template literals': 'property in template literals',
                'added {{foo}}\n and {{bar}}': 'added {{foo}}\n and {{bar}}'
            }
        }
    };

    parser.parseFuncFromString(content);
    t.same(parser.get(), wanted);

    t.end();
});

test('Custom keySeparator and nsSeparator', (t) => {
    const parser = new Parser({
        ns: ['translation', 'myNamespace'],
        defaultValue: function(lng, ns, key) {
            if (lng === 'en') {
                return key;
            }
            return '__NOT_TRANSLATED__';
        },
        keySeparator: false,
        nsSeparator: false
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/custom-separators.js'), 'utf8');
    const wanted = {
        'en': {
            'translation': {
                'myNamespace|firstKey>secondKey>without custom separators': 'myNamespace|firstKey>secondKey>without custom separators',
                'myNamespace:firstKey.secondKey.without custom separators 2': 'myNamespace:firstKey.secondKey.without custom separators 2'
            },
            'myNamespace': {
                'firstKey': {
                    'secondKey': {
                        'with custom separators': 'with custom separators',
                        'with custom separators 2': 'with custom separators 2',
                    }
                }
            }
        }
    };

    parser.parseFuncFromString(content);
    t.same(parser.get(), wanted);

    t.end();
});

test('Should accept trailing comma in functions', (t) => {
    const content = `
        i18next.t(
            'friend',
        )
    `;
    class ParserMock extends Parser {
        log(msg) {
            if (msg.startsWith('i18next-scanner: Unable to parse code')) {
                Parser.prototype.log = originalLog; // eslint-disable-line no-undef
                throw new Error('Should not run into catch');
            }
        }
    }
    const parser = new ParserMock({ debug: true });
    parser.parseFuncFromString(content, {});
    t.same(parser.get(), {
        en: {
            translation: {
                'friend': ''
            }
        }
    });
    t.end();
});

test('Default values test', (t) => {
    const parser = new Parser();
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/default-values.js'), 'utf8');
    const wanted = {
        'en': {
            'translation': {
                'product': {
                    'bread': 'Bread',
                    'milk': 'Milk',
                    'boiledEgg': 'Boiled Egg',
                    'cheese': 'Cheese',
                    'potato': '{{color}} potato',
                    'carrot': '{{size}} carrot',
                }
            }
        }
    };

    parser.parseFuncFromString(content);
    t.same(parser.get(), wanted);

    t.end();
});
