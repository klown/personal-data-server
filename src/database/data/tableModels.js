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
"use strict"

var fluid = require("infusion");
require("../src/js/index.js");

fluid.registerNamespace("fluid.postgresdb");

fluid.postgresdb.tableDefinitions = [
    `DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='prefsSafesType') THEN
              CREATE TYPE "prefsSafesType" AS ENUM ('snapset', 'user');
            END IF;
        END
    $$;`,
    `CREATE TABLE IF NOT EXISTS "${fluid.postgresdb.tableNames.prefsSafes}" (
        "prefsSafesId" VARCHAR(36) PRIMARY KEY NOT NULL,
        "safeType" "prefsSafesType" NOT NULL,
        name VARCHAR(64),
        password VARCHAR(64),
        email VARCHAR(32),
        preferences JSONB NOT NULL DEFAULT '{}'
    );`,
    `CREATE TABLE IF NOT EXISTS "${fluid.postgresdb.tableNames.users}" (
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
    );`,
    `CREATE TABLE IF NOT EXISTS "${fluid.postgresdb.tableNames.cloudSafeCredentials}" (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        "prefsSafeId" VARCHAR(36) NOT NULL,
        "userId" VARCHAR(64) NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS "${fluid.postgresdb.tableNames.clientCredentials}" (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        "clientId" VARCHAR(36) NOT NULL,
        "oauth2ClientId" VARCHAR(64) NOT NULL,
        "oauth2ClientSecret" VARCHAR(255) NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        "revokedReason" TEXT,
        "timestampRevoked" TIMESTAMP WITH TIME ZONE
    );`,
    `CREATE TABLE IF NOT EXISTS "${fluid.postgresdb.tableNames.appInstallationAuthorizations}" (
        id VARCHAR(36) PRIMARY KEY NOT NULL,
        "clientId" VARCHAR(36) NOT NULL,
        "userId" VARCHAR(64),
        "clientCredentialId" VARCHAR(36) NOT NULL,
        "accessToken" VARCHAR(64) NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        "revokedReason" TEXT,
        "timestampRevoked" TIMESTAMPTZ,
        "timestampExpires" TIMESTAMPTZ NOT NULL
    );`
];

module.exports.tableDefinitions = fluid.postgresdb.tableDefinitions;
