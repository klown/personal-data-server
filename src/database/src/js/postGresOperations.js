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
/* eslint-disable no-console */

"use strict";

var pg      = require("pg"),
    format  = require("pg-format");

class PostgresRequest extends pg.Pool {

    /**
     * Constructor: pass the configuration to the super class and add an
     * event handler for any errors -- see:
     * https://node-postgres.com/api/pool#poolonerror-err-error-client-client--void--void
     *
     * @param {Object} configuration - The host, port, user, etc. to configure
     *                                 the Pool.
     */
    constructor(configuration) {
        super(configuration);
        this.on("error", (err, client) => {
            console.error("Error with client %O: %O", client, err);
        });
    };

    /**
     * Wrapper around the super class `query()` method that adds an error
     * handler for logging errors.  The `sql` parameter can be a single SQL
     * command or a semi-colon separated list of commands.
     *
     * @param {String} sql - The SQL command(s) to run.
     * @param {Array} values - Optional array of values for any parameters
     *                         in the `sql` argument.
     * @return {Promise} A promise whose value(s) is/are the result of running
     *                   the SQL statement(s) in the `sql` parameter.  A
     *                   function to log any error is attached to the promise.
     */
    async runSql(sql, values) {
        var promise = this.query(sql, values);
        promise.then(null, function (error) {
            console.error(error.message);
        });
        return promise;
    };

    /**
     * Utility to run an array of SQL commands in bulk.  Examples include
     * creating or upgrading a set of tables in batch, or the bulk load of a
     * set of records.
     *
     * Although not required, the array can express a logical sequence of
     * statements, where a statement's position in the array indicates
     * an operation that must come before a subsequent statement, or after a
     * previous one.
     *
     * @param {Array} sqlArray - An array of SQL statements.
     * @return {Promise} A promise whose values are the results of running the
     *                   sequence of SQL statements in the `sqlArray`.
     */
    async runSqlArray(sqlArray) {
        var results = [];
        for (var i = 0; i < sqlArray.length; i++) {
            let aResult = await this.runSql(sqlArray[i]);
            results.push(aResult);
        };
        return results;
    };

    /**
     * Utility to insert a set of records into a table given an array of JSON
     * objects.
     *
     * The structure of the JSON must match the structure of the table.  That is,
     * the names of the fields must match the column names, and the field values
     * must match the value types declared for the table.  In addition, where the
     * table column requires a non-null value and no default is specified, there
     * must be a corresponding name/value pair in the JSON object.  If the table
     * column value is allowed to be null or has a default, the corresponding
     * JSON name/value pair can be omitted.
     *
     * @param {String} tableName - Name of table to insert into.
     * @param {Array} jsonArray - An array of JSON objects to load.
     * @return {Promise} whose value is an array of successful INSERT results,
     *                   or an error.
     */
    async loadFromJSON(tableName, jsonArray) {
        var insertions = [];
        jsonArray.forEach(function (aRecord) {
            // Special case for array values: pg-format requires them to be
            // processed differently for INSERT vs IN.  The solution is to use
            // the ARRAY format string for both.  See github issue #22:
            // https://github.com/datalanche/node-pg-format/issues/22
            var jsonValues = Object.values(aRecord);
            var tableValues = [];
            jsonValues.forEach(function (aJsonValue) {
                if (Array.isArray(aJsonValue)) {
                    tableValues.push(format("ARRAY[%L]", aJsonValue));
                } else {
                    tableValues.push(format("%L", aJsonValue));
                }
            });
            var insertSql = format(
                "INSERT INTO %I (%I) VALUES (%s)",
                tableName, Object.keys(aRecord), tableValues
            );
            insertions.push(insertSql);
        });
        return this.runSqlArray(insertions);
    };
};

module.exports = { PostgresRequest };
