/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
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

fluid.tests.postgresdb.utils.dropExistingTables = function (postGresOps, tableNames) {
    var dropQueries = [];
    fluid.each(tableNames, function(aTableName) {
        dropQueries.push(
            `DROP TABLE IF EXISTS "${aTableName}" CASCADE;`
        );
    });
    return postGresOps.bulkQuery(dropQueries);
};

fluid.tests.postgresdb.utils.testQuery = function (results, numQueries) {
    jqUnit.assertNotNull("Check for null result", results);
    jqUnit.assertEquals("Check number of queries", numQueries, results.length);
};

fluid.tests.postgresdb.utils.testFailureCreateTable = function (error, tableName) {
    jqUnit.assertNotNull("Check for null error", error);
    jqUnit.assertEquals("Check error message",
        "relation \"" + tableName + "\" already exists",
        error.message
    );
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

    // TODO:  this assumes the order of data in the `allTablesData` object is
    // the same as the arrays of records in `results`, i.e. the first array of
    // `results` matches the first set of data in allTablesData.
    var tableNames = fluid.keys(allTablesData);
    fluid.each(results, function (records, index) {
        var tableName = tableNames[index];
        fluid.tests.postgresdb.utils.testLoadOneTable(records, allTablesData[tableName]);
    });
};
