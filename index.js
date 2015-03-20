var _ = require('lodash');
var fs = require('fs');
var vfs = require('vinyl-fs');
var File = require('vinyl');
var through = require('through2');

var scanner = function(options) {
    var parser = require('./lib/parser')(options);

    options = options || {};

    var transform = function(file, enc, cb) {
        var content = fs.readFileSync(file.path, enc);
        var results;

        /**
         * Handlebars
         *
         * {{i18n 'bar'}}
         * {{i18n 'bar' key='foo'}}
         * {{i18n 'baz' key='locale:foo'}}
         * {{i18n key='noval'}}
         */
        results = content.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/gm) || [];
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

        /**
         * Handlebars block expressions
         *
         * {{#i18n}}Some text{{/i18n}}
         * {{#i18n this}}Description: {{description}}{{/i18n}}
         * {{#i18n this last-name=lastname}}{{firstname}} ${last-name}{{/i18n}}
         *
         * http://stackoverflow.com/questions/406230/regular-expression-to-match-string-not-containing-a-wordo
         */
        results = content.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/gm) || [];
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

        /**
         * <div data-i18n="[attr]ns:foo.bar;[attr]ns:foo.baz"></div>
         */
        results = content.match(/data\-i18n=("[^"]*"|'[^']*')/igm) || '';
        _.each(results, function(result) {
            var r = result.match(/data\-i18n=("[^"]*"|'[^']*')/);
            if (r) {
                var keys = _.trim(r[1], '\'"');
                parser.parseKeys(keys);
            }
        });

        /**
         * i18n._('This is text value');
         * i18n._("text"); // result matched
         * i18n._('text'); // result matched
         * i18n._("text", { count: 1 }); // result matched
         * i18n._("text" + str); // skip run-time variables
         */
        results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
        _.each(results, function(result) {
            var r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);
            if (r) {
                var value = _.trim(r[1], '\'"');
                parser.parseValue(value);
            }
        });

        /**
         * i18n.t('ns:foo.bar');
         * i18n.t("ns:foo.bar"); // result matched
         * i18n.t('ns:foo.bar'); // result matched
         * i18n.t("ns:foo.bar", { count: 1 }); // result matched
         * i18n.t("ns:foo.bar" + str); // skip run-time variables
         */
        results = content.match(/i18n\.t\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
        _.each(results, function(result) {
            var r = result.match(/i18n\.t\(("[^"]*"|'[^']*')/);
            if (r) {
                var key = _.str.trim(r[1], '\'"');
                parser.parseKey(key);
            }
        });

        cb();
    };
    
    var flush = function(cb) {
        var that = this;
        var resStore = parser.toObject();

        _.each(resStore, function(namespaces, lng) {
            _.each(namespaces, function(obj, ns) {
                var regex = {
                    'lng': new RegExp(_.escapeRegExp(options.interpolationPrefix + 'lng' + options.interpolationSuffix), 'g'),
                    'ns': new RegExp(_.escapeRegExp(options.interpolationPrefix + 'ns' + options.interpolationSuffix), 'g')
                };
                var resPath = options.resSetPath
                    .replace(regex.lng, lng)
                    .replace(regex.ns, ns);
                var str = JSON.stringify(obj, null, 4); // 4 spaces

                that.push(new File({
                    path: resPath,
                    contents: new Buffer(str)
                }));
            });
        });

        cb();
    };

    return through.obj(transform, flush);
};

vfs.src('test/fixtures/modules/**/*.{js,hbs}', {base: 'test/fixtures'})
    .pipe(scanner({
        lngs: ['en','de'],
        defaultValue: '__STRING_NOT_TRANSLATED__',
        resGetPath: 'i18n/__lng__/__ns__.json',
        resSetPath: 'i18n/__lng__/__ns__.savedMissing.json',
        nsseparator: ':', // namespace separator
        keyseparator: '.', // key separator
        interpolationPrefix: '__',
        interpolationSuffix: '__',
        ns: {
            namespaces: [],
            defaultNs: 'translation'
        }
    }))
    .pipe(vfs.dest('./dist'));
