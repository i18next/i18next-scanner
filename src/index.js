import fs from 'fs';
import path from 'path';
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
            parser.parseAttrFromString(content);
        }

        if (includes(get(options, 'func.extensions'), extname)) {
            // Parse translation function (e.g. i18next.t('key'))
            parser.parseFuncFromString(content);
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

        Object.keys(resStore).forEach((lng) => {
            const namespaces = resStore[lng];

            Object.keys(namespaces).forEach((ns) => {
                const obj = namespaces[ns];
                const resPath = parser.formatResourceSavePath(lng, ns);
                const str = JSON.stringify(obj, null, options.resource.jsonIndent);

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
