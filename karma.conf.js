// Karma configuration
// Generated on Sun Oct 20 2013 07:28:56 GMT+0200 (CEST)

module.exports = function (config) {
    config.set({

        // base path, that will be used to resolve files and exclude
        basePath: '',


        // frameworks to use
        frameworks: ['jasmine'],


        // list of files / patterns to load in the browser
        files: [
            'tests/jstd-adapter.js',
            'tests/TestCase.js',

            'public/libs/jquery-1.10.2.js',
            'public/libs/underscore.js',
            'public/libs/backbone.js',
            'public/utils.js',
            'public/models/FieldModel.js',
            'public/models/TurnModel.js',
            'public/models/FenceModel.js',
            'public/models/PlayerModel.js',
            'public/models/BoardValidation.js',
            'public/models/BoardSocketEvents.js',
            'public/models/BoardModel.js',

            {pattern: 'tests/clientSideTests/test*.js'}
        ],


        // list of files to exclude
        exclude: [
            'public/main.js'
        ],


        // test results reporter to use
        // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
        reporters: ['progress'],


        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN
        // || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: true,


        // Start these browsers, currently available:
        // - Chrome
        // - ChromeCanary
        // - Firefox
        // - Opera
        // - Safari (only Mac)
        // - PhantomJS
        // - IE (only Windows)
        browsers: [/*'Chrome', */'PhantomJS'],


        // If browser does not capture in given timeout [ms], kill it
        captureTimeout: 60000,


        // Continuous Integration mode
        // if true, it capture browsers, run tests and exit
        singleRun: false
    });
};
