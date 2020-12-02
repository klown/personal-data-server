/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

"use strict";

var fluid = require("infusion");

var testIncludes = [
    "%preferencesServer/src/database/src/test/all-tests.js"
];

fluid.each(testIncludes, function (path) {
    fluid.require(path);
});
