var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var vfs = require('vinyl-fs');
var VirtualFile = require('vinyl');
var through = require('through2');

/**
 * @param {object} options The options object.
 * @param {function} [customTransform]
 * @param {function} [customFlush]
 * @return {object} Returns a through2.obj().
 */
module.exports = function(options, customTransform, customFlush) {
    var parser = require('./lib/parser')(options || {});

    // Bring back parser options
    options = parser.options;

    var transform = function _transform(file, enc, done) {
        var extname = path.extname(file.path);
        var content = fs.readFileSync(file.path, enc);

        /**
         * <div data-i18n="[attr]ns:foo.bar;[attr]ns:foo.baz"></div>
         */
        (function() {
            var results = content.match(/data\-i18n=("[^"]*"|'[^']*')/igm) || '';
            _.each(results, function(result) {
                var r = result.match(/data\-i18n=("[^"]*"|'[^']*')/);
                if (r) {
                    var keys = _.trim(r[1], '\'"');
                    parser.parseAttrs(keys);
                }
            });
        }());

        /**
         * i18n.t('ns:foo.bar');
         * i18n.t("ns:foo.bar"); // result matched
         * i18n.t('ns:foo.bar'); // result matched
         * i18n.t("ns:foo.bar", { count: 1 }); // result matched
         * i18n.t("ns:foo.bar" + str); // skip run-time variables
         */
        (function() {
            var results = content.match(/i18n\.t\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
            _.each(results, function(result) {
                var r = result.match(/i18n\.t\(("[^"]*"|'[^']*')/);
                if (r) {
                    var key = _.trim(r[1], '\'"');
                    parser.parse(key);
                }
            });
        }());

        if (_.isFunction(customTransform)) {
            customTransform.call(this, file, enc, done);
        } else {
            done();
        }
    };
    
    var flush = function _flush(done) {
        var that = this;
        var resStore = parser.toObject({
            sort: !!parser.options.sort
        });

        if (_.isFunction(customFlush)) {
            customFlush.call(this, done);
        } else {
            _.each(resStore, function(namespaces, lng) {
                _.each(namespaces, function(obj, ns) {
                    var regex = {
                        'lng': new RegExp(_.escapeRegExp(parser.options.interpolationPrefix + 'lng' + parser.options.interpolationSuffix), 'g'),
                        'ns': new RegExp(_.escapeRegExp(parser.options.interpolationPrefix + 'ns' + parser.options.interpolationSuffix), 'g')
                    };
                    var resPath = parser.options.resSetPath
                        .replace(regex.lng, lng)
                        .replace(regex.ns, ns);
                    var str = JSON.stringify(obj, null, 4); // 4 spaces

                    that.push(new VirtualFile({
                        path: resPath,
                        contents: new Buffer(str + '\n')
                    }));
                });
            });

            done();
        }
    };

    return _.extend(through.obj(transform, flush), {parser: parser});
};
