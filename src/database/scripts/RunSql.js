/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Node script for running SQL statements either from a file or from the command
 * line.  This assumes that an instance of the named PostgreSQL database is
 * running on the given host, port, etc.
 *
 * The file version loads the sql commands from the given file path and executes
 * it:
 *   RunSql.js postgres localhost 5432 admin **** SQLfile
 *
 * The command line form uses the SQL given on the command line, indicated by a
 * "--":
 *   RunSql.js postgres localhost 5432 admin **** -- "DROP TABLE foobar;"
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
/* eslint-disable no-console */

"use strict";

function main() {
    if (process.argv.length < 7) {
        console.log("Usage: node RunSql.js database host port user password [ SQLfile or -- SQL ]");
        process.exit(1);
    }

    const dbConfig = {
        database: process.argv[2],
        host: process.argv[3],
        port: process.argv[4],
        user: process.argv[5],
        password: process.argv[6]
    };
    console.log("Configuration: ", JSON.stringify(dbConfig, null, 2));

    const sqlFile = process.argv[7];
    var sql = null;
    if (sqlFile === "--") {
        sql = process.argv[8];
        console.log("SQL: ", sql);
    } else {
        console.log("File: ", sqlFile);
    }

    var postgresReq = require("../src/js");
    var pgOps = new postgresReq.PostgresRequest(dbConfig);

    var runResult;
    if (sql) {
        runResult = pgOps.runSql(sql);
    } else {
        runResult = pgOps.runSqlFile(sqlFile);
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
    console.log(
        result.command, " ",
        ( result.rowCount === null ? "" : result.rowCount )
    );
};

main();
