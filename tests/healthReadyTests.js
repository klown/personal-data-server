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

require("../src/shared/driverUtils.js");
require("./shared/utilsSso.js");

// Sets up environment variables for the database parameters, such as database
// name, host, port, etc. for use in thses tests.
fluid.personalData.initEnvironmentVariables({
    dbName: "prefs_testdb",
    dbPort: 5433
});

jqUnit.module("Personal Data Server /health and /ready tests.");

fluid.registerNamespace("fluid.tests.healthReady");

const pdServerUrl = fluid.tests.serverUrl;
const pdServerStartCmd = "node index.js";
const dbConfig = require("../src/personalData/ssoDbOps.js").dbConfig;

jqUnit.test("Health and Ready end point tests", async function () {
    jqUnit.expect(13);
    try {
        // Start with server off -- "/health" should fail
        let response = await fluid.tests.utils.sendRequest(pdServerUrl, "/health");
        // console.log("=== response: ", response);
        jqUnit.assertNotNull("Check '/health' error", response);
        jqUnit.assertTrue("Check '/health' error code", response.toString().includes("ECONNREFUSED"));

        // Start server, but not the database.
        const serverInstance = await fluid.personalData.startServer(pdServerStartCmd, pdServerUrl);
        jqUnit.assertEquals("Check server active", 200, serverInstance.status);

        // "/health" request should now succeed ...
        response = await fluid.tests.utils.sendRequest(pdServerUrl, "/health");
        fluid.tests.healthReady.testResult(response, 200, { isHealthy: true }, "/health (should succeed)");

        //  ... but "/ready" should fail
        response = await fluid.tests.utils.sendRequest(pdServerUrl, "/ready");
        fluid.tests.healthReady.testResult(response, 503, { isError: true, message: "Database is not ready" }, "/ready (should error)");

        const dbStatus = await fluid.personalData.dockerStartDatabase(fluid.tests.postgresContainer,
            fluid.tests.postgresImage,
            dbConfig);
        jqUnit.assertTrue("The database has been started successfully", dbStatus);

        // "/ready" should now work.
        response = await fluid.tests.utils.sendRequest(pdServerUrl, "/ready");
        fluid.tests.healthReady.testResult(response, 200, { isReady: true }, "/ready (should succeed)");

        // Stop the docker container for the database
        await fluid.personalData.dockerStopDatabase(fluid.tests.postgresContainer, dbStatus.wasPaused);

        // Stop the server
        await fluid.personalData.stopServer(serverInstance, pdServerUrl);
    } catch (error) {
        jqUnit.fail("Google SSO tests fail with this error: ", error);
    }
});

fluid.tests.healthReady.testResult = async function (res, expectedStatus, expected, endPoint) {
    jqUnit.assertNotNull("Check '" + endPoint + "' non-null response", res);
    jqUnit.assertEquals("Check '" + endPoint + "' response status", expectedStatus, res.status);
    jqUnit.assertDeepEq("Check '" + endPoint + "' response", expected, res.data);
};
