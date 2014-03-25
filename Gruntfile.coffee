###
 * grunt-deployments
 * https://github.com/getdave/grunt-deployments
 *
 * Copyright (c) 2013 David Smith
 * Licensed under the MIT license.
 ###

module.exports = (grunt) ->

    # Project configuration.
    grunt.initConfig
        db_fixture: grunt.file.readJSON 'test/fixtures/test_db.json'

        # Before generating any new files, remove any previously-created files.
        clean:
            tests: ['tmp']

        coffee:
            compile:
                options:
                    bare: true
                files: [
                    expand: true
                    cwd: './src'
                    src: '**/*.coffee'
                    dest: './tasks'
                    ext: '.js'
                ]

        db_dump:
            # This one should work
            mysql: '<%= db_fixture.mysql %>'

            # This one should fail
            info_schema: '<%= db_fixture.info_schema %>'

        jshint:
            all: [
                'tasks/*.js'
                '<%= nodeunit.tests %>'
            ]
            options:
                jshintrc: '.jshintrc'

        # Unit tests.
        nodeunit:
            tests: ['test/*_test.js']

        watch:
            coffee:
                files: '**/*.coffee'
                tasks: 'coffee'

    # Actually load this plugin's task(s).
    grunt.loadTasks 'tasks'

    # These plugins provide necessary tasks.
    grunt.loadNpmTasks 'grunt-contrib-clean'
    grunt.loadNpmTasks 'grunt-contrib-coffee'
    grunt.loadNpmTasks 'grunt-contrib-jshint'
    grunt.loadNpmTasks 'grunt-contrib-nodeunit'
    grunt.loadNpmTasks 'grunt-contrib-watch'

    # Whenever the "test" task is run, first clean the "tmp" dir, then run this
    # plugin's task(s), then test the result.
    grunt.registerTask 'test', ['clean', 'deployments', 'nodeunit']

    # By default, lint and run all tests.
    grunt.registerTask 'default', ['jshint', 'test']
