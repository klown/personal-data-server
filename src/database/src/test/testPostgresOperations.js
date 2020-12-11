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
require("./data/testTableData.js");

jqUnit.module("PostgresDB operations unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.tests.postgresdb.anotherUserToInsert =  {
    "id": "another.user:nonadmin",
    "iterations": 0,
    "username": "carla",
    "type": "user",
    "name": "carla",
    "email": "carla@localhost",
    "roles": [
        "user"
    ],
    "derived_key": "9ff4bc1c1846181d303971b08b65122a45174d04",
    "salt": "2653c80aabd3889c3dfd6e198d3dca93",
    "verification_code": "carlaIsVerified",
    "verified": true
};

fluid.defaults("fluid.tests.postgresdb.operations", {
    gradeNames: ["fluid.postgresdb.operations"],
    userToInsert: fluid.tests.postgresdb.anotherUserToInsert,

    // Changes that should succeed
    userChanges: {
        where: {
            id: "another.user:nonadmin"
        },
        attributes: {
            "verified": false,
            "email": "carla@globalhost"
        }
    },
    // Changes that should fail
    missingIdentifier: {
         attributes: {
            "verified": false,
            "email": "carla@globalhost"
        }
    },
    members: {
        // Set onCreate()
        tableData: {},          // Data to load into the database.
        rgbChartreuse: null,    // Single record data from the tableData member.
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.tests.postgresdb.operations.loadTableInfo",
            args: ["{that}"]
        }
    },
    components: {
        request: {
            type: "fluid.postgresdb.request",
            options: {
                databaseName: "prefs_testdb",
                host: "localhost",
                port: 5432,
                user: "admin",
                password: "asecretpassword"
            }
        }
    }
});

/*
 * Load the test table definitions and their data, and provide convenience
 * access to some of the data.
 *
 * @param {Object} that - Operations test component instance.
 * @param {Object} that.tableData - Where to store the table data to load into
 *                                  the database.
 * @param {Object} that.rgbChartreuse - Reference to the "chartreuse" rgb data.
 */
fluid.tests.postgresdb.operations.loadTableInfo = function (that) {
    that.loadTableModels(
        "%preferencesServer/src/database/src/test/data/testTableModels.js"
    );
    that.tableData = fluid.tests.postgresdb.testTableData;
    that.rgbChartreuse = fluid.find(that.tableData.rgb, function(aColour) {
        if (aColour.id === "chartreuse") {
            return aColour;
        }
    });
};

fluid.defaults("fluid.tests.postgresdb.operations.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        pgTestOps: {
            type: "fluid.tests.postgresdb.operations"
        },
        testCaseHolder: {
            type: "fluid.tests.postgresdb.operations.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.postgresdb.operations.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "Database operations tests",
        tests: [{
            name: "Database operations tests",
            sequence: [{
                funcName: "fluid.tests.postgresdb.operations.testInit",
                args: ["{pgTestOps}"]
            },
            // In the following, the first argument to the 'resolveArgs' or
            // 'rejectArgs' is a Promise value
            {
                task: "{pgTestOps}.createOneTable",
                args: ["{pgTestOps}.modelDefinitions.rgbTableModel", true],
                                                                        // delete existing table
                resolve: "fluid.tests.postgresdb.operations.testCreateOneTable",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tables"]
            }, {
                task: "{pgTestOps}.createTables",
                args: ["{pgTestOps}.modelDefinitions", true],
                                                          // delete existing tables
                resolve: "fluid.tests.postgresdb.operations.testCreateTables",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tables"]
            }, {
                task: "{pgTestOps}.loadOneTable",
                args: ["rgb", "{pgTestOps}.tableData.rgb"],
                resolve: "fluid.tests.postgresdb.operations.testLoadOneTable",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tableData.rgb"]
            }, {
                task: "{pgTestOps}.deleteTableData",
                args: ["rgb", true],    // hard delete
                resolve: "fluid.tests.postgresdb.operations.testDeleteTableData",
                resolveArgs: ["{arguments}.0", "{pgTestOps}", "rgb"]
                              // number of rows deleted
            }, {
                // Check that rgb data is truly gone
                task: "{pgTestOps}.retrieveValue",
                args: ["rgb", { attributes: ["id"] }],
                resolve: "fluid.tests.postgresdb.operations.testRetrieveValueNoTable",
                resolveArgs: ["{arguments}.0", "rgb"]
            }, {
                // Attempt to load into a non-existent table.
                task: "{pgTestOps}.loadOneTable",
                args: ["noSuchTable", "{pgTestOps}.tableData"],
                resolve: "fluid.tests.postgresdb.operations.testNoSuchTable",
                resolveArgs: ["{arguments}.0", "Load table: No table defined for 'noSuchTable'"]
            }, {
                task: "{pgTestOps}.loadTables",
                args: ["{pgTestOps}.tableData"],
                resolve: "fluid.tests.postgresdb.operations.testLoadTables",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tableData"]
            }, {
                // Select from existing table
                task: "{pgTestOps}.selectRows",
                args: ["rgb", { color: "green" }],
                resolve: "fluid.tests.postgresdb.operations.testSelectRows",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tableData.rgb"]
                              // array of rows
            }, {
                // Select from non-existent table
                task: "{pgTestOps}.selectRows",
                args: ["noSuchTable", { color: "green" }],
                resolve: "fluid.tests.postgresdb.operations.testSelectRows",
                resolveArgs: ["{arguments}.0", []]
                              // array of rows, should be zero length
            }, {
                task: "{pgTestOps}.retrieveValue",
                args: [
                    "rgb",
                    { attributes: ["colourMap"], where: { id: "chartreuse" } }
                ],
                resolve: "fluid.tests.postgresdb.operations.testRetrieveValue",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.rgbChartreuse", "colourMap"]
            }, {
                // Test failing case where value does not exist
                task: "{pgTestOps}.retrieveValue",
                args: [
                    "rgb",
                    { attributes: ["noSuchColumn"], where: { id: "chartreuse" } }
                ],
                reject: "fluid.tests.postgresdb.operations.testRetrieveValueNoColumn",
                rejectArgs: ["{arguments}.0"]
            }, {
                task: "{pgTestOps}.retrieveValue",
                args: ["noSuchTable", { anything: 22 } ],
                resolve: "fluid.tests.postgresdb.operations.testNoSuchTable",
                resolveArgs: ["{arguments}.0", []]
            }, {
                // Insert new record
                task: "{pgTestOps}.insertRecord",
                args: ["users", "{pgTestOps}.options.userToInsert"],
                resolve: "fluid.tests.postgresdb.operations.testInsertRecord",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.options.userToInsert"]
            }, {
                // Insert new record again -- should fail
                task: "{pgTestOps}.insertRecord",
                args: ["users", "{pgTestOps}.options.userToInsert"],
                reject: "fluid.tests.postgresdb.operations.testInsertRecordFail",
                rejectArgs: ["{arguments}.0"]
            }, {
                // Update a field with a proper identifier
                task: "{pgTestOps}.updateFields",
                args: ["users", "{pgTestOps}.options.userChanges"],
                resolve: "fluid.tests.postgresdb.operations.testUpdateFields",
                resolveArgs: ["{arguments}.0", true, 1]
            }, {
                // Update the identifier itself
                task: "{pgTestOps}.updateFields",
                args: [
                    "users",
                    {
                      where: { id: "another.user:nonadmin" },
                      attributes: {"id": "some.new.id"}
                    }
                ],
                resolve: "fluid.tests.postgresdb.operations.testUpdateFields",
                resolveArgs: ["{arguments}.0", true, 1]
            }, {
                // Update a field with no identifier; should fail/reject
                task: "{pgTestOps}.updateFields",
                args: ["users", "{pgTestOps}.options.missingIdentifier"],
                reject: "fluid.tests.postgresdb.operations.testUpdateFields",
                rejectArgs: ["{arguments}.0", false, 0]
            }, {
                // Update with non-existent table; should return "no results"
                task: "{pgTestOps}.updateFields",
                args: ["noSuchUser", "{pgTestOps}.options.missingIdentifier"],
                resolve: "fluid.tests.postgresdb.operations.testUpdateFields",
                resolveArgs: ["{arguments}.0", true, 0]
            }, {
                // Test successful deletion
                task: "{pgTestOps}.deleteRecord",
                args: ["roster.preferenceset", { "name": "default" }],
                resolve: "fluid.tests.postgresdb.operations.testDeleteRecord",
                resolveArgs: ["{arguments}.0", 1]
                              // number deleted, should be 1.
            }, {
                // Test to delete from a non-existent table
                task: "{pgTestOps}.deleteRecord",
                args: ["noSuchTable", { "name": "default" }],
                resolve: "fluid.tests.postgresdb.operations.testDeleteRecord",
                resolveArgs: ["{arguments}.0", 0]
                              // number deleted, should be 0 (zero).
            }, {
                // Soft delete
                task: "{pgTestOps}.deleteTableData",
                args: ["massive", false],    // soft delete
                resolve: "fluid.tests.postgresdb.operations.testDeleteTableData",
                resolveArgs: ["{arguments}.0", "{pgTestOps}", "massive"]
                              // number of rows deleted
            }, {
                // Delete from non-existant table
                task: "{pgTestOps}.deleteTableData",
                args: ["noSuchTable", true],
                resolve: "fluid.tests.postgresdb.operations.testNoSuchTable",
                resolveArgs: ["{arguments}.0", 0]
                              // number of rows deleted
            }]
        }]
    }]
})

fluid.tests.postgresdb.operations.checkKeyValuePairs = function (keys, actualPairs, expectedPairs, msg) {
    fluid.each(keys, function (key) {
        jqUnit.assertDeepEq(
            msg + " for key '" + key + "'",
            expectedPairs[key], actualPairs[key]
        );
    });
};

fluid.tests.postgresdb.operations.testInit = function (pgTestOps) {
    jqUnit.assertNotNull("Check operations instance is non-null", pgTestOps);
    jqUnit.assertTrue(
        "Check table test models and data",
        pgTestOps.modelDefinitions &&
        pgTestOps.tableData &&
        fluid.keys(pgTestOps.tableData).length !== 0
    );
    jqUnit.assertEquals(
        "Check chartreuse data", "chartreuse", pgTestOps.rgbChartreuse.id
    );
    jqUnit.assertNotNull(
        "Check operations request connection",
        pgTestOps.request && pgTestOps.request.sequelize
    );
};

fluid.tests.postgresdb.operations.testCreateOneTable = function (result, tables) {
    jqUnit.assertNotNull("Check for null create table result", result);
    jqUnit.assertDeepEq("Check result was stored", tables[result.getTableName()], result);
};

fluid.tests.postgresdb.operations.testCreateTables = function (result, tables) {
    jqUnit.assertNotNull("Check for null create tables result", result);
    jqUnit.assertEquals("Check number of tables", fluid.keys(tables).length, result.length);
    fluid.each(result, function (aResult) {
        fluid.tests.postgresdb.operations.testCreateOneTable(aResult, tables)
    });
};

fluid.tests.postgresdb.operations.testLoadOneTable = function (result, tableData) {
    jqUnit.assertNotNull("Check for null result", result);
    fluid.each(result, function (aResult, index) {
        var fields = tableData[index];
        var fieldKeys = fluid.keys(fields);
        fluid.tests.postgresdb.operations.checkKeyValuePairs(
            fieldKeys, aResult.get({plain: true}), fields,
            "Check column value matches given data"
        );
    })
};

fluid.tests.postgresdb.operations.testDeleteTableData = function (result, dataBaseOps, tableName) {
    var tableData = dataBaseOps.tableData[tableName];
    jqUnit.assertEquals("Check for number of rows deleted", tableData.length, result);
};

fluid.tests.postgresdb.operations.testLoadTables = function (result, tableData) {
    jqUnit.assertNotNull("Check for null result", result);
    fluid.each(result, function (aResult) {
        fluid.tests.postgresdb.operations.testLoadOneTable(aResult, tableData);
    });
};

fluid.tests.postgresdb.operations.testSelectRows = function (results, expected) {
    if (expected.length === 0) {
        jqUnit.assertEquals("Check zero rows returned", 0, results.length);
    } else {
        fluid.each(results, function (actual) {
            var actualRecord = actual.get({plain: true});
            fluid.each(expected, function (expectedRecord) {
                if (expectedRecord.id === actualRecord.id) {
                    var expectedFields = fluid.keys(expectedRecord);
                    fluid.tests.postgresdb.operations.checkKeyValuePairs(
                        expectedFields, actualRecord, expectedRecord,
                        "Check row values"
                    );
                }
            });
        });
    }
};

fluid.tests.postgresdb.operations.testRetrieveValue = function (results, expected, expectedKey) {
    jqUnit.assertNotEquals("Check for empty result", 0, results.length);
    jqUnit.assertDeepEq(
        "Check value retrieved",
        expected[expectedKey],
        results[0].get({plain: true})[expectedKey]
    );
};

fluid.tests.postgresdb.operations.testRetrieveValueNoTable = function (results, tableName) {
    jqUnit.assertEquals(
        "Check retrieve value when querying non-existent table '" + tableName + "'",
        0, results.length
    );
};

fluid.tests.postgresdb.operations.testRetrieveValueNoColumn = function (result) {
    jqUnit.assertEquals(
        "Check retrieve value when querying non-existent column",
        "column \"noSuchColumn\" does not exist",
        result.message
    );
};

fluid.tests.postgresdb.operations.testInsertRecord = function (results, expectedAddition) {
    jqUnit.assertNotEquals("Check for empty result", 0, results.length);

    // The database adds "createdAt" and "updatedAt" fields which are not in the
    // original record.  Run the comparison based on the fields of the original
    // record (expectedAddition)
    var expectedKeys = fluid.keys(expectedAddition);
    fluid.tests.postgresdb.operations.checkKeyValuePairs(
        expectedKeys, results[0].get({plain: true}), expectedAddition,
        "Check added record"
    );
};

fluid.tests.postgresdb.operations.testInsertRecordFail = function (error) {
    jqUnit.assertEquals(
        "Check duplicate insertion", error.message, "Validation error"
    );
};

fluid.tests.postgresdb.operations.testUpdateFields = function (results, shouldSucceed, expectedNumRows) {
    if (shouldSucceed) {
        jqUnit.assertEquals("Check success (one record changed)", expectedNumRows, results[0]);
    } else {
        jqUnit.assertEquals("Check error message", "Missing primary key", results);
    }
};

fluid.tests.postgresdb.operations.testDeleteRecord = function (actualNumDeleted, expectedNumDeleted) {
    jqUnit.assertEquals(
        "Check number of records deleted",
        expectedNumDeleted,
        actualNumDeleted
    );
};

fluid.tests.postgresdb.operations.testNoSuchTable = function (actualError, expectedError) {
    jqUnit.assertDeepEq(
        "Check access to non-existent table", expectedError, actualError
    );
};

fluid.test.runTests("fluid.tests.postgresdb.operations.environment");
