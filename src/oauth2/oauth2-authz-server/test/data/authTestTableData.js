/* eslint-env node */
"use strict";
require('json5/lib/register');

var fluid = require("infusion");

fluid.registerNamespace("fluid.tests.oauth2");
fluid.tests.oauth2.testTableData = {};

fluid.tests.oauth2.makeTableData = function (testType) {
    var testTableJSON = require("./" + testType + ".json");
    fluid.tests.oauth2[testType] = {};
    fluid.each(testTableJSON, function (tableDataObject) {
        var dataType = tableDataObject.type;
        if (!fluid.tests.oauth2[testType][dataType]) {
            fluid.tests.oauth2[testType][dataType] = [];
        }
        fluid.tests.oauth2[testType][dataType].push(tableDataObject);
    });
};

fluid.tests.oauth2.makeTableData("authGrantFinderTests-data");
fluid.tests.oauth2.makeTableData("authorizationServiceTests-data");
