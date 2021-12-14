/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

const fluid = require("infusion"),
    jqUnit = require("node-jqunit");

require("../src/shared/driverUtils.js");
require("./shared/utilsCommon.js");
require("./shared/utilsSso.js");

jqUnit.module("Personal Data Server /health and /ready tests.");

fluid.registerNamespace("fluid.tests.healthReady");

const postgresOps = require("../src/dbOps/postgresOps.js");
const postgresHandler = new postgresOps.postgresOps(fluid.tests.dbConfig);

jqUnit.test("Health and Ready end point tests", async function () {
    jqUnit.expect(14);

    // Start with server off -- "/health" should fail
    let response = await fluid.tests.utils.sendRequest(fluid.tests.serverUrl, "/health");
    jqUnit.assertNotNull("Check '/health' error", response);
    jqUnit.assertTrue("Check '/health' error code", response.toString().includes("ECONNREFUSED"));

    // Start server, but not the database.
    const serverInstance = await fluid.personalData.startServer(fluid.tests.pdServerStartCmd, fluid.tests.serverUrl);
    jqUnit.assertEquals("Check server active", 200, serverInstance.status);

    // "/health" request should now succeed ...
    response = await fluid.tests.utils.sendRequest(fluid.tests.serverUrl, "/health");
    fluid.tests.healthReady.testResult(response, 200, { isHealthy: true }, "/health (should succeed)");

    //  ... but "/ready" should fail
    response = await fluid.tests.utils.sendRequest(fluid.tests.serverUrl, "/ready");
    fluid.tests.healthReady.testResult(response, 503, { isError: true, message: "Database is not ready" }, "/ready (should error)");

    // Start the database docker container
    const dbStatus = await fluid.personalData.dockerStartDatabase(fluid.tests.postgresContainer, fluid.tests.postgresImage, fluid.tests.dbConfig);
    jqUnit.assertTrue("The database has been started successfully", dbStatus);

    // Initialize db: create tables and load data
    const loadDataStatus = await fluid.personalData.initDataBase(postgresHandler, fluid.tests.sqlFiles);
    jqUnit.assertTrue("The database has been initiated", loadDataStatus);

    // "/ready" should now work.
    response = await fluid.tests.utils.sendRequest(fluid.tests.serverUrl, "/ready");
    fluid.tests.healthReady.testResult(response, 200, { isReady: true }, "/ready (should succeed)");

    // Final clean up
    // 1. Disconnect the postgres client from its server. See https://node-postgres.com/api/client
    fluid.tests.utils.finish(postgresHandler);

    // 2. Stop the docker container for the database
    await fluid.personalData.dockerStopDatabase(fluid.tests.postgresContainer, dbStatus);

    // 3. Stop the server
    await fluid.personalData.stopServer(serverInstance, fluid.tests.serverUrl);
});

fluid.tests.healthReady.testResult = async function (res, expectedStatus, expected, endPoint) {
    jqUnit.assertNotNull("Check '" + endPoint + "' non-null response", res);
    jqUnit.assertEquals("Check '" + endPoint + "' response status", expectedStatus, res.status);
    jqUnit.assertDeepEq("Check '" + endPoint + "' response", expected, res.data);
};
