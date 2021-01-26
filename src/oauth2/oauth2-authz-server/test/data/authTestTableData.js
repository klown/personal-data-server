/* eslint-env node */
"use strict";
require('json5/lib/register');

var fluid = require("infusion");

fluid.registerNamespace("fluid.tests.oauth2");
fluid.tests.oauth2.testTableData = {};

fluid.tests.oauth2.dataTypeTableNameMap = fluid.freezeRecursive({
 "appInstallationAuthorization": "appInstallationAuthorizations",
 "appInstallationClient": "appInstallationClients",
 "clientCredential": "clientCredentials",
 "cloudSafeCredentials": "cloudSafeCredentials",
 "prefsSafesKey": "prefsSafesKeys",
 "user": "users"
});

/*
 * Retrieve test records from JSON files for the given type of test, and store
 * them in the `fluid.tests.oauth2.testTableData` object using the test type
 * as their key.
 *
 * @param {String} testType - The type of test the JSON test data is set up for.
 */
fluid.tests.oauth2.readTestDataJSON = function (testType) {
    var testTableData = fluid.tests.oauth2.testTableData;
    var dataTypeTableNameMap = fluid.tests.oauth2.dataTypeTableNameMap;

    var testTableJSON = require("./" + testType + ".json");
    testTableData[testType] = {};
    fluid.each(testTableJSON, function (tableDataObject) {
        var dataType = dataTypeTableNameMap[tableDataObject.type];
        if (!testTableData[testType][dataType]) {
            testTableData[testType][dataType] = [];
        }
        testTableData[testType][dataType].push(tableDataObject);
    });
    return testTableData;
};

/*
 * Delete any existing records of the given type of test data, based on the
 * test data's "id" fields -- `fluid.tests.oauth2.testTableData`
 *
 * @param {String} testType - The type of test that the test data is set up for.
 * @param {Component} dataStore - Database operations object to delete the
 *                                records from, if any match.
 * @return {Promise} - the result of deleting the records from the database.
 */
fluid.tests.oauth2.deleteExistingRecords = function (testType, dataStore) {
    var delSeq = [];
    var dataTypes = fluid.keys(fluid.tests.oauth2.testTableData[testType]);

    fluid.each(dataTypes, function (dataType) {
        var recordArray = fluid.tests.oauth2.testTableData[testType][dataType];
        fluid.each(recordArray, function (aRecord) {
            delSeq.push(dataStore.deleteRecord(dataType, { "id": aRecord.id }));
        });
    });
    return fluid.promise.sequence(delSeq)
};

/*
 * Load the data base tables with the test records for the given test type.
 * First delete any existing record.
 *
 * @param {String} testType - The type of test that the test data is set up for.
 * @param {Component} dataStore - Database operations object for loading into
 *                                the database.
 * @return {Promise} - the result of loading the records into the database.
 */
fluid.tests.oauth2.loadTestData = function (testType, dataStore) {
    var addSeq = [];
    var dataTypes = fluid.keys(fluid.tests.oauth2.testTableData[testType]);

    // Add test records
    fluid.each(dataTypes, function (dataType) {
        var recordArray = fluid.tests.oauth2.testTableData[testType][dataType];
        addSeq.push(dataStore.loadOneTable(dataType, recordArray));
    });
    return fluid.promise.sequence(addSeq);
};
