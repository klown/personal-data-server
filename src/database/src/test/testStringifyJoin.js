/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit");
require("../js/index.js");

jqUnit.module("PostgresDB 'stringifyJoin' unit tests.");

fluid.registerNamespace("fluid.tests.stringifyJoin");

fluid.tests.stringifyJoin.testObject = {
    "integer": 5,
    "decimal": 3.14159,
    "bool": true,
    "string": "The quick brown fox jumped over the lazy dogs",
    "array": [1, "two", 100],
    "nulll": null,
    "unDefined": undefined,
    "plainObject": {
        "x": "ex",
        "y": 77,
        "z": false,
        "a": ["one", 2, "three"],
        "b": {
            "foo": "bar"
        }
    }
};

fluid.tests.stringifyJoin.expectedMaybeStringify = {
    primitive: 5,
    array: "{1,\"two\",100}",
    plainObject: "{\"x\":\"ex\",\"y\":77,\"z\":false,\"a\":[\"one\",2,\"three\"],\"b\":{\"foo\":\"bar\"}}"
};
fluid.tests.stringifyJoin.expectedKeys = '"integer","decimal","bool","string","array","nulll","unDefined","plainObject"';
fluid.tests.stringifyJoin.expectedValues = "'5','3.14159','true','The quick brown fox jumped over the lazy dogs','{1,\"two\",100}','null','undefined','{\"x\":\"ex\",\"y\":77,\"z\":false,\"a\":[\"one\",2,\"three\"],\"b\":{\"foo\":\"bar\"}}'";


fluid.defaults("fluid.tests.postgresdb.stringifyJoin.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        testCaseHolder: {
            type: "fluid.tests.postgresdb.stringifyJoin.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.postgresdb.stringifyJoin.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    modules: [{
        name: "StringJoin test case",
        tests: [{
            name: "Check stringifyKeysJoin(), stringifyJoinValues(), maybeStringify()",
            sequence: [{
                funcName: "fluid.tests.postgresdb.stringifyJoin.testMaybeStringify",
                args: [
                    "Check maybeStringify() with a primitive",
                    fluid.tests.stringifyJoin.testObject.integer,
                    "primitive"
                ]
            }, {
                funcName: "fluid.tests.postgresdb.stringifyJoin.testMaybeStringify",
                args: [
                    "Check maybeStringify() with an array",
                    fluid.tests.stringifyJoin.testObject.array,
                    "array"
                ]
            },{
                funcName: "fluid.tests.postgresdb.stringifyJoin.testMaybeStringify",
                args: [
                    "Check maybeStringify() with a plain object",
                    fluid.tests.stringifyJoin.testObject.plainObject,
                    "plainObject"
                ]
            }, {
                funcName: "fluid.tests.postgresdb.stringifyJoin.testStringifyJoinKeys",
            }, {
                funcName: "fluid.tests.postgresdb.stringifyJoin.testStringifyJoinValues",
            }]
        }]
    }]
});

fluid.tests.postgresdb.stringifyJoin.testMaybeStringify = function (message, input, expectedFieldname) {
    var actual = fluid.postgresdb.maybeStringify(input);
    jqUnit.assertEquals(message, fluid.tests.stringifyJoin.expectedMaybeStringify[expectedFieldname], actual);
};

fluid.tests.postgresdb.stringifyJoin.testStringifyJoinKeys = function () {
    var actualKeys = fluid.postgresdb.stringifyJoinKeys(
        Object.keys(fluid.tests.stringifyJoin.testObject)
    );
    jqUnit.assertEquals( "Check stringifyJoinKeys()", fluid.tests.stringifyJoin.expectedKeys, actualKeys);
};

fluid.tests.postgresdb.stringifyJoin.testStringifyJoinValues = function () {
    var actualValues = fluid.postgresdb.stringifyJoinValues(
        Object.values(fluid.tests.stringifyJoin.testObject)
    );
    jqUnit.assertEquals("Check stringifyJoinValues()", fluid.tests.stringifyJoin.expectedValues, actualValues);
};

fluid.test.runTests("fluid.tests.postgresdb.stringifyJoin.environment");
