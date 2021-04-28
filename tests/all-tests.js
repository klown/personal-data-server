/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

"use strict";

var testIncludes = [
    "../src/database/src/test/all-tests.js"
];

testIncludes.forEach(function (path) {
    require(path);
});
