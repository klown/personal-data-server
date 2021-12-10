/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

require("./shared/utilsCommon.js");

// Set environment variables so that following tests can connect to the database docker container
process.env.PGDATABASE = fluid.tests.dbConfig.database;
process.env.PGHOST = fluid.tests.dbConfig.host;
process.env.PGPORT = fluid.tests.dbConfig.port;
process.env.PGUSER = fluid.tests.dbConfig.user;
process.env.POSTGRES_PASSWORD = fluid.tests.dbConfig.password;

const testIncludes = [
    // Test DB operations
    "./postgresOpsTests.js",
    "./postgresRequestTests.js",
    "./tableModelDefTests.js",

    // Test Google single sign on
    "./googleSsoTests.js",

    // Test endpoints provided by personal data server
    "./healthReadyTests.js"
];

testIncludes.forEach(function (path) {
    require(path);
});
