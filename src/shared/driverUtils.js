/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

const fluid = require("infusion");
const axios = require("axios");
const { execSync } = require("child_process");

fluid.registerNamespace("fluid.personalData");

const NUM_CHECK_REQUESTS = 10;
const DELAY = 2000; // milliseconds

fluid.personalData.sleep = async function (delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Check if the personal data server is running or not.
 *
 * @param {Number} serverPort - The port that the server is listening to.
 * @return {Boolean} The actual server running status.
 */
fluid.personalData.getServerStatus = async function (serverPort) {
    const url = "http://localhost:" + serverPort;
    let isRunning;  // The actual running status
    let resp;

    console.debug("Finding the server running status at " + url);
    for (let i = 0; i < NUM_CHECK_REQUESTS; i++) {
        try {
            console.debug(`... attempt ${i}`);
            resp = await axios(url);
        }
        catch (error) {
            console.debug(`... attempt ${i} error: ${error.message}`);
            isRunning = false;
            break;
        }
        if (resp.status === 200) {
            isRunning = true;
            break;
        } else {
            console.debug(`... attempt ${i} going to sleep ${DELAY} milliseconds`);
            await fluid.personalData.sleep(DELAY);
        }
    }
    console.debug(`- Attempt to find if the server is running, result:  ${isRunning}`);
    return isRunning;
};

/**
 * Start the database using Docker.  This checks whether the docker container
 * is already running, and if not, attempts to start it.
 *
 * @param {String} container - Name of the docker container.
 * @param {String} image - Name of the associated docker image.
 * @param {String} dbConfig - Parameters for creating a database within the
 (*                           `container` or to check if one already exists.
 * @param {String} dbConfig.user - Adminstrative user of the database.
 * @param {String} dbConfig.password - Adminstrator's password.
 * @param {String} dbConfig.port - Port for database requests.
 * @return {Boolean} True if the database in the container is ready. Otherwise, return false.
 */
fluid.personalData.dockerStartDatabase = async function (container, image, dbConfig) {
    let dbReady = false;
    let execOutput;

    console.debug(`- Starting database container ${container}`);
    // Try starting a stopped container.  If no such container, the command will throw an error.
    try {
        execOutput = execSync(`docker start ${container}`).toString().trim();
    }
    catch (error) {
        execOutput = error.message;
    }

    // If the above re-started the container that was stopped previously, the output of `exectSync()`
    // is the `container` name. Otherwise, use `docker run` to start this container the first time.
    if (execOutput !== container) {
        // Start a new container from the given image
        try {
            execSync(
                `docker run -d --name="${container}" \
                -e POSTGRES_USER=${dbConfig.user} \
                -e POSTGRES_PASSWORD=${dbConfig.password} \
                -p ${dbConfig.port}:${dbConfig.port} \
                ${image} postgres -p ${dbConfig.port}`
            ).toString().trim();
        }
        catch (error) {
            console.debug(`Error starting database container: ${error}.message`);
            dbReady = false;
            return dbReady;
        }
    }

    // Loop to check that PostgresDB is ready.
    console.debug("Checking that PostgresDB is ready...");
    for (let i = 0; i < NUM_CHECK_REQUESTS; i++) {
        console.debug(`... attempt ${i}`);
        try {
            execOutput = execSync(
                `docker exec --user postgres ${container} pg_isready -p ${dbConfig.port}`
            ).toString().trim();
        }
        catch (error) {
            execOutput = error.message;
            console.debug(`... error ${execOutput}`);
        }
        if (execOutput.indexOf("accepting connections") !== -1) {
            dbReady = true;
            break;
        } else {
            await fluid.personalData.sleep(DELAY);
        }
    }
    console.debug(`- Attempt to start database, result:  ${dbReady}`);
    if (dbReady === false) {
        return dbReady;    // bail
    }

    // Container and PostgresDB running, create the actual database to use for
    // the Postgres tables
    console.debug(`Creating (or checking existence of) ${dbConfig.database} ...`);
    try {
        execOutput = execSync(
            `docker exec ${container} createdb -p ${dbConfig.port} -U ${dbConfig.user} --echo ${dbConfig.database}`
        ).toString().trim();
    }
    catch (error) {
        // "Database already exists" not an error in this case.
        if (error.message.indexOf(`database "${dbConfig.database}" already exists`) !== -1) {
            dbReady = true;
        } else {
            console.debug(`... error ${error.message}`);
        }
    }
    return dbReady;
};

/**
 * Disconnect the database client from the database and stop the database docker
 * container.
 *
 * @param {String} container - Name of the docker container.
 * @param {Object} dbRequest - Optional: the PostGresOperations object to
 *                             disconnect from the database.
 * @return {Object} result of disconnecting `dbRequest` from the database.
 */
fluid.personalData.dockerStopDatabase = async function (container, dbRequest) {
    console.debug(`- Stopping database container ${container}`);
    if (dbRequest) {
        await dbRequest.end();
    }
    try {
        execSync(`docker stop ${container}`);
    }
    catch (error) {
        console.debug(`- Failed to stop/remove ${container}: ${error.message}`);
    }
};

/**
 * Clear a database, set up its tables and load some test data records.
 *
 * @param {Object} dbRequest - The PostGresOperations object to use to interact
 *                             with the database.
 * @param {Object} sqlFiles - SQL files to use to initiate the database
 * @param {String} sqlFiles.clearDB - Path to file containing SQL to clear the
 *                                  database.
 * @param {String} sqlFiles.createTables - Path to SQL file with commands to create
 *                                      the database tables.
 * @param {String} sqlFiles.loadData - Path to SQL file to load data into tables.
 * @return {Boolean} true if no error with initialization; false otherwise.
 */
fluid.personalData.initDataBase = async function (dbRequest, sqlFiles) {
    let togo;
    try {
        console.debug("- Emptying database...");
        await dbRequest.runSqlFile(sqlFiles.clearDB);
        console.debug("- ... defining the tables");
        await dbRequest.runSqlFile(sqlFiles.createTables);
        console.debug("- ... adding initial table records");
        await dbRequest.runSqlFile(sqlFiles.loadData);
        togo = true;
    }
    catch (error) {
        console.debug(`Error initalizing database: ${error.message}`);
        togo = false;
    }
    return togo;
};
