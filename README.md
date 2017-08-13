# i18next-scanner [![build status](https://travis-ci.org/i18next/i18next-scanner.svg?branch=master)](https://travis-ci.org/i18next/i18next-scanner) [![Coverage Status](https://coveralls.io/repos/i18next/i18next-scanner/badge.svg?branch=master&service=github)](https://coveralls.io/github/i18next/i18next-scanner?branch=master)

[![NPM](https://nodei.co/npm/i18next-scanner.png?downloads=true&stars=true)](https://www.npmjs.com/package/i18next-scanner)

Scan your code, extract translation keys/values, and merge them into i18n resource files.

## Notice
There is a major breaking change since v1.0, and the API interface and options are not compatible with v0.x.

Checkout [Migration Guide](https://github.com/i18next/i18next-scanner/wiki/Migration-Guide) while upgrading from earlier versions.

## Features
* Fully compatible with [i18next](https://github.com/i18next/i18next) - a full-featured i18n javascript library for translating your webapplication.
* Support [Key Based Fallback](http://i18next.com/translate/keyBasedFallback/) to write your code without the need to maintain i18n keys. This feature is available since [i18next@^2.1.0](https://github.com/i18next/i18next/blob/master/CHANGELOG.md#210)
* A standalone parser API
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
    parser.set(key, '__TRANSLATION__');
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
var sort = require('gulp-sort');
var options = {
    // See options at https://github.com/i18next/i18next-scanner#options
};
vfs.src(['/path/to/src'])
    .pipe(sort()) // Sort files in stream by path
    .pipe(scanner(options))
    .pipe(vfs.dest('/path/to/dest'));
```

Alternatively, you can get a transform stream by calling createStream() as show below:
```js
vfs.src(['/path/to/src'])
    .pipe(sort()) // Sort files in stream by path
    .pipe(scanner.createStream(options))
    .pipe(vfs.dest('/path/to/dest'));
```

### Gulp
Now you are ready to set up a minimal configuration, and get started with Gulp. For example:
```js
var gulp = require('gulp');
var sort = require('gulp-sort');
var scanner = require('i18next-scanner');

gulp.task('i18next', function() {
    return gulp.src(['src/**/*.{js,html}'])
        .pipe(sort()) // Sort files in stream by path
        .pipe(scanner({
            lngs: ['en', 'de'], // supported languages
            resource: {
                // the source path is relative to current working directory
                loadPath: 'assets/i18n/{{lng}}/{{ns}}.json',
                
                // the destination path is relative to your `gulp.dest()` path
                savePath: 'i18n/{{lng}}/{{ns}}.json'
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
                    loadPath: 'assets/i18n/{{lng}}/{{ns}}.json',
                    savePath: 'i18n/{{lng}}/{{ns}}.json'
                }
            }
        }
    }
});
```

## API

There are two ways to use i18next-scanner:

### Standard API
```js
var Parser = require('i18next-scanner').Parser;
var parser = new Parser(options);

var code = "i18next.t('key'); ...";
parser.parseFuncFromString(content); 

var html = '<div data-i18n="key"></div>';
parser.parseAttrFromString(html);

parser.get();
````

#### parser.parseFuncFromString
Parse translation key from JS function
```js
parser.parseFuncFromString(content)

parser.parseFuncFromString(content, { list: ['_t'] });

parser.parseFuncFromString(content, function(key, options) {
    options.defaultValue = key; // use key as the value
    parser.set(key, options);
});

parser.parseFuncFromString(content, { list: ['_t'] }, function(key, options) {
    parser.set(key, options); // use defaultValue
});
```

#### parser.parseAttrFromString
Parse translation key from HTML attribute
```js
parser.parseAttrFromString(content)

parser.parseAttrFromString(content, { list: ['data-i18n'] });

parser.parseAttrFromString(content, function(key) {
    var defaultValue = key; // use key as the value
    parser.set(key, defaultValue);
});

parser.parseAttrFromString(content, { list: ['data-i18n'] }, function(key) {
    parser.set(key); // use defaultValue
});
```

#### parser.get
Get the value of a translation key or the whole i18n resource store
```js
// Returns the whole i18n resource store
parser.get();

// Returns the resource store with the top-level keys sorted by alphabetical order 
parser.get({ sort: true });

// Returns a value in fallback language (@see options.fallbackLng) with namespace and key
parser.get('ns:key');

// Returns a value with namespace, key, and lng
parser.get('ns:key', { lng: 'en' });
```
#### parser.set
Set a translation key with an optional defaultValue to i18n resource store

```js
// Set a translation key
parser.set(key);

// Set a translation key with default value
parser.set(key, defaultValue);

// Set a translation key with default value using options
parser.set(key, {
    defaultValue: defaultValue
});
```

### Transform Stream API
```js
var scanner = require('i18next-scanner');
scanner.createStream(options, customTransform /* optional */, customFlush /* optional */);
```

#### customTransform
The optional `customTransform` function is provided as the 2nd argument for the transform stream API. It must have the following signature: `function (file, encoding, done) {}`. A minimal implementation should call the `done()` function to indicate that the transformation is done, even if that transformation means discarding the file.
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

#### customFlush
The optional `customFlush` function is provided as the last argument for the transform stream API, it is called just prior to the stream ending. You can implement your `customFlush` function to override the default `flush` function. When everything's done, call the `done()` function to indicate the stream is finished.
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


## Default Options

Below are the configuration options with their default values:

```javascript
{
    debug: false,
    removeUnusedKeys: false,
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
        loadPath: 'i18n/{{lng}}/{{ns}}.json',
        savePath: 'i18n/{{lng}}/{{ns}}.json',
    },
    nsSeparator: ':',
    keySeparator: '.',
    pluralSeparator: '_',
    contextSeparator: '_',
    interpolation: {
        pefix: '{{',
        suffix: '}}'
    }
}
```

#### debug

Type: `Boolean` Default: `false`

Set to `true` to trun on debug output.

#### removeUnusedKeys

Type: `Boolean` Default: `false`

Set to `true` to remove unused translation keys from i18n resource files.

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

Type: `String` or `Function` Default: `''`

The default value used if not passed to `parser.set`.

##### Examples
Provides the default value with a string:
```js
{
    defaultValue: '__NOT_TRANSLATED__'
}
```

Provides the default value as a callback function:
```js
{
    // @param {string} lng The language currently used.
    // @param {string} ns The namespace currently used.
    // @param {string} key The translation key.
    // @return {string} Returns a default value for the translation key.
    defaultValue: function(lng, ns, key) {
        if (lng === 'en') {
            // Return key as the default value for English language
            return key;
        }
        // Return the string '__NOT_TRANSLATED__' for other languages
        return '__NOT_TRANSLATED__';
    }
}
```

#### resource

Type: `Object`

Resource options:
```js
{ // Default
    resource: {
        // path where resources get loaded from
        loadPath: 'i18n/{{lng}}/{{ns}}.json',

        // path to store resources
        savePath: 'i18n/{{lng}}/{{ns}}.json',

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

#### context

Type: `Boolean` or `Function` Default: `true`

Whether to add context form key.

```js
context: function(lng, ns, key, options) {
    return true;
}
```

#### contextFallback

Type: `Boolean` Default: `true`

Whether to add a fallback key as well as the context form key.

#### contextSeparator

Type: `String` Default: `'_'`

The character to split context from key.

#### plural

Type: `Boolean` or `Function` Default: `true`

Whether to add plural form key.

```js
plural: function(lng, ns, key, options) {
    return true;
}
```

#### pluralFallback

Type: `Boolean` Default: `true`

Whether to add a fallback key as well as the plural form key.

#### pluralSeparator

Type: `String` Default: `'_'`

The character to split plural from key.

#### interpolation

Type: `Object`

interpolation options
```js
{ // Default
    interpolation: {
        // The prefix for variables
        prefix: '{{',

        // The suffix for variables
        suffix: '}}'
    }
}
```

## Integration Guide
Checkout [Integration Guide](https://github.com/i18next/i18next-scanner/wiki/Integration-Guide) to learn how to integrate with [React](https://github.com/i18next/i18next-scanner/wiki/Integration-Guide#react), [Gettext Style I18n](https://github.com/i18next/i18next-scanner/wiki/Integration-Guide#gettext-style-i18n), and [Handlebars](https://github.com/i18next/i18next-scanner/wiki/Integration-Guide#handlebars).

## License

Copyright (c) 2015-2016 Cheton Wu

Licensed under the [MIT License](https://github.com/i18next/i18next-scanner/blob/master/LICENSE).
