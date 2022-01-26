/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

require("json5/lib/register");
const fluid = require("infusion");
const jqUnit = require("node-jqunit");

require("../src/shared/driverUtils.js");
require("./shared/utilsCommon.js");
require("./shared/utilsSso.js");

jqUnit.module("Personal Data Server /health and /ready tests.");

fluid.registerNamespace("fluid.tests.healthReady");

const skipDocker = process.env.SKIPDOCKER === "true" ? true : false;
const config = require("./testConfig.json5");
const serverUrl = "http://localhost:" + config.server.port;
fluid.tests.utils.setDbEnvVars(config.db);

const postgresOps = require("../src/dbOps/postgresOps.js");
const postgresHandler = new postgresOps.postgresOps(config.db);

jqUnit.test("Health and Ready end point tests", async function () {
    jqUnit.expect(skipDocker ? 13 : 14);

    // Start with server off -- "/health" should fail
    let response = await fluid.tests.utils.sendRequest(serverUrl, "/health");
    jqUnit.assertNotNull("Check '/health' error", response);
    jqUnit.assertTrue("Check '/health' error code", response.toString().includes("ECONNREFUSED"));

    // Start server, but not the database.
    const serverInstance = await fluid.personalData.startServer(config.server.port);
    jqUnit.assertEquals("Check server active", 200, serverInstance.status);

    // "/health" request should now succeed ...
    response = await fluid.tests.utils.sendRequest(serverUrl, "/health");
    fluid.tests.healthReady.testResult(response, 200, { isHealthy: true }, "/health (should succeed)");

    //  ... but "/ready" should fail
    response = await fluid.tests.utils.sendRequest(serverUrl, "/ready");
    fluid.tests.healthReady.testResult(response, 503, { isError: true, message: "Database is not ready" }, "/ready (should error)");

    let dbStatus;
    if (!skipDocker) {
        // Start the database docker container
        dbStatus = await fluid.personalData.dockerStartDatabase(config.db.dbContainerName, config.db.dbDockerImage, config.db);
        jqUnit.assertTrue("The database has been started successfully", dbStatus);
    }

    // Initialize db: create tables and load data
    const loadDataStatus = await fluid.personalData.initDataBase(postgresHandler, fluid.tests.sqlFiles);
    jqUnit.assertTrue("The database has been initiated", loadDataStatus);

    // "/ready" should now work.
    response = await fluid.tests.utils.sendRequest(serverUrl, "/ready");
    fluid.tests.healthReady.testResult(response, 200, { isReady: true }, "/ready (should succeed)");

    // Final clean up
    // 1. Disconnect the postgres client from its server. See https://node-postgres.com/api/client
    fluid.tests.utils.finish(postgresHandler);

    if (!skipDocker) {
        // 2. Stop the docker container for the database
        await fluid.personalData.dockerStopDatabase(config.db.dbContainerName, dbStatus);
    }

    // 3. Stop the server
    await fluid.personalData.stopServer(serverInstance, serverUrl);
});

fluid.tests.healthReady.testResult = async function (res, expectedStatus, expected, endPoint) {
    jqUnit.assertNotNull("Check '" + endPoint + "' non-null response", res);
    jqUnit.assertEquals("Check '" + endPoint + "' response status", expectedStatus, res.status);
    jqUnit.assertDeepEq("Check '" + endPoint + "' response", expected, res.data);
};
