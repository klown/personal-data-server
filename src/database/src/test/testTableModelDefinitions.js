/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit"),
    postgresdb = require("../js/index.js");

require("./testUtilities.js");

jqUnit.module("PostgresDB table definitions unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

// Table names, SQL CREATE, and SQL ALTER statements
require("./data/testTableModels.js");

fluid.defaults("fluid.tests.postgresdb.tableModels", {
    gradeNames: ["fluid.component"],
    members: {
        pgDataModelsOps: new postgresdb.PostgresRequest(fluid.tests.postgresdb.databaseConfig)
    }
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
            name: "Database model table definitions tests",
            sequence: [{
                // First, delete any existing test tables.
                task: "fluid.tests.postgresdb.utils.testSqlArray",
                args: [
                    "{pgTestOps}.pgDataModelsOps",
                    fluid.tests.postgresdb.tableNames,
                    "IF EXISTS"
                ],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: [
                    "{arguments}.0", // DROP results
                    fluid.tests.postgresdb.tableNames.length,
                    "DROP"]
            }, {
                // Create the tables
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.pgDataModelsOps", fluid.tests.postgresdb.tableDefinitions],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: [
                    "{arguments}.0", // CREATE results
                    fluid.tests.postgresdb.tableNames.length,
                    "CREATE"
                ]
            }, {
                // Test failure by trying to create the same tables again. It
                // will fail on the first table.
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.pgDataModelsOps", fluid.tests.postgresdb.tableDefinitions],
                reject: "fluid.tests.postgresdb.utils.testFailureCreateTable",
                rejectArgs: [
                    "{arguments}.0", // error
                    fluid.tests.postgresdb.tableNames[0]
                ]
            }, {
                // Test ALTER of a table.
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.pgDataModelsOps", fluid.tests.postgresdb.tableUpdates],
                resolve: "fluid.tests.postgresdb.testTableUpdates",
                resolveArgs: [
                    "{arguments}.0", // ALTER results
                    fluid.tests.postgresdb.numTableUpdates
                ]
            }, {
                // No result; either resolves or fails.
                task: "fluid.tests.postgresdb.utils.finish",
                args: ["{pgTestOps}.pgDataModelsOps"],
                resolve: "fluid.identity"
            }]
        }]
    }]
});

fluid.tests.postgresdb.testTableUpdates = function (results, numUpdates) {
    fluid.tests.postgresdb.utils.testResults(results, numUpdates);
    fluid.each(results, function (aResult) {
        jqUnit.assertEquals("Check ALTER command", "ALTER", aResult.command);
    });
};

fluid.test.runTests("fluid.tests.postgresdb.tableModels.environment");
