import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import VirtualFile from 'vinyl';
import through2 from 'through2';
import Parser from './parser';

const transform = (parser, customTransform) => {
    return function _transform(file, enc, done) {
        const { options } = parser;
        const content = fs.readFileSync(file.path, enc);
        const extname = path.extname(file.path);

        if (_.includes(options.attr.list, extname)) {
            // FIXME
            console.log(options.attr.list, extname);

            // Parse data attribute from HTML files
            parser.parseHTML(content);
        }

        if (_.includes(options.func.list, extname)) {
            // FIXME
            console.log(options.func.list, extname);

            // Parse translation function from source code
            parser.parseCode(content);
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
        const resStore = parser.getResourceStore({ sort });
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
