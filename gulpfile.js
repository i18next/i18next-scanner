var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var del = require('del');
var runSequence = require('run-sequence');
var jshint = require('gulp-jshint');
var errorHandler = require('./gulp/error-handler');
var sha1 = require('sha1');
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
                    key = sha1(value); // returns a hash value as default key
                }

                parser.parse(key, value);
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
                var key, value;
                var r = result.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/m) || [];

                if ( ! _.isUndefined(r[2])) {
                    value = _.trim(r[2], '\'"');
                }

                if (_.isUndefined(value)) {
                    return;
                }

                key = sha1(value); // returns a hash value as default key
                parser.parse(key, value);
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
                var key, value;
                var r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);

                if (r) {
                    value = _.trim(r[1], '\'"');
                    key = sha1(value); // returns a hash value as default key
                    parser.parse(key, value);
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
