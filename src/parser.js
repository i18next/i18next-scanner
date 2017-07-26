/* eslint no-console: 0 */
import _ from 'lodash';
import fs from 'fs';
import { parse } from 'esprima';

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

    // Context Form
    context: true, // whether to add context form key
    contextFallback: true, // whether to add a fallback key as well as the context form key
    contextSeparator: '_', // char to split context from key

    // Plural Form
    plural: true, // whether to add plural form key
    pluralFallback: true, // whether to add a fallback key as well as the plural form key
    pluralSeparator: '_', // char to split plural from key

    // interpolation options
    interpolation: {
        prefix: '{{', // prefix for interpolation
        suffix: '}}' // suffix for interpolation
    }
};

// http://codereview.stackexchange.com/questions/45991/balanced-parentheses
const matchBalancedParentheses = (str = '') => {
    const parentheses = '[]{}()';
    const stack = [];
    let bracePosition;
    let start = -1;
    let i = 0;

    str = '' + str; // ensure string
    for (i = 0; i < str.length; ++i) {
        if ((start >= 0) && (stack.length === 0)) {
            return str.substring(start, i);
        }

        bracePosition = parentheses.indexOf(str[i]);
        if (bracePosition < 0) {
            continue;
        }
        if ((bracePosition % 2) === 0) {
            if (start < 0) {
                start = i; // remember the start position
            }
            stack.push(bracePosition + 1); // push next expected brace position
            continue;
        }

        if (stack.pop() !== bracePosition) {
            return str.substring(start, i);
        }
    }

    return str.substring(start, i);
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

    // The resStore stores all translation keys including unused ones
    resStore = {};

    // The resScan only stores translation keys parsed from code
    resScan = {};

    constructor(options) {
        this.options = transformOptions(_.extend({}, this.options, options));

        const lngs = this.options.lngs;
        const namespaces = this.options.ns;

        lngs.forEach((lng) => {
            this.resStore[lng] = this.resStore[lng] || {};
            this.resScan[lng] = this.resScan[lng] || {};
            namespaces.forEach((ns) => {
                const resPath = this.formatResourceLoadPath(lng, ns);

                this.resStore[lng][ns] = {};
                this.resScan[lng][ns] = {};
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

        if (debug) {
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
        const pattern = '(?:(?:^\\s*)|[^a-zA-Z0-9_])(?:' + matchPattern + ')\\(("(?:[^"\\\\]|\\\\(?:.|$))*"|\'(?:[^\'\\\\]|\\\\(?:.|$))*\')\\s*[,)]';
        const re = new RegExp(pattern, 'gim');

        let r;

        while ((r = re.exec(content))) {
            const options = {};
            const full = r[0];

            let key = _.trim(r[1]); // Remove leading and trailing whitespace
            const firstChar = key[0];
            if (_.includes(['\'', '"'], firstChar)) {
                // Remove first and last character
                key = key.slice(1, -1);
            }

            // restore multiline strings
            key = key.replace(/(\\\n|\\\r\n)/g, '');

            // JavaScript character escape sequences
            // https://mathiasbynens.be/notes/javascript-escapes

            // Single character escape sequences
            // Note: IE < 9 treats '\v' as 'v' instead of a vertical tab ('\x0B'). If cross-browser compatibility is a concern, use \x0B instead of \v.
            // Another thing to note is that the \v and \0 escapes are not allowed in JSON strings.
            key = key.replace(/(\\b|\\f|\\n|\\r|\\t|\\v|\\0|\\\\|\\"|\\')/g, (match) => eval(`"${match}"`));

            // * Octal escapes have been deprecated in ES5.
            // * Hexadecimal escape sequences: \\x[a-fA-F0-9]{2}
            // * Unicode escape sequences: \\u[a-fA-F0-9]{4}
            key = key.replace(/(\\x[a-fA-F0-9]{2}|\\u[a-fA-F0-9]{4})/g, (match) => eval(`"${match}"`));

            const endsWithComma = (full[full.length - 1] === ',');
            if (endsWithComma) {
                const code = matchBalancedParentheses(content.substr(re.lastIndex));
                const syntax = parse('(' + code + ')');
                const props = _.get(syntax, 'body[0].expression.properties') || [];
                // http://i18next.com/docs/options/
                const supportedOptions = [
                    'defaultValue',
                    'count',
                    'context',
                    'ns'
                ];

                props.forEach((prop) => {
                    if (_.includes(supportedOptions, prop.key.name)) {
                        if (prop.value.type === 'Literal') {
                            options[prop.key.name] = prop.value.value;
                        } else if (prop.value.type === 'TemplateLiteral') {
                            options[prop.key.name] = prop.value.quasis.map(function(element) {
                                return element.value.cooked;
                            }).join('');
                        } else {
                            // Unable to get value of the property
                            options[prop.key.name] = '';
                        }
                    }
                });
            }

            if (customHandler) {
                customHandler(key, options);
                continue;
            }

            this.set(key, options);
        }

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
        const pattern = '(?:(?:^[\\s]*)|[^a-zA-Z0-9_])(?:' + matchPattern + ')=("[^"]*"|\'[^\']*\')';
        const re = new RegExp(pattern, 'gim');

        let r;

        while ((r = re.exec(content))) {
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
        }

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

        let resStore = {};
        if (this.options.removeUnusedKeys) {
            resStore = this.resScan;
        } else {
            resStore = this.resStore;
        }

        if (opts.sort) { // sort by key
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
            let ns = this.options.defaultNs;

            // http://i18next.com/translate/keyBasedFallback/
            // Set nsSeparator and keySeparator to false if you prefer
            // having keys as the fallback for translation.
            // i18next.init({
            //   nsSeparator: false,
            //   keySeparator: false
            // })

            if (_.isString(this.options.nsSeparator) && (key.indexOf(this.options.nsSeparator) > -1)) {
                const parts = key.split(this.options.nsSeparator);

                ns = parts[0];
                key = parts[1];
            }

            const keys = _.isString(this.options.keySeparator)
                       ? key.split(this.options.keySeparator)
                       : [key];
            const lng = opts.lng ? opts.lng : this.options.fallbackLng;
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
    // @param {object} [options] The options object
    // @param {string} [options.defaultValue] defaultValue to return if translation not found
    // @param {number} [options.count] count value used for plurals
    // @param {string} [options.context] used for contexts (eg. male)
    // @param {string} [options.ns] namespace for the translation
    // @param {string|boolean} [options.nsSeparator] The value used to override this.options.nsSeparator
    // @param {string|boolean} [options.keySeparator] The value used to override this.options.keySeparator
    set(key, options = {}) {
        // Backward compatibility
        if (_.isString(options)) {
            let defaultValue = options;

            options = {};
            options.defaultValue = defaultValue;
        }

        const nsSeparator = (options.nsSeparator !== undefined) ? options.nsSeparator : this.options.nsSeparator;
        const keySeparator = (options.keySeparator !== undefined) ? options.keySeparator : this.options.keySeparator;

        let ns = options.ns || this.options.defaultNs;

        console.assert(_.isString(ns) && !!ns.length, 'ns is not a valid string', ns);

        // http://i18next.com/translate/keyBasedFallback/
        // Set nsSeparator and keySeparator to false if you prefer
        // having keys as the fallback for translation.
        // i18next.init({
        //   nsSeparator: false,
        //   keySeparator: false
        // })

        if (_.isString(nsSeparator) && (key.indexOf(nsSeparator) > -1)) {
            const parts = key.split(nsSeparator);

            ns = parts[0];
            key = parts[1];
        }

        const {
            lngs,
            context,
            contextFallback,
            contextSeparator,
            plural,
            pluralFallback,
            pluralSeparator,
            defaultValue
        } = this.options;
        const keys = _.isString(keySeparator) ? key.split(keySeparator) : [key];

        lngs.forEach((lng) => {
            let resLoad = this.resStore[lng] && this.resStore[lng][ns];
            let resScan = this.resScan[lng] && this.resScan[lng][ns];

            if (!_.isObject(resLoad)) { // skip undefined namespace
                console.log('The namespace "' + ns + '" does not exist:', { key, options });
                return;
            }

            Object.keys(keys).forEach((index) => {
                const key = keys[index];

                if (index < (keys.length - 1)) {
                    resLoad[key] = resLoad[key] || {};
                    resLoad = resLoad[key];
                    resScan[key] = resScan[key] || {};
                    resScan = resScan[key];

                    return; // continue
                }

                // Context & Plural
                // http://i18next.com/translate/context/
                // http://i18next.com/translate/pluralSimple/
                //
                // Format:
                // "<key>[[{{contextSeparator}}<context>]{{pluralSeparator}}<plural>]"
                //
                // Example:
                // {
                //   "translation": {
                //     "friend": "A friend",
                //     "friend_male": "A boyfriend",
                //     "friend_female": "A girlfriend",
                //     "friend_male_plural": "{{count}} boyfriends",
                //     "friend_female_plural": "{{count}} girlfriends"
                //   }
                // }
                const resKeys = [];

                // http://i18next.com/translate/context/
                // Note. The parser only supports string type for "context"
                const containsContext = context
                    && (options.context !== undefined)
                    && (typeof options.context === 'string')
                    && (options.context !== '');

                // http://i18next.com/translate/pluralSimple/
                const containsPlural = plural
                    && (options.count !== undefined);

                if (!containsContext && !containsPlural) {
                    resKeys.push(key);
                }

                if ((containsContext && contextFallback) || (containsPlural && pluralFallback)) {
                    resKeys.push(key);
                }

                if (containsContext) {
                    resKeys.push(`${key}${contextSeparator}${options.context}`);
                }

                if (containsPlural) {
                    resKeys.push(`${key}${pluralSeparator}plural`);
                }

                if (containsContext && containsPlural) {
                    resKeys.push(`${key}${contextSeparator}${options.context}${pluralSeparator}plural`);
                }

                resKeys.forEach(resKey => {
                    if (resLoad[resKey] === undefined) {
                        if (options.defaultValue !== undefined) {
                            // Use `options.defaultValue` if specified
                            resLoad[resKey] = options.defaultValue;
                        } else {
                            // Fallback to `defaultValue`
                            resLoad[resKey] = _.isFunction(defaultValue)
                                ? defaultValue(lng, ns, key, options)
                                : defaultValue;
                        }
                        this.debuglog('Added a new translation key { %s: %s } to %s',
                            JSON.stringify(resKey),
                            JSON.stringify(resLoad[resKey]),
                            JSON.stringify(this.formatResourceLoadPath(lng, ns))
                        );
                    }

                    resScan[resKey] = resLoad[resKey];
                });
            });
        });
    }
    // Returns a JSON string containing translation information
    // @param {object} [options] The options object
    // @param {boolean} [options.sort] True to sort object by key
    // @param {function|string[]|number[]} [options.replacer] The same as the JSON.stringify()
    // @param {string|number} [options.space] The same as the JSON.stringify() method
    // @return {string}
    toJSON(options = {}) {
        const { replacer, space, ...others } = options;

        return JSON.stringify(this.get(others), replacer, space);
    }
}

export default Parser;
