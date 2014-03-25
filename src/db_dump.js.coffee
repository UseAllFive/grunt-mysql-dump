###
 * grunt-mysql-dump
 * https:#github.com/digitalcuisine/grunt-mysql-dump
 *
 * Copyright (c) 2013 David Smith, Digital Cuisine
 * Licensed under the MIT license.
 ###

# Dependencies
chalk = require 'chalk'
shell = require 'shelljs'
path  = require 'path'
_     = require 'lodash'


###
 * Lo-Dash Template Helpers
 * http:#lodash.com/docs/#template
 * https:#github.com/gruntjs/grunt/wiki/grunt.template
 ###
commandTemplates =
    mysqldump: "mysqldump -h <%= host %> -P <%= port %> -u<%= user %>
        <%= pass %> --databases <%= database %>",
    mysql: 'mysql -h <%= host %> -P <%= port %> -u<%= user %>
        <%= pass %> < "<%= backup_to %>"',
    ssh: "ssh <%= host %>"

module.exports = (grunt) ->
    ### DB DUMP
    * dump database to specified
    ###
    grunt.registerMultiTask 'db_dump', 'Dump database', ->
        # Get tasks options + set default port
        options = @options
            pass: ""
            port: 3306
            backup_to: "db/backups/<%= grunt.template.today('yyyy-mm-dd') %> -
                <%= target %>.sql"

        paths = generate_backup_paths(@target, options)

        grunt.log.subhead "Dumping database '#{options.title}' to
            '#{paths.file}'"
        if db_dump(options, paths)
            grunt.log.success "Database dump succesfully exported"
            return true
        else
            grunt.log.fail "Database dump failed!"
            return false

    # db_import
    grunt.registerMultiTask 'db_import', 'Import database', ->
        # Get tasks options + set default port
        options = @options
            pass: ""
            port: 3306
            backup_to: "db/backups/<%= grunt.template.today('yyyy-mm-dd') %> -
                <%= target %>.sql"

        paths = generate_backup_paths this.target, options

        grunt.log.subhead "Importing database '#{options.title}' to
            '#{paths.file}'"
        if db_import options, paths
            grunt.log.success "Database dump succesfully imported"
        else
            grunt.log.fail "Database import failed!"
            false

    generate_backup_paths = (target, options) ->
        paths = {}
        paths.file = grunt.template.process(options.backup_to, {
            data:
                target: target
        })
        paths.dir = path.dirname paths.file
        paths

    add_untemplated_properties_to_command = (command, options) ->
        additional_properties = []
        default_option_keys = ["user", "pass", "database", "host", "port",
            "ssh_host", "backup_to", "title"]

        #-- Find the additional option keys not part of the default list
        additional_options_keys = _.reject _.keys(options), (option) ->
            _.contains(default_option_keys, option)

        #-- For each additional option key, add it's key + value to the
        #   additional_properties object array
        _.each additional_options_keys, (key) ->
            value = options[key]

            #-- Modify socket parameter to be --socket
            key = "--socket" if key is "socket"

            if value is ""
                additional_properties.push key
            else
                additional_properties.push key + " \"" + value + "\""

        #-- Add the properties to the command
        if additional_properties.length isnt 0
            command += " " + additional_properties.join " "

        command

    ###
    * Dumps a MYSQL database to a suitable backup location
    ###
    db_dump = (options, paths) ->
        grunt.file.mkdir paths.dir

        tpl_mysqldump = grunt.template.process commandTemplates.mysqldump,
            data:
                user: options.user
                pass: if options.pass isnt "" then '-p' + options.pass else ''
                database: options.database
                host: options.host
                port: options.port

        # Test whether we should connect via SSH first
        if not options.ssh_host?
            # it's a local/direct connection
            cmd = tpl_mysqldump
        else
            # it's a remote connection
            tpl_ssh = grunt.template.process commandTemplates.ssh,
                data:
                    host: options.ssh_host

            cmd = tpl_ssh + " \\ " + tpl_mysqldump

        cmd = add_untemplated_properties_to_command cmd, options

        #-- Write command if being verbose
        grunt.verbose.writeln "Command: " + chalk.cyan(cmd)

        # Capture output...
        ret = shell.exec cmd, {silent: true}

        if ret.code isnt 0
            grunt.log.error ret.output
            return false

        # Write output to file using native Grunt methods
        grunt.file.write paths.file, ret.output

        return true


    ###
     * Import a MYSQL database from a file
     *
     * @author: Justin Anastos <janastos@useallfive.com>
     ###
    db_import = (options, paths) ->
        tpl_mysql = grunt.template.process commandTemplates.mysql,
            data:
                user: options.user
                pass: if options.pass isnt "" then '-p' + options.pass else ''
                host: options.host
                port: options.port
                backup_to: options.backup_to

        # Test whether we should connect via SSH first
        if not options.ssh_host?
            # it's a local/direct connection
            cmd = tpl_mysql
        else
            # it's a remote connection
            tpl_ssh = grunt.template.process commandTemplates.ssh,
                data:
                    host: options.ssh_host

            cmd = tpl_ssh + " \\ " + tpl_mysql

        cmd = add_untemplated_properties_to_command cmd, options

        #-- Write command if being verbose
        grunt.verbose.writeln "Command: " + chalk.cyan(cmd)

        # Capture output...
        ret = shell.exec cmd, {silent: true}

        if(ret.code != 0)
            grunt.log.error ret.output
            return false

        # Write output to file using native Grunt methods
        grunt.file.write paths.file, ret.output

        true
