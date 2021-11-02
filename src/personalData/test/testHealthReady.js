/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */
/* eslint-disable no-console */

"use strict";

const fluid = require("infusion"),
    jqUnit = require("node-jqunit");

// Sets up environment variables for the database parameters, such as database
// name, host, port, etc. for use in thses tests.
require("./testUtils.js");
fluid.tests.personalData.initEnvironmentVariables();

jqUnit.module("Personal Data Server /health and /ready tests.");

fluid.registerNamespace("fluid.tests.healthReady");

fluid.defaults("fluid.tests.healthReady.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        testCaseHolder: {
            type: "fluid.tests.healthReady.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.healthReady.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    pdServerUrl: fluid.tests.personalData.serverUrl,
    pdServerStartCmd: "node src/personalData/bin/www",
    dbConfig: require("../dataBase.js").dbConfig,
    members: {
        // These are assigned during the test sequence
        pdServerProcess: null,     // { status, process, wasRunning }
        databaseStatus: null
    },
    modules: [{
        name: "Health and Ready end point tests",
        tests: [{
            name: "/health and /ready end points",
            sequence: [{
                // Start with server off -- "/health" should fail
                task: "fluid.tests.sendRequest",
                args: ["{that}.options.pdServerUrl", "/health"],
                resolve: "fluid.tests.healthReady.testHealthFail",
                resolveArgs: ["{arguments}.0"] // error
            }, {
                // Start server, but not the database.
                task: "fluid.tests.personalData.startServer",
                args: ["{that}.options.pdServerStartCmd", "{that}.options.pdServerUrl"],
                resolve: "fluid.tests.healthReady.testProcessStarted",
                resolveArgs: ["{arguments}.0", "{that}"]
            }, {
                // "/health" request should now succeed ...
                task: "fluid.tests.sendRequest",
                args: ["{that}.options.pdServerUrl", "/health"],
                resolve: "fluid.tests.healthReady.testResult",
                resolveArgs: ["{arguments}.0", 200, { isHealthy: true }, "/health (should succeed)"]
            }, {
                //  ... but "/ready" should fail
                task: "fluid.tests.sendRequest",
                args: ["{that}.options.pdServerUrl", "/ready"],
                resolve: "fluid.tests.healthReady.testResult",
                resolveArgs: [
                    "{arguments}.0",
                    503,
                    { isError: true, message: "Database is not ready" },
                    "/ready (should error)"
                ]
            }, {
                // ... start the database
                task: "fluid.tests.personalData.dockerStartDatabase",
                args: [
                    fluid.tests.personalData.postgresContainer,
                    fluid.tests.personalData.postgresImage,
                    "{that}.options.dbConfig"
                ],
                resolve: "fluid.tests.healthReady.testDatabaseStarted",
                resolveArgs: ["{that}", true, "{arguments}.0"]
            }, {
                // "/ready" should now work.
                task: "fluid.tests.sendRequest",
                args: ["{that}.options.pdServerUrl", "/ready"],
                resolve: "fluid.tests.healthReady.testResult",
                resolveArgs: ["{arguments}.0", 200, { isReady: true }, "/ready (should succeed)"]
            }, {
                funcName: "fluid.tests.personalData.dockerStopDatabase",
                args: [fluid.tests.personalData.postgresContainer, "{that}.databaseStatus.wasPaused"]
            }, {
                funcName: "fluid.tests.personalData.stopServer",
                args: ["{that}.pdServerProcess", "{that}.options.pdServerUrl"]
            }]
        }]
    }]
});

fluid.tests.healthReady.testProcessStarted = function (result, testCase) {
    console.debug("- Checking process started, ", testCase.options.pdServerStartCmd);
    testCase.pdServerProcess = result;
    jqUnit.assertNotNull("Check process exists", result.process);
    jqUnit.assertEquals("Check server active", 200, result.status);
};

fluid.tests.healthReady.testHealthFail = function (error) {
    jqUnit.assertNotNull("Check '/health' error", error);
    jqUnit.assertTrue("Check '/health' error code", error.toString().includes("ECONNREFUSED"));
};

fluid.tests.healthReady.testDatabaseStarted = function (testCase, expected, actual) {
    testCase.databaseStatus = actual;
    jqUnit.assertEquals("Check that database started", expected, actual.pgReady);
};

fluid.tests.healthReady.testResult = async function (res, expectedStatus, expected, endPoint) {
    jqUnit.assertNotNull("Check '" + endPoint + "' non-null response", res);
    jqUnit.assertEquals("Check '" + endPoint + "' response status", expectedStatus, res.status);
    jqUnit.assertDeepEq("Check '" + endPoint + "' response", expected, res.data);
};

fluid.test.runTests("fluid.tests.healthReady.environment");
