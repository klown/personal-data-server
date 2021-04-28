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
    jqUnit = require("node-jqunit"),
    postgresdb = require("../js/index.js");

require("./testUtilities.js");

// Tables structures and test data records
require("./data/testTableModels.js");
require("./data/testTableData.js");

jqUnit.module("PostgresDB operations unit tests.");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.tests.postgresdb.parameterizedInsert = `
    INSERT INTO rgb (id, color, "colourMap") VALUES($1, $2, $3);
`;

fluid.tests.postgresdb.valueParameters = [
    "plum",
    "purple",
    {
        "name": "purple",
        "HSL": [306, 41, 40]
    }
];

fluid.tests.postgresdb.anotherUserToInsert = `
    INSERT INTO users
               ("userId",                iterations, username, name,    email,             roles,      derived_key,                                salt,                               verification_code, verified)
        VALUES ('another.user:nonadmin', 0,          'carla',  'carla', 'carla@localhost', '{"user"}', '9ff4bc1c1846181d303971b08b65122a45174d04', '2653c80aabd3889c3dfd6e198d3dca93', 'carlaIsVerified', true)
        RETURNING *;
`;

fluid.tests.postgresdb.anotherUserToInsertJSON =  {
    "userId": "another.user:nonadmin",
    "iterations": 0,
    "username": "carla",
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
    gradeNames: ["fluid.component"],

    userToInsert: fluid.tests.postgresdb.anotherUserToInsert,
    userToInsertJSON: fluid.tests.postgresdb.anotherUserToInsertJSON,

    // Changes that should succeed
    userChanges: `
        UPDATE users
            SET verified=false, email='carla@globalhost'
            WHERE "userId"='another.user:nonadmin'
            RETURNING *;
    `,
    userChangesExpected: fluid.extend(
        true, {}, fluid.tests.postgresdb.anotherUserToInsertJSON,
        { verified: false, email: "carla@globalhost" }
    ),
    primaryKeyChange: `
        UPDATE users
            SET "userId"='some.new.id'
            WHERE "userId"='another.user:nonadmin'
            RETURNING *;

    `,
    primaryKeyChangeExpected: fluid.extend(
        true, {}, fluid.tests.postgresdb.anotherUserToInsertJSON,
        { userId: "some.new.id", verified: false, email: "carla@globalhost" }
    ),
    sqlFile: __dirname + "/data/createInsertPrefs.sql",
    members: {
        postgresOps: new postgresdb.PostgresRequest(fluid.tests.postgresdb.databaseConfig),
        tableData: fluid.tests.postgresdb.testTableData,
        // Single record data from the tableData member, set onCreate()
        rgbChartreuse: null
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.tests.postgresdb.operations.findChartreuse",
            args: ["{that}"]
        }
    }
});

/**
 * Load one table from an arry of JSON inputs.
 *
 * @param {Object} pgOps - PostgresRequset instance.
 * @param {Sting} tableName - Name of table to load with the incoming records.
 * @param {Array} dataToLoad - Array of JSON object containing the data to load.
 * @return {Promise} Result of loading the records.
 */
fluid.tests.postgresdb.operations.loadOneTableFromJSON = function (pgOps, tableName, dataToLoad) {
    return pgOps.loadFromJSON(tableName, dataToLoad);
};

/**
 * Provide quick access to the `chartreuse` test data.
 *
 * @param {Object} that - Operations test component instance.
 * @param {Object} that.tableData - Where all of the table data is held.
 * @param {Object} that.rgbChartreuse - Reference to the "chartreuse" rgb data.
 */
fluid.tests.postgresdb.operations.findChartreuse = function (that) {
    that.rgbChartreuse = fluid.find(that.tableData.rgb, function (aColour) {
        if (aColour.id === "chartreuse") {
            return aColour;
        }
    });
};

/**
 * Load test data supplied for all of the test tables into those tables
 *
 * @param {Object} pgTestOps - PostgresRequset instance.
 * @param {Object} tableData - Where all of the input data is held.
 * @return {Promise} - results of the requests to load the test data.
 */
fluid.tests.postgresdb.operations.loadJSON = function (pgTestOps, tableData) {
    var loadSequence = [];
    fluid.each(fluid.tests.postgresdb.tableNames, function (aTableName) {
        loadSequence.push(
            pgTestOps.loadFromJSON(aTableName, tableData[aTableName])
        );
    });
    return Promise.all(loadSequence);
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
            // 'rejectArgs' is a Promise -- the result of a database request.
            {
                // Start with a clean database: drop any existing test tables.
                task: "fluid.tests.postgresdb.utils.testSqlArray",
                args: [
                    "{pgTestOps}.postgresOps",
                    fluid.tests.postgresdb.tableNames,
                    "IF EXISTS"
                ],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: [
                    "{arguments}.0", // DROP results
                    fluid.tests.postgresdb.tableNames.length,
                    "DROP"
                ]
            }, {
                // Drop the tables again -- should reject since there are no
                // such tables any more.
                task: "fluid.tests.postgresdb.utils.testSqlArray",
                args: ["{pgTestOps}.postgresOps", fluid.tests.postgresdb.tableNames],
                reject: "fluid.tests.postgresdb.operations.testDropNonExistentTable",
                rejectArgs: [
                    "{arguments}.0.message",
                    fluid.tests.postgresdb.tableNames
                ]
            }, {
                // Create all of the test tables
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    fluid.tests.postgresdb.tableDefinitions
                ],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: [
                    "{arguments}.0",  // CREATE results
                    fluid.tests.postgresdb.tableNames.length,
                    "CREATE"
                ]
            }, {
                // Load one test table based on JSON data
                task: "fluid.tests.postgresdb.operations.loadOneTableFromJSON",
                args: [
                    "{pgTestOps}.postgresOps",
                    "rgb",
                    "{pgTestOps}.tableData.rgb"
                ],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: [
                    "{arguments}.0",  // INSERT results
                    "{pgTestOps}.tableData.rgb.length",
                    "INSERT"
                ]
            }, {
                // Delete all records from the rgb table loaded previously
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "DELETE FROM rgb;"],
                resolve: "fluid.tests.postgresdb.operations.testDeleteTableData",
                resolveArgs: ["{arguments}.0", "{pgTestOps}", "rgb"] // results has number of rows deleted
            }, {
                // Check that rgb data is truly gone
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "SELECT * FROM rgb;"],
                resolve: "fluid.tests.postgresdb.operations.testEmptyTable",
                resolveArgs: ["{arguments}.0", "rgb"]
            }, {
                // Test failure of attempt to load into a non-existent table.
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "INSERT INTO noSuchTable (foo, bar) VALUES ('baz', 'snafu');"
                ],
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check INSERT into non-existent table",
                    "{arguments}.0.message",
                    "relation \"nosuchtable\" does not exist"
                ]
            }, {
                // Load all tables with data
                task: "fluid.tests.postgresdb.operations.loadJSON",
                args: ["{pgTestOps}.postgresOps", "{pgTestOps}.tableData"],
                resolve: "fluid.tests.postgresdb.utils.testLoadTables",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tableData"]
            }, {
                // Add another rgb record using parameters
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    fluid.tests.postgresdb.parameterizedInsert,
                    fluid.tests.postgresdb.valueParameters
                ],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: [["{arguments}.0"], 1, "INSERT"]
            }, {
                // Select from existing table
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "SELECT * FROM rgb WHERE color='green';"
                ],
                resolve: "fluid.tests.postgresdb.operations.testSelectRows",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.tableData.rgb"] // array of rows
            }, {
                // Select from non-existant table -- should fail
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "SELECT * FROM \"noSuchTable\" WHERE color='green';"
                ],
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check SELECT from non-existent table",
                    "{arguments}.0.message",
                    "relation \"noSuchTable\" does not exist"
                ]
            }, {
                // Test retrieval of a JSONB value
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "SELECT \"colourMap\" FROM rgb WHERE id='chartreuse'"
                ],
                resolve: "fluid.tests.postgresdb.operations.testRetrieveValue",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.rgbChartreuse", "colourMap"]
            }, {
                // Test failing case where column does not exist
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "SELECT \"noSuchColumn\" FROM rgb WHERE color='chartreuse';"
                ],
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check SELECT from non-existent column",
                    "{arguments}.0.message",
                    "column \"noSuchColumn\" does not exist"
                ]
            }, {
                // Insert new user record
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "{pgTestOps}.options.userToInsert"
                ],
                resolve: "fluid.tests.postgresdb.operations.testInsertRecord",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.options.userToInsertJSON"]
            }, {
                // Insert new record again -- should fail
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "{pgTestOps}.options.userToInsert"],
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check second INSERT of same record",
                    "{arguments}.0.message",
                    "duplicate key value violates unique constraint \"users_pkey\""
                ]
            }, {
                // Update a field with a proper identifier
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "{pgTestOps}.options.userChanges"],
                resolve: "fluid.tests.postgresdb.operations.testUpdateFields",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.options.userChangesExpected"]
            }, {
                // Update the primary key itself
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "{pgTestOps}.options.primaryKeyChange"],
                resolve: "fluid.tests.postgresdb.operations.testUpdateFields",
                resolveArgs: ["{arguments}.0", "{pgTestOps}.options.primaryKeyChangeExpected"]
            }, {
                // Update with non-existent primary key; should return zero results
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "UPDATE users SET iterations=55 WHERE \"userId\"='noSuchUser';"
                ],
                resolve: "jqUnit.assertEquals",
                resolveArgs: [
                    "Check UPDATE with mismatched primaryKey",
                    "{arguments}.0.rowCount", 0
                ]
            }, {
                // Test successful deletion
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: [
                    "{pgTestOps}.postgresOps",
                    "DELETE FROM \"roster.preferenceset\" WHERE name='default';"
                ],
                resolve: "jqUnit.assertEquals",
                resolveArgs: [
                    "Check number of records deleted",
                    "{arguments}.0.rowCount", 1
                ]
            }, {
                // Run sql from a file.
                task: "fluid.tests.postgresdb.utils.runSQLfile",
                args: ["{pgTestOps}.postgresOps","{pgTestOps}.options.sqlFile"],
                resolve: "fluid.tests.postgresdb.utils.testResults",
                resolveArgs: ["{arguments}.0", 3]
            }, {
                // Run sql from a non-existent file -- should fail
                task: "fluid.tests.postgresdb.utils.runSQLfile",
                args: ["{pgTestOps}.postgresOps", "/no/such/file.sql"],
                reject: "jqUnit.assertEquals",
                rejectArgs: [
                    "Check running sql when file access failure",
                    "{arguments}.0.message",
                    "ENOENT: no such file or directory, open '/no/such/file.sql'"
                ]
            }, {
                // Delete all records from one table using TRUNCATE.  Note that
                // TRUNCATE returns nothing so it either resolved or rejected.
                // The test that follows this TRUNCATE test checks that all of
                // the records were deleted.
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "TRUNCATE massive;"],
                resolve: "fluid.identity",
                resolveArgs: []
            }, {
                // Check that massive data is truly gone
                task: "fluid.tests.postgresdb.utils.runSQL",
                args: ["{pgTestOps}.postgresOps", "SELECT * FROM massive;"],
                resolve: "fluid.tests.postgresdb.operations.testEmptyTable",
                resolveArgs: ["{arguments}.0", "massive"]
            }, {
                // No result; either resolves or fails.
                task: "fluid.tests.postgresdb.utils.finish",
                args: ["{pgTestOps}.postgresOps"],
                resolve: "fluid.identity"
            }]
        }]
    }]
});

fluid.tests.postgresdb.operations.testInit = function (pgTestOps) {
    jqUnit.assertNotNull("Check operations instance is non-null", pgTestOps.postgresOps);
    jqUnit.assertTrue(
        "Check test data",
        pgTestOps.tableData &&
        Object.keys(pgTestOps.tableData).length !== 0
    );
    jqUnit.assertEquals(
        "Check chartreuse data", "chartreuse", pgTestOps.rgbChartreuse.id
    );
};

fluid.tests.postgresdb.operations.testDeleteTableData = function (result, dataBaseOps, tableName) {
    var tableData = dataBaseOps.tableData[tableName];
    jqUnit.assertEquals("Check for number of rows deleted", tableData.length, result.rowCount);
};

fluid.tests.postgresdb.operations.testSelectRows = function (result, expected) {
    fluid.each(result.rows, function (actualRecord) {
        fluid.each(expected, function (expectedRecord) {
            if (expectedRecord.id === actualRecord.id) {
                var expectedFields = Object.keys(expectedRecord);
                fluid.tests.postgresdb.utils.checkKeyValuePairs(
                    expectedFields, actualRecord, expectedRecord,
                    "Check row values"
                );
            }
        });
    });
};

fluid.tests.postgresdb.operations.testRetrieveValue = function (results, expected, expectedKey) {
    jqUnit.assertNotEquals("Check for empty result", 0, results.length);
    jqUnit.assertDeepEq(
        "Check value retrieved",
        expected[expectedKey],
        results.rows[0][expectedKey]
    );
};

fluid.tests.postgresdb.operations.testEmptyTable = function (results, tableName) {
    jqUnit.assertEquals(
        "Check retrieve value when querying empty table '" + tableName + "'",
        0, results.rowCount
    );
};

fluid.tests.postgresdb.operations.testInsertRecord = function (results, expectedAddition) {
    jqUnit.assertNotEquals("Check for empty result", 0, results.length);

    var expectedKeys = Object.keys(expectedAddition);
    fluid.tests.postgresdb.utils.checkKeyValuePairs(
        expectedKeys, results.rows[0], expectedAddition,
        "Check added record"
    );
};

fluid.tests.postgresdb.operations.testUpdateFields = function (results, expected) {
    fluid.tests.postgresdb.utils.checkKeyValuePairs(
        Object.keys(expected),
        results.rows[0],
        expected,
        "Check update results"
    );
};

fluid.tests.postgresdb.operations.testDropNonExistentTable = function (message, tableNames) {
    jqUnit.assertEquals(
        "Check DROP of non-existant table",
        `table "${tableNames[0]}" does not exist`,
        message
    );
};

fluid.test.runTests("fluid.tests.postgresdb.operations.environment");
