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
 * @return {Boolean} true - If the connection to the database succeeds at the
 *                          configured host, port, user, and password, and there
 *                          is an "AppSsoProvider" table; false otherwise.
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
};

/**
 * Retrieve, from the database, the clientId and secret for this app as provided
 * by given provider.
 *
 * @param {String} provider - The SSO provider, e.g, google, github, or some
 *                            other.
 * @return {Object}           The client information record for the given
 *                            provider.  Null is returned if there is no such
 *                            provider.
 */
dbRequest.getSsoClientInfo = async function (provider) {
    try {
        const clientInfo = await dbRequest.runSql(`
            SELECT * FROM "AppSsoProvider" WHERE provider='${provider}';
        `);
        if (clientInfo.rowCount !== 0) {
            return clientInfo.rows[0];
        } else {
            throw new Error(`No such provider as ${provider}`);
        }
    } catch (error) {
        console.error(`Error retrieving ${provider} provider info: `, error);
        throw error;
    }
};

module.exports = dbRequest;
