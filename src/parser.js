/* eslint no-console: 0 */
/* eslint no-eval: 0 */
import fs from 'fs';
import * as acorn from 'acorn';
import acornJsx from 'acorn-jsx';
import acornStage3 from 'acorn-stage3';
import chalk from 'chalk';
import cloneDeep from 'clone-deep';
import deepMerge from 'deepmerge';
import ensureArray from 'ensure-array';
import { parse } from 'esprima';
import _ from 'lodash';
import parse5 from 'parse5';
import sortObject from 'sortobject';
import i18next from 'i18next';
import jsxwalk from './acorn-jsx-walk';
import flattenObjectKeys from './flatten-object-keys';
import omitEmptyObject from './omit-empty-object';
import nodesToString from './nodes-to-string';

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

    trans: { // Trans component (https://github.com/i18next/react-i18next)
        component: 'Trans',
        i18nKey: 'i18nKey',
        defaultsKey: 'defaults',
        extensions: ['.js', '.jsx'],
        fallbackKey: false,
        acorn: {
            ecmaVersion: 10, // defaults to 10
            sourceType: 'module', // defaults to 'module'
            // Check out https://github.com/acornjs/acorn/tree/master/acorn#interface for additional options
        }
    },

    lngs: ['en'], // array of supported languages
    fallbackLng: 'en', // language to lookup key if not found while calling `parser.get(key, { lng: '' })`

    ns: [], // string or array of namespaces

    defaultLng: 'en', // default language used for checking default values

    defaultNs: 'translation', // default namespace used if not passed to translation function

    defaultValue: '', // default value used if not passed to `parser.set`

    // resource
    resource: {
        // The path where resources get loaded from. Relative to current working directory.
        loadPath: 'i18n/{{lng}}/{{ns}}.json',

        // The path to store resources. Relative to the path specified by `gulp.dest(path)`.
        savePath: 'i18n/{{lng}}/{{ns}}.json',

        // Specify the number of space characters to use as white space to insert into the output JSON string for readability purpose.
        jsonIndent: 2,

        // Normalize line endings to '\r\n', '\r', '\n', or 'auto' for the current operating system. Defaults to '\n'.
        // Aliases: 'CRLF', 'CR', 'LF', 'crlf', 'cr', 'lf'
        lineEnding: '\n'
    },

    keySeparator: '.', // char to separate keys
    nsSeparator: ':', // char to split namespace from key

    // Context Form
    context: true, // whether to add context form key
    contextFallback: true, // whether to add a fallback key as well as the context form key
    contextSeparator: '_', // char to split context from key
    contextDefaultValues: [], // list of values for dynamic values
    contextList: { 'default': { list: [], fallback: false } }, // all valid dynamic values

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

const normalizeOptions = (options) => {
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

    // Trans
    if (_.get(options, 'trans')) {
        if (_.isUndefined(_.get(options, 'trans.component'))) {
            _.set(options, 'trans.component', defaults.trans.component);
        }
        if (_.isUndefined(_.get(options, 'trans.i18nKey'))) {
            _.set(options, 'trans.i18nKey', defaults.trans.i18nKey);
        }
        if (_.isUndefined(_.get(options, 'trans.defaultsKey'))) {
            _.set(options, 'trans.defaultsKey', defaults.trans.defaultsKey);
        }
        if (_.isUndefined(_.get(options, 'trans.extensions'))) {
            _.set(options, 'trans.extensions', defaults.trans.extensions);
        }
        if (_.isUndefined(_.get(options, 'trans.fallbackKey'))) {
            _.set(options, 'trans.fallbackKey', defaults.trans.fallbackKey);
        }
        if (_.isUndefined(_.get(options, 'trans.acorn'))) {
            _.set(options, 'trans.acorn', defaults.trans.acorn);
        }
    }

    // Resource
    if (_.isUndefined(_.get(options, 'resource.loadPath'))) {
        _.set(options, 'resource.loadPath', defaults.resource.loadPath);
    }
    if (_.isUndefined(_.get(options, 'resource.savePath'))) {
        _.set(options, 'resource.savePath', defaults.resource.savePath);
    }
    if (_.isUndefined(_.get(options, 'resource.jsonIndent'))) {
        _.set(options, 'resource.jsonIndent', defaults.resource.jsonIndent);
    }
    if (_.isUndefined(_.get(options, 'resource.lineEnding'))) {
        _.set(options, 'resource.lineEnding', defaults.resource.lineEnding);
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

    options.ns = _.union(_.flatten(options.ns.concat(options.defaultNs)));

    return options;
};

// Get an array of plural suffixes for a given language.
// @param {string} lng The language.
// @param {string} pluralSeparator pluralSeparator, default '_'.
// @return {array} An array of plural suffixes.
const getPluralSuffixes = (lng, pluralSeparator = '_') => {
    const rule = i18next.services.pluralResolver.getRule(lng);

    if (!(rule && rule.numbers)) {
        return []; // Return an empty array if lng is not supported
    }

    if (rule.numbers.length === 1) {
        return [`${pluralSeparator}0`];
    }

    if (rule.numbers.length === 2) {
        return ['', `${pluralSeparator}plural`];
    }

    const suffixes = rule.numbers.reduce((acc, n, i) => {
        return acc.concat(`${pluralSeparator}${i}`);
    }, []);

    return suffixes;
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

    // The all plurals suffixes for each of target languages.
    pluralSuffixes = {};

    constructor(options) {
        this.options = normalizeOptions({
            ...this.options,
            ...options
        });

        const lngs = this.options.lngs;
        const namespaces = this.options.ns;

        lngs.forEach((lng) => {
            this.resStore[lng] = this.resStore[lng] || {};
            this.resScan[lng] = this.resScan[lng] || {};

            this.pluralSuffixes[lng] = ensureArray(getPluralSuffixes(lng, this.options.pluralSeparator));
            if (this.pluralSuffixes[lng].length === 0) {
                this.log(`No plural rule found for: ${lng}`);
            }

            namespaces.forEach((ns) => {
                const resPath = this.formatResourceLoadPath(lng, ns);

                this.resStore[lng][ns] = {};
                this.resScan[lng][ns] = {};

                try {
                    if (fs.existsSync(resPath)) {
                        this.resStore[lng][ns] = JSON.parse(fs.readFileSync(resPath, 'utf-8'));
                    }
                } catch (err) {
                    this.error(`Unable to load resource file ${chalk.yellow(JSON.stringify(resPath))}: lng=${lng}, ns=${ns}`);
                    this.error(err);
                }
            });
        });

        this.log(`options=${JSON.stringify(this.options, null, 2)}`);
    }

    log(...args) {
        const { debug } = this.options;
        if (debug) {
            console.log.apply(this, [chalk.cyan('i18next-scanner:')].concat(args));
        }
    }

    error(...args) {
        console.error.apply(this, [chalk.red('i18next-scanner:')].concat(args));
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

    fixStringAfterRegExp(strToFix) {
        let fixedString = _.trim(strToFix); // Remove leading and trailing whitespace
        const firstChar = fixedString[0];

        // Ignore key with embedded expressions in string literals
        if (firstChar === '`' && fixedString.match(/\${.*?}/)) {
            return null;
        }

        if (_.includes(['\'', '"', '`'], firstChar)) {
            // Remove first and last character
            fixedString = fixedString.slice(1, -1);
        }

        // restore multiline strings
        fixedString = fixedString.replace(/(\\\n|\\\r\n)/g, '');

        // JavaScript character escape sequences
        // https://mathiasbynens.be/notes/javascript-escapes

        // Single character escape sequences
        // Note: IE < 9 treats '\v' as 'v' instead of a vertical tab ('\x0B'). If cross-browser compatibility is a concern, use \x0B instead of \v.
        // Another thing to note is that the \v and \0 escapes are not allowed in JSON strings.
        fixedString = fixedString.replace(/(\\b|\\f|\\n|\\r|\\t|\\v|\\0|\\\\|\\"|\\')/g, (match) => eval(`"${match}"`));

        // * Octal escapes have been deprecated in ES5.
        // * Hexadecimal escape sequences: \\x[a-fA-F0-9]{2}
        // * Unicode escape sequences: \\u[a-fA-F0-9]{4}
        fixedString = fixedString.replace(/(\\x[a-fA-F0-9]{2}|\\u[a-fA-F0-9]{4})/g, (match) => eval(`"${match}"`));
        return fixedString;
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

        const funcs = (opts.list !== undefined)
            ? ensureArray(opts.list)
            : ensureArray(this.options.func.list);

        if (funcs.length === 0) {
            return this;
        }

        const matchFuncs = funcs
            .map(func => ('(?:' + func + ')'))
            .join('|')
            .replace(/\./g, '\\.');
        // `\s` matches a single whitespace character, which includes spaces, tabs, form feeds, line feeds and other unicode spaces.
        const matchSpecialCharacters = '[\\r\\n\\s]*';
        const stringGroup =
            matchSpecialCharacters + '(' +
            // backtick (``)
            '`(?:[^`\\\\]|\\\\(?:.|$))*`' +
            '|' +
            // double quotes ("")
            '"(?:[^"\\\\]|\\\\(?:.|$))*"' +
            '|' +
            // single quote ('')
            '\'(?:[^\'\\\\]|\\\\(?:.|$))*\'' +
            ')' + matchSpecialCharacters;
        const pattern = '(?:(?:^\\s*)|[^a-zA-Z0-9_])' +
            '(?:' + matchFuncs + ')' +
            '\\(' + stringGroup +
            '(?:[\\,]' + stringGroup + ')?' +
            '[\\,\\)]';
        const re = new RegExp(pattern, 'gim');

        let r;
        while ((r = re.exec(content))) {
            const options = {};
            const full = r[0];

            let key = this.fixStringAfterRegExp(r[1], true);
            if (!key) {
                continue;
            }

            if (r[2] !== undefined) {
                const defaultValue = this.fixStringAfterRegExp(r[2], false);
                if (!defaultValue) {
                    continue;
                }
                options.defaultValue = defaultValue;
            }

            const endsWithComma = (full[full.length - 1] === ',');
            if (endsWithComma) {
                const { propsFilter } = { ...opts };

                let code = matchBalancedParentheses(content.substr(re.lastIndex));

                if (typeof propsFilter === 'function') {
                    code = propsFilter(code);
                }

                try {
                    const syntax = code.trim() !== '' ? parse('(' + code + ')') : {};

                    const props = _.get(syntax, 'body[0].expression.properties') || [];
                    // http://i18next.com/docs/options/
                    const supportedOptions = [
                        'defaultValue',
                        'defaultValue_plural',
                        'count',
                        'context',
                        'contextList',
                        'ns',
                        'keySeparator',
                        'nsSeparator',
                    ];

                    props.forEach((prop) => {
                        if (_.includes(supportedOptions, prop.key.name)) {
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
                    this.error(`Unable to parse code "${code}"`);
                    this.error(err);
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

    // Parses translation keys from `Trans` components in JSX
    // <Trans i18nKey="some.key">Default text</Trans>
    parseTransFromString(content, opts = {}, customHandler = null) {
        if (_.isFunction(opts)) {
            customHandler = opts;
            opts = {};
        }

        const {
            transformOptions = {}, // object
            component = this.options.trans.component, // string
            i18nKey = this.options.trans.i18nKey, // string
            defaultsKey = this.options.trans.defaultsKey, // string
            fallbackKey, // boolean|function
            acorn: acornOptions = this.options.trans.acorn, // object
        } = { ...opts };

        const parseJSXElement = (node) => {
            if (!node) {
                return;
            }

            ensureArray(node.openingElement.attributes).forEach(attribute => {
                const value = attribute.value;

                if (!(value && value.type === 'JSXExpressionContainer')) {
                    return;
                }

                const expression = value.expression;
                if (!(expression && expression.type === 'JSXElement')) {
                    return;
                }

                parseJSXElement(expression);
            });

            ensureArray(node.children).forEach(childNode => {
                if (childNode.type === 'JSXElement') {
                    parseJSXElement(childNode);
                }
            });

            if (node.openingElement.name.name !== component) {
                return;
            }

            const attr = ensureArray(node.openingElement.attributes)
                .reduce((acc, attribute) => {
                    if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') {
                        return acc;
                    }

                    const { name } = attribute.name;

                    if (attribute.value.type === 'Literal') {
                        acc[name] = attribute.value.value;
                    } else if (attribute.value.type === 'JSXExpressionContainer') {
                        const expression = attribute.value.expression;

                        // Identifier
                        if (expression.type === 'Identifier') {
                            acc[name] = expression.name;
                        }

                        // Literal
                        if (expression.type === 'Literal') {
                            acc[name] = expression.value;
                        }

                        // Object Expression
                        if (expression.type === 'ObjectExpression') {
                            const properties = ensureArray(expression.properties);
                            acc[name] = properties.reduce((obj, property) => {
                                if (property.value.type === 'Literal') {
                                    obj[property.key.name] = property.value.value;
                                } else if (property.value.type === 'TemplateLiteral') {
                                    obj[property.key.name] = property.value.quasis
                                        .map(element => element.value.cooked)
                                        .join('');
                                } else {
                                    // Unable to get value of the property
                                    obj[property.key.name] = '';
                                }

                                return obj;
                            }, {});
                        }

                        // Template Literal
                        if (expression.type === 'TemplateLiteral') {
                            acc[name] = expression.quasis
                                .map(element => element.value.cooked)
                                .join('');
                        }
                    }

                    return acc;
                }, {});

            const transKey = _.trim(attr[i18nKey]);

            const defaultsString = attr[defaultsKey] || '';
            if (typeof defaultsString !== 'string') {
                this.log(`defaults value must be a static string, saw ${chalk.yellow(defaultsString)}`);
            }

            // https://www.i18next.com/translation-function/essentials#overview-options
            const tOptions = attr.tOptions;
            const options = {
                ...tOptions,
                defaultValue: defaultsString || nodesToString(node.children),
                fallbackKey: fallbackKey || this.options.trans.fallbackKey
            };

            if (Object.prototype.hasOwnProperty.call(attr, 'count')) {
                options.count = Number(attr.count) || 0;
            }

            if (Object.prototype.hasOwnProperty.call(attr, 'ns')) {
                if (typeof options.ns !== 'string') {
                    this.log(`The ns attribute must be a string, saw ${chalk.yellow(attr.ns)}`);
                }

                options.ns = attr.ns;
            }

            if (customHandler) {
                customHandler(transKey, options);
                return;
            }

            this.set(transKey, options);
        };

        try {
            const ast = acorn.Parser.extend(acornStage3, acornJsx())
                .parse(content, {
                    ...defaults.trans.acorn,
                    ...acornOptions
                });

            jsxwalk(ast, {
                JSXElement: parseJSXElement
            });
        } catch (err) {
            if (transformOptions.filepath) {
                this.error(`Unable to parse ${chalk.blue(component)} component from ${chalk.yellow(JSON.stringify(transformOptions.filepath))}`);
                console.error('    ' + err);
            } else {
                this.error(`Unable to parse ${chalk.blue(component)} component:`);
                console.error(content);
                console.error('    ' + err);
            }
        }

        return this;
    }

    // Parses translation keys from `data-i18n` attribute in HTML
    // <div data-i18n="[attr]ns:foo.bar;[attr]ns:foo.baz">
    // </div>
    parseAttrFromString(content, opts = {}, customHandler = null) {
        let setter = this.set.bind(this);

        if (_.isFunction(opts)) {
            setter = opts;
            opts = {};
        } else if (_.isFunction(customHandler)) {
            setter = customHandler;
        }

        const attrs = (opts.list !== undefined)
            ? ensureArray(opts.list)
            : ensureArray(this.options.attr.list);

        if (attrs.length === 0) {
            return this;
        }

        const ast = parse5.parse(content);

        const parseAttributeValue = (key) => {
            key = _.trim(key);
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

            setter(key);
        };

        const walk = (nodes) => {
            nodes.forEach(node => {
                if (node.attrs) {
                    node.attrs.forEach(attr => {
                        if (attrs.indexOf(attr.name) !== -1) {
                            const values = attr.value.split(';');
                            values.forEach(parseAttributeValue);
                        }
                    });
                }
                if (node.childNodes) {
                    walk(node.childNodes);
                }
                if (node.content && node.content.childNodes) {
                    walk(node.content.childNodes);
                }
            });
        };

        walk(ast.childNodes);

        return this;
    }

    // Get the value of a translation key or the whole resource store containing translation information
    // @param {string} [key] The translation key
    // @param {object} [opts] The opts object
    // @param {boolean} [opts.sort] True to sort object by key
    // @param {boolean} [opts.lng] The language to use
    // @return {object}
    get(key, opts = {}) {
        if (_.isPlainObject(key)) {
            opts = key;
            key = undefined;
        }

        let resStore = {};
        if (this.options.removeUnusedKeys) {
            // Merge two objects `resStore` and `resScan` deeply, returning a new merged object with the elements from both `resStore` and `resScan`.
            const resMerged = deepMerge(this.resStore, this.resScan);

            Object.keys(this.resStore).forEach((lng) => {
                Object.keys(this.resStore[lng]).forEach((ns) => {
                    const resStoreKeys = flattenObjectKeys(_.get(this.resStore, [lng, ns], {}));
                    const resScanKeys = flattenObjectKeys(_.get(this.resScan, [lng, ns], {}));
                    const unusedKeys = _.differenceWith(resStoreKeys, resScanKeys, _.isEqual);

                    for (let i = 0; i < unusedKeys.length; ++i) {
                        _.unset(resMerged[lng][ns], unusedKeys[i]);
                        this.log(`Removed an unused translation key { ${chalk.red(JSON.stringify(unusedKeys[i]))} from ${chalk.red(JSON.stringify(this.formatResourceLoadPath(lng, ns)))}`);
                    }

                    // Omit empty object
                    resMerged[lng][ns] = omitEmptyObject(resMerged[lng][ns]);
                });
            });

            resStore = resMerged;
        } else {
            resStore = cloneDeep(this.resStore);
        }

        if (opts.sort) {
            Object.keys(resStore).forEach((lng) => {
                const namespaces = resStore[lng];
                Object.keys(namespaces).forEach((ns) => {
                    // Deeply sort an object by its keys without mangling any arrays inside of it
                    resStore[lng][ns] = sortObject(namespaces[ns]);
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
    // @param {boolean|function} [options.fallbackKey] When the key is missing, pass `true` to return `options.defaultValue` as key, or pass a function to return user-defined key.
    // @param {string} [options.defaultValue] defaultValue to return if translation not found
    // @param {number} [options.count] count value used for plurals
    // @param {string} [options.context] used for contexts (eg. male)
    // @param {object} [options.contextList] used for informing 18next-scanner of all correct contexts
    // @param {string} [options.ns] namespace for the translation
    // @param {string|boolean} [options.nsSeparator] The value used to override this.options.nsSeparator
    // @param {string|boolean} [options.keySeparator] The value used to override this.options.keySeparator
    set(key, options = {}) {
        // Backward compatibility
        if (_.isString(options)) {
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

        let keys = [];

        if (key) {
            keys = _.isString(keySeparator) ? key.split(keySeparator) : [key];
        } else {
            // fallback key
            if (options.fallbackKey === true) {
                key = options.defaultValue;
            }
            if (typeof options.fallbackKey === 'function') {
                key = options.fallbackKey(ns, options.defaultValue);
            }

            if (!key) {
                // Ignore empty key
                return;
            }

            keys = [key];
        }

        const {
            lngs,
            context,
            contextFallback,
            contextSeparator,
            contextDefaultValues,
            contextList,
            plural,
            pluralFallback,
            pluralSeparator,
            defaultLng,
            defaultValue
        } = this.options;

        lngs.forEach((lng) => {
            let resLoad = this.resStore[lng] && this.resStore[lng][ns];
            let resScan = this.resScan[lng] && this.resScan[lng][ns];

            if (!_.isPlainObject(resLoad)) { // Skip undefined namespace
                this.error(`${chalk.yellow(JSON.stringify(ns))} does not exist in the namespaces (${chalk.yellow(JSON.stringify(this.options.ns))}): key=${chalk.yellow(JSON.stringify(key))}, options=${chalk.yellow(JSON.stringify(options))}`);
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
                    if (_.isUndefined(options.context)) {
                        return false;
                    }
                    return _.isFunction(context)
                        ? context(lng, ns, key, options)
                        : !!context;
                })();

                // http://i18next.com/translate/pluralSimple/
                const containsPlural = (() => {
                    if (!plural) {
                        return false;
                    }
                    if (_.isUndefined(options.count)) {
                        return false;
                    }
                    return _.isFunction(plural)
                        ? plural(lng, ns, key, options)
                        : !!plural;
                })();

                const contextValues = (() => {
                    if (options.context !== '') {
                        return [options.context];
                    }
                    if (ensureArray(contextList?.[options.contextList]?.list)?.length > 0) {
                        return ensureArray(contextList[options.contextList]?.list);
                    }
                    if (ensureArray(contextDefaultValues).length > 0) {
                        return ensureArray(contextDefaultValues);
                    }
                    return [];
                })();

                if (containsPlural) {
                    let suffixes = pluralFallback
                        ? this.pluralSuffixes[lng]
                        : this.pluralSuffixes[lng].slice(1);

                    suffixes.forEach((pluralSuffix) => {
                        resKeys.push(`${key}${pluralSuffix}`);
                    });

                    if (containsContext && containsPlural) {
                        suffixes.forEach((pluralSuffix) => {
                            contextValues.forEach(contextValue => {
                                resKeys.push(`${key}${contextSeparator}${contextValue}${pluralSuffix}`);
                            });
                        });
                    }
                } else {
                    if (!containsContext || (containsContext && (contextList?.[options.contextList]?.fallback ?? contextFallback))) {
                        resKeys.push(key);
                    }

                    if (containsContext) {
                        contextValues.forEach(contextValue => {
                            resKeys.push(`${key}${contextSeparator}${contextValue}`);
                        });
                    }
                }

                resKeys.forEach((resKey) => {
                    if (resLoad[resKey] === undefined) {
                        if (options.defaultValue_plural !== undefined && resKey.endsWith(`${pluralSeparator}plural`)) {
                            resLoad[resKey] = options.defaultValue_plural;
                        } else {
                            // Fallback to `defaultValue`
                            resLoad[resKey] = _.isFunction(defaultValue)
                                ? defaultValue(lng, ns, key, options)
                                : (options.defaultValue || defaultValue);
                        }
                        this.log(`Added a new translation key { ${chalk.yellow(JSON.stringify(resKey))}: ${chalk.yellow(JSON.stringify(resLoad[resKey]))} } to ${chalk.yellow(JSON.stringify(this.formatResourceLoadPath(lng, ns)))}`);
                    } else if (options.defaultValue && (!options.defaultValue_plural || !resKey.endsWith(`${pluralSeparator}plural`))) {
                        if (!resLoad[resKey]) {
                            // Use `options.defaultValue` if specified
                            resLoad[resKey] = options.defaultValue;
                        } else if ((resLoad[resKey] !== options.defaultValue) && (lng === defaultLng)) {
                            // A default value has provided but it's different with the expected default
                            this.log(`The translation key ${chalk.yellow(JSON.stringify(resKey))} has a different default value, you may need to check the translation key of default language (${defaultLng})`);
                        }
                    } else if (options.defaultValue_plural && resKey.endsWith(`${pluralSeparator}plural`)) {
                        if (!resLoad[resKey]) {
                            // Use `options.defaultValue_plural` if specified
                            resLoad[resKey] = options.defaultValue_plural;
                        } else if ((resLoad[resKey] !== options.defaultValue_plural) && (lng === defaultLng)) {
                            // A default value has provided but it's different with the expected default
                            this.log(`The translation key ${chalk.yellow(JSON.stringify(resKey))} has a different default value, you may need to check the translation key of default language (${defaultLng})`);
                        }
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

i18next.init();

export default Parser;
