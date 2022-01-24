-- Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
-- All rights reserved.
--
-- PostgreSQL to remove all data from a database.
--
-- Licensed under the New BSD license. You may not use this file except in
-- compliance with this License.
--
-- You may obtain a copy of the License at
-- https://github.com/fluid-project/preferencesServer/blob/main/LICENSE

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
