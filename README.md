# i18next-scanner [![build status](https://travis-ci.org/cheton/i18next-scanner.svg?branch=master)](https://travis-ci.org/cheton/i18next-scanner)

[![NPM](https://nodei.co/npm/i18next-scanner.png?downloads=true&stars=true)](https://nodei.co/npm/i18next-scanner/)

i18next-scanner is a transfrom stream that can scan your code, extract translation keys/values, and merge them into i18n resource files.

It's available as both Gulp and Grunt plugins.

## Features
* Fully compatible with [i18next](https://github.com/i18next/i18next) - a full-featured i18n javascript library for translating your webapplication.
* Support [i18next-text](https://github.com/cheton/i18next-text) to write your code without the need to maintain i18n keys.
* A transform stream that works with both Gulp and Grunt task runner.
* Support custom transform and flush functions.

## Installation
```
npm install i18next-scanner
```

## Gulp Usage
```javascript
var gulp = require('gulp');

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
~TBD~

## Advanced Usage

### Customize transform and flush functions
The main entry function of [i18next-scanner](https://github.com/cheton/i18next-scanner/) is a transform stream using [through2](https://github.com/rvagg/through2). You can pass in your `transform` and `flush` functions like so:
```javascript
gulp.src(['src/**/*.{js,html}'], {base: 'src'})
    .pipe(i18next(options, customTransform, customFlush)
    .pipe(gulp.dest('assets'));
```

### Usage with i18next-text

#### Example of parsing strings
You might want to find all occurrences of the `i18n._()` function in your code.
For example:
```javascript
i18n._('This is text value');
i18n._("text"); // result matched
i18n._('text'); // result matched
i18n._("text", { count: 1 }); // result matched
i18n._("text" + str); // skip run-time variables
```

The content can be parsed with a regular expression, like below:
```javascript
i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]
```

The code might look like this:
```javascript
var _ = require('lodash');
var hash = require('i18next-text').hash['sha1'];
var customTransform = function(file, enc, done) {
    var parser = this.parser;
    var extname = path.extname(file.path);
    var content = fs.readFileSync(file.path, enc);

    (function() {
        var results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
        _.each(results, function(result) {
            var key, value;
            var r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);

            if (r) {
                value = _.trim(r[1], '\'"');
                key = hash(value); // returns a hash value as its default key
                parser.parseValue(value, key);
            }
        });
    }());

    done();
};
```

#### Handlebars i18n helper
**i18n function helper**
```hbs
{{i18n 'bar'}}
{{i18n 'bar' defaultKey='foo'}}
{{i18n 'baz' defaultKey='locale:foo'}}
{{i18n defaultKey='noval'}}
```
Using the regular expression for the above:
```hbs
{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}
```

**i18n block helper**
```hbs
{{#i18n}}Some text{{/i18n}}
{{#i18n this}}Description: {{description}}{{/i18n}}
{{#i18n this last-name=lastname}}{{firstname}} ${last-name}{{/i18n}}
```
Using the regular expression for the above:
```javascript
{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}
```

**Sample code**

The sample code might look like this:
```javascript
var _ = require('lodash');
var hash = require('i18next-text').hash['sha1'];
var customTransform = function(file, enc, done) {
    var parser = this.parser;
    var extname = path.extname(file.path);
    var content = fs.readFileSync(file.path, enc);

    // i18n function helper
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
                key = hash(value); // returns a hash value as its default key
                parser.parseValue(value, key);
                return;
            }
                
            parser.parseKey(key, value);
        });
    }());

    // i18n block helper
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

            key = hash(value); // returns a hash value as its default key
            parser.parseValue(value, key);
        });
    }());

    done();
};
```

## API
```
function(options[, customTransform[, customFlush]])
```

### options
```javascript
{
    lngs: ['en'],
    sort: false,
    defaultValue: '',
    resGetPath: 'i18n/__lng__/__ns__.json',
    resSetPath: 'i18n/__lng__/__ns__.json',
    nsseparator: ':',
    keyseparator: '.',
    interpolationPrefix: '__',
    interpolationSuffix: '__',
    ns: {
        namespaces: [],
        defaultNs: 'translation'
    }
}
```

#### lngs

Type: `Array` Default: `['en']`

Provides a list of supported languages by setting the lngs option.

#### sort

Type: `Boolean`  Default: `false`

Set to `true` if you want to sort translation keys in ascending order.

#### defaultValue

Type: `String` Default: `''`

Provides a default value if a value is not specified.

#### resGetPath

Type: `String` Default: `'i18n/__lng__/__ns__.json'`

The source path of resource files. The `resGetPath` is relative to current working directory.

#### resSetPath

Type: `String` Default: `'i18n/__lng__/__ns__.json'`

The target path of resource files. The `resSetPath` is relative to current working directory or your `gulp.dest()` path.

#### nsseparator

Type: `String` Default: `':'`

The namespace separator.

#### keyseparator

Type: `String` Default: `'.'`

The key separator.

#### interpolationPrefix

Type: `String` Default: `'__'`

The prefix for variables.

#### interpolationSuffix

Type: `String` Default: `'__'`

The suffix for variables.

#### ns

Type: `Object` or `String`

If an `Object` is supplied, you can either specify a list of namespaces, or override the default namespace.
For example:
```javascript
{
    ns: {
        namespaces: [ // Default: []
            'resource',
            'locale'
        ],
        defaultNs: 'resource' // Default: 'translation'
    }
}
```
If a `String` is supplied instead, it will become the default namespace.
For example:
```javascript
{
    ns: 'resource' // Default: 'translation'
}
```

### customTransform
The optional `customTransform` function is provided as the 2nd argument. It must have the following signature: `function (file, encoding, done) {}`. A minimal implementation should call the `done()` function to indicate that the transformation is done, even if that transformation means discarding the file.
For example:
```javascript
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var extname = path.extname(file.path);
    var content = fs.readFileSync(file.path, enc);

    // add custom code

    done();
};
```

To parse a translation key, call `this.parser.parseKey(key, defaultValue)`. The `defaultValue` is optional if the key is not assigned with a default value.
For example:
```javascript
var _ = require('lodash');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    var results = [];

    // parse the content and loop over the results

    _.each(results, function(result) {
        parser.parseKey(result.key, result.defaultValue || '');
    });
};
```

Alternatively, you may call `this.parser.parseValue(value, defaultKey)` to parse a text string with a default key. The `defaultKey` should be unique string and can never be `null`, `undefined`, or empty.
For example:
```javascript
var _ = require('lodash');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    var results = [];

    // parse the content and loop over the results

    _.each(results, function(result) {
        var defaultKey = sha1(result.value); // returns a SHA-1 hash value as its default key
        parser.parseValue(result.value, result.defaultKey || defaultKey);
    });
};
```

### customFlush
The optional `customFlush` function is provided as the last argument, it is called just prior to the stream ending. You can implement your `customFlush` function to override the default `flush` function. When everything's done, call the `done()` function to indicate the stream is finished.
For example:
```javascript
var _ = require('lodash');
var customFlush = function _flush(done) {
    var that = this;
    var resStore = parser.toObject({
        sort: !!parser.options.sort
     });

    // loop over the resStore
    _.each(resStore, function(namespaces, lng) {
        _.each(namespaces, function(obj, ns) {
            // add custom code
        });
    });
    
    done();
};
```

## License

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](https://github.com/cheton/i18next-scanner/blob/master/LICENSE).
