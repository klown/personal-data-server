#!/usr/bin/env node
/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Node script for setting the client id and client secret for the Persoal
 * Data Server.
 *
 * Usage: SetClientInfo.js provider clientId clientSecret
 * provider - The name of the provider, e.g., 'google'
 * clientId, clientSecret - The ID and secret values generateed by the provider.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
/* eslint-disable no-console */

"use strict";

async function main() {
    if (process.argv.length != 5) {
        console.log("Usage: node SetClientInfo.js provider clientId clientSecret");
        process.exit(1);
    }
    const provider = process.argv[2];
    const clientId = process.argv[3];
    const clientSecret = process.argv[4];

    // 1. Check whether the database has an AppSsoProvider record for the given
    // provider.
    const dbRequest = require("../dataBase.js");
    var ssoClientInfo = await dbRequest.runSql(`
        SELECT * FROM "AppSsoProvider" WHERE provider='${provider}'
    `);
    // 2. If no such provider, add it with the client ID and secret
    var clientInfo;
    if (ssoClientInfo.rowCount === 0) {
        clientInfo = await dbRequest.runSql(`
            INSERT INTO "AppSsoProvider"
                (provider, name, client_id, client_secret)
                VALUES ('${provider}', '${provider}', '${clientId}', '${clientSecret}')
                RETURNING *;
        `);
    }
    // 3. If there is such a provider, update the client ID and secret
    else {
        clientInfo = await dbRequest.runSql(`
            UPDATE "AppSsoProvider"
                SET client_id='${clientId}', client_secret='${clientSecret}'
                WHERE provider='${provider}'
                RETURNING *;
        `);
    }
    console.log("AppSsoProvider configured with:", JSON.stringify(clientInfo.rows[0], null, 2));
    process.exit(0);
};

main();
