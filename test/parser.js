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
    t.match(logText, /different default/);
    t.end();
});

test('Skip undefined namespace', (t) => {
    const parser = new Parser({
        ns: ['translation']
    });
    const content = `
        i18next.t('none:key2');
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

test('Parse Trans component #1', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        trans: {
            fallbackKey: true
        },
        nsSeparator: false,
        keySeparator: false,
        fallbackLng: 'en'
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.jsx'), 'utf-8');
    parser.parseTransFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                "key1": "Key 1 default",
                "key2": "Key 2 default value",
                "key3": "This is a <1>test</1>",
                "key4": "You have <1>{{count}}</1> apples",
                "key5": "You have <1>one <1>very</1> bad</1> apple",
                "key6": "This is a <1><0>{{test}}</0></1>",
                "key7 default": "key7 default",
                "key8 default <1>{{count}}</1>": "key8 default <1>{{count}}</1>",
                "We can use Trans without i18nKey=\"...\" as well!": "We can use Trans without i18nKey=\"...\" as well!"
            }
        }
    });
    t.end();
});

test('Parse Trans component #2', (t) => {
    const parser = new Parser({
        lngs: ['en'],
        trans: {
            fallbackKey: (ns, value) => {
                return sha1(value); // return a sha1 as the key
            }
        },
        nsSeparator: false,
        keySeparator: false,
        fallbackLng: 'en'
    });

    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/app.jsx'), 'utf-8');
    parser.parseTransFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                "key1": "Key 1 default",
                "key2": "Key 2 default value",
                "key3": "This is a <1>test</1>",
                "key4": "You have <1>{{count}}</1> apples",
                "key5": "You have <1>one <1>very</1> bad</1> apple",
                "key6": "This is a <1><0>{{test}}</0></1>",
                "4f516979d203813c6bf4ea56043719e11095744f": "key7 default",
                "8f5c444dd42fe9a3e42a8ab3a677e04a4a708105": "key8 default <1>{{count}}</1>",
                "09e944775f89d688fd87cf7abc95a737dd4c54f6": "We can use Trans without i18nKey=\"...\" as well!"
            }
        }
    });
    t.end();
});

test('Parse HTML attribute', (t) => {
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
                "key4": "__TRANSLATION__",
                "key3": "__TRANSLATION__",
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
                "key2": "__TRANSLATION__",
                "key3": "__TRANSLATION__",
                "key4": "__TRANSLATION__"
          }
        }
    }));

    t.equal(parser.get('key1', { lng: 'en' }), '__TRANSLATION__');
    t.equal(parser.get('key1', { lng: 'de' }), undefined);
    t.equal(parser.get('nokey', { lng: 'en' }), undefined);

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
                "Loading...": "Loading...",
                "This value does not exist.": "This value does not exist.",
                "YouTube has more than {{count}} billion users.": "YouTube has more than {{count}} billion users.",
                "YouTube has more than {{count}} billion users._plural": "YouTube has more than {{count}} billion users.",
                "You have {{count}} messages.": "You have {{count}} messages.",
                "You have {{count}} messages._plural": "You have {{count}} messages."
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
        "en": {
            "translation": {
                "Primary 'email' activation": "Primary 'email' activation",
                "Primary \"email\" activation": "Primary \"email\" activation",
                "name='email' value='{{email}}'": "name='email' value='{{email}}'",
                "name=\"email\" value=\"{{email}}\"": "name=\"email\" value=\"{{email}}\"",
                "name=\"email\" value='{{email}}'": "name=\"email\" value='{{email}}'",
                "name='email' value=\"{{email}}\"": "name='email' value=\"{{email}}\"",
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
        nsSeparator: false,
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/multiline-unix.js'), 'utf-8');
    parser.parseFuncFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                "this is a multiline string": "",
                "this is another multiline string": ""
            }
        }
    });
    t.end();
});

test('Multiline (Line Endings: CRLF)', (t) => {
    const parser = new Parser({
        nsSeparator: false,
    });
    const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/multiline-dos.js'), 'utf-8');
    parser.parseFuncFromString(content);
    t.same(parser.get(), {
        en: {
            translation: {
                "this is a multiline string": "",
                "this is another multiline string": ""
            }
        }
    });
    t.end();
});

test('Plural', (t) => {
    test('Default options', (t) => {
        const parser = new Parser()
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/plural.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            en: {
                translation: {
                    "key": "",
                    "key_plural": "",
                    "keyWithCount": "",
                    "keyWithCount_plural": "",
                    "keyWithVariable": "",
                    "keyWithVariable_plural": ""
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
                    "key": "",
                    "keyWithCount": "",
                    "keyWithCount_plural": "",
                    "keyWithVariable": "",
                    "keyWithVariable_plural": ""
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
                "friend": ""
            },
            translation: {}
        }
    });
    t.end();
})

test('Context', (t) => {
    test('Default options', (t) => {
        const parser = new Parser();
        const content = fs.readFileSync(path.resolve(__dirname, 'fixtures/context.js'), 'utf-8');
        parser.parseFuncFromString(content, { propsFilter: props => props });
        t.same(parser.get(), {
            en: {
                translation: {
                    "friend": "",
                    "friend_male": "",
                    "friend_female": ""
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
                    "friend": "",
                    "friend_male": ""
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
        const parser = new Parser();
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    "friend": "",
                    "friend_plural": "",
                    "friend_male": "",
                    "friend_male_plural": "",
                    "friend_female": "",
                    "friend_female_plural": ""
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
                    "friend": "",
                    "friend_male": "",
                    "friend_female": ""
                }
            }
        });
        t.end();
    });

    test('No context fallback', (t) => {
        const parser = new Parser({
            context: true,
            contextFallback: false,
            plural: false
        });
        parser.parseFuncFromString(content);
        t.same(parser.get(), {
            en: {
                translation: {
                    "friend_male": "",
                    "friend_female": ""
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
                    "friend": "",
                    "friend_plural": ""
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
                    "friend_plural": ""
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
        "en": {
            "translation": {
                "property in template literals": "property in template literals",
                "added {{foo}}\n and {{bar}}": "added {{foo}}\n and {{bar}}"
            }
        }
    };

    parser.parseFuncFromString(content);
    t.same(parser.get(), wanted);

    t.end();
});
