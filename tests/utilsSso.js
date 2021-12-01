/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */
/* eslint-disable no-console */

"use strict";

const fluid = require("infusion"),
    axios = require("axios");

fluid.registerNamespace("fluid.tests.personalData");

// Personal data server port (used by express's startup script `node index.js`)
process.env.PORT = 3001;

fluid.tests.personalData.serverUrl = "http://localhost:" + process.env.PORT;
fluid.tests.personalData.postgresContainer = "postgresdb";
fluid.tests.personalData.postgresImage = "postgres:14.0-alpine";

/**
 * Initialize a test database and set up its tables, if it/they do not already
 * exist, and load some test data records.
 *
 * @param {String} serverDomain - The server domain.
 * @param {String} endpoint - The end point supported by the server.
 * @return {Object} The response object containing the response code and message.
 */
fluid.tests.sendRequest = async function (serverDomain, endpoint) {
    console.debug("- Sending '%s' request", endpoint);
    try {
        return await axios.get(serverDomain + endpoint);
    } catch (e) {
        // Return e.response when the server responds with an error.
        // Return e when the server endpoint doesn't exist.
        return e.response ? e.response : e;
    }
};
