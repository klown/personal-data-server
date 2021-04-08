/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
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

jqUnit.module("PostgresDB request unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.defaults("fluid.tests.postgresdb.request", {
    gradeNames: ["fluid.component"],
    members: {
        postgresdb: new postgresdb.PostgresRequest(fluid.tests.postgresdb.databaseConfig)
    },
    invokers: {
        "checkAllDatabases": {
            funcName: "fluid.tests.postgresdb.request.checkAllDatabases",
            args: ["{that}"]
        },
        "checkNoSuchDatabase": {
            funcName: "fluid.tests.postgresdb.request.checkNoSuchDatabase",
            args: ["{that}"]
        }
    }
});

/**
 * Check postgresdb for all of the databases it contains.
 *
 * @param {Object} that - Test request instance.
 * @return {Promise} Results returned by the request.
 */
fluid.tests.postgresdb.request.checkAllDatabases = function (that) {
    var result = that.postgresdb.runSql("SELECT datname FROM pg_database");
    result.then(null, function (error) {
        fluid.log(JSON.stringify(error.message));
    });
    return result;
};

/**
 * Check postgresdb for a non-existent database.
 *
 * @param {Object} that - Test request instance.
 * @return {Promise} Results returned by the request.
 */
fluid.tests.postgresdb.request.checkNoSuchDatabase = function (that) {
    var result = that.postgresdb.runSql("SELECT datname FROM no_such_databasez");
    result.then(null, function (error) {
        fluid.log(JSON.stringify(error.message));
    });
    return result;
};

fluid.defaults("fluid.tests.postgresdb.request.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        databaseRequest: {
            type: "fluid.tests.postgresdb.request"
        },
        testCaseHolder: {
            type: "fluid.tests.postgresdb.request.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.postgresdb.request.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "Database request test cases",
        tests: [{
            name: "Check initialization and connection",
            sequence: [{
                funcName: "fluid.tests.postgresdb.request.testInit",
                args: ["{databaseRequest}.postgresdb"]
            }, {
                task: "{databaseRequest}.checkAllDatabases",
                resolve: "fluid.tests.postgresdb.request.testResults",
                resolveArgs: [
                    "{arguments}.0", // query results
                    "{databaseRequest}"
                ]
            }, {
                task: "{databaseRequest}.checkNoSuchDatabase",
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check error message",
                    "{arguments}.0.message", // query result
                    "relation \"no_such_databasez\" does not exist"
                ]
            }, {
                // No result; either resolves or fails.
                task: "fluid.tests.postgresdb.utils.finish",
                args: ["{databaseRequest}.postgresdb"],
                resolve: "fluid.identity"
            }]
        }]
    }]
});

fluid.tests.postgresdb.request.testInit = function (databaseRequest) {
    jqUnit.assertNotNull(databaseRequest, "Check database request object is non-null");
    jqUnit.assertNotNull(databaseRequest.pool, "Check database connection is non-null");
};

fluid.tests.postgresdb.request.testResults = function (results, databaseRequest) {
    jqUnit.assertNotNull("Check for null query result", results);
    jqUnit.assertNotEquals("Check for empty query result", results.rowCount, 0);

    var ourDatabaseName = databaseRequest.options.database;
    var ourDatabase = fluid.find(results.rows, function (aDatabase) {
        if (aDatabase.datname === ourDatabaseName) {
            return aDatabase;
        }
    }, null);
    jqUnit.assertNotNull(ourDatabase, "Check for '" + ourDatabaseName + "'");
};

fluid.test.runTests("fluid.tests.postgresdb.request.environment");
