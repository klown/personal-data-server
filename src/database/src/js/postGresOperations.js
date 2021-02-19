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
    pg  = require("pg");

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
        }
    }
});

/**
 * Initiallize connection to the postgresdb, using node-postgres.
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
 * Convenience function to surface node-postgres `query()` function.
 *
 * @param {Object} pool - node-postgres Pool instance to use for querying.
 * @param {String} queryString - SQL query.
 * @return {Promise} A promise whose value is the results of the query.
 */
fluid.postgresdb.query = function (pool, queryString) {
    return pool.query(queryString);
};
