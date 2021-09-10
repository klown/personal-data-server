/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

var allTests = [
    "./testGoogleSso.js"
];

allTests.forEach(function (aTest) {
    require(aTest);
});
