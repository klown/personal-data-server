/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Handles endpoints:
 * /sso/
 * /sso/google - trigger SSO for Google OAuth2 provider
 * /sso/google/login/callback - handle OAuth2 callback from Google
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */

"use strict";

const express = require("express");
const fetch = require("node-fetch");
const dbRequest = require("../dataBase.js");

const router = express.Router();
require("json5/lib/register");

// Anti-forgery state parameter
// TODO:  generate `state` on demand.
const state = "03X6PS5fZ6e4";
const googleOptions = require("./googleSso.json5");
googleOptions.encodedRedirectUri = encodeURIComponent(googleOptions.redirectUri);

// SSO "home" page.
router.get("/", function(req, res, next) {
  res.render("index", { title: "Personal Data Server", message: "This paragraph intentionally left blank." });
});

// Trigger Google SSO
router.get("/google", function(req, res, next) {
    dbRequest.getSsoClientInfo(googleOptions.provider).then(
        (clientInfo) => {
            res.redirect(`${googleOptions.authorizeUri}?client_id=${clientInfo.client_id}&redirect_uri=${googleOptions.encodedRedirectUri}&scope=openid+profile+email&response_type=code&state=${state}&access_type=${googleOptions.accessType}`);
        },
        (error) => {
            console.error(error);
            renderErrorResponse(res, error);
        }
    )
});

// Handle the callback from Google
router.get("/google/login/callback", function(req, res, next) {
    console.log("Callback from Google:");
    console.log(JSON.stringify(req.query, null, 2));
    // Check the `state`
    if (req.query.state === state) {
        // First response from Google is with a `code` parameter.
        if (req.query.code) {
            fetchAccessToken(googleOptions, req.query.code).then(
                (accessToken) => {
                    console.log("Access token: ", JSON.stringify(accessToken, null, 2));
                    res.render("index", { title: "Access token", message: JSON.stringify(accessToken, null, 2) });
                },
                (error) => {
                    console.error("Error requesting access token: ", error);
                    renderErrorResponse(res, error);
                }
            );
        }
        else {
            console.log("Unknown request");
        }
    // Mismatch with anti-forgery `state` parameter -- bail.
    } else {
        const error = new Error("Mismatched anti-forgery parameter");
        console.error(error.message);
        renderErrorResponse(res, error);
    }
});

/**
 * Render an error response
 *
 * @param {Object} response An express response object
 * @param {Error} err An error
 */
function renderErrorResponse (response, err) {
    response.render("error", {
        title: err.message,
        message: err.message,
        error: err
    });
};

/**
 * Retrieve, from the database, the clientId and secret for this app as provided
 * by Google.
 *
 * @param {String} provider  The SSO provider, e.g, google, github, or some
 *                           other.
 * @return {Object} The client information record for the given provider.  Null
 *                  is returned if there is no such provider.
 */
dbRequest.getSsoClientInfo = async function (provider) {
    try {
        const clientInfo = await dbRequest.runSql(`
            SELECT * FROM "AppSsoProvider" WHERE provider='${provider}';
        `);
        if (clientInfo.rowCount != 0) {
            return clientInfo.rows[0];
        } else {
            throw new Error(`No such provider as ${provider}`);
        }
     } catch (error) {
         console.error(`Error retrieving ${provider} provider info: `, error);
         throw error;
     }
};

/**
 * Given that the SSO provider has responded with a `code`, get an access token
 * for the SSO user.
 * See: https://github.com/node-fetch/node-fetch#common-usage
 *
 * @param {Object} options Provider information
 * @param {String} options.accessTokenUri The URI to use to make the access
 *                                        token request of the SSO provider.
 * @param {String} options.provider The SSO provider, e.g, google, github, etc.
 * @param {String} options.redirectUri The Personal Data Server URI that the
 *                                     provider calls back to.
 * @param {String} code The key code result of the authorization request sent
 *                      to the provider.
 * @return {Object} The access token, if the request is successful.
 */
async function fetchAccessToken (options, code) {
    const clientInfo = await dbRequest.getSsoClientInfo(options.provider);
    const response = await fetch(options.accessTokenUri, {
        method: "post",
        body: JSON.stringify({
            grant_type: "authorization_code",
            code: `${code}`,
            redirect_uri: `${options.redirectUri}`,
            client_id: `${clientInfo.client_id}`,
            client_secret: `${clientInfo.client_secret}`
        }),
        headers: { "Content-Type": "appication/json" }
    });
    const accessToken = await response.json();
    return accessToken;
};


module.exports = router;
