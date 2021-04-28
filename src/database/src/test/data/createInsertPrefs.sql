/*
 * Copyright 2020-2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='prefsSafesType') THEN
            CREATE TYPE "prefsSafesType" AS ENUM ('snapset', 'user');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='accessType') THEN
            CREATE TYPE "accessType" AS ENUM ('public', 'private', 'shared by trusted parties');
        END IF;
    END
$$;
CREATE TABLE "prefsSafes" (
    "prefsSafesId" VARCHAR(36) PRIMARY KEY NOT NULL,
    "safeType" "prefsSafesType" NOT NULL,
    name VARCHAR(64),
    password VARCHAR(64),
    email VARCHAR(32),
    preferences JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO "prefsSafes" ("prefsSafesId", "safeType", name, password, email)
    VALUES ('prefsSafe-1', 'user', 'carla', 'null', 'someone@somewhere.com')
    RETURNING *
;
