var fs = require('fs');
var path = require('path');
var util = require('util');
var debuglog = require('debuglog');
var _ = require('lodash');
var hashlib = require('i18next-text').hash;
var map = require('./map');
var pkg = require('../package.json');

var Parser = function(options) {
    var defaults = {
        lngs: [],
        defaultValue: '',
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
    };
    var resStore;

    this.options = _.clone(options);
    this.resStore = resStore = {};

    _.defaults(this.options, defaults);

    options = this.options;

    _.each(options.lngs, function(lng) {
        resStore[lng] = resStore[lng] || {};
        _.each(options.ns.namespaces, function(ns) {
            var regex = {
                'lng': new RegExp(_.escapeRegExp(options.interpolationPrefix + 'lng' + options.interpolationSuffix), 'g'),
                'ns': new RegExp(_.escapeRegExp(options.interpolationPrefix + 'ns' + options.interpolationSuffix), 'g')
            };
            var resPath = options.resGetPath
                .replace(regex.lng, lng)
                .replace(regex.ns, ns);

            resStore[lng][ns] = {};

            var filepath = path.join(__dirname, '..', '..', resPath);

            if (fs.statSync(filepath).isFile()) {
                resStore[lng][ns] = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            }
        });
    });

};

/**
 *
 */
Parser.prototype.parseKeys = function(key) {
    var _self = this;

    var keys = [];
    if (key.indexOf(';') <= key.length-1) {
        keys = key.split(';');
    } else {
        keys = [ key ];
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

        _self.parseKey(key);
    });
};

/**
 *
 */
Parser.prototype.parseKey = function(key, defaultValue) { 
    var options = this.options;
    var resStore = this.resStore;

    var ns = (typeof options.ns === 'string') ? options.ns : options.ns.defaultNs;
    if (key.indexOf(options.nsseparator) > -1) {
        var parts = key.split(options.nsseparator);
        ns = parts[0];
        key = parts[1];
    }

    var keys = key.split(options.keyseparator);
    _.each(options.lngs, function(lng) {
        var lookupKey;
        var value = resStore[lng] && resStore[lng][ns];
        var x = 0;
        while (keys[x]) {
            value = value && value[keys[x]];
            x++;
        }

        if ( ! _.isUndefined(value)) {
            // Reuse the key existed in the resStore
            lookupKey = '[' + lng + '][' + ns + '][' + keys.join('][') + ']';
            debuglog('[v] resStore' + lookupKey + '="' + map(resStore, lookupKey) + '"');
        } else if (_.isObject(resStore[lng][ns])) {
            var res = resStore[lng][ns];
            _.each(keys, function(elem, index) {
                if (index >= (keys.length - 1)) { 
                    res[elem] = _.isUndefined(defaultValue) ? options.defaultValue : defaultValue;
                } else {
                    res[elem] = res[elem] || {};
                    res = res[elem];
                }
            });

            // Add new key to the resStore
            lookupKey = '[' + lng + '][' + ns + '][' + keys.join('][') + ']';
            debuglog('[+] resStore' + lookupKey + '="' + map(resStore, lookupKey) + '"');
        } else { // skip the namespace that is not defined in the i18next options
            console.error('The namespace "' + ns + '" is not defined in your i18next options. Please ensure the namespace exists in the namespaces array.');
        }
    });
};

/**
 *
 */
Parser.prototype.parseValue = function(value) { 
    var options = this.options;
    var resStore = this.resStore;

    var key = hashlib['sha1'](value); // FIXME
    var ns = (typeof options.ns === 'string') ? options.ns : options.ns.defaultNs;

    _.each(options.lngs, function(lng) {
        var lookupKey = '[' + lng + '][' + ns + '][' + key + ']';

        // Verify existing value
        var _value = map(resStore, lng + '.' + ns + '.' + key);
        if (_.isUndefined(_value)) {
            map(resStore, lng + '.' + ns + '.' + key, value);
            debuglog('[+] resStore' + lookupKey + '="' + map(resStore, lookupKey) + '"');
        } else if (_value === value) {
            debuglog('[v] resStore' + lookupKey + '="' + map(resStore, lookupKey) + '"');
        } else {
            console.error('[x] Key conflict in ' + lookupKey + '="' + _value + '"\n' + 'sha1' + '("' + value + '")=' + key);
        }
    });
};

// Regular expression for parsing name value pairs
// http://stackoverflow.com/questions/168171/regular-expression-for-parsing-name-value-pairs
//
// Example:
// > var str = ' id=nav-bar class = "top" foo = "bar\\"baz" ';
// > str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];              
// < ["id=nav-bar", "class = "top"", "foo = "bar\"baz""]
//
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
