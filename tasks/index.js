'use strict';

module.exports = function(grunt) {
    var i18next = require('..');
    var vfs = require('vinyl-fs');

    grunt.registerMultiTask('i18next', 'A grunt task for i18next-scanner', function() {
        var done = this.async();
        var options = this.options() || {};
        var targets = (this.file) ? [this.file] : this.files;

        targets.forEach(function(target) {
            vfs.src(target.files || target.src, {base: target.base || '.'})
                .pipe(i18next(options, target.customTransform, target.customFlush))
                .pipe(vfs.dest(target.dest || '.'))
                .on('end', function() {
                    done();
                });
        });
    });
};
