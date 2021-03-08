/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

var fluid = require("infusion");
var allTests = [
    "./testPostgresRequest.js",
    "./testPostgresOperations.js",
    "./testTableModelDefinitions.js",
    "./testStringifyJoin.js"/*,
    "./testDataModelOperations.js"*/
];

fluid.each(allTests, function (aTest) {
        require(aTest);
    }
);
