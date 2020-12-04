/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

// This tests the "real" tables for the data model documented at:
// https://github.com/fluid-project/preferencesServer/blob/main/doc/dataModel.md

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit");

require("../js/postgresOperations.js");

jqUnit.module("PostgresDB table definitions unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.defaults("fluid.tests.postgresdb.tableModels", {
    gradeNames: ["fluid.postgresdb.operations"],
    listeners: {
        "onCreate": {
            funcName: "fluid.tests.postgresdb.tableModels.loadTableInfo",
            args: ["{that}"]
        }
    },
    components: {
        request: {
            type: "fluid.postgresdb.request",
            options: {
                databaseName: "fluid_prefsdb",
                host: "localhost",
                port: 5432,
                user: "admin",
                password: "asecretpassword"
            }
        }
    }
});

/*
 * Load the table definitions.
 *
 * @param {Object} that - Operations test component instance.
 * @param {Object} that.modelDefinitions - List to populate with the table models.
 */
fluid.tests.postgresdb.tableModels.loadTableInfo = function (that) {
    that.loadTableModels(
        "%preferencesServer/src/database/data/tableModels.js"
    );
};

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
                funcName: "fluid.tests.postgresdb.tableModels.testInit",
                args: ["{pgTestOps}"]
            }, {
                task: "{pgTestOps}.createTables",
                args: ["{pgTestOps}.modelDefinitions", false],
                                                       // delete existing tables
                resolve: "fluid.tests.postgresdb.tableModels.testCreateTables",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tables"]
            }]
        }]
    }]
});

fluid.tests.postgresdb.tableModels.createTables = function (pgTestOps) {
    var promise = pgTestOps.createTables(pgTestOps.modelDefinitions, false);
    return promise;
};

fluid.tests.postgresdb.tableModels.testInit = function (pgTestOps) {
    jqUnit.assertNotNull("Check operations instance is non-null", pgTestOps);
    jqUnit.assertNotNull("Check table test models and data", pgTestOps.modelDefinitions);
};

fluid.tests.postgresdb.tableModels.testCreateOneTable = function (result, tables) {
    jqUnit.assertNotNull("Check for null create table result", result);
    jqUnit.assertDeepEq("Check result was stored", tables[result.getTableName()], result);
};

fluid.tests.postgresdb.tableModels.testCreateTables = function (results, tables) {
    jqUnit.assertNotNull("Check for null create tables result", results);
    jqUnit.assertEquals("Check number of tables", fluid.keys(tables).length, results.length);
    fluid.each(results, function (aResult) {
        fluid.tests.postgresdb.tableModels.testCreateOneTable(aResult, tables)
    });
};

fluid.test.runTests("fluid.tests.postgresdb.tableModels.environment");
