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
/* eslint-disable no-console */

"use strict";

const express = require("express");
const session = require("express-session");
const dbRequest = require("../dataBase.js");
const generateNonce = require("../generateRandomToken.js");
const googleSso = require("./ssoProviders/googleSso.js");

const router = express.Router();

// SSO "home" page.
router.get("/", function (req, res) {
    res.render("index", {
        title: "Personal Data Server",
        message: "This paragraph intentionally left blank."
    });
});

// Trigger Google SSO
router.get("/google", function (req, res) {
    req.session.secret = generateNonce(16);
    dbRequest.getSsoClientInfo(googleSso.options.provider).then(
        (clientInfo) => {
            googleSso.authorize(req, res, clientInfo, req.session.secret, googleSso.options);
        },
        (error) => {
            console.error(error);
            renderErrorResponse(res, error);
        }
    );
});

// Handle the callback from Google
router.get("/google/login/callback", function (req, res) {
    console.log("Callback from Google:");
    // Check the anti-forgery token (state)
    if (req.query.state === req.session.secret) {
        if (req.query.code) {
            googleSso.fetchAccessToken(req.query.code, dbRequest, googleSso.options).then(
                (accessToken) => {
                    googleSso.fetchUserInfo(accessToken, googleSso.options).then(
                        (userInfo) => {
                            googleSso.addUserAndAccessToken(userInfo, accessToken, dbRequest, googleSso.options).then(
                                (accountInfo) => { req.session.accountInfo = accountInfo; }
                            );
                        },
                        (error) => {
                            console.error("Error requesting user info: ", error);
                            renderErrorResponse(res, error);
                        }
                    );
                    // Finished SSO, forget state secret (needed?)
                    req.session.secret = "shhhh";
                    debugger;
                    res.render("index", {
                        title: "Access token",
                        message: JSON.stringify(accessToken, null, 2)
                    });
                },
                (error) => {
                    console.error("Error requesting access token: ", error);
                    renderErrorResponse(res, error);
                }
            );
        } else {
            const error = new Error("Unknown request");
            console.error(error.message);
            renderErrorResponse(res, error);
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
 * @param {Object}  response - An express response object
 * @param {Error}   err      - An error instance
 */
function renderErrorResponse(response, err) {
    response.render("error", {
        title: err.message,
        message: err.message,
        error: err
    });
};

module.exports = router;
