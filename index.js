var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var vfs = require('vinyl-fs');
var File = require('vinyl');
var through = require('through2');

module.exports = function(options, customTransform, customFlush) {
    var parser = require('./lib/parser')(options);

    options = options || {};

    var transform = function _transform(file, enc, done) {
        var extname = path.extname(file.path);
        var content = fs.readFileSync(file.path, enc);
        var results;

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

        if (_.isFunction(customTransform)) {
            customTransform.call(this, file, enc, done);
        } else {
            done();
        }
    };
    
    var flush = function _flush(done) {
        var that = this;
        var resStore = parser.toObject({
            sort: !!options.sort
        });

        if (_.isFunction(customFlush)) {
            customFlush.call(this, done);
        } else {
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

            done();
        }
    };

    return _.extend(through.obj(transform, flush), {parser: parser});
};
