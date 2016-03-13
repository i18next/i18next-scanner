'use strict';

import _ from 'lodash';
import fs from 'fs';
import gutil from 'gulp-util';
import path from 'path';
import hash from 'sha1';
import table from 'text-table';

const transform = function(file, enc, done) {
    const parser = this.parser;
    const extname = path.extname(file.path);
    const content = fs.readFileSync(file.path, enc);
    const tableData = [
        ['Key', 'Value']
    ];

    gutil.log('parsing ' + JSON.stringify(file.relative) + ':');

    { // Using i18next-text
        const results = content.match(/i18n\._\(("[^"]*"|'[^']*')\s*[\,\)]/igm) || '';
        _.each(results, function(result) {
            let key, value;
            const r = result.match(/i18n\._\(("[^"]*"|'[^']*')/);
            if (r) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');

                key = hash(value); // returns a hash value as its default key

                parser.parseKey(key, value);

                tableData.push([key, _.isUndefined(value) ? parser.options.defaultValue : value ]);
            }
        });
    }

    { // i18n function helper
        const results = content.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/gm) || [];
        _.each(results, function(result) {
            let key, value;
            const r = result.match(/{{i18n\s+("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')?([^}]*)}}/m) || [];
            if ( ! _.isUndefined(r[1])) {
                value = _.trim(r[1], '\'"');

                // Replace double backslash with single backslash
                value = value.replace(/\\\\/g, '\\');
                value = value.replace(/\\\'/, '\'');
            }

            const params = parser.parseHashArguments(r[2]);
            if (_.has(params, 'defaultKey')) {
                key = params['defaultKey'];
            }

            if (_.isUndefined(key) && _.isUndefined(value)) {
                return;
            }

            if (_.isUndefined(key)) {
                key = hash(value); // returns a hash value as its default key
            }

            parser.parseKey(key, value);

            tableData.push([key, _.isUndefined(value) ? parser.options.defaultValue : value ]);
        });
    }

    { // i18n block helper
        const results = content.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/gm) || [];
        _.each(results, function(result) {
            let key, value;
            const r = result.match(/{{#i18n\s*([^}]*)}}((?:(?!{{\/i18n}})(?:.|\n))*){{\/i18n}}/m) || [];

            if ( ! _.isUndefined(r[2])) {
                value = _.trim(r[2], '\'"');
            }

            if (_.isUndefined(value)) {
                return;
            }

            key = hash(value); // returns a hash value as its default key

            parser.parseKey(key, value);

            tableData.push([key, _.isUndefined(value) ? parser.options.defaultValue : value ]);
        });
    }

    if (_.size(tableData) > 1) {
        gutil.log('result of ' + JSON.stringify(file.relative) + ':\n' + table(tableData, {'hsep': ' | '}));
    }

    done();
};
