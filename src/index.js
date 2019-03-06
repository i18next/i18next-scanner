/* eslint-disable no-buffer-constructor */
import fs from 'fs';
import path from 'path';
import eol from 'eol';
import get from 'lodash/get';
import includes from 'lodash/includes';
import VirtualFile from 'vinyl';
import through2 from 'through2';
import Parser from './parser';

const transform = (parser, customTransform) => {
    return function _transform(file, enc, done) {
        const { options } = parser;
        const content = fs.readFileSync(file.path, enc);
        const extname = path.extname(file.path);

        if (includes(get(options, 'attr.extensions'), extname)) {
            // Parse attribute (e.g. data-i18n="key")
            parser.parseAttrFromString(content, {
                transformOptions: {
                    filepath: file.path
                }
            });
        }

        if (includes(get(options, 'func.extensions'), extname)) {
            // Parse translation function (e.g. i18next.t('key'))
            parser.parseFuncFromString(content, {
                transformOptions: {
                    filepath: file.path
                }
            });
        }

        if (includes(get(options, 'trans.extensions'), extname)) {
            // Look for Trans components in JSX
            parser.parseTransFromString(content, {
                transformOptions: {
                    filepath: file.path
                }
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

        if (typeof customFlush === 'function') {
            this.parser = parser;
            customFlush.call(this, done);
            return;
        }

        // Flush to resource store
        const resStore = parser.get({ sort: options.sort });
        const { jsonIndent } = options.resource;
        const lineEnding = String(options.resource.lineEnding).toLowerCase();

        Object.keys(resStore).forEach((lng) => {
            const namespaces = resStore[lng];

            Object.keys(namespaces).forEach((ns) => {
                const obj = namespaces[ns];
                const resPath = parser.formatResourceSavePath(lng, ns);
                let text = JSON.stringify(obj, null, jsonIndent) + '\n';

                if (lineEnding === 'auto') {
                    text = eol.auto(text);
                } else if (lineEnding === '\r\n' || lineEnding === 'crlf') {
                    text = eol.crlf(text);
                } else if (lineEnding === '\n' || lineEnding === 'lf') {
                    text = eol.lf(text);
                } else if (lineEnding === '\r' || lineEnding === 'cr') {
                    text = eol.cr(text);
                } else { // Defaults to LF
                    text = eol.lf(text);
                }

                let contents = null;

                try {
                    // "Buffer.from(string[, encoding])" is added in Node.js v5.10.0
                    contents = Buffer.from(text);
                } catch (e) {
                    // Fallback to "new Buffer(string[, encoding])" which is deprecated since Node.js v6.0.0
                    contents = new Buffer(text);
                }

                this.push(new VirtualFile({
                    path: resPath,
                    contents: contents
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

// Convenience API
module.exports = (...args) => module.exports.createStream(...args);

// Basic API
module.exports.createStream = createStream;

// Parser
module.exports.Parser = Parser;
