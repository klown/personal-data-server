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

const startServer = function (port) {
    port = port || 3000;
    app.set("port", port);

    /**
     * Create HTTP server.
     */
    const server = http.createServer(app);

    /**
     * Event listener for HTTP server "error" event.
     */

    const onError = function (error) {
        if (error.syscall !== "listen") {
            throw error;
        }

        const bind = typeof port === "string"
            ? "Pipe " + port
            : "Port " + port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
        }
    };

    /**
     * Event listener for HTTP server "listening" event.
     */

    const onListening = function () {
        const addr = server.address();
        const bind = typeof addr === "string"
            ? "pipe " + addr
            : "port " + addr.port;
        console.log("Listening on " + bind);
    };

    /**
     * Listen on provided port, on all network interfaces.
     */
    server.listen(port);
    server.on("error", onError);
    server.on("listening", onListening);

    return server;
};

const stopServer = async function (server) {
    await server.close();
};

module.exports = {
    startServer,
    stopServer
};
