# i18next-scanner [![build status](https://travis-ci.org/i18next/i18next-scanner.svg?branch=master)](https://travis-ci.org/i18next/i18next-scanner) [![Coverage Status](https://coveralls.io/repos/i18next/i18next-scanner/badge.svg?branch=master&service=github)](https://coveralls.io/github/i18next/i18next-scanner?branch=master)

[![NPM](https://nodei.co/npm/i18next-scanner.png?downloads=true&stars=true)](https://nodei.co/npm/i18next-scanner/)

i18next-scanner is a transform stream that can scan your code, extract translation keys/values, and merge them into i18n resource files.

It's available as both Gulp and Grunt plugins.

## Features
* Fully compatible with [i18next](https://github.com/i18next/i18next) - a full-featured i18n javascript library for translating your webapplication.
* Support [Key Based Fallback](http://i18next.com/translate/keyBasedFallback/) to write your code without the need to maintain i18n keys. This feature is available since [i18next@^2.1.0](https://github.com/i18next/i18next/blob/master/CHANGELOG.md#210)
* A transform stream that works with both Gulp and Grunt task runner.
* Support custom transform and flush functions.

## Installation
```
npm install --save-dev i18next-scanner
```

## Usage

### Standard API
```js
var fs = require('fs');
var Parser = require('i18next-scanner').Parser;

var customHandler = function(key) {
    var defaultValue = '__TRANSLATION__'; // optional default value
    parser.set(key, defaultValue);
};

var parser = new Parser();
var content = '';

// Parse Translation Function
// i18next.t('key');
content = fs.readFileSync('/path/to/app.js', 'utf-8');
parser
    .parseFuncFromString(content, customHandler) // pass a custom handler
    .parseFuncFromString(content, { list: ['i18next.t']}) // override `func.list`
    .parseFuncFromString(content, { list: ['i18next.t']}, customHandler)
    .parseFuncFromString(content); // using default options and handler

// Parse HTML Attribute
// <div data-i18n="key"></div>
content = fs.readFileSync('/path/to/index.html', 'utf-8');
parser
    .parseAttrFromString(content, customHandler) // pass a custom handler
    .parseAttrFromString(content, { list: ['data-i18n'] }) // override `attr.list`
    .parseAttrFromString(content, { list: ['data-i18n'] }, customHandler)
    .parseAttrFromString(content); // using default options and handler

console.log(parser.get());
console.log(parser.get({ sort: true }));
console.log(parser.get('translation:key', { lng: 'en'}));
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

Alternatively, you can get a transform stream by calling createStream() as show below:
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

## API Options

There are two ways to use i18next-scanner:

#### Standard API
```js
var Parser = require('i18next-scanner').Parser;
var parser = new Parser(options);
````

#### Transform Stream API
```js
var scanner = require('i18next-scanner');
scanner.createStream(options, customTransform /* optional */, customFlush /* optional */);
```

Below are the configuration options with their default values:

### Default Options
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

If an `Object` is supplied, you can either specify a list of attributes and extensions, or override the default.
```js
{ // Default
    attr: {
        list: ['data-i18n'],
        extensions: ['.html', '.htm']
    }
}
```

You can set attr to `false` to disable parsing attribute as below:
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
```

You can set func to `false` to disable parsing translation function as below:
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

A namespace string or an array of namespaces.

#### defaultNs

Type: `String` Default: `'translation'`

The default namespace used if not passed to translation function.

#### defaultValue

Type: `String` Default: `''`

The default value used if not passed to `parser.set`.

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

Set to `false` to disable key separator if you prefer having keys as the fallback for translation (e.g. gettext). This feature is supported by [i18next@2.1.0](https://github.com/i18next/i18next/blob/master/CHANGELOG.md#210). Also see <strong>Key based fallback</strong> at http://i18next.com/translate/keyBasedFallback.

#### nsSeparator

Type: `String` or `false` Default: `':'`

Namespace separator used in translation keys.

Set to `false` to disable namespace separator if you prefer having keys as the fallback for translation (e.g. gettext). This feature is supported by [i18next@2.1.0](https://github.com/i18next/i18next/blob/master/CHANGELOG.md#210). Also see <strong>Key based fallback</strong> at http://i18next.com/translate/keyBasedFallback.

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
```js
var scanner = require('i18next-scanner');
var vfs = require('vinyl-fs');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);

    // add your code
    done();
};

vfs.src(['/path/to/src'])
    .pipe(scanner(options, customTransform))
    .pipe(vfs.dest('path/to/dest'));
```

To parse a translation key, call `parser.set(key, defaultValue)` to assign the key with an optional `defaultValue`.
For example:
```js
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    
    parser.parseFuncFromString(content, { list: ['i18n.t'] }, function(key) {
        var defaultValue = '__L10N__';
        parser.set(key, defaultValue);
    });
    
    done();
};
```

Alternatively, you may call `parser.set(defaultKey, value)` to assign the value with a default key. The `defaultKey` should be unique string and can never be `null`, `undefined`, or empty.
For example:
```js
var hash = require('sha1');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    
    parser.parseFuncFromString(content, { list: ['i18n._'] }, function(key) {
        var value = key;
        var defaultKey = hash(value);
        parser.set(defaultKey, value);
    });
    
    done();
};
```

### customFlush
The optional `customFlush` function is provided as the last argument, it is called just prior to the stream ending. You can implement your `customFlush` function to override the default `flush` function. When everything's done, call the `done()` function to indicate the stream is finished.
For example:
```js
var scanner = require('i18next-scanner');
var vfs = require('vinyl-fs');
var customFlush = function _flush(done) {
    var parser = this.parser;
    var resStore = parser.getResourceStore();

    // loop over the resStore
    Object.keys(resStore).forEach(function(lng) {
        var namespaces = resStore[lng];
        Object.keys(namespaces).forEach(function(ns) {
            var obj = namespaces[ns];
            // add your code
        });
    });
    
    done();
};

vfs.src(['/path/to/src'])
    .pipe(scanner(options, customTransform, customFlush))
    .pipe(vfs.dest('/path/to/dest'));
```

## Integration

### React Integration
An example of resource file:
```json
{           
    "app": {
        "name": "My App"
    },
    "key": "__myVar__ are important"
}
```

Use `i18next.t()` in your React JSX code:
```js
import i18next from 'i18next';
import React from 'react';

class App extends React.Component {
    render() {
        return (
            <div>
                <h1>{i18next.t('app.name')}</h1> // "My App"
                <p>{i18next.t('key', { myVar:'variables' })}</p> // "variables are important"
            </div>
        );
    }
}
```

### Gettext Style Integration

First, you have to upgrade i18next to v2.1.0 at least to support the <strong>Key Based Fallback</strong> feature.

Here is an example of finding all occurrences of the `_t()` function in your code:
```javascript
_t('This is text value');
_t("text");
_t('text');
_t("text", { count: 1 });
_t("text" + str); // skip run-time variables
```

The content can be parsed using the parser API:
```javascript
parser.parseCode(content, options = {}, customHandler = null)
```

The code might look like this:
```js
var Parser = require('i18next-scanner').Parser;

///
// You have to use i18next@^2.1.0, and set both nsSeparator and keySeparator to false
///
var parser = new Parser({
    nsSeparator: false,
    keySeparator: false
});

var content = fs.readFileSync('/path/to/app.js', 'utf-8');
parser.parseFuncFromString(content, { list: ['_t'] });

console.log(parser.getResourceStore());
```

Usage with Gulp:
```js
var gulp = require('gulp');
var scanner = require('i18next-scanner');

var customTransform = function(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);

    parser.parseFuncFromString(content, { list: ['_t'] });

    done();
};

gulp.src(src)
    .pipe(scanner(options, customTransform))
    .pipe(dest);
```

### Handlebars Integration

Here is an example of what our template file might look like:

**function helper**
```hbs
{{i18n 'bar'}}
{{i18n 'bar' defaultKey='foo'}}
{{i18n 'baz' defaultKey='namespace:foo'}}
{{i18n defaultKey='noval'}}
{{i18n 'Basic Example'}}
{{i18n '__first-name__ __last-name__' first-name=firstname last-name=lastname}}
{{i18n 'English' defaultKey='locale:language.en-US'}}
{{i18n defaultKey='loading'}}
```

**block helper**
```hbs
{{#i18n}}Some text{{/i18n}}
{{#i18n this}}Description: {{description}}{{/i18n}}
{{#i18n this last-name=lastname}}{{firstname}} __last-name__{{/i18n}}
```

You can compile the template string into a Handlebars template function, and then render the template by passing a data object (a.k.a. context) into that function:
```js
var source = fs.readFileSync('/path/to/your/handlebars-template.hbs'), 'utf-8');
var template = handlebars.compile(source);
var context = {
    'firstname':'Foo',
    'lastname':'Bar',
    'description': 'Foo Bar Test'
};
console.log(template(context));
```

#### Handlebars Helper

Use the `Handlebars.registerHelper` method to register the `i18n` helper:

```js
var handlebars = require('handlebars');
var i18next = require('i18next');

var handlebarsHelper = function(context, options) {
    var defaultValue;

    if ((typeof context === 'object') && (typeof options === 'undefined')) {
        // {{i18n defaultKey='loading'}}
        options = context;
        context = undefined;
    }

    if ((typeof options === 'object') && (typeof options.fn === 'function')) {
        // {{#i18n}}<span>Some text</span>{{/i18n}}
        // {{#i18n this}}<p>Description: {{description}}</p>{{/i18n}}
        defaultValue = options.fn(context);
    } else if (typeof context === 'string') {
        // {{i18n 'Basic Example'}}
        // {{i18n '__first-name__ __last-name__' first-name=firstname last-name=lastname}}
        // {{i18n 'English' defaultKey='locale:language.en-US'}}
        defaultValue = context;
    }

    options = options || {};
    options.hash = options.hash || {};

    var opts = i18n.functions.extend({ defaultValue: defaultValue }, options.hash);
    var defaultKey = options.hash.defaultKey;
    var result;

    if (typeof defaultKey === 'undefined') {
        result = i18next.t(defaultValue, opts);
    } else {
        result = i18next.t(defaultKey, opts);
    }

    return result;
};

handlebars.registerHelper('i18n', handlebarsHelper);
```

By default, Handlebars will escape the returned result by default.
If you want to generate HTML, you have to return a `new Handlebars.SafeString(result)` like  so:
```js
var handlebars = require('handlebars');

handlebars.registerHelper('i18n', function() {
    var result = handlebarsHelper.apply(this, arguments);
    return new handlebars.SafeString(result);
});
```
In such a circumstance, you will want to manually escape parameters.

#### Example

The sample code might look like this:
```javascript
var _ = require('lodash');
var hash = require('sha1');

// Parses hash arguments for Handlebars block helper
// @see [Hash Arguments]{@http://code.demunskin.com/other/Handlebars/block_helpers.html#hash-arguments}
// @see [Regular expression for parsing name value pairs]{@link http://stackoverflow.com/questions/168171/regular-expression-for-parsing-name-value-pairs}
// @example <caption>Example usage:</caption>
// it will output ["id=nav-bar", "class = "top"", "foo = "bar\"baz""]
// var str = ' id=nav-bar class = "top" foo = "bar\\"baz" ';
// str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
// @param [string] str A string representation of hash arguments
// @return {object}
var parseHashArguments = function(str) {
    var hash = {};

    var results = str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
    results.forEach((result) => {
        result = _.trim(result);
        var r = result.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/) || [];
        if (r.length < 3 || _.isUndefined(r[1]) || _.isUndefined(r[2])) {
            return;
        }

        var key = _.trim(r[1]);
        var value = _.trim(r[2]);

        { // value is enclosed with either single quote (') or double quote (") characters
            var quoteChars = '\'"';
            var quoteChar = _.find(quoteChars, (quoteChar) => {
                return value.charAt(0) === quoteChar;
            });
            if (quoteChar) { // single quote (') or double quote (")
                value = unquote(value, quoteChar);
            }
        }

        hash[key] = value;
    });

    return hash;
};

var customTransform = function(file, enc, done) {
    var parser = this.parser;
    var extname = path.extname(file.path);
    var content = fs.readFileSync(file.path, enc);

    // function helper
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

            var params = parseHashArguments(r[2]);
            if (_.has(params, 'defaultKey')) {
                key = params['defaultKey'];
            }
                
            if (_.isUndefined(key) && _.isUndefined(value)) {
                return;
            }

            if (_.isUndefined(key)) {
                key = hash(value); // returns a hash value as its default key
            }

            parser.set(key, value);
        });
    }());

    // block helper
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
            parser.set(key, value);
        });
    }());

    done();
};
```

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](https://github.com/i18next/i18next-scanner/blob/master/LICENSE).
