/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
"use strict";

var fluid = require("infusion");

fluid.registerNamespace("fluid.postgresdb");

// Data model types -- the "type" field in the different models as documented at
// https://github.com/fluid-project/preferencesServer/blob/main/doc/dataModel.md#future-data-model
fluid.postgresdb.dataModelTypes = fluid.freezeRecursive({
    user: "user",
    prefsSafe: "prefsSafe",
    clientCredential: "clientCredential",
    appInstallationClient: "appInstallationClient",
    appInstallationAuthorizations: "appInstallationAuthorizations",
    cloudSafeCredentials: "cloudSafeCredentials",
    prefsSafesKey: "prefsSafesKey"
});

// Postgres table names
fluid.postgresdb.tableNames = fluid.freezeRecursive({
    users: "users",
    prefsSafes: "prefsSafes",
    clientCredentials: "clientCredentials",
    appInstallationClients: "appInstallationClients",
    appInstallationAuthorizations: "appInstallationAuthorizations",
    cloudSafeCredentials: "cloudSafeCredentials",
    prefsSafesKeys: "prefsSafesKeys"

});

fluid.postgresdb.schemaVersion = "0.2";

// Error details that the database reports.
fluid.postgresdb.errors = fluid.freezeRecursive({
    missingInput: {
        message: "The input field \"%fieldName\" was undefined",
        statusCode: 400,
        isError: true
    },
    missingDoc: {
        message: "A record of type \"%docType\" was not found",
        isError: true
    },
    mismatchedDocType: {
        message: "The document type must be \"%docType\" instead of the selected document type \"%selectedDocType\"",
        isError: true
    },
    unauthorized: {
        message: "Unauthorized",
        statusCode: 401,
        isError: true
    }
});
