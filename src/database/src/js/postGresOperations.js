/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
"use strict";

var fluid = require("infusion"),
    pg    = require("pg");

fluid.registerNamespace("fluid.postgresdb");

fluid.defaults("fluid.postgresdb.request", {
    gradeNames: ["fluid.component"],

    // The following are set by integrators that use this component
    databaseName:   null,   // e.g., "fluid_prefsdb"
    host:           null,   // e.g., "localhost"
    port:           null,   // e.g., 5432
    user:           null,   // e.g., "admin"
    password:       null,
    members: {
        // Reference to a node-postgres Pool instance that will handle the
        // Postgres queries, initialized onCreate.
        pool:  null
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.postgresdb.initConnection",
            args: ["{that}"]
        }
    },
    invokers: {
        "query": {
            funcName: "fluid.postgresdb.query",
            args: ["{that}.pool", "{arguments}.0"]
                                  // SQL query string
        },
        "bulkQuery": {
            funcName: "fluid.postgresdb.bulkQuery",
            args: ["{that}", "{arguments}.0"]
                              // array of SQL query strings
        },
        "loadFromJSON" : {
            funcName: "fluid.postgresdb.loadFromJSON",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // array of JSON
        }
    }
});

/**
 * Initialize connection to the postgres database, using node-postgres.
 *
 * @param {Object} that - Contains the options for the connection and a member
 *                        to hold a reference to the connection.
 * @param {String} that.options.databaseName - Name of the database.
 * @param {String} that.options.user - Name of the user with admin access.
 * @param {String} that.options.password - User's password.
 * @param {String} that.options.dialect - The dialect for SQL requests,
 *                                        e.g. "postgres".
 * @param {Number} that.options.port - The port number for the connection.
 * @param {Object} that.pool - Allocated and used to make postgres queries.
 *
 */
fluid.postgresdb.initConnection = function (that) {
    that.pool = new pg.Pool({
        user:       that.options.user,
        password:   that.options.password,
        host:       that.options.host,
        database:   that.options.database,
        port:       that.options.port
    });
};

/**
 * Convenience function to surface node-postgres `query()` function and log any
 * errors.
 *
 * @param {Object} pool - node-postgres Pool instance to use for querying.
 * @param {String} queryString - SQL query.
 * @return {Promise} A promise whose value is the results of the query.
 */
fluid.postgresdb.query = function (pool, queryString) {
    var promise = pool.query(queryString);
    promise.then(null, function (error) {
        fluid.log(error.message);
    });
    return promise;
};

/**
 * Utility to run a sequence of postgres queries in bulk.  This can be used to
 * create or upgrade a set of tables in batch, or bulk load a set of records.
 *
 * @param {Object} that - Postgres request object.
 * @param {Array} queryArray - An array of SQL statements.
 * @return {Promise} A promise whose values are the results of running the
 *                   sequence of commands in the `queryArray`.
 */
fluid.postgresdb.bulkQuery = function (that, queryArray) {
    var commandSequence = [];
    fluid.each(queryArray, function (aQuery) {
        commandSequence.push(that.query(aQuery));
    });
    return fluid.promise.sequence(commandSequence).then(
        null,
        function (error) {
            fluid.log(error.message);
        }
    );
};

/**
 * Utility to insert a set of records into a table given an array of JSON
 * objects.
 *
 * The structure of the JSON must match the structure of the table.
 * The names of the fields must match the column names.  Where the table
 * requires a non-null value, there is a value in the JSON object, and so on.
 *
 * @param {Object} that - Postgres request object.
 * @param {Sting} tableName - Name of table to insert into.
 * @param {Array} jsonArray - An array of JSON objects who.
 * @return {Promise} A promise whose values are the results of running the
 *                   sequence of commands in the `queryArray`.
 */
fluid.postgresdb.loadFromJSON = function (that, tableName, jsonArray) {
    var insertions = [];
    fluid.each(jsonArray, function (aRecord) {
        var columns = fluid.postgresdb.stringifyJoinKeys(Object.keys(aRecord));
        var values = fluid.postgresdb.stringifyJoinValues(Object.values(aRecord));
        insertions.push(
            `INSERT INTO "${tableName}" (${columns}) VALUES (${values});`
        );
    });
    // For debugging
    fluid.each(insertions, function (anInsertion) {
        fluid.log(fluid.logLevel.TRACE, anInsertion);
    });
    return that.bulkQuery(insertions);
};

/**
 * Utility to stringify each element of an array of object keys and join them
 * as a single string separated by commas.  This is similar to the Array.join()
 * function, but where each element is quoted with double quotes.
 *
 * @param {Array} keys - Array of object keys.
 * @return {String} - The keys in a comma separated string where each key is
 *                    quoted.
 */
fluid.postgresdb.stringifyJoinKeys = function (keys) {
    if (keys.length === 0) {
        return "";
    }
    var theJoin = JSON.stringify(keys[0]);
    for (var i = 1; i < keys.length; i++) {
        theJoin += "," + JSON.stringify(keys[i]);
    }
    return theJoin;
};

/**
 * Utility to stringify each element of an array of object values and join them
 * as a single string separated by commas.  This is similar to the Array.join()
 * function, but where each element is quoted with a single quote.  Also, if
 * a value is an object, it is stringified as well as quoted.
 *
 * @param {Array} values - Array of object values.
 * @return {String} - The keys in a comma separated string where each key is
 *                    quoted.
 */
fluid.postgresdb.stringifyJoinValues = function (values) {
    if (values.length === 0) {
        return "";
    }
    var theJoin = "'" + fluid.postgresdb.maybeStringify(values[0]) + "'";
    for (var i = 1; i < values.length; i++) {
        theJoin += ",'" + fluid.postgresdb.maybeStringify(values[i]) + "'";
    }
    return theJoin;
};

/**
 * Utility to return a stringified object if given an object; otherwise just
 * return it.
 *
 * The input value is checked via `fluid.isPrimitive()`, and if so, it is
 * returned as is.  Otherwise the result of `JSON.stringify()` is returned. If
 * the argument is an array, the square brackets are replaced with curly ones.
 * @param {Any} aValue - Value to stringify if necessary.
 * @return {Any|String} - The value as is, or stringified.
 */
fluid.postgresdb.maybeStringify = function (aValue) {
    if (fluid.isPrimitive(aValue)) {
        return aValue;
    }
    else if (fluid.isArrayable(aValue)) {
        return JSON.stringify(aValue).replace(/\[/g, '{').replace(/\]/g, '}');
    }
    else {
        return JSON.stringify(aValue);
    }
};


