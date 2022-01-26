/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 *
 * Node script for running SQL statements either from a file or from the command
 * line. This assumes that an instance of the named PostgreSQL database is
 * running on the given host, port, etc.
 *
 * The file version loads the sql commands from the given file path and executes
 * it:
 *   runSql.js --db personalData --host localhost --port 5432 --user admin --password asecretpassword --sqlfile ./dataModel/SsoProvidersData.sql
 *
 * The command line form uses the SQL given on the command line, indicated by a
 * "--":
 *   runSql.js --db personalData --host localhost --port 5432 --user admin --password asecretpassword --sql "DROP TABLE foobar;"
 */

"use strict";

function main() {
    const argv = require('minimist')(process.argv.slice(2));
    const sqlFile = argv.sqlfile;
    const sql = argv.sql;

    console.log("SQL: ", sql);
    console.log("File: ", sqlFile);

    if (!sql && !sqlFile) {
        console.log("Usage: node runSql.js --db {database} --host {host} --port {port} --user {user} --password {password} --sqlfile {SQLfile} --sql {SQL} ]");
        console.log("Note: One of parameters \"SQLfile\" or \"SQL\" must be provided.");
        process.exit(1);
    }

    const dbConfig = {
        database: argv.db || "personalData",
        host: argv.host || "localhost",
        port: argv.port || 5432,
        user: argv.user || "admin",
        password: argv.password || "asecretpassword"
    };
    console.log("Configuration: ", JSON.stringify(dbConfig, null, 2));

    const postgresOps = require("../src/dbOps/postgresOps.js");
    const postgresHandler = new postgresOps.postgresOps(dbConfig);

    let runResult;
    if (sql) {
        runResult = postgresHandler.runSql(sql);
    } else {
        runResult = postgresHandler.runSqlFile(sqlFile);
    }
    runResult.then(
        function success(value) {
            if (value.forEach) {
                value.forEach(result => {
                    logResult(result);
                });
            } else {
                logResult(value);
            }
            process.exit(0);
        },
        function error(err) {
            console.error(err);
            process.exit(1);
        }
    );
};

function logResult(result) {
    result.rows.forEach((row) => {
        console.log("%O", row);
    });
};

main();
