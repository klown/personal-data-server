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

const fluid = require("infusion");
const jqUnit = require("node-jqunit");
const postgresOps = require("../src/dbOps/postgresOps.js");

require("../src/shared/driverUtils.js");
require("./shared/utilsDb.js");

// Tables structures and test data records
require("./data/testTableModels.js");
require("./data/testTableData.js");

jqUnit.module("PostgresDB operations unit tests.");

fluid.registerNamespace("fluid.tests.dbOps");

const parameterizedInsert = `
    INSERT INTO rgb (id, color, "colourMap") VALUES($1, $2, $3);
`;

const valueParameters = [
    "plum",
    "purple",
    {
        "name": "purple",
        "HSL": [306, 41, 40]
    }
];

const sqlFile = __dirname + "/data/createInsertPrefs.sql";

const testData = {
    userToInsert: `
        INSERT INTO users
                   ("userId",                iterations, username, name,    email,             roles,      derived_key,                                salt,                               verification_code, verified)
            VALUES ('another.user:nonadmin', 0,          'carla',  'carla', 'carla@localhost', '{"user"}', '9ff4bc1c1846181d303971b08b65122a45174d04', '2653c80aabd3889c3dfd6e198d3dca93', 'carlaIsVerified', true)
            RETURNING *;
        `,
    userToInsertJSON: {
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
    },
    userChanges: `
        UPDATE users
            SET verified=false, email='carla@globalhost'
            WHERE "userId"='another.user:nonadmin'
            RETURNING *;
    `,
    primaryKeyChange: `
        UPDATE users
            SET "userId"='some.new.id'
            WHERE "userId"='another.user:nonadmin'
            RETURNING *;
    `
};

const expected = {
    userChanges: fluid.extend(
        true, {}, testData.userToInsertJSON,
        { verified: false, email: "carla@globalhost" }
    ),
    primaryKeyChange: fluid.extend(
        true, {}, testData.userToInsertJSON,
        { userId: "some.new.id", verified: false, email: "carla@globalhost" }
    )
};

const rgbChartreuse = fluid.find(fluid.tests.dbOps.testTableData.rgb, function (aColour) {
    if (aColour.id === "chartreuse") {
        return aColour;
    }
});

jqUnit.test("Database operations tests", async function () {
    jqUnit.expect(240);

    // Start the database
    const dbStatus = await fluid.personalData.dockerStartDatabase(fluid.tests.postgresContainer, fluid.tests.postgresImage, fluid.tests.dbConfig);
    jqUnit.assertTrue("The database has been started successfully", dbStatus);

    const postgresHandler = new postgresOps.postgresOps(fluid.tests.dbConfig);

    // Start with a clean database: drop any existing test tables.
    let response = await fluid.tests.utils.testSqlArray(postgresHandler, fluid.tests.dbOps.tableNames, "IF EXISTS");
    fluid.tests.utils.testResults(response, fluid.tests.dbOps.tableNames.length, "DROP");

    // Create all of the test tables
    response = await fluid.tests.utils.runSQL(postgresHandler, fluid.tests.dbOps.tableDefinitions);
    fluid.tests.utils.testResults(response, fluid.tests.dbOps.tableNames.length, "CREATE");

    // Load one test table based on JSON data
    response = await postgresHandler.loadFromJSON("rgb", fluid.tests.dbOps.testTableData.rgb);
    fluid.tests.utils.testResults(response, fluid.tests.dbOps.testTableData.rgb.length, "INSERT");

    // Delete all records from the rgb table loaded previously
    response = await fluid.tests.utils.runSQL(postgresHandler, "DELETE FROM rgb;");
    jqUnit.assertEquals("Check for number of rows deleted", fluid.tests.dbOps.testTableData.rgb.length, response.rowCount);

    // Check that rgb data is truly gone
    response = await fluid.tests.utils.runSQL(postgresHandler, "SELECT * FROM rgb;");
    jqUnit.assertEquals("Check retrieve value when querying empty table 'rgb'", 0, response.rowCount);

    // Test failure of attempt to load into a non-existent table.
    try {
        await fluid.tests.utils.runSQL(postgresHandler, "INSERT INTO noSuchTable (foo, bar) VALUES ('baz', 'snafu');");
    } catch (error) {
        jqUnit.assertEquals("Check INSERT into non-existent table", error.message, "relation \"nosuchtable\" does not exist");
    }

    // Load all tables with data
    response = await fluid.tests.dbOps.loadJSON(postgresHandler, fluid.tests.dbOps.testTableData);
    jqUnit.assertNotNull("Check for null result", response);
    fluid.each(response, function (aResult, index) {
        const tableName = fluid.tests.dbOps.tableNames[index];
        fluid.tests.utils.testResults(
            aResult, fluid.tests.dbOps.testTableData[tableName].length, "INSERT"
        );
    });

    // Add another rgb record using parameters
    response = await fluid.tests.utils.runSQL(postgresHandler, parameterizedInsert, valueParameters);
    jqUnit.assertEquals("Check number of rows added", 1, response.rowCount);
    jqUnit.assertEquals("Check SQL command", "INSERT", response.command);

    // Select from existing table
    response = await fluid.tests.utils.runSQL(postgresHandler, "SELECT * FROM rgb WHERE color='green';");
    fluid.each(response.rows, function (actualRecord) {
        fluid.each(fluid.tests.dbOps.testTableData.rgb, function (expectedRecord) {
            if (expectedRecord.id === actualRecord.id) {
                const expectedFields = Object.keys(expectedRecord);
                fluid.tests.utils.checkKeyValuePairs(
                    expectedFields, actualRecord, expectedRecord,
                    "Check row values"
                );
            }
        });
    });

    // Select from non-existant table -- should fail
    try {
        await fluid.tests.utils.runSQL(postgresHandler, "SELECT * FROM noSuchTable WHERE color='green';");
    } catch (error) {
        jqUnit.assertEquals("Check SELECT from non-existent table", error.message, "relation \"nosuchtable\" does not exist");
    }

    // Test retrieval of a JSONB value
    response = await fluid.tests.utils.runSQL(postgresHandler, "SELECT \"colourMap\" FROM rgb WHERE id='chartreuse'");
    jqUnit.assertNotEquals("Check for empty result", 0, response.length);
    jqUnit.assertDeepEq("Check value retrieved", rgbChartreuse.colourMap, response.rows[0].colourMap);

    // Test failing case where column does not exist
    try {
        await fluid.tests.utils.runSQL(postgresHandler, "SELECT \"noSuchColumn\" FROM rgb WHERE color='chartreuse';");
    } catch (error) {
        jqUnit.assertEquals("Check SELECT from non-existent column", error.message, "column \"noSuchColumn\" does not exist");
    }

    // Insert new user record
    response = await fluid.tests.utils.runSQL(postgresHandler, testData.userToInsert);
    const expectedKeys = Object.keys(testData.userToInsertJSON);
    fluid.tests.utils.checkKeyValuePairs(expectedKeys, response.rows[0], testData.userToInsertJSON, "Check added record");

    // Insert new record again -- should fail
    try {
        await fluid.tests.utils.runSQL(postgresHandler, testData.userToInsert);
    } catch (error) {
        jqUnit.assertEquals("Check second INSERT of same record", error.message, "duplicate key value violates unique constraint \"users_pkey\"");
    }

    // Update a field with a proper identifier
    response = await fluid.tests.utils.runSQL(postgresHandler, testData.userChanges);
    fluid.tests.utils.checkKeyValuePairs(Object.keys(expected.userChanges), response.rows[0], expected.userChanges, "Check update results");

    // Update the primary key itself
    response = await fluid.tests.utils.runSQL(postgresHandler, testData.primaryKeyChange);
    fluid.tests.utils.checkKeyValuePairs(Object.keys(expected.primaryKeyChange), response.rows[0], expected.primaryKeyChange, "Check update results");

    // Update with non-existent primary key; should return zero results
    response = await fluid.tests.utils.runSQL(postgresHandler, "UPDATE users SET iterations=55 WHERE \"userId\"='noSuchUser';");
    jqUnit.assertEquals("Check UPDATE with mismatched primaryKey", response.rowCount, 0);

    // Test successful deletion
    response = await fluid.tests.utils.runSQL(postgresHandler, "DELETE FROM \"prefsSafes\" WHERE \"prefsSafesId\"='prefsSafe-1';");
    jqUnit.assertEquals("Check number of records deleted", response.rowCount, 1);

    // Run sql from a file.
    response = await fluid.tests.utils.runSQLfile(postgresHandler, sqlFile);
    fluid.tests.utils.testResults(response, 3);

    // Run sql from a non-existent file -- should fail
    try {
        await fluid.tests.utils.runSQLfile(postgresHandler, "/no/such/file.sql");
    } catch (error) {
        jqUnit.assertEquals("Check running sql when file access failure", error.message, "ENOENT: no such file or directory, open '/no/such/file.sql'");
    }

    // Delete all records from one table using TRUNCATE.  Note that TRUNCATE returns nothing so it either resolved or rejected.
    // The test that follows this TRUNCATE test checks that all of the records were deleted.
    await fluid.tests.utils.runSQL(postgresHandler, "TRUNCATE massive;");

    // Check that massive data is truly gone
    response = await fluid.tests.utils.runSQL(postgresHandler, "SELECT * FROM massive;");
    jqUnit.assertEquals("Check retrieve value when querying empty table 'massive'", 0, response.rowCount);

    fluid.tests.utils.finish(postgresHandler);

    // Stop the docker container for the database
    await fluid.personalData.dockerStopDatabase(fluid.tests.postgresContainer, dbStatus);
});

/**
 * Load test data supplied for all of the test tables into those tables
 *
 * @param {Object} postgresHandler - postgresHandler instance.
 * @param {Object} tableData - Where all of the input data is held.
 * @return {Promise} - results of the requests to load the test data.
 */
fluid.tests.dbOps.loadJSON = function (postgresHandler, tableData) {
    let loadSequence = [];
    fluid.each(fluid.tests.dbOps.tableNames, function (aTableName) {
        loadSequence.push(
            postgresHandler.loadFromJSON(aTableName, tableData[aTableName])
        );
    });
    return Promise.all(loadSequence);
};
