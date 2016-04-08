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
    fallbackLng: 'en', // language to lookup key if not found while calling `parser.get(key, { lng: '' })`

    ns: [], // string or array of namespaces

    defaultNs: 'translation', // default namespace used if not passed to translation function

    defaultValue: '', // default value used if not passed to `parser.set`

    // resource
    resource: {
        loadPath: 'i18n/{{lng}}/{{ns}}.json', // the source resource path (relative to current working directory)
        savePath: 'i18n/{{lng}}/{{ns}}.json', // the target resource path (relative to the path specified with `gulp.dest(path)`)
        jsonIndent: 2
    },

    keySeparator: '.', // char to separate keys
    nsSeparator: ':', // char to split namespace from key

    // interpolation options
    interpolation: {
        prefix: '{{', // prefix for interpolation
        suffix: '}}' // suffix for interpolation
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

    // Resource
    if (_.isUndefined(_.get(options, 'func.extensions'))) {
        _.set(options, 'func.extensions', defaults.func.extensions);
    }
    if (_.isUndefined(_.get(options, 'resource.loadPath'))) {
        _.set(options, 'resource.loadPath', defaults.resource.loadPath);
    }
    if (_.isUndefined(_.get(options, 'resource.savePath'))) {
        _.set(options, 'resource.savePath', defaults.resource.savePath);
    }
    if (_.isUndefined(_.get(options, 'resource.jsonIndent'))) {
        _.set(options, 'resource.jsonIndent', defaults.resource.jsonIndent);
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

    if (!_.isArray(options.ns)) {
        options.ns = [options.ns];
    }

    options.ns = _(options.ns.concat(options.defaultNs))
        .flatten()
        .union()
        .value();

    return options;
};

/**
* Creates a new parser
* @constructor
*/
class Parser {
    options = _.assign({}, defaults);
    resStore = {};

    constructor(options) {
        this.options = transformOptions(_.extend({}, this.options, options));

        const lngs = this.options.lngs;
        const namespaces = this.options.ns;

        lngs.forEach((lng) => {
            this.resStore[lng] = this.resStore[lng] || {};
            namespaces.forEach((ns) => {
                const resPath = this.formatResourceLoadPath(lng, ns);
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

        this.debuglog('[i18next-scanner] Parser(options): ' + JSON.stringify(this.options));
    }
    debuglog(...args) {
        const { debug } = this.options;
        if (!!debug) {
            console.log.apply(this, args);
        }
    }
    formatResourceLoadPath(lng, ns) {
        const options = this.options;
        const regex = {
            lng: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'lng' + options.interpolation.suffix), 'g'),
            ns: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'ns' + options.interpolation.suffix), 'g')
        };
        return options.resource.loadPath
            .replace(regex.lng, lng)
            .replace(regex.ns, ns);
    }
    formatResourceSavePath(lng, ns) {
        const options = this.options;
        const regex = {
            lng: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'lng' + options.interpolation.suffix), 'g'),
            ns: new RegExp(_.escapeRegExp(options.interpolation.prefix + 'ns' + options.interpolation.suffix), 'g')
        };
        return options.resource.savePath
            .replace(regex.lng, lng)
            .replace(regex.ns, ns);
    }
    // i18next.t('ns:foo.bar') // matched
    // i18next.t("ns:foo.bar") // matched
    // i18next.t('ns:foo.bar') // matched
    // i18next.t("ns:foo.bar", { count: 1 }); // matched
    // i18next.t("ns:foo.bar" + str); // not matched
    parseFuncFromString(content, opts = {}, customHandler = null) {
        if (_.isFunction(opts)) {
            customHandler = opts;
            opts = {};
        }

        const funcs = opts.list || this.options.func.list;
        const matchPattern = _(funcs)
            .map((func) => ('(?:' + func + ')'))
            .value()
            .join('|')
            .replace(/\./g, '\\.');
        const pattern = '(?:(?:^[\s]*)|[^a-zA-Z0-9_])(?:' + matchPattern + ')\\(("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')\\s*[\\,\\)]';
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

            this.set(key);
        });

        return this;
    }
    // Parses translation keys from `data-i18n` attribute in HTML
    // <div data-i18n="[attr]ns:foo.bar;[attr]ns:foo.baz">
    // </div>
    parseAttrFromString(content, opts = {}, customHandler = null) {
        if (_.isFunction(opts)) {
            customHandler = opts;
            opts = {};
        }

        const attrs = opts.list || this.options.attr.list;
        const matchPattern = _(attrs)
            .map((attr) => ('(?:' + attr + ')'))
            .value()
            .join('|')
            .replace(/\./g, '\\.');
        const pattern = '(?:(?:^[\s]*)|[^a-zA-Z0-9_])(?:' + matchPattern + ')=("[^"]*"|\'[^\']*\')';
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

                this.set(key);
            });
        });

        return this;
    }
    // Get the value of a translation key or the whole resource store containing translation information
    // @param {string} [key] The translation key
    // @param {object} [opts] The opts object
    // @param {boolean} [opts.sort] True to sort object by key
    // @param {boolean} [opts.lng] The language to use
    // @return {object}
    get(key, opts = {}) {
        if (_.isObject(key)) {
            opts = key;
            key = undefined;
        }

        const resStore = _.assign({}, this.resStore);

        if (!!opts.sort) { // sort by key
            Object.keys(resStore).forEach((lng) => {
                const namespaces = resStore[lng];

                Object.keys(namespaces).forEach((ns) => {
                    resStore[lng][ns] = _(namespaces[ns])
                        .toPairs()
                        .sortBy((pair) => pair[0])
                        .reduce((memo, pair) => {
                            const _key = pair[0];
                            const _value = pair[1];
                            memo[_key] = _value;
                            return memo;
                        }, {});

                        // Note. The reduce method is not chainable by default
                });
            });
        }

        if (!_.isUndefined(key)) {
            const options = this.options;
            let ns = options.defaultNs;

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
            const lng = opts.lng ? opts.lng : options.fallbackLng;
            const namespaces = resStore[lng] || {};

            let value = namespaces[ns];
            let x = 0;
            while (keys[x]) {
                value = value && value[keys[x]];
                x++;
            }

            return value;
        }

        return resStore;
    }
    // Set translation key with an optional defaultValue to i18n resource store
    // @param {string} key The translation key
    // @param {string} [defaultValue] The key's value
    set(key, defaultValue) {
        const options = this.options;

        let ns = options.defaultNs;
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
                    JSON.stringify(this.formatResourceLoadPath(lng, ns))
                );
            } else if (_.isObject(this.resStore[lng][ns])) {
                // Adding a new entry
                let res = this.resStore[lng][ns];
                Object.keys(keys).forEach((index) => {
                    const elem = keys[index];
                    if (index >= (keys.length - 1)) {
                        if (_.isUndefined(defaultValue)) {
                            res[elem] = _.isFunction(options.defaultValue) ? options.defaultValue(lng, ns, elem) : options.defaultValue;
                        } else {
                            res[elem] = defaultValue;
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
                    JSON.stringify(this.formatResourceLoadPath(lng, ns))
                );
            } else { // skip the namespace that is not defined in the i18next options
                console.log('The namespace "' + ns + '" does not exist:', { key, defaultValue });
            }
        });
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
