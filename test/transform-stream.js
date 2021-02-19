import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import gulp from 'gulp';
import tap from 'gulp-tap';
import VirtualFile from 'vinyl';
import { test } from 'tap';
import scanner from '../src';

const defaults = {
    debug: false,
    func: {
        list: ['_t', 't']
    },
    trans: {
        fallbackKey: true
    },
    lngs: ['en','de'],
    ns: [
        'locale',
        'resource'
    ],
    defaultNs: 'resource',
    defaultValue: '__STRING_NOT_TRANSLATED__',
    resource: {
        loadPath: '',
        savePath: 'i18n/{{lng}}/{{ns}}.json'
    },
    nsSeparator: false, // namespace separator
    keySeparator: false, // key separator
    interpolation: {
        prefix: '{{',
        suffix: '}}'
    }
};

test('Parse both .html and .js files', (t) => {
    const options = _.merge({}, defaults, {});
    const list = [
        'test/fixtures/app.html',
        'test/fixtures/modules/**/*.js'
    ];

    gulp.src(list)
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            const list = [
                'i18n/de/resource.json',
                'i18n/en/resource.json',
            ];

            if (_.includes(list, file.path)) {
                const found = JSON.parse(contents);
                const wanted = {
                    "Loading...": "__STRING_NOT_TRANSLATED__",
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    'key4': '__STRING_NOT_TRANSLATED__',
                    'key3': '__STRING_NOT_TRANSLATED__',
                    'key2': '__STRING_NOT_TRANSLATED__',
                    'key1': '__STRING_NOT_TRANSLATED__'
                };
                t.same(found, wanted);
            }
        }));
});

test('[Key Based Fallback] defaultValue as string', function(t) {
    const options = _.merge({}, defaults, {
        func: {
            extensions: ['.js'] // with extensions
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            const list = [
                'i18n/de/resource.json',
                'i18n/en/resource.json',
            ];

            if (_.includes(list, file.path)) {
                const found = JSON.parse(contents);
                const wanted = {
                  "Loading...": "__STRING_NOT_TRANSLATED__",
                  "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                  "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                  "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                  "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                  "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }
        }));
});

test('[Key Based Fallback] defaultValue as function', function(t) {
    const options = _.merge({}, defaults, {
        defaultValue: function(lng, ns, key) {
            if (lng === 'en') {
                return key;
            }
            return '__STRING_NOT_TRANSLATED__';
        },
        func: {
            extensions: ['.js'] // with extensions
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();

            if (file.path === 'i18n/en/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                  "Loading...": "Loading...",
                  "This value does not exist.": "This value does not exist.",
                  "YouTube has more than {{count}} billion users.": "YouTube has more than {{count}} billion users.",
                  "YouTube has more than {{count}} billion users._plural": "YouTube has more than {{count}} billion users.",
                  "You have {{count}} messages.": "You have {{count}} messages.",
                  "You have {{count}} messages._plural": "You have {{count}} messages."
                };
                t.same(found, wanted);
            }

            if (file.path === 'i18n/de/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                  "Loading...": "__STRING_NOT_TRANSLATED__",
                  "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                  "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                  "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                  "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                  "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }
        }));
});

test('[Trans Component] fallbackKey', function(t) {
    const options = _.merge({}, defaults, {
        ns: [
            'dev',
            'locale',
            'resource'
        ],
        trans: {
            extensions: ['.js', '.jsx'], // with extensions
            fallbackKey: function(ns, value) {
                return value;
            }
        },
        nsSeparator: false,
        keySeparator: '.' // Specify the keySeparator for this test to make sure the fallbackKey won't be separated
    });

    gulp.src('test/fixtures/**/trans.jsx')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();

            if (file.path === 'i18n/en/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    // quote style
                    "jsx-quotes-double": "Use double quotes for the i18nKey attribute",
                    "jsx-quotes-single": "Use single quote for the i18nKey attribute",

                    // plural
                    "plural": "You have {{count}} apples",
                    "plural_plural": "You have {{count}} apples",

                    // context
                    "context": "A boyfriend",
                    "context_male": "A boyfriend",

                    // i18nKey
                    "multiline-text-string": "multiline text string",
                    "string-literal": "This is a <1>test</1>",
                    "object-expression": "This is a <1>{{test}}</1>",
                    "arithmetic-expression": "2 + 2 = {{result}}",
                    "components": "Go to <1>Administration > Tools</1> to download administrative tools.",
                    "lorem-ipsum": "<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</2>",
                    "lorem-ipsum-nested": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</2>",

                    // fallback key
                    "Hello, World!": "Hello, World!",
                    "multiline text string": "multiline text string",
                    "This is a <1>test</1>": "This is a <1>test</1>",
                    "This is a <1>{{test}}</1>": "This is a <1>{{test}}</1>",
                    "2 + 2 = {{result}}": "2 + 2 = {{result}}",
                    "Go to <1>Administration > Tools</1> to download administrative tools.": "Go to <1>Administration > Tools</1> to download administrative tools.",
                    "<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</2>": "<0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</0>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<2>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</2>",
                    "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</2>": "Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.<1>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</1></1><2>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</2>",

                    // defaults
                    "The component might be self-closing": "The component might be self-closing",
                    "Some <0>{variable}</0>": "Some <0>{variable}</0>",
                    "Hello <1>{{planet}}</1>!": "Hello <1>{{planet}}</1>!",

                    // props
                    "translation from props": "translation from props",
                    "translation from nested props": "translation from nested props",
                    "translation from deeply nested props": "translation from deeply nested props",
                    "tooltip1": "Some tooltip text",
                    "tooltip2": "Some tooltip text"
                };
                t.same(found, wanted);
            }
        }));
});

test('Empty result', function(t) {
    const options = _.merge({}, defaults, {
        func: {
            extensions: [] // without extensions
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            const list = [
                'i18n/de/resource.json',
                'i18n/en/resource.json',
            ];

            if (_.includes(list, file.path)) {
                const found = JSON.parse(contents);
                const wanted = {};
                t.same(found, wanted);
            }
        }));
});

test('Custom transform', function(t) {
    const options = _.merge({}, defaults, {
    });

    const expectedKey = 'CUSTOM TRANSFORM';
    const customTransform = function(file, enc, done) {
        this.parser.set(expectedKey);
        done();
    };

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options, customTransform))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            const list = [
                'i18n/de/resource.json',
                'i18n/en/resource.json',
            ];

            if (_.includes(list, file.path)) {
                const found = JSON.parse(contents);
                const wanted = {
                  "Loading...": "__STRING_NOT_TRANSLATED__",
                  "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                  "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                  "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                  "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                  "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__",
                  "CUSTOM TRANSFORM": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }
        }));
});

test('Custom flush', function(t) {
    const options = _.merge({}, defaults, {
    });

    const expectedContents = 'CUSTOM FLUSH';
    const customFlush = function(done) {
        this.push(new VirtualFile({
            path: 'virtual-path',
            contents: new Buffer(expectedContents)
        }));

        done();
    };

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options, null, customFlush))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();
            t.same(contents, expectedContents);
        }));
});

test('Keep old translations', function(t) {
    const options = _.merge({}, defaults, {
        resource: {
            loadPath: 'test/fixtures/i18n/{{lng}}/{{ns}}.json',
            savePath: 'i18n/{{lng}}/{{ns}}.json'
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();

            // English - locale.json
            if (file.path === 'i18n/en/locale.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "language": {
                        "en-US": "English"
                    }
                };
                t.same(found, wanted);
            }

            // English - resource.json
            if (file.path === 'i18n/en/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "loading": "Loading...",
                    "cd643ef3": "Loading...",
                    "8524de963f07201e5c086830d370797f": "Loading...",
                    "b04ba49f848624bb97ab094a2631d2ad74913498": "Loading...",
                    "Loading...": "Loading...", // Note. This is an existing translation key in English resource file.
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }

            // German - locale.json
            if (file.path === 'i18n/de/locale.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "language": {
                        "de-DE": "German"
                    }
                };
                t.same(found, wanted);
            }

            // German - resource.json
            if (file.path === 'i18n/de/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "loading": "Wird geladen...",
                    "cd643ef3": "Wird geladen...",
                    "8524de963f07201e5c086830d370797f": "Wird geladen...",
                    "b04ba49f848624bb97ab094a2631d2ad74913498": "Wird geladen...",
                    "Loading...": "__STRING_NOT_TRANSLATED__",
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }
        }));
});

// https://github.com/i18next/i18next-scanner/issues/30
test('Remove old translation keys which are already removed from code', function(t) {
    const options = _.merge({}, defaults, {
        removeUnusedKeys: true,
        resource: {
            loadPath: 'test/fixtures/i18n/{{lng}}/{{ns}}.json',
            savePath: 'i18n/{{lng}}/{{ns}}.json'
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();

            // English - locale.json
            if (file.path === 'i18n/en/locale.json') {
                const found = JSON.parse(contents);
                const wanted = {};
                t.same(found, wanted);
            }

            // English - resource.json
            if (file.path === 'i18n/en/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "Loading...": "Loading...", // Note. This is an existing translation key in English resource file.
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }

            // German - locale.json
            if (file.path === 'i18n/de/locale.json') {
                const found = JSON.parse(contents);
                const wanted = {};
                t.same(found, wanted);
            }

            // German - resource.json
            if (file.path === 'i18n/de/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "Loading...": "__STRING_NOT_TRANSLATED__",
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }
        }));
});

test('Escape sequences', function(t) {
    const options = _.merge({}, defaults, {
    });

    gulp.src('test/fixtures/escape-sequences.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();

            // English - resource.json
            if (file.path === 'i18n/en/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "Single character escape sequences: \b\f\n\r\t\v\0\'\"\\": "__STRING_NOT_TRANSLATED__",
                    "Hexadecimal escape sequences: \xa9\xA9": "__STRING_NOT_TRANSLATED__",
                    "Unicode escape sequences: \u00a9\u00A9\u2665": "__STRING_NOT_TRANSLATED__",
                    "Backslashes in single quote: ' \\ '": "__STRING_NOT_TRANSLATED__"
                };

                t.same(found, wanted);
            }
        }));
});

test('Line Endings', function(t) {
    test('Defaults to line feed (LF)', function(t) {
        const eol = '\n';
        const lineEnding = null;
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Auto', function(t) {
        const isWindows = typeof process != 'undefined' && 'win32' === process.platform;
        const eol = isWindows ? '\r\n' : '\n';
        const lineEnding = 'auto';
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Carriage Return (CR)', function(t) {
        const eol = '\r';
        const lineEnding = 'CR'; // or 'cr'
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Carriage Return (\\r)', function(t) {
        const eol = '\r';
        const lineEnding = '\r';
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Line Feed (LF)', function(t) {
        const eol = '\n';
        const lineEnding = 'LF'; // or 'lf'
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Line Feed (\\n)', function(t) {
        const eol = '\n';
        const lineEnding = '\n';
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Line Feed + Carriage Return (CRLF)', function(t) {
        const eol = '\r\n';
        const lineEnding = 'CRLF'; // or 'crlf'
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('Line Feed + Rarriage Return (\\r\\n)', function(t) {
        const eol = '\r\n';
        const lineEnding = '\r\n';
        const options = {
            ...defaults,
            resource: {
                ...defaults.resource,
                lineEnding
            }
        };

        gulp.src('test/fixtures/modules/**/*.js')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();
                t.ok(contents.endsWith(eol));
            }));
    });

    test('[Trans Component] defaultValue is respected', function(t) {
        const options = _.merge({}, defaults, {
            trans: {
                extensions: ['.js', '.jsx'], // with extensions
                fallbackKey: true
            },
            defaultValue: (lng, ns, key, options) => "Test default value",
            nsSeparator: false,
            keySeparator: false
        });

        gulp.src('test/fixtures/**/trans-defaultValue.jsx')
            .pipe(scanner(options))
            .on('end', function() {
                t.end();
            })
            .pipe(tap(function(file) {
                const contents = file.contents.toString();

                if (file.path === 'i18n/en/resource.json') {
                    const found = JSON.parse(contents);
                    const wanted = {
                        "Trans component should respect the defaultValue option": "Test default value",
                    };
                    t.same(found, wanted);
                }
            }));
    });

    t.end();
});

test('resource.loadPath and resource.savePath configuration as functions', function(t) {
    const options = _.merge({}, defaults, {
        removeUnusedKeys: true,
        resource: {
            loadPath: function(lng, ns) {
                return 'test/fixtures/i18n/'+lng+'/'+ns+'.json';
            },
            savePath: function(lng, ns) {
                return 'i18n/'+lng+'/'+ns+'.json';
            }
        }
    });

    gulp.src('test/fixtures/modules/**/*.js')
        .pipe(scanner(options))
        .on('end', function() {
            t.end();
        })
        .pipe(tap(function(file) {
            const contents = file.contents.toString();

            // English - locale.json
            if (file.path === 'i18n/en/locale.json') {
                const found = JSON.parse(contents);
                const wanted = {};
                t.same(found, wanted);
            }

            // English - resource.json
            if (file.path === 'i18n/en/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "Loading...": "Loading...", // Note. This is an existing translation key in English resource file.
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }

            // German - locale.json
            if (file.path === 'i18n/de/locale.json') {
                const found = JSON.parse(contents);
                const wanted = {};
                t.same(found, wanted);
            }

            // German - resource.json
            if (file.path === 'i18n/de/resource.json') {
                const found = JSON.parse(contents);
                const wanted = {
                    "Loading...": "__STRING_NOT_TRANSLATED__",
                    "This value does not exist.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users.": "__STRING_NOT_TRANSLATED__",
                    "YouTube has more than {{count}} billion users._plural": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages.": "__STRING_NOT_TRANSLATED__",
                    "You have {{count}} messages._plural": "__STRING_NOT_TRANSLATED__"
                };
                t.same(found, wanted);
            }
        }));
});

