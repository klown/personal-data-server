/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

const fluid = require("infusion"),
    axios = require("axios");

fluid.registerNamespace("fluid.tests.utils");

// Personal data server port (used by express's startup script `node index.js`)
process.env.PORT = 3001;
fluid.tests.serverUrl = "http://localhost:" + process.env.PORT;

/**
 * Initialize a test database and set up its tables, if it/they do not already
 * exist, and load some test data records.
 *
 * @param {String} serverDomain - The server domain.
 * @param {String} endpoint - The end point supported by the server.
 * @return {Object} The response object containing the response code and message.
 */
fluid.tests.utils.sendRequest = async function (serverDomain, endpoint) {
    console.debug("- Sending '%s' request", endpoint);
    try {
        return await axios.get(serverDomain + endpoint);
    } catch (e) {
        // Return e.response when the server responds with an error.
        // Return e when the server endpoint doesn't exist.
        return e.response ? e.response : e;
    }
};
