/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
/* eslint-env node */

"use strict";

var fluid = require("infusion"),
    jqUnit = require("node-jqunit");

fluid.registerNamespace("fluid.tests.postgresdb.utils");

// Host, port, database name, etc. for testing
fluid.tests.postgresdb.databaseConfig = {
    database: process.env.PGDATABASE        || "prefs_testdb",
    host: process.env.PGPHOST               || "localhost",
    port: process.env.PGPORT                || 5432,
    user: process.env.PGUSER                || "admin",
    password: process.env.POSTGRES_PASSWORD || "asecretpassword"
};

/**
 * A test of the `runSqlArray()` method by a bulk deletion of the given tables
 * from the database.  The tables are dropped in bulk.
 *
 * @param {Component} postgresOps - Postgres operations instance.
 * @param {Array} tableNames - Array of tables to delete.
 * @param {String} ifExists - (Optional) additional IF EXISTS clause.
 * @return {Promise} The value of the drop operation.
 */
fluid.tests.postgresdb.utils.testSqlArray = function (postgresOps, tableNames, ifExists) {
    ifExists = ifExists || "";
    var dropSQL = [];
    fluid.each(tableNames, function (aTableName) {
        dropSQL.push(
            `DROP TABLE ${ifExists} "${aTableName}" CASCADE;`
        );
    });
    return postgresOps.runSqlArray(dropSQL);
};

/**
 * Run SQL statement(s).
 *
 * @param {Object} pgOps - Postgres operations instance.
 * @param {String} sql - SQL statement.
 * @param {Array} values - Optional values for any parameters in `sql`.
 * @return {Promise} Result of running the statment(s).
 */
fluid.tests.postgresdb.utils.runSQL = function (pgOps, sql, values) {
    return pgOps.runSql(sql, values);
};

/**
 * Run SQL statement(s) fetched from a file.
 *
 * @param {Object} pgOps - Postgres operations instance.
 * @param {String} sqlFile - Path to file containing SQL statements.
 * @return {Promise} Result of running the statment(s).
 */

fluid.tests.postgresdb.utils.runSQLfile = function (pgOps, sqlFile) {
    fluid.log("SQLFILE: " + sqlFile);
    return pgOps.runSqlFile(sqlFile);
};

/**
 * Check the results of running some SQL.  At least check that the
 * results from the query is non-null and there are an equal number of them as
 * there were statements.  Node-postgres returns a results array where each
 * object in the array has a `command` property.  A `command` parameter is
 * optional here, but if provided, is compared to the `command` properties of
 * the results.
 *
 * @param {Array} results - SQL statement(s) results.
 * @param {Number} numStatements - Expected number of SQL statements executed.
 * @param {String} command - Optional: if present, it will be checked against
 *                           commands returned in the results.
 */
fluid.tests.postgresdb.utils.testResults = function (results, numStatements, command) {
    jqUnit.assertNotNull("Check for null result", results);
    jqUnit.assertEquals("Check number of commands", numStatements, results.length);
    if (command) {
        fluid.each(results, function (aResult) {
            jqUnit.assertEquals("Check SQL command", command, aResult.command);
        });
    }
};

/**
 * Compare the key-value pairs of the JSON returned from a database operation
 * against an expected set of key-value pairs.  Date values are a special case
 * since, even though PostGres is documented as outputting the date in ISO
 * format, it replaces the 'T' with a space.  See the note in the "Data/Time
 * Types" documentation:
 * https://www.postgresql.org/docs/13/datatype-datetime.html#DATATYPE-DATETIME-OUTPUT
 *
 * @param {Array} keys - The field names of the JSON objects to compare.
 * @param {Object} actualPairs - JSON object returned from the database.
 * @param {Object} expectedPairs - Expected JSON object.
 * @param {String} msg - Message for the comparison tests.
 */
fluid.tests.postgresdb.utils.checkKeyValuePairs = function (keys, actualPairs, expectedPairs, msg) {
    fluid.each(keys, function (aKey) {
        var actualValue = actualPairs[aKey];
        var expectedValue = expectedPairs[aKey];
        var message = msg + " for key '" + aKey + "'";
        // Special case: time stamps -- convert the value to Date objects for
        // comparison
        if (actualValue instanceof Date) {
            var actualDate = new Date(actualValue);
            var expectedDate = new Date(expectedValue);
            jqUnit.assertDeepEq(message, expectedDate, actualDate);
        } else {
            jqUnit.assertDeepEq(message, expectedValue, actualValue);
        }
    });
};

fluid.tests.postgresdb.utils.testFailureCreateTable = function (error, tableName) {
    jqUnit.assertNotNull("Check for null error", error);
    jqUnit.assertEquals("Check error message",
        "relation \"" + tableName + "\" already exists",
        error.message
    );
};

fluid.tests.postgresdb.utils.testLoadTables = function (results, allTablesData) {
    jqUnit.assertNotNull("Check for null result", results);
    fluid.each(results, function (aResult, index) {
        var tableName = fluid.tests.postgresdb.tableNames[index];
        fluid.tests.postgresdb.utils.testResults(
            aResult, allTablesData[tableName].length, "INSERT"
        );
    });
};

fluid.tests.postgresdb.utils.finish = function (pgOps) {
    return pgOps.end().then(() => {
        fluid.log("Postgres operations done");
    });
};
