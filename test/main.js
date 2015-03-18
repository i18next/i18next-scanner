'use strict';

var fs = require('fs');
var path = require('path');
var test = require('tap').test;

var toFixturePath = function(fileName) {
    var args = Array.prototype.slice.call(arguments);
    return path.resolve.apply(null, [__dirname, 'fixtures'].concat(args));
};

test('setup', function(t) {
    t.end();
});

test('teardown', function(t) {
    t.end();
});
