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
    jqUnit = require("node-jqunit");
require("../js/index.js");

jqUnit.module("PostgresDB request unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.defaults("fluid.tests.postgresdb.request", {
    gradeNames: ["fluid.postgresdb.request"],
    databaseName: "prefs_testdb",
    host: "localhost",
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER || "admin",
    password: process.env.POSTGRES_PASSWORD || "asecretpassword",
    invokers: {
        "checkAllDatabases": {
            funcName: "fluid.tests.postgresdb.request.checkAllDatabases",
            args: ["{that}"]
        }
    }
});

/*
 * Query postgresdb for all of the databases it contains.
 *
 * @param {Object} that - Test request instance.
 * @param {Object} that.pool - Node-postgres object used for querie.
 * @return {Promise} Results returned by the query.
 */
fluid.tests.postgresdb.request.checkAllDatabases = function (that) {
    var queryResult = that.query("SELECT datname FROM pg_database");
    queryResult.then(null, function (error) {
        fluid.log(JSON.stringify(error.message));
    });
    return queryResult;
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
        name: "Database request test case",
        tests: [{
            name: "Check initialization and connection",
            sequence: [{
                funcName: "fluid.tests.postgresdb.request.testInit",
                args: ["{databaseRequest}"]
            }, {
                task: "{databaseRequest}.checkAllDatabases",
                resolve: "fluid.tests.postgresdb.request.testQueryResults",
                resolveArgs: ["{arguments}.0", "{databaseRequest}"]
                              // query results
            }, {
                task: "{databaseRequest}.query",
                args: ["SELECT datname FROM no_such_databasez"],
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check error message",
                    "{arguments}.0.message", // query result
                    "relation \"no_such_databasez\" does not exist"
                ]
            }]
        }]
    }]
});

fluid.tests.postgresdb.request.testInit = function (databaseRequest) {
    jqUnit.assertNotNull(databaseRequest, "Check database request object is non-null");
    jqUnit.assertNotNull(databaseRequest.pool, "Check database connection is non-null");
};

fluid.tests.postgresdb.request.testQueryResults = function (results, databaseRequest) {
    jqUnit.assertNotNull("Check for null query result", results);
    jqUnit.assertNotEquals("Check for empty query result", results.rowCount, 0);

    var ourDatabaseName = databaseRequest.options.databaseName;
    var ourDatabase = fluid.find(results.rows, function(aDatabase) {
        if (aDatabase.datname === ourDatabaseName) {
            return aDatabase;
        }
    }, null);
    jqUnit.assertNotNull(ourDatabase, "Check for '" + ourDatabaseName + "'");
};

fluid.test.runTests("fluid.tests.postgresdb.request.environment");
