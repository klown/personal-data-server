#!/usr/bin/env node
/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

// This script containing functions to start and stop the personal data server.
// Note that it doesn't start the backend database server and load data.

"use strict";

const app = require("./src/server/app.js");
const http = require("http");

/**
 * Start the personal data server. Note that it doesn't start the backend database server and load data.
 *
 * @param {Number} port - The port that the personal data server listens to.
 * @return {Object} - In the structure of {server: {Object}, status: {Promise}}
 *                  Two elements are:
 *                  server: the server instance;
 *                  status: a promise whose resolved value is a success message and rejected value is an error
 *                  message of why the server failed to start.
 */
const startServer = async function (port) {
    port = port || 3000;
    app.set("port", port);

    /**
     * Create HTTP server.
     */
    const server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */
    server.listen(port);

    let status = new Promise((resolve, reject) => {
        /**
         * Event listener for HTTP server "listening" event.
         */
        server.on("listening", () => {
            const addr = server.address();
            const bind = typeof addr === "string"
                ? "pipe " + addr
                : "port " + addr.port;
            resolve("Listening on " + bind);
        });

        /**
         * Event listener for HTTP server "error" event.
         */
        server.on("error", (error) => {
            let message;
            if (error.syscall !== "listen") {
                throw error;
            }

            const bind = typeof port === "string"
                ? "Pipe " + port
                : "Port " + port;

            // handle specific listen errors with friendly messages
            switch (error.code) {
            case "EACCES":
                message = bind + " requires elevated privileges";
                break;
            case "EADDRINUSE":
                message = bind + " is already in use";
                break;
            default:
                message = error;
            }
            reject(message);
        });
    });

    return {
        server,
        status
    };
};

/**
 * Stop the personal data server.
 *
 * @param {Number} server - The `server` element returned by startServer() function.
 */
const stopServer = async function (server) {
    await server.close();
};

module.exports = {
    startServer,
    stopServer
};
