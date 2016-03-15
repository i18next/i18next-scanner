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
    var defaultValue; // optional default value
    parser.parseKey(key, defaultValue);
};

var parser = new Parser();
var content = '';

// Parse Translation Function
// i18next.t('key');
content = fs.readFileSync('/path/to/app.js', 'utf-8');
parser
    .parseFuncFromString(content);
    .parseFuncFromString(content, { list: ['i18next.t']}); // override default list
    .parseFuncFromString(content, { list: ['i18next.t']}, customHandler); // override default list and pass a custom handler
    .parseFuncFromString(content, customHandler); // pass a custom handler

// Parse HTML Attribute
// <div data-i18n="key"></div>
content = fs.readFileSync('/path/to/index.html', 'utf-8');
parser
    .parseAttrFromString(content);
    .parseAttrFromString(content, { list: ['data-i18n'] }); // override default list
    .parseAttrFromString(content, { list: ['data-i18n'] }, customHandler); // override default list and pass a custom handler
    .parseAttrFromString(content, customHandler); // pass a custom handler

console.log(parser.get());
console.log(parser.get({ sort: true }));
console.log(parser.get('namespace:your.translation.key', { lng: 'en'}));
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

To parse a translation key, call `parser.parseKey(key, defaultValue)` to assign the key with an optional `defaultValue`.
For example:
```js
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    
    parser.parseFuncFromString(content, { list: ['i18n.t'] }, function(key) {
        var defaultValue = '__L10N__';
        parser.parseKey(key, defaultValue);
    });
    
    done();
};
```

Alternatively, you may call `parser.parseKey(defaultKey, value)` to assign the value with a default key. The `defaultKey` should be unique string and can never be `null`, `undefined`, or empty.
For example:
```js
var hash = require('sha1');
var customTransform = function _transform(file, enc, done) {
    var parser = this.parser;
    var content = fs.readFileSync(file.path, enc);
    
    parser.parseFuncFromString(content, { list: ['i18n._'] }, function(key) {
        var value = key;
        var defaultKey = hash(value);
        parser.parseKey(defaultKey, value);
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

## Integration Guide
Checkout [Integration Guide](https://github.com/i18next/i18next-scanner/wiki/Integration-Guide) to learn how to integrate with React, Gettext Style i18n, and Handlebars.

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](https://github.com/i18next/i18next-scanner/blob/master/LICENSE).
