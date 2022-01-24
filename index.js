#!/usr/bin/env node
/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

// This script reads configs from config.js and starts the entire personal data server including the express server,
// the database docker container. It also loads data into the database.
// Usage: node index.js
// Parameters:
// port - Optional. The port that the personal data server will listen to. The default value is 3000.
//
// A sample command that runs this script in the universal root directory:
// node startServer.js 3001

"use strict";

require("json5/lib/register");
require("./src/shared/driverUtils.js");
const postgresOps = require("./src/dbOps/postgresOps.js");

const fluid = require("infusion");
fluid.registerNamespace("fluid.personalData");

const sqlFiles = {
    clearDB: __dirname + "/dataModel/ClearDB.sql",
    createTables: __dirname + "/dataModel/SsoTables.sql",
    loadData: __dirname + "/dataModel/SsoProvidersData.sql"
};

const config = require("./config.json5");
const serverPort = process.env.SERVERPORT || config.server.port || 3000;

const dbConfig = {
    database: process.env.DATABASE || config.db.database,
    port: process.env.DBPORT || config.db.port,
    host: process.env.DBHOST || config.db.host,
    user: process.env.DBUSER || config.db.user,
    password: process.env.DBPASSWORD || config.db.password
};

async function main() {
    // Start the database docker container
    await fluid.personalData.dockerStartDatabase(config.db.dbContainerName, config.db.dbDockerImage, dbConfig);

    // Initialize db: create tables and load data
    const postgresHandler = new postgresOps.postgresOps(dbConfig);
    await fluid.personalData.initDataBase(postgresHandler, sqlFiles);

    // Start the personal data server
    await fluid.personalData.startServer(serverPort);
}

main();
