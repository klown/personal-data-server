/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

const fluid = require("infusion"),
    axios = require("axios"),
    { exec, execSync } = require("child_process");

fluid.registerNamespace("fluid.personalData");

const NUM_CHECK_REQUESTS = 10;
const DELAY = 2000; // msec

fluid.personalData.sleep = async function (delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Check if the personal data server is running using the given url.  If not
 * running, start it.  If it does not start after ten attempts, give up.
 *
 * @param {String} execCmd - Command passed to `exec()` to start the server.
 * @param {String} url - The url to GET to test if the server is running.
 * @return {Object} An object that has the status of the last request regardless
 *                  of success, and the node ChildProcess started by `exec()`
 *                  or `null` if it failed to start.
 */
fluid.personalData.startServer = async function (execCmd, url) {
    let resp = {};
    console.debug(`- Checking if server is running using ${url}`);
    try {
        resp = await axios(url);
        return { status: resp.status, process: null, wasRunning: true };
    }
    catch (error) { ; }

    // Server needs to be started
    console.debug(`- Starting server at ${url}`);
    const pdServerProcess = exec(execCmd);
    for (let i = 0; i < NUM_CHECK_REQUESTS; i++) {
        try {
            console.debug(`... attempt ${i}`);
            resp = await axios(url);
        }
        catch (error) {
            console.debug(`... attempt ${i} error: ${error.message}`);
            resp.status = 503;
        }
        if (resp.status === 200) {
            break;
        } else {
            console.debug(`... attempt ${i} going to sleep`);
            await fluid.personalData.sleep(DELAY);
        }
    }
    console.debug(`- Attempt to start server, result:  ${resp.status}`);
    return { status: resp.status, process: pdServerProcess, wasRunning: false };
};

/**
 * Stop the personal data server, if it was started by this testing sequence.
 * If it was started in order to run the tests, the `childProcess` argument will
 * have a non-null ChildProcess instance and a `wasRunning` flag set to false.
 * If so, check the ChildProcess's exit status and, if it has not exited, invoke
 * its `kill()` method.
 *
 * @param {Object} childProcessInfo - Information about the server's process
 * @param {Object} childProcessInfo.wasRunning - True if the server was already
 *                                               running.
 * @param {Object} childProcessInfo.process - ChildProcess instance `wasRunning`
 *                                            created if the server was not
 *                                            running.
 * @param {String} url - Url to use to check if the ChildProcess has been killed.
 */
fluid.personalData.stopServer = async function (childProcessInfo, url) {
    console.debug(`- Stopping server at ${url}`);
    if (childProcessInfo.wasRunning === false && childProcessInfo.process &&
        childProcessInfo.process.exitCode === null) {
        childProcessInfo.process.kill();
    }
    // Wait for the childProcess to fully exit
    for (let i = 0; i < NUM_CHECK_REQUESTS; i++) {
        try {
            console.debug(`... attempt ${i}`);
            await axios(url);
        }
        catch (error) {
            break;
        }
        await fluid.personalData.sleep(DELAY);
    }
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
 * @return {Object} An object containing two flags, `wasPaused` if the container
 *                  was restarted from a paused state and `pg_ready` to indicate
 *                  if the database in the container is ready.
 */
fluid.personalData.dockerStartDatabase = async function (container, image, dbConfig) {
    let dbStatus = {};
    let execOutput;

    console.debug(`- Starting database container ${container}`);
    // Try starting a stopped container.  If no such container, the command
    // will throw.
    try {
        execOutput = execSync(`docker start ${container}`).toString().trim();
    }
    catch (error) {
        execOutput = error.message;
    }

    // If the above re-started a paused container, the output of `exectSync()`
    // is the `container` name.
    if (execOutput === container) {
        dbStatus.wasPaused = true;
    } else {
        // Start a new container from the given image
        dbStatus.wasPaused = false;
        try {
            execSync(
                `docker run -d --name="${container}" \
                -e POSTGRES_USER=${dbConfig.user} \
                -e POSTGRES_PASSWORD=${dbConfig.password} \
                -p $PGPORT:${dbConfig.port} \
                ${image} postgres -p ${dbConfig.port}`
            ).toString().trim();
        }
        catch (error) {
            console.debug(`Error starting database container: ${error}.message`);
            dbStatus.pgReady = false;
            return dbStatus;
        }
    }

    // Loop to check that PostgresDB is ready.
    console.debug("Checking that PostgresDB is ready...");
    dbStatus.pgReady = false;
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
            dbStatus.pgReady = true;
            break;
        } else {
            await fluid.personalData.sleep(DELAY);
        }
    }
    console.debug(`- Attempt to start database, result:  ${dbStatus.pgReady}`);
    if (dbStatus.pgReady === false) {
        return dbStatus;    // bail
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
            dbStatus.pgReady = true;
        } else {
            console.debug(`... error ${error.message}`);
        }
    }
    return dbStatus;
};

/**
 * Disconnect the database client from the database and stop the database docker
 * container.  If the container was simply paused at the beginning of testing,
 * leave it in a paused state, but, if the container was created for testing,
 * remove it from the container list.
 *
 * @param {String} container - Name of the docker container.
 * @param {Object} wasPaused - Whether the database docker container was paused
 *                            at the start of testing.
 * @param {Object} dbRequest - Optional: the PostGresOperations object to
 *                             disconnect from the database.
 * @return {Object} result of disconnecting `dbRequest` from the database.
 */
fluid.personalData.dockerStopDatabase = async function (container, wasPaused, dbRequest) {
    console.debug(`- Stopping database container ${container}`);
    if (dbRequest) {
        await dbRequest.end();
    }
    try {
        execSync(`docker stop ${container}`);
        if (!wasPaused) {
            console.log("WOULD COMPLETELY DESTROY THE DATABASE");
            // execSync(`docker rm ${container}`);
        }
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
        console.debug("- Emptying test database...");
        await dbRequest.runSqlFile(sqlFiles.clearDB);
        console.debug("- ... defining the tables");
        await dbRequest.runSqlFile(sqlFiles.createTables);
        console.debug("- ... adding initial test records");
        await dbRequest.runSqlFile(sqlFiles.loadData);
        togo = true;
    }
    catch (error) {
        console.debug(`Error iniitalizing test database: ${error.message}`);
        togo = false;
    }
    return togo;
};
