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

require("./data/testTableModels.js");

/**
 * Load the table definitions SQL that corresponds to the actual data model.
 *
 * @return {Array} - Array of CREATE TABLE commands.
 */
fluid.tests.postgresdb.loadModelTableDefinitions = function () {
    var defs = fluid.require(
        "%preferencesServer/src/database/data/tableModels.js", require
    );
    return defs.tableDefinitions;
};

fluid.defaults("fluid.tests.postgresdb.tableModels", {
    gradeNames: ["fluid.postgresdb.request"],
    databaseName: "prefs_testdb",
    host: "localhost",
    port: process.env.PGPORT || 5432,
    user: process.env.POSTGRES_USER || "admin",
    password: process.env.POSTGRES_PASSWORD || "asecretpassword",
    members: {
        testTableDefinitions: fluid.tests.postgresdb.tableDefinitions,
        modelTableDefinitions: fluid.tests.postgresdb.loadModelTableDefinitions()
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
            name: "Database operations tests",
            sequence: [{
                // First two tests are for the test tables.
                task: "fluid.tests.postgresdb.utils.dropExistingTables",
                args: ["{pgTestOps}", fluid.tests.postgresdb.tableNames],
                resolve: "jqUnit.assertNotNull",
                resolveArgs: ["Check DROP tables results", "{arguments}.0"]
                                                           // DROP results
            }, {
                task: "{pgTestOps}.bulkQuery",
                args: ["{pgTestOps}.testTableDefinitions"],
                resolve: "fluid.tests.postgresdb.utils.testCreateTables",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.testTableDefinitions"]
            }, {
                // Next test is for the tables based on the actual data model,
                // but still using test database, not actual database.
                // TODO:  move this to the data models tests.
                task: "{pgTestOps}.bulkQuery",
                args: ["{pgTestOps}.modelTableDefinitions"],
                resolve: "fluid.tests.postgresdb.utils.testCreateTables",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.modelTableDefinitions"]
            }]
        }]
    }]
});

fluid.test.runTests("fluid.tests.postgresdb.tableModels.environment");
