/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */

"use strict";

const fluid = require("infusion");

fluid.registerNamespace("fluid.tests.utils");

fluid.tests.postgresContainer = "postgresdb";
fluid.tests.postgresImage = "postgres:14.0-alpine";

// Host, port, database name, etc. for testing
fluid.tests.dbConfig = {
    database: "prefs_testdb",
    host: "localhost",
    port: 5433,
    user: "admin",
    password: "asecretpassword"
};

// Disconnect the postgres client from its server. See https://node-postgres.com/api/client
fluid.tests.utils.finish = function (postgresHandler) {
    return postgresHandler.end().then(() => {
        fluid.log("Postgres operations done");
    });
};
