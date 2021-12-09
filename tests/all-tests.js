/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

const testIncludes = [
    // Test DB operations
    "./postgresOpsTests.js",
    "./postgresRequestTests.js",
    "./tableModelDefTests.js",

    // Test Google single sign on
    "./googleSsoTests.js",

    // Test endpoints provided by personal data server
    "./healthReadyTests.js"

];

testIncludes.forEach(function (path) {
    require(path);
});
