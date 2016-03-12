'use strict';

var t = require('tap');
var i18nextScanner = require('../');
var customTransform = require('./utils/transform');
var util = require('util');

var options = {
    lngs: ['en'],
};

t.plan(2)

t.test('disabled keyseparator', function(t){
    options.keyseparator = false;
    var parser = i18nextScanner(options, customTransform).parser;
    parser.parse('Creating...', '');
    t.same(parser.resStore, {
        en: {
            translation:{
                'Creating...': ''
            }
        }
    }, 'The key should not use default keyseparator . to split');
    t.end();
});

t.test('default keyseparator', function(t){
    options.keyseparator = '.';
    var parser = i18nextScanner(options, customTransform).parser;
    parser.parse('key1.key2', '');
    console.log(util.inspect(parser.resStore));
    t.same(parser.resStore, {
        en: {
            translation:{
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The key should use default keyseparator . to split');
    t.end();
});
