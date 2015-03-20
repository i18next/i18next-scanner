var fs = require('fs');
var gulp = require('gulp');
var del = require('del');
var browserify = require('browserify');
var runSequence = require('run-sequence');
var jshint = require('gulp-jshint');
var source = require('vinyl-source-stream');
var errorHandler = require('./gulp/error-handler');
var pkg = require('./package.json');
var config = require('./gulp/config');

gulp.task('clean', function(callback) {
    del(config.clean.files, callback);
});

gulp.task('jshint', function() {
    return gulp.src(config.jshint.src)
        .pipe(jshint(config.jshint.options))
        .pipe(jshint.reporter('default', {verbose: true}))
        .pipe(jshint.reporter('fail'))
            .on('error', errorHandler.error);
});

/*
gulp.task('hashlib', ['hashlib:dev', 'hashlib:dist']);
gulp.task('hashlib:dev', function() {
    return browserify()
        .add('./lib/hash/index.js')
        .bundle()
        .pipe(source('i18next-text-hashlib.js'))
        .pipe(header(config.banner, {pkg: pkg}))
        .pipe(gulp.dest('dist'));
});
gulp.task('hashlib:dist', ['hashlib:dev'], function() {
    return gulp.src('dist/i18next-text-hashlib.js')
        .pipe(uglify(config.uglify.dist))
        .pipe(header(config.banner, {pkg: pkg}))
        .pipe(rename('i18next-text-hashlib.min.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build:dev', ['hashlib'], function() {
    return gulp.src(['dist/i18next-text-hashlib.js', 'src/i18next-text.js'])
        .pipe(uglify(config.uglify.dev))
        .pipe(concat('i18next-text.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('build:dist', ['hashlib'], function() {
    return gulp.src(['dist/i18next-text-hashlib.js', 'src/i18next-text.js'])
        .pipe(uglify(config.uglify.dist))
        .pipe(concat('i18next-text.min.js'))
        .pipe(header(config.banner, {pkg: pkg}))
        .pipe(gulp.dest('dist'));
});

gulp.task('build:custom',function() {
    return gulp.src(['src/i18next-text.js'])
        .pipe(uglify(config.uglify.dev))
        .pipe(rename('i18next-text.custom.js'))
        .pipe(gulp.dest('dist'));
});
*/

gulp.task('build', ['jshint'], function(callback) {
    runSequence('clean', callback);
});
gulp.task('default', ['build']);
