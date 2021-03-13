/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
"use strict";

var fluid = require("infusion");

fluid.registerNamespace("fluid.tests.postgresdb");

fluid.tests.postgresdb.tableNames = [
    "rgb",
    "roster.preferenceset",
    "massive",
    "users"
];

fluid.tests.postgresdb.tableDefinitions = `
    CREATE TABLE "${fluid.tests.postgresdb.tableNames[0]}" (
        id VARCHAR(36) PRIMARY KEY,
        color VARCHAR(36),
        "colourMap" JSONB,
        "timeStampCreated" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "timeStampModified" TIMESTAMPTZ
    );
    CREATE TABLE "${fluid.tests.postgresdb.tableNames[1]}" (
        name VARCHAR(64) PRIMARY KEY,
        description VARCHAR(64),
        prefs_json JSONB
    );
    CREATE TABLE "${fluid.tests.postgresdb.tableNames[2]}" (
        text TEXT
    );
    CREATE TABLE "${fluid.tests.postgresdb.tableNames[3]}" (
        "userId" VARCHAR(64) PRIMARY KEY NOT NULL,
        name VARCHAR(64) NOT NULL,
        username VARCHAR(64) NOT NULL,
        derived_key VARCHAR(255) NOT NULL,
        verification_code VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        iterations INT NOT NULL,
        email VARCHAR(32) NOT NULL,
        roles VARCHAR(16)[] NOT NULL,
        verified BOOLEAN NOT NULL DEFAULT false
    );
`;

fluid.tests.postgresdb.tableUpdates = `
    ALTER TABLE "${fluid.tests.postgresdb.tableNames[0]}"
        RENAME COLUMN color TO colour;
    ALTER TABLE "${fluid.tests.postgresdb.tableNames[0]}"
        ADD "timeStampExpired" TIMESTAMPTZ;
`;

fluid.tests.postgresdb.numTableUpdates = 2;
