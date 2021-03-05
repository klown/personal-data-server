/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

// This tests the tables for the data model documented at:
// https://github.com/fluid-project/preferencesServer/blob/main/doc/dataModel.md

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit");

require("../js/postgresOperations.js");
require("./testUtilities.js");

jqUnit.module("PostgresDB table definitions unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

// Table names, SQL CREATE, and SQL ALTER statements
require("./data/testTableModels.js");

fluid.defaults("fluid.tests.postgresdb.tableModels", {
    gradeNames: ["fluid.postgresdb.request"],
    databaseName: process.env.PGDATABASE || "prefs_testdb",
    host: process.env.PGHOST ||"localhost",
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || "admin",
    password: process.env.POSTGRES_PASSWORD || "asecretpassword"
});

fluid.defaults("fluid.tests.postgresdb.tableModels.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        pgTestOps: {
            type: "fluid.tests.postgresdb.tableModels"
        },
        testCaseHolder: {
            type: "fluid.tests.postgresdb.tableModels.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.postgresdb.tableModels.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "Database table data models tests",
        tests: [{
            name: "Database operations tests",
            sequence: [{
                // First, delete any existing test tables.  This actually tests
                // "{pgTestOps}.bulkQuery()"
                task: "fluid.tests.postgresdb.utils.dropExistingTables",
                args: ["{pgTestOps}", fluid.tests.postgresdb.tableNames],
                resolve: "fluid.tests.postgresdb.utils.testQuery",
                resolveArgs: ["{arguments}.0", fluid.tests.postgresdb.tableNames.length]
                               // DROP results
            }, {
                // Create the tables
                task: "{pgTestOps}.query",
                args: [fluid.tests.postgresdb.tableDefinitions],
                resolve: "fluid.tests.postgresdb.utils.testQuery",
                resolveArgs: ["{arguments}.0", fluid.tests.postgresdb.tableNames.length]
            }, {
                // Test failure by trying to create the same tables again. It
                // will fail on the first table.
                task: "{pgTestOps}.query",
                args: [fluid.tests.postgresdb.tableDefinitions],
                reject: "fluid.tests.postgresdb.utils.testFailureCreateTable",
                rejectArgs: ["{arguments}.0", fluid.tests.postgresdb.tableNames[0]]
                              // error
            }, {
                // Test ALTER of a table.
                task: "{pgTestOps}.query",
                args: [fluid.tests.postgresdb.tableUpdates],
                resolve: "fluid.tests.postgresdb.testTableUpdates",
                resolveArgs: ["{arguments}.0", fluid.tests.postgresdb.numTableUpdates]

            }]
        }]
    }]
});

fluid.tests.postgresdb.testTableUpdates = function (results, numUpdates) {
    fluid.tests.postgresdb.utils.testQuery(results, numUpdates);
    fluid.each(results, function (aResult) {
        jqUnit.assertEquals("Check ALTER command", "ALTER", aResult.command);
    });
};

fluid.test.runTests("fluid.tests.postgresdb.tableModels.environment");
