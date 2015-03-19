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
         * i18n._('This is text value');
         * i18n._("text"); // result matched
         * i18n._('text'); // result matched
         * i18n._("text", { count: 1 }); // result matched
         * i18n._("text" + str); // skip run-time variables
         */
        results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || "";
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
        results = content.match(/i18n\.t\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || "";
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
