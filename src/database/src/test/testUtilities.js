/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
/* eslint-env node */

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit");

fluid.registerNamespace("fluid.tests.postgresdb.utils");

/**
 * Delete the given tables from the database.  The tables are dropped in bulk.
 *
 * @param {Component} postGresOps - Postgres test request object
 * @param {Array} tablesNames - Array of tables to delete.
 * @param {Promise} The value of the drop operation.
 */
fluid.tests.postgresdb.utils.dropExistingTables = function (postGresOps, tableNames) {
    var dropQueries = [];
    fluid.each(tableNames, function(aTableName) {
        dropQueries.push(
            `DROP TABLE IF EXISTS "${aTableName}" CASCADE;`
        );
    });
    return postGresOps.bulkQuery(dropQueries);
};

/**
 * Check that the database query worked.  Success is at least a check that the
 * results from the query is non-null and there are an equal number of them as
 * there were queries made.  Node-postgres returns a results array where each
 * object in the array has a `command` property.  A `command` parameter is
 * optional, and if provided, is compared to the `command` properties of the
 * results.
 *
 * @param {Component} postGresOps - Postgres test request object
 * @param {Number} numQueries - Mumber of queries made.
 * @param {String} command - Optional: if present, it will be checked against
 *                           commands in the results.
 */
fluid.tests.postgresdb.utils.testQuery = function (results, numQueries, command) {
    jqUnit.assertNotNull("Check for null result", results);
    jqUnit.assertEquals("Check number of queries", numQueries, results.length);
    if (command) {
        fluid.each(results, function (aResult) {
            jqUnit.assertEquals("Check query command", command, aResult.command);
        });
    }
};

fluid.tests.postgresdb.utils.testFailureCreateTable = function (error, tableName) {
    jqUnit.assertNotNull("Check for null error", error);
    jqUnit.assertEquals("Check error message",
        "relation \"" + tableName + "\" already exists",
        error.message
    );
};

fluid.tests.postgresdb.utils.checkKeyValuePairs = function (keys, actualPairs, expectedPairs, msg) {
    fluid.each(keys, function (key) {
        var actualValue = actualPairs[key];
        var expectedValue = expectedPairs[key];
        var message = msg + " for key '" + key + "'";
        // Special case: handle time stamps -- they are Date objects as they
        // come out of the database.
        if (actualValue instanceof Date) {
            jqUnit.assertEquals(
                message,
                new Date(expectedValue).getTime(),
                actualValue.getTime()
            );
        } else {
            jqUnit.assertDeepEq(message, expectedValue, actualValue);
        }
    });
};

fluid.tests.postgresdb.utils.testLoadOneTable = function (records, tableData) {
    jqUnit.assertNotNull("Check for null result", records);
    fluid.each(records, function (aRecord, index) {
        var expectedPairs = tableData[index];
        var keys = fluid.keys(expectedPairs);
        fluid.tests.postgresdb.utils.checkKeyValuePairs(
            keys, aRecord, expectedPairs,
            "Check column value matches given data"
        );
    })
};

fluid.tests.postgresdb.utils.testLoadTables = function (results, allTablesData) {
    jqUnit.assertNotNull("Check for null result", results);
    fluid.each(results, function (aResult, index) {
         var tableName = fluid.tests.postgresdb.tableNames[index];
         fluid.tests.postgresdb.utils.testQuery(
            aResult, allTablesData[tableName].length, "INSERT"
         );
    });
};
