//
// https://github.com/kogakure/gulp-tutorial/blob/master/gulp/config.js
//
var banner = [
    '/**',
    ' * <%= pkg.name %> - <%= pkg.description %>',
    ' * <%= pkg.author %>',
    ' * Version <%= pkg.version %>',
    ' * <%= pkg.license %> Licensed',
    ' */',
    ''].join('\n');

module.exports = {
    banner: banner,
    clean: {
        files: [
            'dist'
        ]
    },
    jshint: {
        src: [
            'index.js',
            'gulpfile.js',
            'src/**/*.js',
            'lib/**/*.js'
        ],
        options: require('../config/jshint')
    }
};
