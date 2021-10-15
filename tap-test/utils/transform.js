import _ from 'lodash';
import fs from 'fs';
import gutil from 'gulp-util';
import path from 'path';
import hash from 'sha1';
import table from 'text-table';

const unquote = (str, quoteChar) => {
    quoteChar = quoteChar || '"';
    if (str[0] === quoteChar && str[str.length - 1] === quoteChar) {
        return str.slice(1, str.length - 1);
    }
    return str;
};

// Parses hash arguments for Handlebars block helper
// @see [Hash Arguments]{@http://code.demunskin.com/other/Handlebars/block_helpers.html#hash-arguments}
// @see [Regular expression for parsing name value pairs]{@link http://stackoverflow.com/questions/168171/regular-expression-for-parsing-name-value-pairs}
// @example <caption>Example usage:</caption>
// it will output ["id=nav-bar", "class = "top"", "foo = "bar\"baz""]
// var str = ' id=nav-bar class = "top" foo = "bar\\"baz" ';
// str.match(/([^=,\s]*)\s*=\s*((?:"(?:\\.|[^"\\]+)*"|'(?:\\.|[^'\\]+)*')|[^'"\s]*)/igm) || [];
// @param [string] str A string representation of hash arguments
// @return {object}
const parseHashArguments = function(str) {
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
};

const transform = function(file, enc, done) {
    const parser = this.parser;
    const extname = path.extname(file.path);
    const content = fs.readFileSync(file.path, enc);
    const tableData = [
        ['Key', 'Value']
    ];

    gutil.log('parsing ' + JSON.stringify(file.relative) + ':');

    { // Using Gettext style i18n
        parser.parseFuncFromString(content, { list: ['i18n._'] }, function(key) {
            const value = key;
            key = hash(value); // returns a hash value as its default key
            parser.set(key, value);

            tableData.push([key, _.isUndefined(value) ? parser.options.defaultValue : value ]);
        });
    }

    { // Handlebars - i18n function helper
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

            const params = parseHashArguments(r[2]);
            if (_.has(params, 'defaultKey')) {
                key = params['defaultKey'];
            }

            if (_.isUndefined(key) && _.isUndefined(value)) {
                return;
            }

            if (_.isUndefined(key)) {
                key = hash(value); // returns a hash value as its default key
            }

            parser.set(key, value);

            tableData.push([key, _.isUndefined(value) ? parser.options.defaultValue : value ]);
        });
    }

    { // Handlebars - i18n block helper
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

            parser.set(key, value);

            tableData.push([key, _.isUndefined(value) ? parser.options.defaultValue : value ]);
        });
    }

    if (_.size(tableData) > 1) {
        gutil.log('result of ' + JSON.stringify(file.relative) + ':\n' + table(tableData, {'hsep': ' | '}));
    }

    done();
};

export default transform;
