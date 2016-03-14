# i18next-scanner [![build status](https://travis-ci.org/i18next/i18next-scanner.svg?branch=master)](https://travis-ci.org/i18next/i18next-scanner) [![Coverage Status](https://coveralls.io/repos/i18next/i18next-scanner/badge.svg?branch=master&service=github)](https://coveralls.io/github/i18next/i18next-scanner?branch=master)

[![NPM](https://nodei.co/npm/i18next-scanner.png?downloads=true&stars=true)](https://nodei.co/npm/i18next-scanner/)

i18next-scanner is a transform stream that can scan your code, extract translation keys/values, and merge them into i18n resource files.

It's available as both Gulp and Grunt plugins.

## Features
* Support React JSX. See the [Usage with React JSX](https://github.com/i18next/i18next-scanner/#usage-with-react-jsx) section for details. 
* Fully compatible with [i18next](https://github.com/i18next/i18next) - a full-featured i18n javascript library for translating your webapplication.
* Support [i18next-text](https://github.com/cheton/i18next-text) to write your code without the need to maintain i18n keys.
* A transform stream that works with both Gulp and Grunt task runner.
* Support custom transform and flush functions.

## Examples
Check out some examples:
* [API options](https://github.com/cheton/webappengine/blob/master/gulp/config.js#L190)
* A gulp task that uses a [custom transform](#customtransform) to scan strings for [i18next-text](https://github.com/cheton/i18next-text) and Handlebars template: https://github.com/cheton/webappengine/blob/master/gulp/tasks/i18next.js#L104

## Installation
```
npm install --save-dev i18next-scanner
```

## Usage

### Standard API
```js
var Parser = require('i18next-scanner').Parser;

var customHandler = function(key) {
    var defaultValue = ''; // optional default value
    parser.parseKey(key, defaultValue);
};
var parser = new Parser();
var content = '';

// translation function: i18next.t('key');
content = fs.readFileSync('/path/to/app.js', 'utf-8');
parse.parseFunctions(content);
parse.parseFunctions(content, { list: ['i18next.t']}); // override default list
parse.parseFunctions(content, { list: ['i18next.t']}, customHandler); // override default list and pass a custom handler
parse.parseFunctions(content, customHandler); // pass a custom handler

// data attribute: <div data-i18n="key"></div>
content = fs.readFileSync('/path/to/index.html', 'utf-8');
parse.parseAttributes(content);
parse.parseAttributes(content, { list: ['data-i18n'] }); // override default list
parse.parseAttributes(content, { list: ['data-i18n'] }, customHandler); // override default list and pass a custom handler
parse.parseAttributes(content, customHandler); // pass a custom handler

console.log(parser.getResourceStore());
```

### Transform Stream API
The main entry function of [i18next-scanner](https://github.com/i18next/i18next-scanner) is a transform stream. You can use [vinyl-fs](https://github.com/wearefractal/vinyl) to create a readable stream, pipe the stream through [i18next-scanner](https://github.com/i18next/i18next-scanner) to transform your code into an i18n resource object, and write to a destination folder.

Here is a simple example showing how that works:
```js
var scanner = require('i18next-scanner');
var vfs = require('vinyl-fs');
var options = {
    // See options at https://github.com/i18next/i18next-scanner#options
};
vfs.src(['/path/to/src'])
    .pipe(scanner(options))
    .pipe(vfs.dest('/path/to/dest'));
```

Alternatively, you can get a stream by calling createStream() as show below:
```js
vfs.src(['/path/to/src'])
    .pipe(scanner.createStream(options))
    .pipe(vfs.dest('/path/to/dest'));
```

### Gulp
Now you are ready to set up a minimal configuration, and get started with Gulp. For example:
```js
var gulp = require('gulp');
var scanner = require('i18next-scanner');

gulp.task('i18next', function() {
    return gulp.src(['src/**/*.{js,html}'])
        .pipe(scanner({
            lngs: ['en', 'de'], // supported languages
            resource: {
                // the source path is relative to current working directory
                loadPath: 'assets/i18n/__lng__/__ns__.json',
                
                // the destination path is relative to your `gulp.dest()` path
                savePath: 'i18n/__lng__/__ns__.json'
            }
        }))
        .pipe(gulp.dest('assets'));
});
```

### Grunt
Once you've finished the installation, add this line to your project's Gruntfile:
```js
grunt.loadNpmTasks('i18next-scanner');
```

In your project's Gruntfile, add a section named `i18next` to the data object passed into `grunt.initConfig()`, like so:
```js
grunt.initConfig({
    i18next: {
        dev: {
            src: 'src/**/*.{js,html}',
            dest: 'assets',
            options: {
                lngs: ['en', 'de'],
                resource: {
                    loadPath: 'assets/i18n/__lng__/__ns__.json',
                    savePath: 'i18n/__lng__/__ns__.json'
                }
            }
        }
    }
});
```

## Advanced Usage

### Customize transform and flush functions
As mentioned in the [Usage](#usage) section, the main entry function returns a [through2](https://github.com/rvagg/through2) object stream, you can pass in your `transform` and `flush` functions:
```js
scanner(options[, customTransform[, customFlush]])
```

### Usage with React JSX
An example of resource file:
```json
{           
    "app": {
        "name": "My App"
    },
    "key": "__myVar__ are important"
}
```

Use `i18n.t()` in your React JSX code:
```js
import i18n from 'i18next';
import React from 'react';

class App extends React.Component {
    render() {
        return (
            <div>
                <h1>{i18n.t('app.name')}</h1> // "My App"
                <p>{i18n.t('key', { myVar:'variables' })}</p> // "variables are important"
            </div>
        );
    }
}
```

### Gettext Style i18n

You might want to find all occurrences of the `_t()` function in your code.
For example:
```javascript
_t('This is text value');
_t("text");
_t('text');
_t("text", { count: 1 });
_t("text" + str); // skip run-time variables
```

The content can be parsed using the parser API:
```javascript
parseCode(content, options = {}, customHandler = null)
```

The code might look like this:
```javascript
var Parser = require('i18next-scanner').Parser;
var hash = require('sha1');

var parser = new Parser();
var content = fs.readFileSync('/path/to/app.js', 'utf-8');

parse.parseCode(content, { list: ['_t'] }, function(key) {
    var value = key;
    var defaultKey = hash(value); // returns a hash value as its default key
    parser.parseKey(defaultKey, value);
});

console.log(parser.getResourceStore());
```

Usage with Gulp:
```js
var gulp = require('gulp');
var hash = require('sha1');
var scanner = require('i18next-scanner');

var customTransform = function(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);

    parse.parseCode(content, { list: ['_t'] }, function(key) {
        var value = key;
        var defaultKey = hash(value); // returns a hash value as its default key
        parser.parseKey(defaultKey, value);
    });

    done();
};

gulp.src(src)
    .pipe(scanner(options, customTransform))
    .pipe(dest);
```

### Handlebars i18n helper
**i18n function helper**
```hbs
{{i18n 'bar'}}
{{i18n 'bar' defaultKey='foo'}}
{{i18n 'baz' defaultKey='locale:foo'}}
{{i18n defaultKey='noval'}}
```
Using the regular expression for the above:
```javascript
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
var hash = require('sha1');

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

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');                              
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
            parser.parseKey(key, value);
        });
    }());

    done();
};
```

## API Options

There are two ways to use i18next-scanner:

1. Standard API
```js
var Parser = require('i18next-scanner').Parser;
var parser = new Parser(options);
````

2. Transform Stream API
```js
var scanner = require('i18next-scanner');
scanner.createStream(options[, customTransform[, customFlush]])
```

Below are the configuration options with their default values:

### Default options
```javascript
{
    debug: false,
    sort: false,
    attr: {
        list: ['data-i18n'],
        extensions: ['.html', '.htm']
    },
    func: {
        list: ['i18next.t', 'i18n.t'],
        extensions: ['.js', '.jsx']
    },
    lngs: ['en'],
    ns: ['translation'],
    defaultNs: 'translation',
    defaultValue: '',
    resource: {
        loadPath: 'i18n/__lng__/__ns__.json',
        savePath: 'i18n/__lng__/__ns__.json',
    },
    nsSeparator: ':',
    keySeparator: '.',
    interpolation: {
        pefix: '__',
        suffix: '__'
    }
}
```

#### debug

Type: `Boolean` Default: `false`

Set to `true` to trun on debug output.

#### sort

Type: `Boolean` Default: `false`

Set to `true` if you want to sort translation keys in ascending order.

#### attr

Type: `Object` or `false`

If an `Object` is supplied, you can either specify a list of data attributes and extensions, or override the default.
```js
{ // Default
    attr: {
        list: ['data-i18n'],
        extensions: ['.html', '.htm']
    }
}

Setting false will not parse attribute.
```js
{
    attr: false
}
```

#### func

Type: `Object` or `false`

If an `Object` is supplied, you can either specify a list of translation functions and extensions, or override the default.
```js
{ // Default
    func: {
        list: ['i18next.t', 'i18n.t'],
        extensions: ['.js', '.jsx']
    }
}

Setting false will not parse translation functions.
```js
{
    func: false
}
```

#### lngs

Type: `Array` Default: `['en']`

An array of supported languages.

#### ns

Type: `String` or `Array` Default: `['translation']`

string or array of namespaces

#### defaultNs

Type: `String` Default: `'translation'`

The default namespace used if not passed to translation function.

#### defaultValue

Type: `String` Default: `''`

The default value used if not passed to `parser.parseKey`.

#### resource

Type: `Object`

Resource options:
```js
{ // Default
    resource: {
        // path where resources get loaded from
        loadPath: 'i18n/__lng__/__ns__.json',

        // path to store resources
        savePath: 'i18n/__lng__/__ns__.json',

        // jsonIndent to use when storing json files
        jsonIndent: 2
    }
}
```

#### keySeparator

Type: `String` or `false` Default: `'.'`

Key separator used in translation keys.

&gt;= [i18next@2.1.0](https://github.com/i18next/i18next/blob/master/CHANGELOG.md#210)
Set to false to disable key separator if you prefer having keys as the fallback for translation (e.g. gettext).
See <strong>Key based fallback</strong> at http://i18next.com/translate/keyBasedFallback/.

#### nsSeparator

Type: `String` or `false` Default: `':'`

Namespace separator used in translation keys.

&gt;= [i18next@2.1.0](https://github.com/i18next/i18next/blob/master/CHANGELOG.md#210)
Set to false to disable namespace separator if you prefer having keys as the fallback for translation (e.g. gettext)
See <strong>Key based fallback</strong> at http://i18next.com/translate/keyBasedFallback/.

#### interpolation

Type: `Object`

interpolation options
```js
{ // Default
    interpolation: {
        // The prefix for variables
        prefix: '__',

        // The suffix for variables
        suffix: '__'
    }
}
```

### customTransform
The optional `customTransform` function is provided as the 2nd argument. It must have the following signature: `function (file, encoding, done) {}`. A minimal implementation should call the `done()` function to indicate that the transformation is done, even if that transformation means discarding the file.
For example:
```javascript
var i18next = require('i18next-scanner');
var vfs = require('vinyl-fs');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var extname = path.extname(file.path);
    var content = fs.readFileSync(file.path, enc);

    // add your code
    done();
};

vfs.src(['path/to/src'])
    .pipe(i18next(options, customTransform))
    .pipe(vfs.dest('path/to/dest'));
```

To parse a translation key, call `parser.parse(key, defaultValue)` to assign the key with an optional `defaultValue`.
For example:
```javascript
var _ = require('lodash');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    var results = [];

    // parse the content and loop over the results
    _.each(results, function(result) {
        var key = result.key;
        var value = result.defaultValue || '';
        parser.parse(key, value);
    });
};
```

Alternatively, you may call `parser.parse(defaultKey, value)` to assign the value with a default key. The `defaultKey` should be unique string and can never be `null`, `undefined`, or empty.
For example:
```javascript
var _ = require('lodash');
var hash = require('i18next-text').hash['sha1'];
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    var results = [];

    // parse the content and loop over the results
    _.each(results, function(result) {
        var key = result.defaultKey || hash(result.value);
        var value = result.value;
        parser.parse(key, value);
    });
};
```

### customFlush
The optional `customFlush` function is provided as the last argument, it is called just prior to the stream ending. You can implement your `customFlush` function to override the default `flush` function. When everything's done, call the `done()` function to indicate the stream is finished.
For example:
```javascript
var _ = require('lodash');
var i18next = require('i18next-scanner');
var vfs = require('vinyl-fs');
var customFlush = function _flush(done) {
    var that = this;
    var resStore = parser.toObject({
        sort: !!parser.options.sort
     });

    // loop over the resStore
    _.each(resStore, function(namespaces, lng) {
        _.each(namespaces, function(obj, ns) {
            // add your code
        });
    });
    
    done();
};

vfs.src(['path/to/src'])
    .pipe(i18next(options, customTransform, customFlush))
    .pipe(vfs.dest('path/to/dest'));
```

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](https://github.com/i18next/i18next-scanner/blob/master/LICENSE).
