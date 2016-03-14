/* eslint no-console: 0 */
import _ from 'lodash';
import fs from 'fs';

const defaults = {
    debug: false, // verbose logging

    sort: false, // sort keys in alphabetical order

    attr: { // HTML attributes to parse
        list: ['data-i18n'],
        extensions: ['.html', '.htm']
    },

    func: { // function names to parse
        list: ['i18next.t', 'i18n.t'],
        extensions: ['.js', '.jsx']
    },

    lngs: ['en'], // array of supported languages

    ns: [], // string or array of namespaces

    defaultNs: 'translation' // default namespace used if not passed to translation function

    defaultValue: '', // default value used if not passed to `parseKey()`

    // resource
    resource: {
        loadPath: 'i18n/__lng__/__ns__.json', // the source resource path (relative to current working directory)
        savePath: 'i18n/__lng__/__ns__.json', // the target resource path (relative to the path specified with `gulp.dest(path)`)
    },

    keySeparator: '.', // char to separate keys
    nsSeparator: ':', // char to split namespace from key

    // interpolation options
    interpolation: {
        prefix: '__', // prefix for interpolation
        suffix: '__', // suffix for interpolation
    }
};

const transformOptions = (options) => {
    // Attribute
    if (_.isUndefined(_.get(options, 'attr.list'))) {
        _.set(options, 'attr.list', defaults.attr.list);
    }
    if (_.isUndefined(_.get(options, 'attr.extensions'))) {
        _.set(options, 'attr.extensions', defaults.attr.extensions);
    }
    // Function
    if (_.isUndefined(_.get(options, 'func.list'))) {
        _.set(options, 'func.list', defaults.func.list);
    }
    if (_.isUndefined(_.get(options, 'func.extensions'))) {
        _.set(options, 'func.extensions', defaults.func.extensions);
    }

    // Accept both nsseparator or nsSeparator
    if (!_.isUndefined(options.nsseparator)) {
        options.nsSeparator = options.nsseparator;
        delete options.nsseparator;
    }
    // Allowed only string or false
    if (!_.isString(options.nsSeparator)) {
        options.nsSeparator = false;
    }

    // Accept both keyseparator or keySeparator
    if (!_.isUndefined(options.keyseparator)) {
        options.keySeparator = options.keyseparator;
        delete options.keyseparator;
    }
    // Allowed only string or false
    if (!_.isString(options.keySeparator)) {
        options.keySeparator = false;
    }

    if (_.isString(options.ns)) {
        options.ns = {
            namespaces: [],
            defaultNs: options.ns
        };
    }

    if (!_.isArray(options.ns.namespaces)) {
        options.ns.namespaces = [];
    }
    console.assert(_.isArray(options.ns.namespaces), 'The ns.namespaces option should be an array of strings');

    options.ns.namespaces = _(options.ns.namespaces.concat(options.ns.defaultNs))
        .flatten()
        .union()
        .value();

    return options;
};

const unquote = (str, quoteChar) => {
    quoteChar = quoteChar || '"';
    if (str[0] === quoteChar && str[str.length - 1] === quoteChar) {
        return str.slice(1, str.length - 1);
    }
    return str;
};

/**
* Creates a new parser
* @constructor
*/
class Parser {
    options = Object.assign({}, defaults);
    resStore = {};

    constructor(options) {
        this.options = transformOptions(_.extend({}, this.options, options));

        const lngs = this.options.lngs;
        const namespaces = this.options.ns.namespaces;

        lngs.forEach((lng) => {
            this.resStore[lng] = this.resStore[lng] || {};
            namespaces.forEach((ns) => {
                const resPath = this.getResourceLoadPath(lng, ns);
                this.resStore[lng][ns] = {};
                try {
                    const stat = fs.statSync(resPath);
                    if (stat.isFile()) {
                        this.resStore[lng][ns] = JSON.parse(fs.readFileSync(resPath, 'utf-8'));
                    }
                } catch (err) {
                    this.debuglog('Unable to load ' + JSON.stringify(resPath));
                }
            });
        });

        this.debuglog('[i18next-scanner] Parser(options):', this.options);
    }
    debuglog(...args) {
        const { debug } = this.options;
        if (!!debug) {
            console.log.apply(this, args);
        }
    }
    getResourceLoadPath(lng, ns) {
        const options = this.options;
        const regex = {
            lng: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'lng' + options.interpolation.suffix), 'g'),
            ns: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'ns' + options.interpolation.suffix), 'g')
        };
        return options.resource.loadPath
            .replace(regex.lng, lng)
            .replace(regex.ns, ns);
    }
    getResourceSavePath(lng, ns) {
        const options = this.options;
        const regex = {
            lng: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'lng' + options.interpolation.suffix), 'g'),
            ns: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'ns' + options.interpolation.suffix), 'g')
        };
        return options.resource.savePath
            .replace(regex.lng, lng)
            .replace(regex.ns, ns);
    }
    // Returns I18n resource store containing translation information
    // @param {object} [opts] The opts object
    // @param {boolean} [opts.sort] True to sort object by key
    // @return {object}
    getResourceStore(opts = {}) {
        const { sort } = opts;
        const resStore = Object.assign({}, this.resStore);

        if (!!sort) { // sort by key
            Object.keys(resStore).forEach((lng) => {
                const namespaces = resStore[lng];

                Object.keys(namespaces).forEach((ns) => {
                    resStore[lng][ns] = _(namespaces[ns])
                        .toPairs()
                        .sortBy((pair) => pair[0])
                        .reduce((memo, pair) => {
                            const [key, value] = pair;
                            memo[key] = value;
                            return memo;
                        }, {})
                        .value();
                });
            });
        }

        return resStore;
    }
    // i18next.t('ns:foo.bar') // matched
    // i18next.t("ns:foo.bar") // matched
    // i18next.t('ns:foo.bar') // matched
    // i18next.t("ns:foo.bar", { count: 1 }); // matched
    // i18next.t("ns:foo.bar" + str); // not matched
    parseFuncFromString(content, options = {}, customHandler = null) {
        if (_.isFunction(options)) {
            customHandler = options;
            options = {};
        }

        const funcs = options.list || this.options.func.list;
        const matchPattern = _(funcs)
            .map((func) => ('(?:' + func + ')'))
            .value()
            .join('|')
            .replace(/\./g, '\\.');
        const pattern = '[^a-zA-Z0-9_](?:' + matchPattern + ')\\(("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')\\s*[\\,\\)]';
        const results = content.match(new RegExp(pattern, 'gim')) || [];
        results.forEach((result) => {
            const r = result.match(new RegExp(pattern));
            if (!r) {
                return;
            }

            const key = _.trim(r[1], '\'"');

            if (customHandler) {
                customHandler(key);
                return;
            }

            this.parseKey(key);
        });
    }
    // Parses translation keys from `data-i18n` attribute in HTML
    // <div data-i18n="[attr]ns:foo.bar;[attr]ns:foo.baz">
    // </div>
    parseAttrFromString(content, options = {}, customHandler = null) {
        if (_.isFunction(options)) {
            customHandler = options;
            options = {};
        }

        const attrs = options.list || this.options.attr.list;
        const matchPattern = _(attrs)
            .map((attr) => ('(?:' + attr + ')'))
            .value()
            .join('|')
            .replace(/\./g, '\\.');
        const pattern = '[^a-zA-Z0-9_](?:' + matchPattern + ')=("[^"]*"|\'[^\']*\')';
        const results = content.match(new RegExp(pattern, 'gim')) || [];
        results.forEach((result) => {
            const r = result.match(new RegExp(pattern));
            if (!r) {
                return;
            }

            const attr = _.trim(r[1], '\'"');
            const keys = (attr.indexOf(';') >= 0) ? attr.split(';') : [attr];
            keys.forEach((key) => {
                //let attr = 'text';
                key = _.trim(key);
                if (key.length === 0) {
                    return;
                }
                if (key.indexOf('[') === 0) {
                    let parts = key.split(']');
                    key = parts[1];
                    //attr = parts[0].substr(1, parts[0].length - 1);
                }
                if (key.indexOf(';') === (key.length - 1)) {
                    key = key.substr(0, key.length - 2);
                }

                if (customHandler) {
                    customHandler(key);
                    return;
                }

                this.parseKey(key);
            });
        });
    }
    // Parses a translation key and stores the key-value pairs to i18n resource store
    // @param {string} key The translation key
    // @param {string} [defaultValue] The key's value
    parseKey(key, defaultValue) {
        const options = this.options;

        let ns = _.isString(options.ns) ? options.ns : options.ns.defaultNs;
        console.assert(_.isString(ns) && !!ns.length, 'ns is not a valid string', ns);

        // http://i18next.com/translate/keyBasedFallback/
        // Set nsSeparator and keySeparator to false if you prefer
        // having keys as the fallback for translation.
        // i18next.init({
        //   nsSeparator: false,
        //   keySeparator: false
        // })

        if (_.isString(options.nsSeparator) && (key.indexOf(options.nsSeparator) > -1)) {
            const parts = key.split(options.nsSeparator);
            ns = parts[0];
            key = parts[1];
        }

        const keys = _.isString(options.keySeparator) ? key.split(options.keySeparator) : [key];
        options.lngs.forEach((lng) => {
            let value = this.resStore[lng] && this.resStore[lng][ns];
            let x = 0;

            while (keys[x]) {
                value = value && value[keys[x]];
                x++;
            }

            if (!_.isUndefined(value)) {
                // Found a value associated with the key
                let lookupKey = '[' + lng + '][' + ns + '][' + keys.join('][') + ']';
                this.debuglog('Found a value %s associated with the key %s in %s.',
                    JSON.stringify(_.get(this.resStore, lookupKey)),
                    JSON.stringify(keys.join(options.keySeparator || '')),
                    JSON.stringify(this.getResourceLoadPath(lng, ns))
                );
            } else if (_.isObject(this.resStore[lng][ns])) {
                // Adding a new entry
                let res = this.resStore[lng][ns];
                Object.keys(keys).forEach((index) => {
                    const elem = keys[index];
                    if (index >= (keys.length - 1)) {
                        if (options.keySeparator === false) {
                            res[elem] = elem;
                        } else {
                            res[elem] = _.isUndefined(defaultValue) ? options.defaultValue : defaultValue;
                        }
                    } else {
                        res[elem] = res[elem] || {};
                        res = res[elem];
                    }
                });
                let lookupKey = '[' + lng + '][' + ns + '][' + keys.join('][') + ']';
                this.debuglog('Adding a new entry {%s:%s} to %s.',
                    JSON.stringify(keys.join(options.keySeparator || '')),
                    JSON.stringify(_.get(this.resStore, lookupKey)),
                    JSON.stringify(this.getResourceLoadPath(lng, ns))
                );
            } else { // skip the namespace that is not defined in the i18next options
                const msg = 'Ensure the namespace "' + ns + '" exists in ns.namespaces: ' + JSON.stringify({
                    ns: ns,
                    key: key,
                    defaultValue: defaultValue
                });
                console.error(msg);
            }
        });
    }
    // Parses hash arguments for Handlebars block helper
    // @see [Hash Arguments]{@http://code.demunskin.com/other/Handlebars/block_helpers.html#hash-arguments}
    // @see [Regular expression for parsing name value pairs]{@link http://stackoverflow.com/questions/168171/regular-expression-for-parsing-name-value-pairs}
    // @example <caption>Example usage:</caption>
    // it will output ["id=nav-bar", "class = "top"", "foo = "bar\"baz""]
    // var str = ' id=nav-bar class = "top" foo = "bar\\"baz" ';
    // str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
    // @param [string] str A string representation of hash arguments
    // @return {object}
    parseHashArguments(str) {
        let hash = {};

        const results = str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
        results.forEach((result) => {
            result = _.trim(result);
            const r = result.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/) || [];
            if (r.length < 3 || _.isUndefined(r[1]) || _.isUndefined(r[2])) {
                return;
            }

            let key = _.trim(r[1]);
            let value = _.trim(r[2]);

            { // value is enclosed with either single quote (') or double quote (") characters
                const quoteChars = '\'"';
                const quoteChar = _.find(quoteChars, (quoteChar) => {
                    return value.charAt(0) === quoteChar;
                });
                if (quoteChar) { // single quote (') or double quote (")
                    value = unquote(value, quoteChar);
                }
            }

            hash[key] = value;
        });

        return hash;
    }
    // Returns a JSON string containing translation information
    // @param {object} [options] The options object
    // @param {boolean} [options.sort] True to sort object by key
    // @param {function|string[]|number[]} [options.replacer] The same as the JSON.stringify()
    // @param {string|number} [options.space] The same as the JSON.stringify() method
    // @return {string}
    toJSON(options = {}) {
        const { replacer, space } = options;

        return JSON.stringify(this.getResourceStore(options), replacer, space);
    }
}

export default Parser;
