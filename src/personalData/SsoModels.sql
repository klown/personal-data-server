-- Copyright 2021 Inclusive Design Research Centre, OCAD University
-- All rights reserved.
--
-- Table definitions to support single sign on (SSO) data models.
--
-- Licensed under the New BSD license. You may not use this file except in
-- compliance with this License.
--
-- You may obtain a copy of the License at
-- https://github.com/fluid-project/preferencesServer/blob/main/LICENSE

-- SSO Provider
CREATE TABLE "AppSsoProvider" (
    "providerId" SERIAL NOT NULL PRIMARY KEY,
    "provider" varchar(30) NOT NULL,
    "name" varchar(40) NOT NULL,
    "client_id" varchar(191) NOT NULL,
    "client_secret" varchar(191) NOT NULL
);

-- User
CREATE TABLE "User" (
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

-- SSO Account
CREATE TABLE "SsoAccount" (
    "ssoAccountId" SERIAL NOT NULL PRIMARY KEY,
    "user" VARCHAR(64) NOT NULL REFERENCES "User" ("userId") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    "provider" INTEGER NOT NULL REFERENCES "AppSsoProvider" ("providerId") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    "userInfo" JSONB NOT NULL
);

-- Access Token from SSO Provider
CREATE TABLE "AccessToken" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "ssoAccount" INTEGER NOT NULL REFERENCES "SsoAccount" ("ssoAccountId") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    "ssoProvider" INTEGER NOT NULL REFERENCES "AppSsoProvider" ("providerId") ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NULL,
    "refreshToken" TEXT DEFAULT NULL,
    "loginToken" TEXT NOT NULL
);
