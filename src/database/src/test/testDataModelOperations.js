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

require("../js/dataModelOperations.js");
require("./data/testDataModelOpsTableData.js");
require("./testUtilities.js");

jqUnit.module("Data Model postgresdb operations unit tests.");

fluid.registerNamespace("fluid.tests.dataModel");

fluid.tests.dataModel.prefsSafesKey = "";

fluid.defaults("fluid.tests.dataModel.operations", {
    gradeNames: ["fluid.postgresdb.dataModelOps"],

    knownUserId: "org.idrc.user:nonadmin",
    unknownUserId: "NoOneIknoW",

    knownPrefsSafesId: "prefsSafe-1",
    unknownPrefsSafesId: "xyzzy",

    knownClientId: "appInstallationClient-1",
    unknownClientId: "RaNdOm",

    knownCloudSafeCredentialsId: "cloudSafeCredential-2",
    unknownCloudSafeCredentialsId: "unknown",

    knownOAuth2ClientId: "net.gpii.ajc.bakersfield",
    oauth2ClientTestDataId: "clientCredential-1",   // client with `knownOAuth2ClientId`
    unknownOAuth2ClientId: "foo.barbaz.ca",

    knownPrefsSafesKey: "chrome_high_contrast",
    unknownPrefsSafesKey: "MoDnAr",

    knownAccessToken: "gpii-app-installation-accessToken-3",
    authorizationId: "appInstallationAuthorization-3",  // authorization with `knownAccessToken`
    unknownAccessToken: "DAM for SCORM",

    members: {
        // Set onCreate
        tableData: null,
        expectedUserRecord: null,
        expectedPrefsSafe: null,
        expectedClient: null,
        expectedCloudSafeCredentials: null,
        expectedClientCredentials: null,
        expectedAppInstallationAuthorization: null
    },
    invokers: {
        getTestRecordData: {
            funcName: "fluid.tests.dataModel.operations.getTestRecordData",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // identfier
        }
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.tests.dataModel.operations.doSetUp",
            args: ["{that}"]
        }
    },
    components: {
        request: {
            type: "fluid.postgresdb.request",
            options: {
                databaseName:   "prefs_testdb",
                host:           "localhost",
                port: process.env.PGPORT || 5432,
                user: process.env.POSTGRES_USER || "admin",
                password: process.env.POSTGRES_PASSWORD || "asecretpassword",
            }
        }
    }
});

/**
 * Set up for tests:
 * - load the table definitions and their data,
 * - find a reference to the expected user record used in the tests,
 * - find a reference to the expected preferences safe used in the tests.
 *
 * @param {Object} that - Operations test component instance.
 * @param {Object} that.tableData - Where to store the table data to load into
 *                                  the database.
 * @param {Object} that.expectedUserRecord - Reference to that.options.knownUserId's
 *                                           test record data from that.tableData.
 * @param {Object} that.expectedPrefsSafe - Reference to that.options.prefsSafeId's
 *                                          test record data from that.tableData.
 */
fluid.tests.dataModel.operations.doSetUp = function (that) {
    that.loadTableModels("%preferencesServer/src/database/data/tableModels.js");
    that.tableData = fluid.tests.dataModel.testTableData;
    that.expectedUserRecord = that.getTestRecordData(
        fluid.postgresdb.tableNames.users, that.options.knownUserId
    );
    that.expectedPrefsSafe = that.getTestRecordData(
        fluid.postgresdb.tableNames.prefsSafes, that.options.knownPrefsSafesId
    );
    that.expectedClient = that.getTestRecordData(
        fluid.postgresdb.tableNames.appInstallationClients, that.options.knownClientId
    );
    that.expectedCloudSafeCredentials = that.getTestRecordData(
        fluid.postgresdb.tableNames.cloudSafeCredentials, that.options.knownCloudSafeCredentialsId
    );
    that.expectedClientCredentials = that.getTestRecordData(
        fluid.postgresdb.tableNames.clientCredentials, that.options.oauth2ClientTestDataId
    );
    that.expectedAppInstallationAuthorization = that.getTestRecordData(
        fluid.postgresdb.tableNames.appInstallationAuthorizations, that.options.authorizationId
    );
};

/**
 * Get a reference test data used to load a record into a table.  Note that this
 * gets the test data *not* from the database, but from the test data itself.
 *
 * @param {Object} that - Operations test component instance.
 * @param {Object} that.tableData - The test data used to load the tables.
 * @param {String} testDataTableName - Name of the table the record was to be
 *                                     loaded into.
 * @param {String} identifier - Identifier of the record.
 * @return {Object} A JSON structure that is the test data for the record.
 */
fluid.tests.dataModel.operations.getTestRecordData = function (databaseOps, testDataTableName, identifier) {
    var testRecordData = fluid.find(databaseOps.tableData[testDataTableName],
        function (aTestRecord) {
            if (aTestRecord.id === identifier) {
                return aTestRecord;
            }
        }, null);
    return testRecordData;
};

fluid.defaults("fluid.tests.dataModel.operations.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        dbTestOps: {
            type: "fluid.tests.dataModel.operations"
        },
        testCaseHolder: {
            type: "fluid.tests.dataModel.operations.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.dataModel.operations.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "Database models operations tests",
        tests: [{
            name: "Database models operations tests",
            sequence: [{
                funcName: "fluid.tests.dataModel.operations.testInit",
                args: ["{dbTestOps}"]
            }, {
                task: "{dbTestOps}.createTables",
                args: ["{dbTestOps}.modelDefinitions", true],
                                                       // delete existing tables
                resolve: "fluid.tests.postgresdb.utils.testCreateTables",
                resolveArgs: ["{arguments}.0", "{dbTestOps}.tables"]
            }, {
                task: "{dbTestOps}.loadTables",
                args: ["{dbTestOps}.tableData"],
                resolve: "fluid.tests.postgresdb.utils.testLoadTables",
                resolveArgs: ["{arguments}.0", "{dbTestOps}.tableData"]
            }, {
                // General findRecordById()
                task: "{dbTestOps}.findRecordById",
                args: [
                    "{dbTestOps}.options.knownUserId",
                    fluid.postgresdb.tableNames.users
                ],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedUserRecord",
                    "{dbTestOps}.options.knownUserId"
                ]
            }, {
                task: "{dbTestOps}.findRecordById",
                args: [
                    "{dbTestOps}.options.unknownUserId",
                    fluid.postgresdb.tableNames.users
                ],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: ["{arguments}.0", "{dbTestOps}.options.unknownUserId"]
            }, {
                // General findRecordByFieldValue
                task: "{dbTestOps}.findRecordByFieldValue",
                args: [
                    {"userId": "{dbTestOps}.options.knownUserId"},
                    fluid.postgresdb.tableNames.cloudSafeCredentials
                ],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedCloudSafeCredentials",
                    "{dbTestOps}.options.knownUserId"
                ]
            }, {
                task: "{dbTestOps}.findRecordByFieldValue",
                args: [
                    {"userId": "{dbTestOps}.options.unknownUserId"},
                    fluid.postgresdb.tableNames.cloudSafeCredentials
                ],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: ["{arguments}.0", "{dbTestOps}.options.unknownUserId"]
            }, {
                // Find a user by their id
                task: "{dbTestOps}.findUserById",
                args: [
                    "{dbTestOps}.options.knownUserId",
                    fluid.postgresdb.tableNames.users
                ],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedUserRecord",
                    "{dbTestOps}.options.knownUserId"
                ]
            }, {
                task: "{dbTestOps}.findUserById",
                args: [
                    "{dbTestOps}.options.unknownUserId",
                    fluid.postgresdb.tableNames.users
                ],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: ["{arguments}.0", "{dbTestOps}.options.unknownUserId"]
            }, {
                // Find prefsSafe by its id.
                task: "{dbTestOps}.findPrefsSafeById",
                args: ["{dbTestOps}.options.knownPrefsSafesId"],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedPrefsSafe",
                    "{dbTestOps}.options.knownPrefsSafesId"
                ]
            }, {
                task: "{dbTestOps}.findPrefsSafeById",
                args: ["{dbTestOps}.options.unknownPrefsSafesId"],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: ["{arguments}.0", "{dbTestOps}.options.unknownPrefsSafesId"]
            }, {
                // Find prefsSafe given a user record
                task: "{dbTestOps}.findPrefsSafeByUserRecord",
                args: ["{dbTestOps}.expectedUserRecord"],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedPrefsSafe",
                    "{dbTestOps}.expectedUserRecord.id"
                ]
            }, {
                // Find prefsSafe given a user id
                task: "{dbTestOps}.findPrefsSafeByUserId",
                args: ["{dbTestOps}.options.knownUserId"],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedPrefsSafe",
                    "{dbTestOps}.options.knownUserId"
                ]
            }, {
                task: "{dbTestOps}.findPrefsSafeByUserId",
                args: ["{dbTestOps}.options.unknownUserId"],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.unknownUserId"
                ]
            }, {
                // Find appInstallationClient given its id
                task: "{dbTestOps}.findClientById",
                args: ["{dbTestOps}.options.knownClientId"],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedClient",
                    "{dbTestOps}.options.knownClientId"
                ]
            }, {
                task: "{dbTestOps}.findClientById",
                args: ["{dbTestOps}.options.unknownClientId"],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.unknownClientId"
                ]
            }, {
                // Find cloud safe credentials given vis its userId value
                task: "{dbTestOps}.findCloudCredentialsByUserId",
                args: [{"userId": "{dbTestOps}.options.knownUserId"}],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedCloudSafeCredentials",
                    "{dbTestOps}.options.knownCloudSafeCredentialsId"
                ]
            }, {
                task: "{dbTestOps}.findCloudCredentialsByUserId",
                args: [{"userId": "{dbTestOps}.options.unknownUserId"}],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.unknownUserId"
                ]
            }, {
                // Find client credentials given its oauth2ClientId
                task: "{dbTestOps}.findClientByOauth2ClientId",
                args: [
                    {"oauth2ClientId": "{dbTestOps}.options.knownOAuth2ClientId"}
                ],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedClientCredentials",
                    "{dbTestOps}.options.knownOAuth2ClientId"
                ]
            }, {
                task: "{dbTestOps}.findClientByOauth2ClientId",
                args: [
                    {"oauth2ClientId": "{dbTestOps}.options.unknownOAuth2ClientId"}
                ],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.unknownOAuth2ClientId"
                ]
            }, {
                // Find client credentials given its oauth2ClientId
                task: "{dbTestOps}.findAuthorizationByAccessToken",
                args: [
                    {"accessToken": "{dbTestOps}.options.knownAccessToken"}
                ],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.expectedAppInstallationAuthorization",
                    "{dbTestOps}.options.knownAccessToken"
                ]
            }, {
                task: "{dbTestOps}.findAuthorizationByAccessToken",
                args: [
                    {"accessToken": "{dbTestOps}.options.unknownAccessToken"}
                ],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.unknownAccessToken"
                ]
            }, {
                // Create a structure of access token, authorization, and
                // credentials based on an accessToken.
                task: "{dbTestOps}.getAuthAndCredentialsByAccessToken",
                args:[
                    {"accessToken": "{dbTestOps}.options.knownAccessToken"}
                ],
                resolve: "fluid.tests.dataModel.operations.testAccessStructure",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.knownAccessToken",
                    "{dbTestOps}.expectedCloudSafeCredentials",
                    "{dbTestOps}.expectedAppInstallationAuthorization"
                 ]
            }, {
                task: "{dbTestOps}.getAuthAndCredentialsByAccessToken",
                args: [
                    {"accessToken": "{dbTestOps}.options.unknownAccessToken"}
                ],
                resolve: "fluid.tests.dataModel.operations.testAccessStructure",
                resolveArgs: ["{arguments}.0", undefined, {}, {}]
            }, {
                // Find prefsSafe given a prefsSafesKey (formerly GPII Key)
                task: "{dbTestOps}.findPrefsSafeByPrefsSafeKey",
                args: ["{dbTestOps}.options.knownPrefsSafesKey"],
                resolve: "fluid.tests.dataModel.operations.testFindSuccess",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.knownPrefsSafesKey.prefsSafes",
                    "{dbTestOps}.options.knownPrefsSafesKey"
                ]
            }, {
                task: "{dbTestOps}.findPrefsSafeByPrefsSafeKey",
                args: ["{dbTestOps}.options.unknownPrefsSafesKey"],
                resolve: "fluid.tests.dataModel.operations.testFindNone",
                resolveArgs: [
                    "{arguments}.0",
                    "{dbTestOps}.options.unknownPrefsSafesKey"
                ]
            }]
        }]
    }]
});

fluid.tests.dataModel.operations.testInit = function (dbTestOps) {
    jqUnit.assertNotNull("Check operations instance is non-null", dbTestOps);
    jqUnit.assertTrue(
        "Check table test models and data",
        dbTestOps.modelDefinitions &&
        dbTestOps.tableData &&
        fluid.keys(dbTestOps.tableData).length !== 0 &&
        dbTestOps.expectedUserRecord !== null &&
        dbTestOps.expectedPrefsSafe !== null
    );
    jqUnit.assertNotNull(
        "Check operations request connection",
        dbTestOps.request && dbTestOps.request.sequelize
    );
};

fluid.tests.dataModel.operations.testFindSuccess = function (results, expected, msg) {
    jqUnit.assertNotNull("Check find results: " + msg, results);
    jqUnit.assertNotEquals("Check number of " + msg + " records found", 0, results.length);
    fluid.tests.postgresdb.utils.checkKeyValuePairs(
        fluid.keys(expected),
        results[0],
        expected,
        "Check found record: " + msg
    );
};

fluid.tests.dataModel.operations.testFindNone = function (results, msg) {
    jqUnit.assertNotNull("Check find results", results);
    jqUnit.assertEquals("Check find no results for " + msg, 0, results.length);
};

fluid.tests.dataModel.operations.testAccessStructure = function (result, accessToken, credentials, authorization) {
    jqUnit.assertNotNull("Check access token structure", result);
    jqUnit.assertEquals("Check access token in access token structure", accessToken, result.accessToken);

    fluid.tests.postgresdb.utils.checkKeyValuePairs(
        fluid.keys(credentials),
        result.credentials,
        credentials,
        "Check credentials in access token structure: " + accessToken
    );
    fluid.tests.postgresdb.utils.checkKeyValuePairs(
        fluid.keys(authorization),
        result.authorization,
        authorization,
        "Check authorization in access token structure: " + accessToken
    );
};

fluid.test.runTests("fluid.tests.dataModel.operations.environment");
