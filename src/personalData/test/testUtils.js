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
    fetch = require("node-fetch"),
    { exec, execSync } = require("child_process");

fluid.registerNamespace("fluid.tests.personalData");

fluid.tests.personalData.serverUrl = "http://localhost:3000";
fluid.tests.personalData.postgresContainer = "postgresdb";
fluid.tests.personalData.postgresImage = "postgres:13.1-alpine";

const NUM_CHECK_REQUESTS = 10;
const DELAY = 2000; // msec

fluid.tests.personalData.initEnvironmentVariables = function () {
    console.debug("- Initializing shell environment variables");
    process.env.PGDATABASE = "prefs_testdb";
    process.env.PGHOST = "localhost";
    process.env.PGPORT = 5433;
    process.env.PGUSER = "admin";
    process.env.POSTGRES_PASSWORD = "asecretpassword";
};

fluid.tests.personalData.sleep = async function (delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Start the personal data server, waiting until is up and running.  Once the
 * process is started, the given url is requested either until a successful
 * response, or after ten attempts.
 *
 * @param {String} execCmd - Command passed to `exec()` to start the server.
 * @param {String} url - The url to GET to test if the server is running.
 * @return {Object} An object that has the status of the last request regardless
 *                  of success, and the node ChildProcess started by `exec()`
 *                  or `null` if it failed to start.
 */
fluid.tests.personalData.startServer = async function (execCmd, url) {
    var resp = {};
    console.debug(`Starting server at ${url}`);
    const pdServerProcess = exec(execCmd);
    for (var i = 0; i < NUM_CHECK_REQUESTS; i++) {
        try {
            console.debug(`... attempt ${i}`);
            resp = await fetch(url);
        }
        catch (error) {
            resp.status = 503;
        }
        if (resp.status === 200) {
            break;
        } else {
            await fluid.tests.personalData.sleep(DELAY);
        }
    }
    console.debug(`Attempt to start server, result:  ${resp.status}`);
    return { status: resp.status, process: pdServerProcess };
};

/**
 * Stop the personal data server.  Given a ChildProcess instance, checks its
 * exit status and, if it has not exited, invokes its `kill()` method.
 *
 * @param {Object} childProcess - ChildProcess for the server job.
 * @param {String} url - The url to GET to test if the server is running.
 */
fluid.tests.personalData.stopServer = async function (childProcess, url) {
    console.debug(`Stopping server at ${url}`);
    if (childProcess && childProcess.exitCode === null) {
        childProcess.kill();
    }
    // Wait for the childProcess to fully exit
    for (var i = 0; i < NUM_CHECK_REQUESTS; i++) {
        try {
            console.debug(`... attempt ${i}`);
            await fetch(url);
        }
        catch (error) {
            break;
        }
    }
};

/**
 * Start the database using Docker.  This checks whether the docker container
 * is already running, and if not, attempts to start it.  Note that this assumes
 * that the image/container is set up such that the environment variables are
 * as defined in `fluid.tests.personalData.initEnvironmentVariables()`.
 *
 * @param {String} container - Name of the docker container.
 * @param {String} image - Name of the associated docker image.
 * @return {Object} An object that has the status of the last request regardless
 *                  of success, and the node ChildProcess started by `exec()`
 *                  or `null` if it failed to start.
 */
fluid.tests.personalData.dockerStartDatabase = async function (container, image) {
    var retVal = {};
    var execOutput;

    console.debug(`Starting database container ${container}`);
    // Try starting a stopped container.  If no such container, the command
    // will throw.
    try {
        execOutput = execSync(`docker start ${container}`).toString().trim();
    }
    catch (error) {
        execOutput = error.message;
    }

    if (execOutput !== container) {
        // Start a new container from the given image
        retVal.wasPaused = false;
        try {
            execOutput = execSync(
                `docker run -d --name="${container}"
                -e POSTGRES_USER=${process.env.PGUSER}
                -e POSTGRES_PASSWORD=${process.env.POSTGRES_PASSWORD}
                -p $PGPORT:${process.env.PGPORT}
                -d ${image} postgres -p ${process.env.PGPORT})
            `).toString().trim();
        }
        catch (error) {
            execOutput = error.message;
        }
    } else {
        retVal.wasPaused = true;
    }

    // Loop to check that the database is ready.
    retVal.pgReady = false;
    for (var i = 0; i < NUM_CHECK_REQUESTS; i++) {
        console.debug(`... attempt ${i}`);
        try {
            execOutput = execSync(
                `docker exec --user postgres ${container} pg_isready -p ${process.env.PGPORT}`
            ).toString().trim();
        }
        catch (error) {
            execOutput = error.message;
        }
        if (execOutput.indexOf("accepting connections") !== -1) {
            retVal.pgReady = true;
            break;
        } else {
            await fluid.tests.personalData.sleep(DELAY);
        }
    }
    console.debug(`Attempt to start database, result:  ${retVal.pgReady}`);
    return retVal;
};

/**
 * Stop the database docker container and, if it was not running to begin with
 * remove it from the container list; otherwise, leave it in a paused state.
 *
 * @param {String} container - Name of the docker container.
 * @param {Object} databaseStatus - Property `wasPaused` indicates whether the
 *                                  container was previously.
 */
fluid.tests.personalData.dockerStopDatabase = function (container, databaseStatus) {
    console.debug(`Stopping database container ${container}`);
    try {
        execSync(`docker stop ${container}`);
        if (!databaseStatus.wasPaused) {
            console.log("WOULD COMPLETELY DESTROY THE DATABASE");
            // execSync(`docker rm ${container}`);
        }
    }
    catch (error) {
        console.debug(`Failed to stop/remove ${container}: ${error.message}`);
    }
};
