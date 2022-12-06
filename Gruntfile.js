'use strict';

module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({

        simplemocha: {
            all: {
                src: ['tests/mochaTests/*.js']
            }
        },

        karma: {
            test: {
                configFile: 'karma.conf.js'
            }
        }
    });


    grunt.registerTask('test', ['karma', 'simplemocha']);
};