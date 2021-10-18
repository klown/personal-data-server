-- Copyright 2021 Inclusive Design Research Centre, OCAD University
-- All rights reserved.
--
-- Test record for Google SSO provider client information.
--
-- Licensed under the New BSD license. You may not use this file except in
-- compliance with this License.
--
-- You may obtain a copy of the License at
-- https://github.com/fluid-project/preferencesServer/blob/main/LICENSE

INSERT INTO "AppSsoProvider" (provider, name, client_id, client_secret) VALUES (
    'google',
    'Google',
    '554291169960-repqllu9q9h5loog0hpadr6854fb2oq0.apps.dummy.com',
    'ek1k4RNTao8XY6gAmmOXxJ6m'
) RETURNING *;

-- This is a real one.
-- INSERT INTO "AppSsoProvider" (provider, name, client_id, client_secret) VALUES (
--     'google',
--     'google',
--     '247181811838-36gccml0o88mvfeljq3cdchdaja1mj1t.apps.googleusercontent.com',
--     '_Qh6eAUV630XhLLyAayf7z9l'
-- ) RETURNING *;
