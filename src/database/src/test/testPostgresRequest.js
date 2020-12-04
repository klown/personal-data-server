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
    jqUnit = require("node-jqunit");
require("../js/postgresOperations.js");

jqUnit.module("PostgresDB request unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.defaults("fluid.tests.postgresdb.request", {
    gradeNames: ["fluid.postgresdb.request"],
    databaseName: "prefs_testdb",
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "asecretpassword",
    allDatabasesQuery: "SELECT datname FROM pg_database;",
    members: {
        queryResult: null,  // Set in the test (a Sequelize Promise)
    },
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
 * @param {Object} that.sequelize - Connection to postgresdb.
 * @return {Promise} Promise returned by the request (Sequelize Promise).
 */
fluid.tests.postgresdb.request.checkAllDatabases = function (that) {
    that.queryResult = that.sequelize.query(that.options.allDatabasesQuery);
    that.queryResult.then(null, function (error) {
        fluid.log(JSON.stringify(error.message));
    });
    return that.queryResult;
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
                resolve: "fluid.tests.postgresdb.request.testQueryResult",
                resolveArgs: ["{arguments}.0", "{databaseRequest}"]
            }]                // Sequelize Promise result
        }]

    }]
});

fluid.tests.postgresdb.request.testInit = function (databaseRequest) {
    jqUnit.assertNotNull(databaseRequest, "Check database request object is non-null");
    jqUnit.assertNotNull(databaseRequest.sequelize, "Check database connection is non-null");
};

fluid.tests.postgresdb.request.testQueryResult = function (result, databaseRequest) {
    jqUnit.assertNotNull("Check for null query result", result);

    var dataBases = result[0];
    jqUnit.assertNotEquals("Check for empty query result", dataBases.length, 0);

    var ourDatabaseName = databaseRequest.options.databaseName;
    var ourDatabase = fluid.find(dataBases, function(aDatabase) {
        if (aDatabase.datname === ourDatabaseName) {
            return aDatabase;
        }
    });
    jqUnit.assertNotNull(ourDatabase, "Check for '" + ourDatabaseName + "'");
};

fluid.test.runTests("fluid.tests.postgresdb.request.environment");
