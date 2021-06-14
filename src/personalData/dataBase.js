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
/* eslint-disable no-console */

"use strict";

// Data base access
const postgresdb = require("../database/src/js/index.js");

// Database configuration and connection
const dbConfg = {
    database: process.env.PGDATABASE        || "prefs_testdb",
    host: process.env.PGPHOST               || "localhost",
    port: process.env.PGPORT                || 5433,
    user: process.env.PGUSER                || "admin",
    password: process.env.POSTGRES_PASSWORD || "asecretpassword"
};
var dbRequest = new postgresdb.PostgresRequest(dbConfg);

/**
 * Check that the database is ready to accept requests.  The check involves
 * retrieving the 'public' tables from the database and checking for one
 * named "AppSsoProvider".
 *
 * @return true if connection to the database succeeds at the configured host,
 *         port, user, and password, and there is an "AppSsoProvider" table;
 *         false otherwise
 */
dbRequest.isReady = async function () {
    try {
        const tables = await dbRequest.runSql(
            "SELECT * FROM pg_catalog.pg_tables WHERE schemaname='public';"
        );
        return tables.rows.some ((aTable) => {
            return aTable.tablename === "AppSsoProvider";
        });
    }
    catch (error) {
        console.error("Error accessing database, ", error);
        return false;
    }
}

module.exports = dbRequest;
