'use strict';

var t = require('tap');
var Parser = require('../').Parser;
var util = require('util');

var defaults = {
    lngs: ['en'],
};

t.plan(4);

t.test('disabled nsseparator', function(t){
    var parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: false,
        keySeparator: '.'
    }));
    parser.parseKey('foo:bar', '');
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'foo:bar': ''
            }
        }
    }, 'The ns should not use default nsseparator : to split');
    t.end();
});

t.test('disabled keyseparator', function(t){
    var parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: false
    }));
    parser.parseKey('Creating...', '');
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'Creating...': 'Creating...'
            }
        }
    }, 'The key should not use default keyseparator . to split');
    t.end();
});

t.test('default nsseparator', function(t){
    var parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: '.'
    }));
    parser.parseKey('translation:key1.key2', '');
    console.log(util.inspect(parser.getResourceStore()));
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The ns should use default nsseparator : to split');
    t.end();
});

t.test('default keyseparator', function(t){
    var parser = new Parser(Object.assign({}, defaults, {
        nsSeparator: ':',
        keySeparator: '.'
    }));
    parser.parseKey('key1.key2', '');
    console.log(util.inspect(parser.getResourceStore()));
    t.same(parser.getResourceStore(), {
        en: {
            translation: {
                'key1': {
                    'key2': ''
                }
            }
        }
    }, 'The key should use default keyseparator . to split');
    t.end();
});
