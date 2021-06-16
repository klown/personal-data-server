-- SSO Provider
CREATE TABLE "AppSsoProvider" (
    "providerId" SERIAL NOT NULL PRIMARY KEY,
    "provider" varchar(30) NOT NULL,
    "name" varchar(40) NOT NULL,
    "client_id" varchar(191) NOT NULL,
    "client_secret" varchar(191) NOT NULL
);
INSERT INTO "AppSsoProvider" (provider, name, client_id, client_secret) VALUES (
    'Dummy Provider',
    'dummyProvider',
    '554291169960-repqllu9q9h5loog0hpadr6854fb2oq0.apps.dummy.com',
    'ek1k4RNTao8XY6gAmmOXxJ6m'
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
INSERT INTO "User" (
    "userId",
    name,
    username,
    derived_key,
    verification_code,
    salt,
    iterations,
    email,
    roles,
    verified
) VALUES (
    'dummyId',
    'notadummy',
    'genius',
    '98f5ab8c475a720739779fad5fd61092edc94a08',
    'DE74AAF3-2A0F-47A3-BBC6-5A1FD2A9A6BE',
    '2653c80aabd3889c3dfd6e198d3dca93',
    0,
    'genius@mensa.org',
    '{"user"}',
    TRUE
);

-- SSO Account
CREATE TABLE "SsoAccount" (
    "ssoAccountId" SERIAL NOT NULL PRIMARY KEY,
    "user" VARCHAR(64) NOT NULL REFERENCES "User" ("userId") DEFERRABLE INITIALLY DEFERRED,
    "provider" INTEGER NOT NULL REFERENCES "AppSsoProvider" ("providerId") DEFERRABLE INITIALLY DEFERRED,
    "userInfo" JSONB NOT NULL
);
INSERT INTO "SsoAccount" ("user", "provider", "userInfo")
    VALUES (
        'dummyId', 1, '{"id": "110080685778429079941",  "email": "psmith@google.com", "verified_email": true, "name": "Pat Smith", "given_name": "Pat", "family_name": "Smit", "picture": "https://lh3.googleusercontent.com/a-/AOh14GjlAC1GiD-0oTyb9NPXLUSyC1O9TfVsX5SSlll3=s96-c", "locale": "en"}'
);

-- Access Token from SSO Provider
CREATE TABLE "AccessToken" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "ssoAccount" INTEGER NOT NULL REFERENCES "SsoAccount" ("ssoAccountId") DEFERRABLE INITIALLY DEFERRED,
    "ssoProvider" INTEGER NOT NULL REFERENCES "AppSsoProvider" ("providerId") DEFERRABLE INITIALLY DEFERRED,
    "accessToken" TEXT NOT NULL,
    "expiresIn" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "loginToken" TEXT NOT NULL
);
INSERT INTO "AccessToken" ("ssoAccount", "ssoProvider", "accessToken", "expiresIn", "refreshToken", "loginToken")
    VALUES (
        '1', 1,
        'ya29.a0AfH6SMB38um4jZCosaASMmdVagk-926k6le7aIPywo0oYnh3SwThF8mzbDl_0__c5ZdJMd2ilJ_gU5lh0HdvO_bNKYwOaCXhuBIc7NVpXng2AgcnBpHJ_kUzxbiFxoWj_XF11h4KsOh-hpqZGw91-efk1r0S',
        3600,
        '1//04jXyLbMMuTMXCgYIARAAGAQSNwF-L9IrSvHAGg3dikYtllivLrmRlrLFoyKKdjCMQiCdTmDRJT0F3gzm9gSSeBIrTo0KTRHuP1Q',
        'ln29.n0NsU6FZO38hz4wMPbfnNFZzqIntx-926x6yr7nVCljb0bLau3FjGuS8zmoQy_0__p5MqWZq2vyW_tH5yu0UqiB_oAXLjBnPKuhOVp7AIcKat2NtpaOcUW_xHmkovSkbJw_KS11u4XfBu-ucdMTj91-rsx1e0F'
);

