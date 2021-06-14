/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */

"use strict";

var express = require('express');
var router = express.Router();
const dbRequest = require("../dataBase.js");

// URI that Google will call this app with
const googleRedirectURI = "/google/login/callback";

// Anti-forgery state parameter
// TODO:  generate this on demand
const state = "03X6PS5fZ6e4"

// SSO "home" page.
router.get("/", function(req, res, next) {
  res.render("index", { title: "Personal Data Server" });
});

router.get("/google", function(req, res, next) {
    dbRequest.getSsoClientInfo("google").then(
        (clientInfo) => {
            console.log(`https://accounts.google.com/o/oauth2/auth?client_id=${clientInfo.client_id}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F%2Fgoogle%2Flogin%2Fcallback&scope=openid+profile+email&response_type=code&state=${state}&access_type=offline`);
            res.redirect(`https://accounts.google.com/o/oauth2/auth?client_id=${clientInfo.client_id}&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fsso%2Fgoogle%2Flogin%2Fcallback&scope=openid+profile+email&response_type=code&state=${state}&access_type=offline`);
        },
        (error) => {
            console.error(error);
            res.render("index", { title: error.message });
        }
    )
});

router.get(googleRedirectURI, function(req, res, next) {
  res.render("index", { title: "Called back from Google" });
});


/**
 * Retrieve, from the database, the clientId and secret for this app as provided
 * by Google.
 *
 * @param provider The SSO provider, e.g, google, github, or some other.
 *
 * @return true if connection to the database succeeds at the configured host,
 *         port, user, and password, and there is an "AppSsoProvider" table;
 *         false otherwise
 */
dbRequest.getSsoClientInfo = async function (provider) {
    try {
        const clientInfo = await dbRequest.runSql(`
            SELECT * FROM "AppSsoProvider" WHERE provider='${provider}';
        `);
        if (clientInfo.rowCount != 0) {
            return clientInfo.rows[0];
        } else {
            throw `No such provider as ${provider}`;
        }
    } catch (error) {
        console.error("Error retrieving clientId and secret: ", error);
        return null;
    }
};

module.exports = router;
