/*!
Copyright 2016-2020 OCAD university

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

(function () {

    "use strict";

    fluid.defaults("fluid.oauth2.authGrantFinder", {
        gradeNames: ["fluid.component"],
        components: {
            authorizationService: {
                type: "fluid.oauth2.authorizationService"
            }
        },
        invokers: {
            getGrantForAccessToken: {
                funcName: "fluid.oauth2.authGrantFinder.getGrantForAccessToken",
                args: ["{that}.authorizationService", "{arguments}.0"]
                                                      // accessToken
            }
        }
    });

    // Return a promise object that contains the granted privilege for the access token.
    // This function looks up access tokens granted for App Installations to find the match.
    fluid.oauth2.authGrantFinder.getGrantForAccessToken = function (authorizationService, accessToken) {
        var promiseTogo = fluid.promise();
        var authorizationPromise = authorizationService.getInfoByAccessToken(accessToken);
        var grant;

        authorizationPromise.then(function (authRecord) {
            if (authRecord) {
                if (authRecord.authorization.type === gpii.dbOperation.docTypes.gpiiAppInstallationAuthorization &&
                    fluid.oauth2.getExpiresIn(authorizationService.getCurrentDate(), authRecord.authorization.timestampExpires) > 0) {
                    grant = {
                        accessToken: accessToken,
                        gpiiKey: authRecord.authorization.gpiiKey,
                        allowSettingsGet: true,
                        allowSettingsPut: true,
                        allowedPrefsToWrite: authRecord.clientCredential.allowedPrefsToWrite || null
                    };
                }
            }
            promiseTogo.resolve(grant);
        });

        return promiseTogo;
    };
})();
