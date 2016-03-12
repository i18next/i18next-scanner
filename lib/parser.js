var fs = require('fs');
var path = require('path');
var util = require('util');
var colors = require('colors');
var _ = require('lodash');
var pkg = require('../package.json');

/**
 * Creates a new parser
 * @constructor
 */
var Parser = function(options) {
    var defaults = {
        // Debug output
        debug: false,

        // Provides a list of supported languages by setting the lngs option.
        lngs: ['en'],

        // Sorts the keys in ascending order.
        sort: false,

        // Provides a default value if a value is not specified.
        defaultValue: '',

        // The resGetPath is the source i18n path, it is relative to current working directory.
        resGetPath: 'i18n/__lng__/__ns__.json',

        // The resSetPath is the target i18n path, it is relative to your gulp.dest path.
        resSetPath: 'i18n/__lng__/__ns__.json',

        // Changes namespace and/or key separator by setting nsseparator and/or keyseparator options.
        nsseparator: ':',
        keyseparator: '.',

        // Changes pre-/suffix for variables by setting interpolationPrefix and interpolationSuffix options.
        interpolationPrefix: '__',
        interpolationSuffix: '__',

        ns: {
            // Provides a list of namespaces by setting the namespaces option.
            namespaces: [],
            // Changes the default namespace by setting the ns.defaultNs option.
            defaultNs: 'translation'
        }
    };

    var that = this;

    this.options = _.clone(options);

    _.defaults(this.options, defaults);

    options = this.options;

    var resStore = this.resStore = {};
    var fn = this.fn = {
        getResourcePath: function(lng, ns) {
            var options = that.options;
            var regex = {
                'lng': new RegExp(_.escapeRegExp(options.interpolationPrefix + 'lng' + options.interpolationSuffix), 'g'),
                'ns': new RegExp(_.escapeRegExp(options.interpolationPrefix + 'ns' + options.interpolationSuffix), 'g')
            };
            return options.resGetPath
                .replace(regex.lng, lng)
                .replace(regex.ns, ns);
        },
        debuglog: function() {
            var options = that.options;
            if (!!options.debug) {
                var args = Array.prototype.slice.call(arguments, 0);
                console.log.apply(this, args);
            }
        }
    };

    if (_.isString(options.ns)) {
        options.ns = {
            namespaces: [],
            defaultNs: options.ns
        };
    }

    if ( ! _.isArray(options.ns.namespaces)) {
        options.ns.namespaces = [];
    }
    console.assert(_.isArray(options.ns.namespaces), 'The ns.namespaces option should be an array of strings');

    options.ns.namespaces = _.chain(options.ns.namespaces.concat([options.ns.defaultNs]))
        .flatten()
        .union()
        .value();

    _.each(options.lngs, function(lng) {
        resStore[lng] = resStore[lng] || {};
        _.each(options.ns.namespaces, function(ns) {
            var resPath = fn.getResourcePath(lng, ns);

            resStore[lng][ns] = {};

            try {
                var stat = fs.statSync(resPath);
                if (stat.isFile()) {
                    resStore[lng][ns] = JSON.parse(fs.readFileSync(resPath, 'utf-8'));
                }
            }
            catch (err) {
                fn.debuglog('Unable to load ' + JSON.stringify(resPath));
            }
        });
    });

    fn.debuglog('parser initialization:', JSON.stringify({
        'options': options,
        'resStore': resStore
    }, null, 2));
};

/**
 * Parses a translation key and stores the key-value pairs to i18n resource store
 * @param {string} key The translation key
 * @param {string} [defaultValue] The key's value
 */
Parser.prototype.parse = function(key, defaultValue) {
    var fn = this.fn;
    var options = this.options;
    var resStore = this.resStore;

    var ns = _.isString(options.ns) ? options.ns : options.ns.defaultNs;
    console.assert(_.isString(ns) && !!ns.length, 'ns is not a valid string', ns);

    if (typeof options.nsseparator === 'string' && key.indexOf(options.nsseparator) > -1) {
        var parts = key.split(options.nsseparator);
        ns = parts[0];
        key = parts[1];
    }

    // keep compatibility with i18next to supoprt disabling keyseparator
    // in case you want to have the key as a fallback value.
    var keys = typeof options.keyseparator === 'string' ?
                key.split(options.keyseparator) :
                [key];
    _.each(options.lngs, function(lng) {
        var lookupKey;
        var value = resStore[lng] && resStore[lng][ns];
        var x = 0;
        while (keys[x]) {
            value = value && value[keys[x]];
            x++;
        }

        if ( ! _.isUndefined(value)) {
            // Found a value associated with the key
            lookupKey = '[' + lng + '][' + ns + '][' + keys.join('][') + ']';
            fn.debuglog('Found a value %s associated with the key %s in %s.',
                JSON.stringify(_.get(resStore, lookupKey)),
                JSON.stringify(key),
                JSON.stringify(fn.getResourcePath(lng, ns))
            );
        } else if (_.isObject(resStore[lng][ns])) {
            // Adding a new entry
            var res = resStore[lng][ns];
            _.each(keys, function(elem, index) {
                if (index >= (keys.length - 1)) {
                    res[elem] = _.isUndefined(defaultValue) ? options.defaultValue : defaultValue;
                } else {
                    res[elem] = res[elem] || {};
                    res = res[elem];
                }
            });

            lookupKey = '[' + lng + '][' + ns + '][' + keys.join('][') + ']';
            fn.debuglog('Adding a new entry {%s:%s} to %s.',
                JSON.stringify(key),
                JSON.stringify(_.get(resStore, lookupKey)),
                JSON.stringify(fn.getResourcePath(lng, ns))
            );
        } else { // skip the namespace that is not defined in the i18next options
            var msg = 'Please ensure the namespace "' + ns + '" exists in the ns.namespaces[] of your ' + pkg.name + ' options: ' + JSON.stringify({
                ns: ns,
                key: key,
                defaultValue: defaultValue
            });
            console.error(msg.red);
        }
    });
};

/**
 * Parses translation keys from `data-i18n` attribute in HTML
 * @param {string} attrs A semicolon-separated list of attributes
 */
Parser.prototype.parseAttrs = function(attrs) {
    var _self = this;

    var keys = [];
    if (attrs.indexOf(';') <= attrs.length-1) {
        keys = attrs.split(';');
    } else {
        keys = [ attrs ];
    }

    _.each(keys, function(key) {
        var attr = 'text';

        key = _.trim(key);

        if (key.length === 0) {
            return;
        }

        if (key.indexOf('[') === 0) {
            var parts = key.split(']');
            key = parts[1];
            attr = parts[0].substr(1, parts[0].length-1);
        }

        if (key.indexOf(';') === key.length-1) {
            key = key.substr(0, key.length-2);
        }

        _self.parse(key);
    });
};

/**
 * Parses hash arguments for Handlebars block helper
 * @see [Hash Arguments]{@http://code.demunskin.com/other/Handlebars/block_helpers.html#hash-arguments}
 * @see [Regular expression for parsing name value pairs]{@link http://stackoverflow.com/questions/168171/regular-expression-for-parsing-name-value-pairs}
 * @example <caption>Example usage:</caption>
 * // it will output ["id=nav-bar", "class = "top"", "foo = "bar\"baz""]
 * var str = ' id=nav-bar class = "top" foo = "bar\\"baz" ';
 * str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
 * @param [string] str A string representation of hash arguments
 * @return {object}
 */
Parser.prototype.parseHashArguments = function(str) {
    var hash = {};
    var params = str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
    var unquote = function(str, quoteChar) {
        quoteChar = quoteChar || '"';
        if (str[0] === quoteChar && str[str.length - 1] === quoteChar) {
            return str.slice(1, str.length - 1);
        }
        return str;
    };

    _.each(params, function(param) {
        param = _.trim(param);
        var r = param.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/) || [];

        if (r.length < 3 || _.isUndefined(r[1]) || _.isUndefined(r[2])) {
            return;
        }

        var key = _.trim(r[1]);
        var value = (function(value) { // value is enclosed with either single quote (') or double quote (") characters
            value = _.trim(value);

            var quoteChars = '\'"';
            var quoteChar = _.find(quoteChars, function(quoteChar) {
                return value.charAt(0) === quoteChar;
            });

            if (quoteChar) { // single quote (') or double quote (")
                value = unquote(value, quoteChar);
            }

            return value;
        }(r[2]));

        hash[key] = value;
    });

    return hash;
};

/**
 * Returns a JSON string containing translation information
 * @param {object} [opts] The options object
 * @param {boolean} [opts.sort] True to sort object by key
 * @param {function|string[]|number[]} [opts.replacer] The same as the JSON.stringify()
 * @param {string|number} [opts.space] The same as the JSON.stringify() method
 * @return {string}
 */
Parser.prototype.toJSON = function(opts) {
    opts = opts || {};
    return JSON.stringify(this.toObject(opts), opts.replacer, opts.space);
};

/**
 * Returns an Object containing translation information
 * @param {object} [opts] The options object
 * @param {boolean} [opts.sort] True to sort object by key
 * @return {object}
 */
Parser.prototype.toObject = function(opts) {
    opts = opts || {};
    opts.sort = !!opts.sort;

    var resStore = _.clone(this.resStore);

    if (opts.sort) {
        _.each(resStore, function(namespaces, lng) {
            _.each(namespaces, function(obj, ns) {
                // Sorted by key
                resStore[lng][ns] = _.chain(obj)
                    .pairs()
                    .sortBy(function(pair) { var key = pair[0]; return key; })
                    .reduce(function(memo, pair) { var key = pair[0], value = pair[1]; memo[key] = value; return memo; }, {})
                    .value();
            });
        });
    }

    return resStore;
};

module.exports = function(options) {
    return new Parser(options);
};
