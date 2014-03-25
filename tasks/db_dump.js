
/*
 * grunt-mysql-dump
 * https:#github.com/digitalcuisine/grunt-mysql-dump
 *
 * Copyright (c) 2013 David Smith, Digital Cuisine
 * Licensed under the MIT license.
 */
var chalk, commandTemplates, path, shell, _;

chalk = require('chalk');

shell = require('shelljs');

path = require('path');

_ = require('lodash');


/*
 * Lo-Dash Template Helpers
 * http:#lodash.com/docs/#template
 * https:#github.com/gruntjs/grunt/wiki/grunt.template
 */

commandTemplates = {
  mysqldump: "mysqldump -h <%= host %> -P <%= port %> -u<%= user %> <%= pass %> --databases <%= database %>",
  mysql: 'mysql -h <%= host %> -P <%= port %> -u<%= user %> <%= pass %> < "<%= backup_to %>"',
  ssh: "ssh <%= host %>"
};

module.exports = function(grunt) {

  /* DB DUMP
  * dump database to specified
   */
  var add_untemplated_properties_to_command, db_dump, db_import, generate_backup_paths;
  grunt.registerMultiTask('db_dump', 'Dump database', function() {
    var options, paths;
    options = this.options({
      pass: "",
      port: 3306,
      backup_to: "db/backups/<%= grunt.template.today('yyyy-mm-dd') %> - <%= target %>.sql"
    });
    paths = generate_backup_paths(this.target, options);
    grunt.log.subhead("Dumping database '" + options.title + "' to '" + paths.file + "'");
    if (db_dump(options, paths)) {
      grunt.log.success("Database dump succesfully exported");
      return true;
    } else {
      grunt.log.fail("Database dump failed!");
      return false;
    }
  });
  grunt.registerMultiTask('db_import', 'Import database', function() {
    var options, paths;
    options = this.options({
      pass: "",
      port: 3306,
      backup_to: "db/backups/<%= grunt.template.today('yyyy-mm-dd') %> - <%= target %>.sql"
    });
    paths = generate_backup_paths(this.target, options);
    grunt.log.subhead("Importing database '" + options.title + "' to '" + paths.file + "'");
    if (db_import(options, paths)) {
      return grunt.log.success("Database dump succesfully imported");
    } else {
      grunt.log.fail("Database import failed!");
      return false;
    }
  });
  generate_backup_paths = function(target, options) {
    var paths;
    paths = {};
    paths.file = grunt.template.process(options.backup_to, {
      data: {
        target: target
      }
    });
    paths.dir = path.dirname(paths.file);
    return paths;
  };
  add_untemplated_properties_to_command = function(command, options) {
    var additional_options_keys, additional_properties, default_option_keys;
    additional_properties = [];
    default_option_keys = ["user", "pass", "database", "host", "port", "ssh_host", "backup_to", "title"];
    additional_options_keys = _.reject(_.keys(options), function(option) {
      return _.contains(default_option_keys, option);
    });
    _.each(additional_options_keys, function(key) {
      var value;
      value = options[key];
      if (value === "") {
        return additional_properties.push(key);
      } else {
        return additional_properties.push(key + " \"" + value + "\"");
      }
    });
    if (additional_properties.length === 0) {
      command += " " + additional_properties.join(" ");
    }
    return command;
  };

  /*
  * Dumps a MYSQL database to a suitable backup location
   */
  db_dump = function(options, paths) {
    var cmd, ret, tpl_mysqldump, tpl_ssh;
    grunt.file.mkdir(paths.dir);
    tpl_mysqldump = grunt.template.process(commandTemplates.mysqldump, {
      data: {
        user: options.user,
        pass: options.pass !== "" ? '-p' + options.pass : '',
        database: options.database,
        host: options.host,
        port: options.port
      }
    });
    if (options.ssh_host == null) {
      cmd = tpl_mysqldump;
    } else {
      tpl_ssh = grunt.template.process(commandTemplates.ssh, {
        data: {
          host: options.ssh_host
        }
      });
      cmd = tpl_ssh + " \\ " + tpl_mysqldump;
    }
    cmd = add_untemplated_properties_to_command(cmd, options);
    grunt.verbose.writeln("Command: " + chalk.cyan(cmd));
    ret = shell.exec(cmd, {
      silent: true
    });
    if (ret.code !== 0) {
      grunt.log.error(ret.output);
      return false;
    }
    grunt.file.write(paths.file, ret.output);
    return true;
  };

  /*
   * Import a MYSQL database from a file
   *
   * @author: Justin Anastos <janastos@useallfive.com>
   */
  return db_import = function(options, paths) {
    var cmd, ret, tpl_mysql, tpl_ssh;
    tpl_mysql = grunt.template.process(commandTemplates.mysql, {
      data: {
        user: options.user,
        pass: options.pass !== "" ? '-p' + options.pass : '',
        host: options.host,
        port: options.port,
        backup_to: options.backup_to
      }
    });
    if (options.ssh_host == null) {
      cmd = tpl_mysql;
    } else {
      tpl_ssh = grunt.template.process(commandTemplates.ssh, {
        data: {
          host: options.ssh_host
        }
      });
      cmd = tpl_ssh + " \\ " + tpl_mysql;
    }
    grunt.verbose.writeln("Command: " + chalk.cyan(cmd));
    ret = shell.exec(cmd, {
      silent: true
    });
    if (ret.code !== 0) {
      grunt.log.error(ret.output);
      return false;
    }
    grunt.file.write(paths.file, ret.output);
    return true;
  };
};
