# i18next-scanner [![build status](https://travis-ci.org/cheton/i18next-scanner.svg?branch=master)](https://travis-ci.org/cheton/i18next-scanner) [![Coverage Status](https://coveralls.io/repos/cheton/i18next-scanner/badge.svg?branch=master&service=github)](https://coveralls.io/github/cheton/i18next-scanner?branch=master)

[![NPM](https://nodei.co/npm/i18next-scanner.png?downloads=true&stars=true)](https://nodei.co/npm/i18next-scanner/)

i18next-scanner is a transform stream that can scan your code, extract translation keys/values, and merge them into i18n resource files.

It's available as both Gulp and Grunt plugins.

## Features
* Fully compatible with [i18next](https://github.com/i18next/i18next) - a full-featured i18n javascript library for translating your webapplication.
* Support [i18next-text](https://github.com/cheton/i18next-text) to write your code without the need to maintain i18n keys.
* A transform stream that works with both Gulp and Grunt task runner.
* Support custom transform and flush functions.

## Installation
```
npm install --save-dev i18next-scanner
```

## Usage
The main entry function of [i18next-scanner](https://github.com/cheton/i18next-scanner) is a transform stream. You can use [vinyl-fs](https://github.com/wearefractal/vinyl) to create a readable stream, pipe the stream through [i18next-scanner](https://github.com/cheton/i18next-scanner) to transform your code into an i18n resource object, and write to a destination folder.
Here is a simple example showing how that works:
```javascript
var i18next = require('i18next-scanner');
var vfs = require('vinyl-fs');

vfs.src(['path/to/src'])
    .pipe(i18next())
    .pipe(vfs.dest('path/to/dest'));
```

## Gulp Usage
Now you are ready to set up a minimal configuration, and get started with Gulp.
For example:
```javascript
var gulp = require('gulp');
var i18next = require('i18next-scanner');

gulp.task('i18next', function() {
    return gulp.src(['src/**/*.{js,html}'])
        .pipe(i18next({
            // a list of supported languages
            lngs: ['en', 'de'], 
            
            // the source path is relative to current working directory
            resGetPath: 'assets/i18n/__lng__/__ns__.json',
            
            // the destination path is relative to your `gulp.dest()` path
            resSetPath: 'i18n/__lng__/__ns__.json'
        }))
        .pipe(gulp.dest('assets'));
});
```


## Grunt Usage
Once you've finished the installation, add this line to your project's Gruntfile:
```javascript
grunt.loadNpmTasks('i18next-scanner');
```

In your project's Gruntfile, add a section named `i18next` to the data object passed into `grunt.initConfig()`, like so:
```javascript
grunt.initConfig({
    i18next: {
        dev: {
            src: 'src/**/*.{js,html}',
            dest: 'assets',
            options: {
                lngs: ['en', 'de'],
                resGetPath: 'assets/i18n/__lng__/__ns__.json',
                resSetPath: 'i18n/__lng__/__ns__.json'
            }
        }
    }
});
````

## Advanced Usage

### Customize transform and flush functions
As mentioned in the [Usage](#usage) section, the main entry function returns a [through2](https://github.com/rvagg/through2) object stream, you can pass in your `transform` and `flush` functions:
```javascript
i18next(options[, customTransform[, customFlush]])
```

### Usage with i18next-text

#### Example of parsing strings
You might want to find all occurrences of the `i18n._()` function in your code.
For example:
```javascript
i18n._('This is text value');
i18n._("text");
i18n._('text');
i18n._("text", { count: 1 });
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

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');                              

                key = hash(value); // returns a hash value as its default key
                parser.parse(key, value);
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

            parser.parse(key, value);
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
            parser.parse(key, value);
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
    debug: false,
    sort: false,
    lngs: ['en'],
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

#### debug

Type: `Boolean` Default: `false`

Set to `true` to trun on debug output.

#### sort

Type: `Boolean` Default: `false`

Set to `true` if you want to sort translation keys in ascending order.

#### lngs

Type: `Array` Default: `['en']`

Provides a list of supported languages.

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

Copyright (c) 2015 Cheton Wu

Licensed under the [MIT License](https://github.com/cheton/i18next-scanner/blob/master/LICENSE).
