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
const generateNonce = require("../../generateRandomToken.js");

const REDIRECT_URI = "http://localhost:3000/sso/google/login/callback";

const options = {
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

    // Identifier for retrieving the client information (e.g. id and secret)
    // for the Personal Data Server database.
    provider: "google"
};

class GoogleSso {

    get REDIRECT_URI() { return REDIRECT_URI; };
    get options() { return options; };

    /**
     * Execute the first step in the SSO workflow, making an authorize request
     * to Google.  This throws if there is an error retrieving the client
     * information from the database.
     *
     * @param {Object} req - The express request that triggered the workflow
     * @param {Object} req.session.secret - Anti-forgery token used in the SSO workflow
     * @param {Object} res - The express response used to redirect to Google
     * @param {Object} dbRequest - Used to retrieve this client's id and secret
     * @param {Object} options - Other options specific to Google SSO
     * @param {String} options.authorizeUri - Google's authorization endpoint
     * @param {String} options.encodedRedirectUri - The endpoint that Google will call
     * @param {String} options.accessType - The type of access to Google needed for SSO
     *
     */
    async authorize (req, res, dbRequest, options) {
        const clientInfo = await dbRequest.getSsoClientInfo(this.options.provider);
        req.session.secret = generateNonce(12);
        const authRequest = `${options.authorizeUri}?client_id=${clientInfo.client_id}&redirect_uri=${options.encodedRedirectUri}&scope=openid+profile+email&response_type=code&state=${req.session.secret}&access_type=${options.accessType}`;
        console.debug("Google /authorize request: ", authRequest);
        res.redirect(authRequest);
    };

    /**
     * Handle the redirect callback from Google:
     * - request an access token,
     * - request the user's profile
     * - create/update database with respect to the User, AccessToken, and
     *   SsoAccount records.
     * This throws if an error occurs at any step.
     *
     * @param {Object} req - The express request that triggered the workflow
     * @param {Object} req.query.code - Token from Google to use to request access token
     * @param {Object} res - The express response.
     * @param {Object} dbRequest - Used to update User, AccessToken, and SsoAccount
     *                             records
     * @param {Object} options - Other options specific to Google SSO
     * @return {String} - The login token generated for static workflow clients.
     */
    async handleCallback (req, res, dbRequest, options) {
        try {
            if (!req.query.code) {
                throw new Error("Unknown request");
            }
            const accessToken = await this.fetchAccessToken(req.query.code, dbRequest, options);
            const userInfo = await this.fetchUserInfo(accessToken, options);
            const accountInfo = await this.storeUserAndAccessToken(userInfo, accessToken, dbRequest);
            console.debug(accountInfo);
            return accountInfo.accessToken.loginToken;
        }
        // TODO:  if all catch() does is re-throw, is the try/catch necessary?
        catch (error) {
            throw error;
        }
    };

    /**
     * Request an access token from Google SSO.
     *
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
    async fetchAccessToken (code, dbRequest, options) {
        const clientInfo = await dbRequest.getSsoClientInfo(options.provider);
        const response = await fetch(options.accessTokenUri, {
            method: "post",
            body: JSON.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: options.redirectUri,
                client_id: clientInfo.client_id,
                client_secret: clientInfo.client_secret,
                access_type: options.access_type
            }),
            header: { "Content-type": "application/json" }
        });
        const accessToken = await response.json();
        console.debug("Status: %s: Access token for %s: %O", response.status, options.provider, accessToken);
        return accessToken;
    };

    /**
     * Request the SSO users's email and profile from Google.
     * @param {Object} accessToken - The access token provided by Google.
     * @param {Object} accessToken.scope - Email and profile scope.
     * @param {Object} options - Other options specific to Google SSO.
     * @param {Object} options.userInfoUri - URI to Google's user profile end point.
     * @return {Object} user profile information as json.
     */
    async fetchUserInfo (accessToken, options) {
        const fullUri = `${options.userInfoUri}?` + new URLSearchParams({
            access_token: accessToken.access_token,
            alt: "json"
        });
        const response = await fetch(fullUri);
        console.debug("USER INFO RESPONSE STATUS ", response.status);
        console.debug(JSON.stringify(response, null, 2));
        const userInfo = response.json();
        console.debug("USER INFO: ", JSON.stringify(userInfo, null, 2));
        return userInfo;
    };

    /**
     * Create and persist user, access token, and SSO account records based
     * on the given information.
     *
     * @param {Object} userInfo - The informatino to use to create the user record.
     * @param {Object} accessToken - The access token provided by the provider for
     *                               the user's access.
     * @param {Object} dbRequest - Database access for storing the user, access
     *                             token, and related records.
     * @return {Object} Object that has the User, SsoAccount, and AccessToken
     *                  records.
     */
    async storeUserAndAccessToken (userInfo, accessToken, dbRequest) {
        // Use Google's identifier as the userId field for the User record.
        const userRecord = await dbRequest.addUser(
            userInfo, {name: "userId", value: userInfo.id}
        );
        var accountInfo = await dbRequest.addSsoAccount(userRecord, userInfo, "google");
        accountInfo = await dbRequest.refreshAccessToken(accountInfo, accessToken);
        return accountInfo;
    };
};

module.exports = new GoogleSso();
