/*!
Copyright 2014-2019 OCAD university

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

The research leading to these results has received funding from the European Union's
Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.

You may obtain a copy of the License at
https://github.com/fluid-project/preferencesServer/blob/main/LICENSE.txt
*/

/* eslint-env browser */
/* eslint strict: ["error", "function"] */

var fluid = fluid || require("infusion");

fluid.require("%preferencesServer/src/oauth2/oauth2-utilities", require);
fluid.require("%preferencesServer/src/database/src/js", require);

(function () {

    "use strict";

    fluid.registerNamespace("fluid.oauth2.authorizationService");

    // Small function to return the current date.  Used in part to ensure that we can compare canned dates in tests.
    fluid.oauth2.authorizationService.getCurrentDate = function () {
        return new Date();
    };

    fluid.defaults("fluid.oauth2.authorizationService", {
        gradeNames: ["fluid.component"],
        components: {
            dataStore: {
                type: "fluid.postgresdb.dataModelOps"
            },
            codeGenerator: {
                type: "fluid.oauth2.codeGenerator"
            }
        },
        invokers: {
            grantAppInstallationAuthorization: {
                funcName: "fluid.oauth2.authorizationService.grantAppInstallationAuthorization",
                args: ["{dataStore}", "{codeGenerator}", "{arguments}.0", "{arguments}.1", "{arguments}.2"]
                                                         // prefsSafesKey, clientId, clientCredentialId
            },
            getInfoByAccessToken: {
                func: "{dataStore}.getAuthAndCredentialsByAccessToken"
                    // accessToken
            },
            getCurrentDate: {
                funcName: "fluid.oauth2.authorizationService.getCurrentDate"
            }
        }
    });

    // APIs for App Installation clients

    /**
     * Grant an authorization for the given App Installation. The prefsSafes key will be verified before the access token is returned.
     * @param {Component} dataStore - An instance of gpii.dbOperation.dbDataStore.
     * @param {Component} codeGenerator - An instance of fluid.oauth2.codeGenerator.
     * @param {String} prefsSafesKey - A preferences safes key.
     * @param {String} clientId - A client id.
     * @param {String} clientCredentialId - A client credential id.
     * @return {Promise} A promise object whose resolved value is the access token. An error will be returned if the prefsSafes ID is not found.
     */
    fluid.oauth2.authorizationService.grantAppInstallationAuthorization = function (dataStore, codeGenerator, prefsSafesKey, clientId, clientCredentialId) {
        var promiseTogo = fluid.promise();

        if (!prefsSafesKey || !clientId || !clientCredentialId) {
            var error = fluid.postgresdb.composeError(fluid.postgresdb.errors.missingInput, {fieldName: "PrefsSafes ID, client ID, or client credential ID"});
            promiseTogo.reject(error);
        } else {
            var clientPromise = dataStore.findClientById(clientId);
            var clientCredentialPromise = dataStore.findClientCredentialById(clientCredentialId);

            // TODO: Update the usage of fluid.promise.sequence() once https://issues.fluidproject.org/browse/FLUID-5938 is resolved.
            var sources = [clientPromise, clientCredentialPromise];
            var promisesSequence = fluid.promise.sequence(sources);

            promisesSequence.then(function (responses) {
                var clientRec = responses[0][0];
                var clientCredentialRec = responses[1][0];
                var error;

                if (!clientRec || clientRec.type !== fluid.postgresdb.dataModelTypes.appInstallationClient) {
                    fluid.log("authorizationService, granting app installation authorization: invalid client or the type of the client with the client id (" + clientId + ") is not \"" + fluid.postgresdb.dataModelTypes.appInstallationClient + "\"");
                    error = fluid.postgresdb.composeError(fluid.postgresdb.errors.unauthorized);
                    promiseTogo.reject(error);
                } else if (!clientCredentialRec || clientCredentialRec.type !== fluid.postgresdb.dataModelTypes.clientCredential) {
                    fluid.log("authorizationService, granting app installation authorization: invalid client credential or the type of the client credential with id (" + clientCredentialId + ") is not \"" + fluid.postgresdb.dataModelTypes.clientCredential + "\"");
                    error = fluid.postgresdb.composeError(fluid.postgresdb.errors.unauthorized);
                    promiseTogo.reject(error);
                } else if (clientCredentialRec.clientId !== clientId) {
                    fluid.log("authorizationService, granting app installation authorization: the client id (" + clientCredentialRec.clientId + ") that the client credential belongs to does not match the client id (" + clientId + ") that requests the authorization");
                    error = fluid.postgresdb.composeError(fluid.postgresdb.errors.unauthorized);
                    promiseTogo.reject(error);
                } else {
                    // Re-issue a new access token every time. In the case that multiple requests were made for the same "client credential + prefsSafesKey"
                    // combination, the access token would be different for each request in the audit log. In the case that one request was detected to
                    // be from an attacker, invoking the associating access token would not affect other access tokens or the real user.
                    fluid.oauth2.authorizationService.createAppInstallationAuthorization(promiseTogo, dataStore, codeGenerator, prefsSafesKey, clientId, clientCredentialId, fluid.oauth2.defaultTokenLifeTimeInSeconds);
                }
            });
        }
        return promiseTogo;
    };

    /**
     * @param {Promise} promiseTogo - Modified by the function with objects to be resolved or to fail.
     * @param {Component} dataStore - An instance of gpii.dbOperation.dbDataStore.
     * @param {Component} codeGenerator - An instance of fluid.oauth2.codeGenerator.
     * @param {String} userId - A userId key.
     * @param {String} clientId - An unique client id.
     * @param {String} clientCredentialId - An unique client credential id.
     * @param {String} expiresIn - The lifetime in seconds of the access token.
     *
     * If promiseTogo is fired, the first argument will be the returned values.
     */
    fluid.oauth2.authorizationService.createAppInstallationAuthorization = function (promiseTogo, dataStore, codeGenerator, prefsSafesKey, clientId, clientCredentialId, expiresIn) {
        var token = codeGenerator.generateAccessToken();
        var expiresTimestamp = fluid.oauth2.getTimestampExpires(new Date(), expiresIn);

        var authorizationPromise = dataStore.addAuthorization({
            clientId: clientId,
            prefsSafesKey: prefsSafesKey,
            clientCredentialId: clientCredentialId,
            accessToken: token,
            timestampExpires: expiresTimestamp
        });
        var mapper = function () {
            // The created access token is resolved for promiseTogo eventually
            return {
                accessToken: token,
                expiresIn: expiresIn
            };
        };
        var authorizationPromise = fluid.promise.map(authorizationPromise, mapper);
        fluid.promise.follow(authorizationPromise, promiseTogo);
    };

})();
