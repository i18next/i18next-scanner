# i18next-scanner [![build status](https://travis-ci.org/cheton/i18next-scanner.svg?branch=master)](https://travis-ci.org/cheton/i18next-scanner)

[![NPM](https://nodei.co/npm/i18next-scanner.png?downloads=true&stars=true)](https://nodei.co/npm/i18next-scanner/)

i18next-scanner is available as both gulp and grunt plugins that can scan your code, extracts translation keys/values, and merges them into i18n resource files.

## Features

## Installation

`npm install i18next-scanner`

## Gulp Usage

```javascript
gulp.task('i18next-scanner', function() {
    var i18next = require('i18next-scanner');

    return gulp.src(['src/**/*.{js,html}'], {base: 'src'})
        .pipe(i18next({
            lngs: ['en', 'de'],
            defaultValue: '__STRING_NOT_TRANSLATED__',
            resGetPath: 'assets/i18n/__lng__/__ns__.json',
            resSetPath: 'i18n/__lng__/__ns__.json',
            ns: 'translation'
        })
        .pipe(gulp.dest('assets'));
});
```

## Grunt Usage

## Usage with i18next-text

### Parses the i18n._() method

```javascript
gulp.task('i18next-scanner', function() {
    var i18next = require('i18next-scanner');
    var hash = require('i18next-text').hash['sha1'];
    var options = {
        lngs: ['en', 'de'],
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resGetPath: 'assets/i18n/__lng__/__ns__.json',
        resSetPath: 'i18n/__lng__/__ns__.json',
        ns: 'translation'
    };

    var customTransform = function(file, enc, done) {
        var parser = this.parser;
        var extname = path.extname(file.path);
        var content = fs.readFileSync(file.path, enc);

        /*
         * Supports i18next-text's _() method for i18next:
         *
         * i18n._('This is text value');
         * i18n._("text"); // result matched
         * i18n._('text'); // result matched
         * i18n._("text", { count: 1 }); // result matched
         * i18n._("text" + str); // skip run-time variables
         */
        (function() {
            var results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
            _.each(results, function(result) {
                var key, value;
                var r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);

                if (r) {
                    value = _.trim(r[1], '\'"');
                    key = hash(value); // returns a SHA-1 hash value as default key
                    parser.parseValue(value, key);
                }
            });
        }());

        done();
    };

    return gulp.src(['src/**/*.js'], {base: 'src'})
        .pipe(i18next(options, customTransform))
        .pipe(gulp.dest('assets'));
});
```

### Handlebars i18n helper with block expressions

```javascript
gulp.task('i18next-scanner', function() {
    var i18next = require('i18next-scanner');
    var hash = require('i18next-text').hash['sha1'];
    var options = {
        lngs: ['en', 'de'],
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resGetPath: 'assets/i18n/__lng__/__ns__.json',
        resSetPath: 'i18n/__lng__/__ns__.json',
        ns: 'translation'
    };

    var customTransform = function(file, enc, done) {
        var parser = this.parser;
        var extname = path.extname(file.path);
        var content = fs.readFileSync(file.path, enc);

        /*
         * Supports Handlebars i18n helper
         *
         * {{i18n 'bar'}}
         * {{i18n 'bar' defaultKey='foo'}}
         * {{i18n 'baz' defaultKey='locale:foo'}}
         * {{i18n defaultKey='noval'}}
         */
        (function() {
            var results = content.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/gm) || [];
            _.each(results, function(result) {
                var key, value;
                var r = result.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/m) || [];

                if ( ! _.isUndefined(r[1])) {
                    value = _.trim(r[1], '\'"');
                }

                var params = parser.parseHashArguments(r[2]);
                if (_.has(params, 'defaultKey')) {
                    key = params['defaultKey'];
                }
                
                if (_.isUndefined(key) && _.isUndefined(value)) {
                    return;
                }

                if (_.isUndefined(key)) {
                    key = hash(value); // returns a SHA-1 hash value as default key
                    parser.parseValue(value, key);
                    return;
                }
                
                parser.parseKey(key, value);
            });
        }());

        /*
         * Supports Handlebars i18n helper with block expressions
         *
         * {{#i18n}}Some text{{/i18n}}
         * {{#i18n this}}Description: {{description}}{{/i18n}}
         * {{#i18n this last-name=lastname}}{{firstname}} ${last-name}{{/i18n}}
         */
        (function() {
            var results = content.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/gm) || [];
            _.each(results, function(result) {
                var key, value;
                var r = result.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/m) || [];

                if ( ! _.isUndefined(r[2])) {
                    value = _.trim(r[2], '\'"');
                }

                if (_.isUndefined(value)) {
                    return;
                }

                key = hash(value); // returns a SHA-1 hash value as default key
                parser.parseValue(value, key);
            });
        }());

        done();
    };

    return gulp.src(['src/**/*.hbs'], {base: 'src'})
        .pipe(i18next(options, customTransform))
        .pipe(gulp.dest('assets'));
});
```

## Options

## License

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](https://github.com/cheton/i18next-scanner/blob/master/LICENSE).
