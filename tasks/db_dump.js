/*
 * grunt-mysql-dump
 * https://github.com/digitalcuisine/grunt-mysql-dump
 *
 * Copyright (c) 2013 David Smith, Digital Cuisine
 * Licensed under the MIT license.
 */

'use strict';

var shell = require('shelljs'),
    path  = require('path'),
    _     = require('lodash');


/**
 * Lo-Dash Template Helpers
 * http://lodash.com/docs/#template
 * https://github.com/gruntjs/grunt/wiki/grunt.template
 */
var commandTemplates = {
    mysqldump: "mysqldump -h <%= host %> -P <%= port %> -u<%= user %> <%= pass %> --databases <%= database %>",
    ssh: "ssh <%= host %>"
};


module.exports = function(grunt) {
    /** DB DUMP
     * dump database to specified
     */
    grunt.registerMultiTask('db_dump', 'Dump database', function() {
        // Get tasks options + set default port
        var options = this.options({
            pass: "",
            port: 3306,
            backup_to: "db/backups/<%= grunt.template.today('yyyy-mm-dd') %> - <%= target %>.sql"
        });

        var paths = generate_backup_paths(this.target, options);

        grunt.log.subhead("Dumping database '" + options.title + "' to '" + paths.file + "'");
        if(db_dump(options, paths))
        {
            grunt.log.success("Database dump succesfully exported");
        }
        else
        {
            grunt.log.fail("Database dump failed!");
            return false;
        }
    });


    function generate_backup_paths(target, options) {
        var paths = {};
        paths.file = grunt.template.process(options.backup_to, {
            data: {
                target: target
            }
        });
        paths.dir = path.dirname(paths.file);
        return paths;
    }

    function add_untemplated_properties_to_command(command, options) {
        var additional_options_keys;
        var additional_properties = [];
        var default_option_keys = ["user", "pass", "database", "host", "port",
            "ssh_host", "backup_to", "title"];

        //-- Find the additional option keys not part of the default list
        additional_options_keys = _.reject(_.keys(options), function(option) {
            return _.contains(default_option_keys, option);
        });

        //-- For each additional option key, add it's key + value to the
        //   additional_properties object array
        _.each(additional_options_keys, function(key) {
            var value = options[key];

            if ("" === value) {
                additional_properties.push(key);
            } else {
                additional_properties.push(key + " \"" + value + "\"");
            }
        });

        //-- Add the properties to the command
        if (0 !== additional_properties.length) {
            command += " " + additional_properties.join(" ");
        }

        return command;
    }

    /**
     * Dumps a MYSQL database to a suitable backup location
     */
    function db_dump(options, paths) {
        var cmd;

        grunt.file.mkdir(paths.dir);


        // 2) Compile MYSQL cmd via Lo-Dash template string
        //
        // "Process" the password flag directly in the data hash to avoid a "-p" that would trigger a password prompt
        // in the shell
        var tpl_mysqldump = grunt.template.process(commandTemplates.mysqldump, {
            data: {
                user: options.user,
                pass: options.pass != "" ? '-p' + options.pass : '',
                database: options.database,
                host: options.host,
                port: options.port
            }
        });

        // 3) Test whether we should connect via SSH first
        if (typeof options.ssh_host === "undefined")
        {
            // it's a local/direct connection
            cmd = tpl_mysqldump;

        }
        else
        {
            // it's a remote connection
            var tpl_ssh = grunt.template.process(commandTemplates.ssh, {
                data: {
                    host: options.ssh_host
                }
            });

            cmd = tpl_ssh + " \\ " + tpl_mysqldump;
        }

        cmd = add_untemplated_properties_to_command(cmd, options);

        //-- Write command if being verbose
        grunt.verbose.writeln("Command: " + chalk.cyan(cmd));

        // Capture output...
        var ret = shell.exec(cmd, {silent: true});

        if(ret.code != 0)
        {
            grunt.log.error(ret.output)
            return false;
        }

        // Write output to file using native Grunt methods
        grunt.file.write(paths.file, ret.output);

        return true;
    }
};





