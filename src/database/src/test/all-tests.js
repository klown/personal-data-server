/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

var allTests = [
    "./testPostgresRequest.js",
    "./testPostgresOperations.js",
    "./testTableModelDefinitions.js"
];

allTests.forEach(function (aTest) {
    require(aTest);
});
