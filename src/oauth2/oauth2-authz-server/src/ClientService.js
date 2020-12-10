/*!
Copyright 2014-2020 OCAD university

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

The research leading to these results has received funding from the European Union's
Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.

You may obtain a copy of the License at
https://github.com/fluid-project/preferencesServer/blob/main/LICENSE.txt
*/

"use strict";

var fluid = require("infusion");

fluid.registerNamespace("fluid.oauth2");

fluid.defaults("fluid.oauth2.clientService", {
    gradeNames: ["fluid.component"],
    components: {
        dataStore: {
            type: "gpii.dbOperation.dataStore"
        }
    },
    invokers: {
        authenticateClient: {
            funcName: "fluid.oauth2.clientService.authenticateClient",
            args: ["{dataStore}", "{arguments}.0", "{arguments}.1"]
                                  // oauth2ClientId, expectedOauth2ClientSecret
        },
        getClientById: {
            func: "{dataStore}.findClientById"
        }
    }
});

// To verify a client information matches the expected value
//
// @dataStore (Object) - an instance of a data store component such as gpii.dbOperation.dbDataStore
// @oauth2ClientId (String) - an OAuth2 client id
// @expectedOauth2ClientSecret (String) - The expected OAuth2 client secret
//
// @return (Promise) - A promise object that contains either a client record or an error
fluid.oauth2.clientService.authenticateClient = function (dataStore, oauth2ClientId, expectedOauth2ClientSecret) {
    var promiseTogo = fluid.promise();
    var clientPromise = dataStore.findClientByOauth2ClientId(oauth2ClientId);

    clientPromise.then(function (record) {
        var client = record ? record.client : undefined;
        var clientCredential = record ? record.clientCredential : undefined;

        if (client && clientCredential && fluid.get(clientCredential, ["oauth2ClientSecret"]) === expectedOauth2ClientSecret) {
            promiseTogo.resolve({
                client: client,
                clientCredential: {
                    id: clientCredential.id,
                    allowedIPBlocks: clientCredential.allowedIPBlocks,
                    isCreateGpiiKeyAllowed: !!clientCredential.isCreateGpiiKeyAllowed,
                    isCreatePrefsSafeAllowed: !!clientCredential.isCreatePrefsSafeAllowed
                }
            });
        } else {
            fluid.log("clientService: unauthorized client with oauth2ClientId - " + oauth2ClientId);
            promiseTogo.reject(gpii.dbOperation.errors.unauthorized);
        }
    }, function (err) {
        promiseTogo.reject(err);
    });
    return promiseTogo;
};
