import _ from 'lodash';
import fs from 'fs';
import VirtualFile from 'vinyl';
import through2 from 'through2';
import Parser from './parser';

// <div data-i18n="[attr]ns:foo.bar;[attr]ns:foo.baz">
// </div>
const parseAttributes = (attributes, content, callback) => {
    const matchPattern = _(attributes)
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

        const keys = _.trim(r[1], '\'"');
        callback(keys);
    });
};

// i18next.t('ns:foo.bar') // matched
// i18next.t("ns:foo.bar") // matched
// i18next.t('ns:foo.bar') // matched
// i18next.t("ns:foo.bar", { count: 1 }); // matched
// i18next.t("ns:foo.bar" + str); // not matched
const parseFunctions = (functions, content, callback) => {
    const matchPattern = _(functions)
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
        callback(key);
    });
};

const transform = (parser, customTransform) => {
    return function _transform(file, enc, done) {
        const { options } = parser;
        const { attributes, functions } = options;
        const content = fs.readFileSync(file.path, enc);

        { // Parse selector attribute
            parseAttributes(attributes, content, (keys) => {
                parser.parseAttrs(keys);
            });
        }

        { // Parse translation function
            parseFunctions(functions, content, (key) => {
                parser.parse(key);
            });
        }

        if (typeof customTransform === 'function') {
            this.parser = parser;
            customTransform.call(this, file, enc, done);
            return;
        }

        done();
    };
};

const flush = (parser, customFlush) => {
    return function _flush(done) {
        const { options } = parser;
        const { sort, interpolationPrefix, interpolationSuffix, resSetPath } = options;

        if (typeof customFlush === 'function') {
            this.parser = parser;
            customFlush.call(this, done);
            return;
        }

        // Flush to resource store
        const resStore = parser.toObject({ sort });
        Object.keys(resStore).forEach((lng) => {
            const namespaces = resStore[lng];
            Object.keys(namespaces).forEach((ns) => {
                const obj = namespaces[ns];
                const regex = {
                    lng: new RegExp(_.escapeRegExp(interpolationPrefix + 'lng' + interpolationSuffix), 'g'),
                    ns: new RegExp(_.escapeRegExp(interpolationPrefix + 'ns' + interpolationSuffix), 'g')
                };
                const resPath = resSetPath
                    .replace(regex.lng, lng)
                    .replace(regex.ns, ns);
                const str = JSON.stringify(obj, null, 4);

                this.push(new VirtualFile({
                    path: resPath,
                    contents: new Buffer(str + '\n')
                }));
            });
        });

        done();
    };
};

// @param {object} options The options object.
// @param {function} [customTransform]
// @param {function} [customFlush]
// @return {object} Returns a through2.obj().
const createStream = (options, customTransform, customFlush) => {
    const parser = new Parser(options);
    const stream = through2.obj(
        transform(parser, customTransform),
        flush(parser, customFlush)
    );

    return stream;
};

// Convinience API
module.exports = (...args) => module.exports.createStream(...args);

// Basic API
module.exports.createStream = createStream;

// Parser
module.exports.Parser = Parser;
module.exports.parseAttributes = parseAttributes;
module.exports.parseFunctions = parseFunctions;
