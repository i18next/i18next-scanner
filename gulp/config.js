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
    },
    i18next: {
        base: 'test/fixtures',
        src: [
            'test/fixtures/modules/**/*.{js,hbs}'
        ],
        options: {
            // Provides a list of supported languages by setting the lngs option.
            lngs: ['en', 'de'],

            // Sorts the keys in ascending order.
            sort: true, // default: false

            // Provides a default value if a value is not specified.
            defaultValue: '', // default: ''

            // The resGetPath is your source i18n path, it is relative to current working directory.
            resGetPath: 'assets/i18n/__lng__/__ns__.json', // default: 'i18n/__lng__/__ns__.json'

            // The resSetPath is your target i18n path, it is relative to your gulp.dest path.
            resSetPath: 'i18n/__lng__/__ns__.json', // default: 'i18n/__lng__/__ns__.json'

            ns: {
                // Provides a list of namespaces by setting the namespaces option.
                namespaces: [
                    'translation',
                    'locale'
                ],

                // Changes the default namespace by setting the ns.defaultNs option.
                defaultNs: 'translation' // default: 'translation'
            }
        }
    }
};
