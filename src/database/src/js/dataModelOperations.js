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
            args: ["{that}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
                             // field name     // field value   // table name
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
            args: ["userId", "{arguments}.0", fluid.postgresdb.tableNames.cloudSafeCredentials]
                             // user id
        },
        findClientById: {
            func: "{that}.findRecordById",
            args: ["{arguments}.0", fluid.postgresdb.tableNames.appInstallationClients]
                   // appInstallationClient id
        },
        findClientByOauth2ClientId: {
             func: "{that}.findRecordByFieldValue",
             args: ["oauth2ClientId", "{arguments}.0", fluid.postgresdb.tableNames.clientCredentials]
                                      // oauth2ClientId value
        },
        findAuthorizationByAccessToken: {
             func: "{that}.findRecordByFieldValue",
             args: ["accessToken", "{arguments}.0", fluid.postgresdb.tableNames.appInstallationAuthorizations]
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
 * @param {String} field - Name of the field/column to search.
 * @param {String} value - Value to search for.
 * @param {String} tableName - Name of database table to search.
 * @return {Promise} Promise whose value is an array containing the record sought,
 *                   or an empty array if no record was found.
 */
 fluid.postgresdb.dataModelOps.findRecordByFieldValue = function (that, fieldName, value, tableName) {
    var constraints = {};
    constraints[fieldName] = value;
    return that.selectRows(tableName, constraints);
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
    var promise = that.findCloudCredentialsByUserId(userId);
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
 * Common handler for success, but when there are no records in the result.
 *
 * @param {Object} success - Data Model operations instance.
 * @param {Object} that - Data Model operations instance.
 * @param {String} message - The PrefsSafesKey to use as the search.
 * @return {Promise} Promise whose value is an array with one entry, the
 *                   PrefsSafe, or an empty array.
 */
// fluid.postgresdb.dataModelOps.addSuccessHandler = function (inPromise, outPromise, options) {
//     inPromise.then(function (success) {
//         // Result is only one or none
//         if (success.length === 0) {
//             fluid.log(options.message, options.key, "in ", options.tableName);
//             outPromise.resolve(success);
//         } else {
//             var result = success[0].get({plain: true});
//             var next = that.selectRows(options.tableName, options.rowInfo);
//             fluid.promise.follow(next, outPromise);
//         }
//     };
// };
