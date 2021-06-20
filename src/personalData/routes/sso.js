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
const dbRequest = require("../dataBase.js");
const googleSso = require("./ssoProviders/googleSso.js");

const router = express.Router();

// Anti-forgery state parameter
// TODO:  generate `state` on demand.
const state = "03X6PS5fZ6e4";

// SSO "home" page.
router.get("/", function (req, res) {
    res.render("index", {
        title: "Personal Data Server",
        message: "This paragraph intentionally left blank."
    });
});

// Trigger Google SSO
router.get("/google", function (req, res) {
    dbRequest.getSsoClientInfo(googleSso.options.provider).then(
        (clientInfo) => {
            googleSso.authorize(req, res, clientInfo, state, googleSso.options);
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
    console.log(JSON.stringify(req.query, null, 2));
    // Check the anti-forgery token (state)
    if (req.query.state === state) {
        if (req.query.code) {
            googleSso.fetchAccessToken(req.query.code, dbRequest, googleSso.options).then(
                (accessToken) => {
                    // TODO: store the access token in the database
                    console.log("Access token: ", JSON.stringify(accessToken, null, 2));
                    res.render("index", { title: "Access token", message: JSON.stringify(accessToken, null, 2) });
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
