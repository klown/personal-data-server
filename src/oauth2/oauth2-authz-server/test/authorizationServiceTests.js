/*!

    Copyright 2015-2021 OCAD university
    Copyright 2019 Raising the Floor International

    Licensed under the New BSD license. You may not use this file except in
    compliance with this License.

    The research leading to these results has received funding from the European Union's
    Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.

    You may obtain a copy of the License at
    https://github.com/fluid-project/preferencesServer/blob/main/LICENSE.txt

*/
"use strict";
var fluid = require("infusion"),
    jqUnit = require("node-jqunit");

require("../src/AuthorizationService.js");
require("./data/authTestTableData.js");
require("./authTestFixtures");

fluid.logObjectRenderChars = 4096;

//gpii.loadTestingSupport();

// The mock codeGenerator for testing
fluid.defaults("fluid.tests.oauth2.mockCodeGenerator", {
    gradeNames: ["fluid.component"],
    invokers: {
        generateAccessToken: "fluid.tests.oauth2.mockCodeGenerator.generateAccessToken"
    }
});

fluid.tests.oauth2.mockCodeGenerator.generateAccessToken = function () {
    return "test-access-token";
};

fluid.defaults("fluid.tests.oauth2.authorizationService.caseHolder", {
    gradeNames: ["fluid.tests.oauth2.caseHolder"],
    distributeOptions: [{
        source: "{that}.options.components.dbRequest",
        target: "{that dataStore}.options.components.request"
    }],
    members: {
        dataBaseReadyPromise: null  // set onCreate
    },
    components: {
        authorizationService: {
            type: "fluid.oauth2.authorizationService",
            //createOnEvent: "onFixturesConstructed",
            options: {
                gradeNames: ["fluid.tests.dbOperation.dbDataStore.base"],
                components: {
                    dataStore: {
                        type: "fluid.postgresdb.dataModelOps",
                    },
                    codeGenerator: {
                        type: "fluid.tests.oauth2.mockCodeGenerator"
                    }
                }
            }
        },
        dbRequest: {
            type: "fluid.postgresdb.request",
            options: {
                host: "localhost",
                port: process.env.PGPORT || 5432,
                user: process.env.POSTGRES_USER || "admin",
                password: process.env.POSTGRES_PASSWORD || "asecretpassword",
                databaseName: "prefs_testdb"
            }
        }
    }
});

fluid.tests.oauth2.authorizationService.caseHolder.init = function (testCaseHolder, dataStore) {
    var promise = dataStore.loadModelsAndConnect(
        "%preferencesServer/src/database/data/tableModels.js"
    );
    promise.then(
        function (success) {
            fluid.log("Connected to database and its tables");
        },
        function (error) {
            fluid.log("Failed to connect to the database and its tables");
            fluid.log("Error", error.message);
        }
    );
    testCaseHolder.dataBaseReadyPromise = promise;
    return promise;
};

// The base test environment without any data
fluid.defaults("fluid.tests.oauth2.authorizationService.testEnvironment", {
    gradeNames: ["fluid.tests.oauth2.baseEnvironment"],
    databases: {
        prefs_testdb: {
            data: [
                "%preferencesServer/src/oauth2/oauth2-authz-server/test/data/authorizationServiceTests-data.json"
            ]
        }
    },
    components: {
        caseHolder: {
            type: "fluid.tests.oauth2.authorizationService.caseHolder"
        }
    }
});

// All expected results
fluid.tests.oauth2.authorizationService.expected = {
    success: {
        accessToken: "test-access-token",
        expiresIn: 3600
    },
    unauthorized: {
        message: "Unauthorized",
        statusCode: 401,
        isError: true
    },
    missingInput: {
        message: "The input field \"PrefsSafes ID, client ID, or client credential ID\" was undefined",
        statusCode: 400,
        isError: true
    }
};

fluid.defaults("fluid.tests.oauth2.authorizationService.withData.grantAppInstallationAuthorization", {
    gradeNames: ["fluid.tests.oauth2.authorizationService.testEnvironment"],
    components: {
        caseHolder: {
            options: {
                modules: [{
                    name: "Test grantAppInstallationAuthorization()",
                    tests: [
                        {
                            name: "Iniialize connection to database",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.dataStore.loadModelsAndConnect",
                                args: ["%preferencesServer/src/database/data/tableModels.js"],
                                // If failure, a rejection occurs
                                resolve: "jqUnit.assertTrue",
                                resolveArgs: ["Check connection", true]
                            }]
                        },
                        {
                            name: "Initialize test table data -- load test data",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                funcName: "fluid.tests.oauth2.authorizationService.testInputTestData",
                                args: []
                            }]
                        },
                        {
                            name: "Initialize test table data -- delete existing records",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "fluid.tests.oauth2.deleteExistingRecords",
                                args: ["authorizationServiceTests-data", "{authorizationService}.dataStore"],
                                // If failure, a rejection occurs
                                resolve: "jqUnit.assertTrue",
                                resolveArgs: ["Check flushed database", true]
                            }]
                        },
                        {
                            name: "Initialize test table data -- add test records",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "fluid.tests.oauth2.loadTestData",
                                args: ["authorizationServiceTests-data", "{authorizationService}.dataStore"],
                                resolve: "fluid.tests.oauth2.authorizationService.withData.testRecordsAdded",
                                resolveArgs: ["{that}", "{authorizationService}", "{arguments}.0"]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns an access token",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", "appInstallationClient-1", "clientCredential-1"],
                                resolve: "jqUnit.assertDeepEq",
                                resolveArgs: [
                                    "The access token should be received in an expected format",
                                    fluid.tests.oauth2.authorizationService.expected.success,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns an access token when the prefsSafes key record is not found in the database",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["non-existent-gpii-key", "appInstallationClient-1", "clientCredential-1"],
                                resolve: "jqUnit.assertDeepEq",
                                resolveArgs: [
                                    "The access token should be received in an expected format",
                                    fluid.tests.oauth2.authorizationService.expected.success,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when a prefsSafes key is not provided in the argument list",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: [undefined, "appInstallationClient-1", "clientCredential-1"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when a prefsSafes key is missing",
                                    fluid.tests.oauth2.authorizationService.expected.missingInput,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when a client id is not provided in the argument list",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", undefined, "clientCredential-1"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when a client id is missing",
                                    fluid.tests.oauth2.authorizationService.expected.missingInput,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when a client credential id is not provided in the argument list",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["org.idrc.user:nonadmin", "appInstallationClient-1", undefined],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when a client credential id is missing",
                                    fluid.tests.oauth2.authorizationService.expected.missingInput,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when the client record is not found in the database",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", "non-existent-client-id", "clientCredential-1"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when the client record is not found in the database",
                                    fluid.tests.oauth2.authorizationService.expected.unauthorized,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when the client credential record is not found in the database",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", "appInstallationClient-1", "non-existent-clientCredential-id"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when the client credential record is not found in the database",
                                    fluid.tests.oauth2.authorizationService.expected.unauthorized,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when the client type is not \"appInstallationClient\"",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", "appInstallationClient-2", "clientCredential-1"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when the client type is not \"appInstallationClient\"",
                                    fluid.tests.oauth2.authorizationService.expected.unauthorized,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when the client credential type is not \"clientCredential\"",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", "appInstallationClient-1", "clientCredential-3"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when the client credential type is not \"clientCredential\"",
                                    fluid.tests.oauth2.authorizationService.expected.unauthorized,
                                    "{arguments}.0"
                                ]
                            }]
                        },
                        {
                            name: "grantAppInstallationAuthorization() returns error when the client credential does not belong to the client that requests for the authorization",
                            sequenceGrade: "fluid.tests.oauth2.sequenceGrade",
                            sequence: [{
                                task: "{authorizationService}.grantAppInstallationAuthorization",
                                args: ["alice_gpii_key", "appInstallationClient-1", "clientCredential-2"],
                                reject: "jqUnit.assertDeepEq",
                                rejectArgs: [
                                    "The error is returned when the client credential does not belong to the client that requests for the authorization",
                                    fluid.tests.oauth2.authorizationService.expected.unauthorized,
                                    "{arguments}.0"
                                ]
                            }]
                        }
                    ]
                }]
            }
        }
    }
});

fluid.tests.oauth2.authorizationService.testInputTestData = function () {
    var testData = fluid.tests.oauth2.readTestDataJSON("authorizationServiceTests-data");
    jqUnit.assertNotNull("Check input test data (non-null)", testData);
    jqUnit.assertNotEquals("Check input test data (not empty)", fluid.keys(testData).length, 0);
};

fluid.tests.oauth2.authorizationService.withData.testRecordsAdded = function (testCaseHolder, authService, results) {
    testCaseHolder.testRecordsAdded = results;
    jqUnit.assertNotEquals("Check added test records", results.length, 0);
};

fluid.test.runTests([
    "fluid.tests.oauth2.authorizationService.withData.grantAppInstallationAuthorization"
]);
