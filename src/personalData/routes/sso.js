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

/**
 * Trigger the single sign on workflow where Google is the OAuth2 provider.
 */
router.get("/", function (req, res) {
    res.render("index", {
        title: "Personal Data Server",
        message: "This paragraph intentionally left blank."
    });
});


/**
 * Trigger the single sign on workflow where Google is the OAuth2 provider.
 */
router.get("/google", function (req, res) {
    // Redirects to Google's `/authorize` endpoint
    googleSso.authorize(req, res, dbRequest, googleSso.options)
        .catch((error) => {
            console.error(error);
            // TODO: replace with non-ui response, likely json with a meaningful
            // status code.
            renderErrorResponse(res, error);
        });
});

/**
 * Handle the OAuth2 redirect callback from Google.
 */
router.get("/google/login/callback", function (req, res) {
    if (req.query.state !== req.session.secret) {
        const error = new Error("Mismatched anti-forgery parameter");
        console.error(error.message);
        renderErrorResponse(res, error);
    }
    // Anti-forgery check passed -- handle the callback from Google.
    googleSso.handleCallback(req, res, dbRequest, googleSso.options)
        .then((loginToken) => {
            // Finished SSO, forget state secret (needed?)
            req.query.state = "shhhh";
            req.session.staticToken = loginToken;

            // TODO: Need some sort of response here, but Google isn't expecting
            // anything.
            res.render("index", {
                title: "Login Token:",
                message: JSON.stringify(req.session.staticToken, null, 2)
            });
        })
        .catch((error) => {
            console.log(error);
            // TODO: replace with non-ui response, likely json with a meaningful
            // status code.
            renderErrorResponse(res, error);
        });
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
