/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Defines constants and functions to handle the SSO workflow using Google as
 * the provider.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
/* eslint-disable no-console */

"use strict";

const fetch = require("node-fetch");

const REDIRECT_URI = "http://localhost:3000/sso/google/login/callback";
const googleSso = {
    options: {
        // Google authorization endpoint to start their authorization workflow.
        authorizeUri: "https://accounts.google.com/o/oauth2/auth",

        // Google "get access token" and "refresh access token" endpoints.
        accessTokenUri: "https://accounts.google.com/o/oauth2/token",
        accessType: "offline",

        // Google user endpoints.
        userInfoUri: "https://www.googleapis.com/oauth2/v2/userinfo",

        // Google "use access token endpoint"
        credentialsUri: "https://oauth2.googleapis.com/token",

        // URI that Google uses to call back to the Personal Data Server for
        // logging in.
        redirectUri: REDIRECT_URI,
        encodedRedirectUri: encodeURIComponent(REDIRECT_URI),

        // SQL to retrieve the client information (e.g. id and secret) for the
        // Personal Data Server database.
        provider: "google",
        clientInfoSql: "SELECT * FROM \"AppSsoProvider\" WHERE provider='google'"
    },

    /**
     * Execute the first step in the SSO workflow, making an authorize request
     * to Google
     * @param {Object} req - The express request that triggered the workflow
     * @param {Object} res - The express response used to redirect to Google
     * @param {Object} clientInfo - The client id and secret of the personal data server
     * @param {String} state - Anti-forgery token used in the SSO workflow
     * @param {Object} options - Other options specific to Google SSO.
     * @param {String} options.authorizeUri - Google's authorization endpoint.
     * @param {String} options.encodedRedirectUri - The callback that triggered this method, encoded
     * @param {String} options.accessType - The type of access to Google needed for SSO.
     *
     */
    authorize: function (req, res, clientInfo, state, options) {
        res.redirect(`${options.authorizeUri}?client_id=${clientInfo.client_id}&redirect_uri=${options.encodedRedirectUri}&scope=openid+profile+email&response_type=code&state=${state}&access_type=${options.accessType}`);
    },

    /**
     * Request an access token from Google SSO
     * @param {String} code - The code provided by Gogole to exchange for the
     *                        access token
     * @param {Object} dbRequest - Database access for retrieving client id and
     *                             secret.
     * @param {Object} options - Other options specific to Google SSO.
     * @param {Object} options.provider - Identifier to use to find this client's
     *                                    id and secret in the database.
     * @param {Object} options.accessTokenUri - URI to Google's access token
     *                                          endpoint.
     * @return {Object} an access token as json.
     */
    fetchAccessToken: async function (code, dbRequest, options) {
        // TODO:  error handling for each await.
        const clientInfo = await dbRequest.getSsoClientInfo(options.provider);
        const response = await fetch(options.accessTokenUri, {
            method: "post",
            body: JSON.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: options.redirectUri,
                client_id: clientInfo.client_id,
                client_secret: clientInfo.client_secret
            }),
            header: { "Content-type": "application/json" }
        });
        const accessToken = await response.json();
        return accessToken;
    },

    /**
     * Request the SSO users's email and profile from Google.
     * @param {Object} accessToken - The access token provided by Google.
     * @param {Object} accessToken.scope - Email and profile scope.
     * @param {Object} options - Other options specific to Google SSO.
     * @param {Object} options.userInfoUri - URI to Google's user profile end point.
     * @return {Object} an access token as json.
     */
    fetchUserInfo: async function (accessToken, options) {
        const fullUri = `${options.userInfoUri}?` + new URLSearchParams({
            access_token: accessToken.access_token,
            alt: "json"
        });
        const response = await fetch(fullUri);
        console.log("USER INFO RESPONSE STATUS ", response.status);
        console.log(JSON.stringify(response, null, 2));
        const userInfo = response.json();
        console.log("USER INFO: ", JSON.stringify(userInfo, null, 2));
        return userInfo;
    }
};

module.exports = googleSso;
