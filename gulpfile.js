var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var del = require('del');
var runSequence = require('run-sequence');
var jshint = require('gulp-jshint');
var source = require('vinyl-source-stream');
var errorHandler = require('./gulp/error-handler');
var pkg = require('./package.json');
var config = require('./gulp/config');

gulp.task('clean', function(callback) {
    del(config.clean.files, callback);
});

gulp.task('jshint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint(config.jshint.options))
        .pipe(jshint.reporter('default', {verbose: true}))
        .pipe(jshint.reporter('fail'))
            .on('error', errorHandler.error);
});

gulp.task('i18next-scanner', function() {
    var i18next = require('./index');

    var customTransform = function(file, enc, done) {
        var extname = path.extname(file.path);
        var content = fs.readFileSync(file.path, enc);

        var parser = this.parser;
        console.assert(_.isObject(parser), 'parser is not an object');

        /**
         * Supports Handlebars i18n helper
         *
         * {{i18n 'bar'}}
         * {{i18n 'bar' key='foo'}}
         * {{i18n 'baz' key='locale:foo'}}
         * {{i18n key='noval'}}
         */
        (function() {
            var results = content.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/gm) || [];
            _.each(results, function(result) {
                var key, defaultValue;

                var r = result.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/m) || [];
                if ( ! _.isUndefined(r[1])) {
                    defaultValue = _.trim(r[1], '\'"');
                }

                var params = parser.parseHashArguments(r[2]);
                if (_.has(params, 'key')) {
                    key = params['key'];
                }
                
                if (_.isUndefined(key) && _.isUndefined(defaultValue)) {
                    return;
                }

                if (_.isUndefined(key)) {
                    parser.parseValue(defaultValue);
                } else {
                    parser.parseKey(key, defaultValue);
                }
            });
        }());

        /**
         * Supports Handlebars i18n helper with block expressions
         *
         * {{#i18n}}Some text{{/i18n}}
         * {{#i18n this}}Description: {{description}}{{/i18n}}
         * {{#i18n this last-name=lastname}}{{firstname}} ${last-name}{{/i18n}}
         *
         * http://stackoverflow.com/questions/406230/regular-expression-to-match-string-not-containing-a-wordo
         */
        (function() {
            var results = content.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/gm) || [];
            _.each(results, function(result) {
                var key, defaultValue;

                var r = result.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/m) || [];

                if ( ! _.isUndefined(r[2])) {
                    defaultValue = _.trim(r[2], '\'"');
                }

                if (_.isUndefined(defaultValue)) {
                    return;
                }

                parser.parseValue(defaultValue);
            });
        }());

        /**
         * Supports i18next-text's _() method for i18next
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
                var r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);
                if (r) {
                    var value = _.trim(r[1], '\'"');
                    parser.parseValue(value);
                }
            });
        }());

        done();
    };

    return gulp.src(config.i18next.src, {base: config.i18next.base})
        .pipe(i18next(config.i18next.options, customTransform))
        .pipe(gulp.dest('assets'));
});

gulp.task('build', ['jshint'], function(callback) {
    runSequence('clean', 'i18next-scanner', callback);
});
gulp.task('default', ['build']);
