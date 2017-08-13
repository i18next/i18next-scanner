/* eslint no-console: 0 */
import fs from 'fs';
import isArray from 'lodash/isArray';
import isFunction from 'lodash/isFunction';
import isObject from 'lodash/isObject';
import isUndefined from 'lodash/isUndefined';
import isString from 'lodash/isString';
import flatten from 'lodash/flatten';
import union from 'lodash/union';
import get from 'lodash/get';
import set from 'lodash/set';
import escapeRegExp from 'lodash/escapeRegExp';
import includes from 'lodash/includes';
import trim from 'lodash/trim';
import toPairs from 'lodash/toPairs';
import sortBy from 'lodash/sortBy';
import { parse } from 'esprima';
import ensureArray from './ensure-array';

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
    if (isUndefined(get(options, 'attr.list'))) {
        set(options, 'attr.list', defaults.attr.list);
    }
    if (isUndefined(get(options, 'attr.extensions'))) {
        set(options, 'attr.extensions', defaults.attr.extensions);
    }

    // Function
    if (isUndefined(get(options, 'func.list'))) {
        set(options, 'func.list', defaults.func.list);
    }

    // Resource
    if (isUndefined(get(options, 'func.extensions'))) {
        set(options, 'func.extensions', defaults.func.extensions);
    }
    if (isUndefined(get(options, 'resource.loadPath'))) {
        set(options, 'resource.loadPath', defaults.resource.loadPath);
    }
    if (isUndefined(get(options, 'resource.savePath'))) {
        set(options, 'resource.savePath', defaults.resource.savePath);
    }
    if (isUndefined(get(options, 'resource.jsonIndent'))) {
        set(options, 'resource.jsonIndent', defaults.resource.jsonIndent);
    }

    // Accept both nsseparator or nsSeparator
    if (!isUndefined(options.nsseparator)) {
        options.nsSeparator = options.nsseparator;
        delete options.nsseparator;
    }
    // Allowed only string or false
    if (!isString(options.nsSeparator)) {
        options.nsSeparator = false;
    }

    // Accept both keyseparator or keySeparator
    if (!isUndefined(options.keyseparator)) {
        options.keySeparator = options.keyseparator;
        delete options.keyseparator;
    }
    // Allowed only string or false
    if (!isString(options.keySeparator)) {
        options.keySeparator = false;
    }

    if (!isArray(options.ns)) {
        options.ns = [options.ns];
    }

    options.ns = union(flatten(options.ns.concat(options.defaultNs)));

    return options;
};

/**
* Creates a new parser
* @constructor
*/
class Parser {
    options = { ...defaults };

    // The resStore stores all translation keys including unused ones
    resStore = {};

    // The resScan only stores translation keys parsed from code
    resScan = {};

    constructor(options) {
        this.options = transformOptions({
            ...this.options,
            ...options
        });

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
                    this.log('Unable to load ' + JSON.stringify(resPath));
                }
            });
        });

        this.log(`Parser: options=${JSON.stringify(this.options)}`);
    }
    log(...args) {
        const { debug } = this.options;
        if (debug) {
            console.log.apply(this, args);
        }
    }
    formatResourceLoadPath(lng, ns) {
        const options = this.options;

        const regex = {
            lng: new RegExp(escapeRegExp(options.interpolation.prefix + 'lng' + options.interpolation.suffix), 'g'),
            ns: new RegExp(escapeRegExp(options.interpolation.prefix + 'ns' + options.interpolation.suffix), 'g')
        };

        return options.resource.loadPath
            .replace(regex.lng, lng)
            .replace(regex.ns, ns);
    }
    formatResourceSavePath(lng, ns) {
        const options = this.options;
        const regex = {
            lng: new RegExp(escapeRegExp(options.interpolation.prefix + 'lng' + options.interpolation.suffix), 'g'),
            ns: new RegExp(escapeRegExp(options.interpolation.prefix + 'ns' + options.interpolation.suffix), 'g')
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
        if (isFunction(opts)) {
            customHandler = opts;
            opts = {};
        }

        const funcs = (opts.list !== undefined)
            ? ensureArray(opts.list)
            : ensureArray(this.options.func.list);

        if (funcs.length === 0) {
            return this;
        }

        const matchPattern = funcs
            .map(func => ('(?:' + func + ')'))
            .join('|')
            .replace(/\./g, '\\.');
        const pattern = '(?:(?:^\\s*)|[^a-zA-Z0-9_])(?:' + matchPattern + ')\\(("(?:[^"\\\\]|\\\\(?:.|$))*"|\'(?:[^\'\\\\]|\\\\(?:.|$))*\')\\s*[,)]';
        const re = new RegExp(pattern, 'gim');

        let r;

        while ((r = re.exec(content))) {
            const options = {};
            const full = r[0];

            let key = trim(r[1]); // Remove leading and trailing whitespace
            const firstChar = key[0];
            if (includes(['\'', '"'], firstChar)) {
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
                const { propsFilter } = { ...opts };

                let code = matchBalancedParentheses(content.substr(re.lastIndex));

                if (typeof propsFilter === 'function') {
                    code = propsFilter(code);
                }

                try {
                    const syntax = parse('(' + code + ')');
                    const props = get(syntax, 'body[0].expression.properties') || [];
                    // http://i18next.com/docs/options/
                    const supportedOptions = [
                        'defaultValue',
                        'count',
                        'context',
                        'ns'
                    ];

                    props.forEach((prop) => {
                        if (includes(supportedOptions, prop.key.name)) {
                            if (prop.value.type === 'Literal') {
                                options[prop.key.name] = prop.value.value;
                            } else if (prop.value.type === 'TemplateLiteral') {
                                options[prop.key.name] = prop.value.quasis
                                    .map(element => element.value.cooked)
                                    .join('');
                            } else {
                                // Unable to get value of the property
                                options[prop.key.name] = '';
                            }
                        }
                    });
                } catch (err) {
                    this.log(`Unable to parse code "${code}"`);
                    this.log(err);
                }
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
        if (isFunction(opts)) {
            customHandler = opts;
            opts = {};
        }

        const attrs = (opts.list !== undefined)
            ? ensureArray(opts.list)
            : ensureArray(this.options.attr.list);

        if (attrs.length === 0) {
            return this;
        }

        const matchPattern = attrs
            .map(attr => ('(?:' + attr + ')'))
            .join('|')
            .replace(/\./g, '\\.');
        const pattern = '(?:(?:^[\\s]*)|[^a-zA-Z0-9_])(?:' + matchPattern + ')=("[^"]*"|\'[^\']*\')';
        const re = new RegExp(pattern, 'gim');

        let r;

        while ((r = re.exec(content))) {
            const attr = trim(r[1], '\'"');
            const keys = (attr.indexOf(';') >= 0)
                ? attr.split(';')
                : [attr];

            keys.forEach((key) => {
                key = trim(key);
                if (key.length === 0) {
                    return;
                }
                if (key.indexOf('[') === 0) {
                    const parts = key.split(']');
                    key = parts[1];
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
        if (isObject(key)) {
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
                    const pairs = toPairs(namespaces[ns]);
                    resStore[lng][ns] = sortBy(pairs, (pair => pair[0]))
                        .reduce((memo, pair) => {
                            const _key = pair[0];
                            const _value = pair[1];
                            memo[_key] = _value;
                            return memo;
                        }, {});
                });
            });
        }

        if (!isUndefined(key)) {
            let ns = this.options.defaultNs;

            // http://i18next.com/translate/keyBasedFallback/
            // Set nsSeparator and keySeparator to false if you prefer
            // having keys as the fallback for translation.
            // i18next.init({
            //   nsSeparator: false,
            //   keySeparator: false
            // })

            if (isString(this.options.nsSeparator) && (key.indexOf(this.options.nsSeparator) > -1)) {
                const parts = key.split(this.options.nsSeparator);

                ns = parts[0];
                key = parts[1];
            }

            const keys = isString(this.options.keySeparator)
                       ? key.split(this.options.keySeparator)
                       : [key];
            const lng = opts.lng
                ? opts.lng
                : this.options.fallbackLng;
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
        if (isString(options)) {
            const defaultValue = options;
            options = {
                defaultValue: defaultValue
            };
        }

        const nsSeparator = (options.nsSeparator !== undefined)
            ? options.nsSeparator
            : this.options.nsSeparator;
        const keySeparator = (options.keySeparator !== undefined)
            ? options.keySeparator
            : this.options.keySeparator;

        let ns = options.ns || this.options.defaultNs;

        console.assert(isString(ns) && !!ns.length, 'ns is not a valid string', ns);

        // http://i18next.com/translate/keyBasedFallback/
        // Set nsSeparator and keySeparator to false if you prefer
        // having keys as the fallback for translation.
        // i18next.init({
        //   nsSeparator: false,
        //   keySeparator: false
        // })

        if (isString(nsSeparator) && (key.indexOf(nsSeparator) > -1)) {
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
        const keys = isString(keySeparator)
            ? key.split(keySeparator)
            : [key];

        lngs.forEach((lng) => {
            let resLoad = this.resStore[lng] && this.resStore[lng][ns];
            let resScan = this.resScan[lng] && this.resScan[lng][ns];

            if (!isObject(resLoad)) { // Skip undefined namespace
                this.log('The namespace "' + ns + '" does not exist:', { key, options });
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
                const containsContext = (() => {
                    if (!context) {
                        return false;
                    }
                    if (isUndefined(options.context)) {
                        return false;
                    }
                    return isFunction(context)
                        ? context(lng, ns, key, options)
                        : !!context;
                })();

                // http://i18next.com/translate/pluralSimple/
                const containsPlural = (() => {
                    if (!plural) {
                        return false;
                    }
                    if (isUndefined(options.count)) {
                        return false;
                    }
                    return isFunction(plural)
                        ? plural(lng, ns, key, options)
                        : !!plural;
                })();

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
                            resLoad[resKey] = isFunction(defaultValue)
                                ? defaultValue(lng, ns, key, options)
                                : defaultValue;
                        }
                        this.log('Added a new translation key { %s: %s } to %s',
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
