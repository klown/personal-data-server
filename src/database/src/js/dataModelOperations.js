/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
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

require("./databaseConstants.js");
require("./postgresOperations.js");
require("../../data/tableModels.js");

fluid.registerNamespace("fluid.postgresdb");

fluid.defaults("fluid.postgresdb.dataModelOps", {
    gradeNames: ["fluid.postgresdb.operations"],
    invokers: {
        findRecordById: {
            funcName: "fluid.postgresdb.dataModelOps.findRecordById",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // record id     // table name
        },
        findRecordByFieldValue: {
            funcName: "fluid.postgresdb.dataModelOps.findRecordByFieldValue",
            args: ["{that}", "{arguments}.0",   "{arguments}.1"]
                             // name/value pair // table name
        },
        findPrefsSafeById: {
            func: "{that}.findRecordById",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.prefsSafes]
                   // prefsSafe id
        },
        findUserById: {
            func: "{that}.findRecordById",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.users]
                   // user id
        },
        findPrefsSafeByUserRecord: {
            funcName: "fluid.postgresdb.dataModelOps.findPrefsSafeByUserRecord",
            args: ["{that}", "{arguments}.0"]
                             // user record
        },
        findPrefsSafeByUserId: {
            funcName: "fluid.postgresdb.dataModelOps.findPrefsSafeByUserId",
            args: ["{that}", "{arguments}.0"]
                             // user id
        },
        findCloudCredentialsByUserId: {
            func: "{that}.findRecordByFieldValue",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.cloudSafeCredentials]
                    // user id name/value pair
        },
        findClientById: {
            func: "{that}.findRecordById",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.appInstallationClients]
                   // appInstallationClient id
        },
        findClientByOauth2ClientId: {
            func: "{that}.findRecordByFieldValue",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.clientCredentials]
                   // oauth2ClientId name/value pair
        },
        findAuthorizationByAccessToken: {
            func: "{that}.findRecordByFieldValue",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.appInstallationAuthorizations]
                   // accessToken name/value pair
        },
        getAuthAndCredentialsByAccessToken: {
            funcName: "fluid.postgresdb.dataModelOps.getAuthAndCredentialsByAccessToken",
            args: ["{that}", "{arguments}.0"]
                             // accessToken value
        },
        findPrefsSafeByPrefsSafeKey: {
             funcName: "fluid.postgresdb.dataModelOps.findPrefsSafeByPrefsSafeKey",
             args: ["{that}", "{arguments}.0"]
                              // Prefs Safe key
        },
    },
});

/**
 * Find a record in the given named table with the given identifier.
 *
 * @param {Object} that - Data Model operations instance.
 * @param {String} identifier - Record id to match.
 * @param {String} tableName - Name of database table to search.
 * @return {Promise} Promise whose value is an array containing the record sought,
 *                   or an empty array if no record was found.
 */
fluid.postgresdb.dataModelOps.findRecordById = function (that, identifier, tableName) {
    return that.selectRows(tableName, { id: identifier });
};

/**
 * Find a record in the named table with the given field/column value.
 *
 * @param {Object} that - Data Model operations instance.
 * @param {Object} nameValue - Structure containing a field name and its value,
 *                             e.g. {"userId": "fred"}.
 * @param {String} tableName - Name of database table to search.
 * @return {Promise} Promise whose value is an array containing the record sought,
 *                   or an empty array if no record was found.
 */
 fluid.postgresdb.dataModelOps.findRecordByFieldValue = function (that, nameValue, tableName) {
    return that.selectRows(tableName, nameValue);
 };

/**
 * Find a PrefsSafe given a user record.  The user's cloud safe credentials are
 * first retrieved, and, if successful, the preferences safe is retrieved based
 * on the credentials record.
 *
 * @param {Object} that - Data Model operations instance.
 * @param {String} user - User record.
 * @return {Promise} Promise whose value is an array of length 1 containing the
 *                   PrefsSafe, or an empty array.
 */
fluid.postgresdb.dataModelOps.findPrefsSafeByUserRecord = function (that, userRecord) {
    return that.findPrefsSafeByUserId(userRecord.id);
};

/**
 * Find a PrefsSafe given a user id.  The user's cloud safe credentials are
 * first retrieved, and, if successful, the preferences safe is retrieved based
 * on the credentials record.
 *
 * @param {Object} that - Data Model operations instance.
 * @param {String} userId - User identifier.
 * @return {Promise} Promise whose value is an array of length 1 containing the
 *                   PrefsSafe, or an empty array.
 */
fluid.postgresdb.dataModelOps.findPrefsSafeByUserId = function (that, userId) {
    var togo = fluid.promise();
    var promise = that.findCloudCredentialsByUserId({"userId": userId});
    promise.then(function (success) {
        // Result is one or none
        if (success.length === 0) {
            fluid.log("No credentials for: '", userId , "', in ", fluid.postgresdb.tableNames.cloudSafeCredentials);
            togo.resolve(success);
        } else {
            var credentials = success[0].get({plain: true});
            var next = that.findPrefsSafeById(credentials.prefsSafeId);
            fluid.promise.follow(next, togo);
        }
    });
    return togo;
};

/**
 * Find a PrefsSafe in the PrefsSafe table by first using a record in the
 * PrefsSafesKey table.
 *
 * @param {Object} that - Data Model operations instance.
 * @param {String} prefsSafesKey - The PrefsSafesKey to use as the search.
 * @return {Promise} Promise whose value is an array with one entry, the
 *                   PrefsSafe, or an empty array.
 */
fluid.postgresdb.dataModelOps.findPrefsSafeByPrefsSafeKey = function (that, prefsSafesKey) {
    var togo = fluid.promise();
    var promise = that.selectRows(fluid.postgresdb.tableNames.prefsSafesKeys, { id: prefsSafesKey });
    promise.then(function (success) {
        // Should only be one or none
        if (success.length === 0) {
            fluid.log("No such PrefsSafesKey: '", prefsSafesKey, "', in ", fluid.postgresdb.tableNames.prefsSafesKeys);
            togo.resolve(success);
        } else {
            var prefsSafeKeyRecord = success[0].get({plain: true});
            var next = that.findPrefsSafeById(prefsSafeKeyRecord.prefsSafeId);
            fluid.promise.follow(next, togo);
        }
    });
    return togo;
};

/**
 * Find the appAuthorizationInstallation record for the given accessToken, and
 * then the cloudSafeCredentials based on the authorization's "userId".  Return
 * a structure consisting of the accessToken, the credentials, and the
 * authorization:
 * {
 *    accessToken: access token value passed in.
 *    authorization: authorization record associated with the access token.
 *    credentials: credentials referenced by userId value in the authorization
 * }
 *
 * @param {Object} that - Data Model operations instance.
 * @param {String} accessToken - Access token value to base the search on.
 * @return {Promise} Promise whose value is the access token, credentials, and
 *                   authorization structure described above, or an empty object
 *                   if nothing is found.
 */
fluid.postgresdb.dataModelOps.getAuthAndCredentialsByAccessToken = function (that, accessToken) {
    var togo = fluid.promise();
    var authPromise = that.findAuthorizationByAccessToken(accessToken);
    authPromise.then(function (authResults) {
        if (authResults.length === 0) {
            fluid.log("No authorization for token : '", accessToken, "'");
            togo.resolve({});
        } else {
            var authorization = authResults[0].get({plain: true});
            var credPromise = that.findCloudCredentialsByUserId({"userId": authorization.userId});
            credPromise.then(function (credResults) {
                if (credResults.length === 0) {
                    fluid.log("No credentials for token : '", accessToken, "'");
                    togo.resolve({});
                } else {
                    var credentials = credResults[0].get({plain: true});
                    togo.resolve({
                        "accessToken": accessToken.accessToken,
                        "authorization": authorization,
                        "credentials": credentials
                    });
                }
            });
        }
    });
    return togo;
};
