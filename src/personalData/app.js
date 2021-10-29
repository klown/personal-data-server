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

const express = require("express");
const session = require("express-session");
const path = require("path");
const logger = require("morgan");

var indexRouter = require("./routes/index");
var ssoRouter = require("./routes/sso");

const app = express();
app.use(logger("dev"));
app.use(session({ secret: "shhhh", resave: false, saveUninitialized: true }));

// Views
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

// Endpoints
app.use("/", indexRouter);
app.use("/sso", ssoRouter);

// TODO:  Move to testing
var usersRouter = require("./routes/users");
app.use("/users", usersRouter); // test getting and displaying a list of users
app.use(express.static(path.join(__dirname, "public"))); // test serve static files under /public

// General endpoint for 404s
app.use(function (req, res, next) {
    res.status(404).send("Sorry, can't find it");
    next();
});

module.exports = app;
