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

// GET home page.
router.get('/', function(req, res, next) {
  res.render("index", { title: "Personal Data Server" });
});

// '/health' end point -- if the server is running at all, it will execute this
// and is considered healthy
router.get("/health", function(req, res, next) {
  res.json({ isHealthy: true });
});

// '/ready' end point -- if server is healthy and the database is ready.
router.get("/ready", function (req, res, next) {
    dbRequest.isReady().then(
        (ready) => { res.json({ isReady: ready }); },
        (error) => { res.json({ isReady: false }); }
    );
});

module.exports = router;
