-- Copyright 2021 Inclusive Design Research Centre, OCAD University
-- All rights reserved.
--
-- PostgreSQL to remove all data from a database.
--
-- Licensed under the New BSD license. You may not use this file except in
-- compliance with this License.
--
-- You may obtain a copy of the License at
-- https://github.com/fluid-project/preferencesServer/blob/main/LICENSE

DROP TABLE IF EXISTS "AccessToken" CASCADE;
DROP TABLE IF EXISTS "SsoAccount" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "AppSsoProvider" CASCADE;
