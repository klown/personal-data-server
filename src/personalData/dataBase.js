/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
/* eslint-disable no-console */

"use strict";

const postgresdb = require("../database/src/js/index.js");
const generateToken = require("./generateRandomToken.js");

// Database configuration and connection
const dbConfig = {
    database: process.env.PGDATABASE        || "prefs_testdb",
    host: process.env.PGPHOST               || "localhost",
    port: process.env.PGPORT                || 5433,
    user: process.env.PGUSER                || "admin",
    password: process.env.POSTGRES_PASSWORD || "asecretpassword"
};

const addUserSql = `
    INSERT in users ("userId"", iterations, username, name, email, roles, derived_key, salt, verification_code, verified)
    VALUES ($1, $2, $3, $4, $5, 'user', $6, $7, $8, $9 )
    RETURNING *;
`;

class DataBaseRequest extends postgresdb.PostgresRequest {


    /**
     * Check that the database is ready to accept requests.  The check involves
     * retrieving the 'public' tables from the database and checking for one
     * named "AppSsoProvider".
     *
     * @return {Boolean} true - If the connection to the database succeeds at the
     *                          configured host, port, user, and password, and there
     *                          is an "AppSsoProvider" table; false otherwise.
     */
    async isReady() {
        try {
            const tables = await this.runSql(
                "SELECT * FROM pg_catalog.pg_tables WHERE schemaname='public';"
            );
            return tables.rows.some ((aTable) => {
                return aTable.tablename === "AppSsoProvider";
            });
        }
        catch (error) {
            console.error("Error accessing database, ", error);
            return false;
        }
    };

    /**
     * Retrieve, from the database, the clientId and secret for this app as provided
     * by given provider.
     *
     * @param {String} provider - The SSO provider, e.g, google, github, or some
     *                            other.
     * @return {Object}           The client information record for the given
     *                            provider.  Null is returned if there is no such
     *                            provider.
     */
    async getSsoClientInfo(provider) {
        try {
            const clientInfo = await this.runSql(`
                SELECT * FROM "AppSsoProvider" WHERE provider='${provider}';
            `);
            if (clientInfo.rowCount !== 0) {
                return clientInfo.rows[0];
            } else {
                throw new Error(`No such provider as ${provider}`);
            }
        } catch (error) {
            console.error(`Error retrieving ${provider} provider info: `, error);
            throw error;
        }
    };

    /**
     * Create and persist a User, or find an exising User.  The default way to
     * identify a User is by their email whose value is given in the first
     * argument `userInfo`.  Another way to identify the user can be provided
     * by the caller using the `constraint` argument, e.g.
     * `{ name: "username", value: "pat" }`.
     *
     * @param {Object} userInfo - The information to use to locate an existing
     *                            User record or create a new one.
     * @param {Object} constraint - Optional field name and value to use to find
     *                              the user.
     * @param {String} constraint.name - Name of the field to filter by,
     *                                   defaults to "email",
     * @param {String} constraint.value - Value of the field to filter by,
     *                                    defaults to the form "name@host.com".
     */
    async addUser(userInfo, constraint) {
        // Check if user already exists and create one if none.
        const filter = constraint || {
            name: "email",
            value: userInfo.email
        };
        var userRecords = await this.runSql(
            `SELECT * FROM "User" WHERE "${filter.name}"='${filter.value}';`
        );
        // TODO: derived_key, verification_code, and salt are meaningless in an
        // SSO scenario, but consider creating actual values for them.
        if (userRecords.rowCount === 0) {
            const newUser = {
                userId: userInfo.id,
                iterations: 0,
                username: userInfo.email,
                name: userInfo.name,
                roles: ['user'],
                derived_key: generateToken(255),
                verification_code: generateToken(255),
                salt: generateToken(255),
                email: userInfo.email,
                verified: true
            };
            userRecords = await this.loadFromJSON("User", [newUser])[0];
        }
        return userRecords.rows[0];
    };

    /**
     * Create and persist an SsoAccount record associated with the given User
     * records, or update an exising SsoAccount.
     *
     * @param {Object} userRecord - The User record in the database associated
     *                              with this account.
     *                            User record or create a new one.
     * @param {Object} userInfo - The user information provided by the SSO
     *                            provider.
     * @param {String} provider - The SSO provider.
     * @return {Object} An object consisting of the User record, the
     *                  AppSsoProvider record, the SsoAccount record.
     */
    async addSsoAccount(userRecord, userInfo, provider) {
        const clientInfo = await this.getSsoClientInfo(provider);
        var ssoAccountRecords = await this.runSql(
            `SELECT * FROM "SsoAccount" WHERE "user"='${userRecord.userId}';`
        );
        if (ssoAccountRecords.rowCount === 0) {
            ssoAccountRecords = await this.loadFromJSON("SsoAccount", [{
                user: userRecord.userId,
                provider: clientInfo.providerId,
                userInfo: userInfo
            }])[0];
        } else {
            // TODO: consider adding updateFromJSON().
            const accountId = ssoAccountRecords.rows[0].ssoAccountId;
            const userInfoStr = JSON.stringify(userInfo);
            ssoAccountRecords = await this.runSql(`
                UPDATE "SsoAccount"
                    SET "user"='${userRecord.userId}', provider=${clientInfo.providerId}, "userInfo"='${userInfoStr}'
                    WHERE "ssoAccountId"=${accountId}
                    RETURNING *;
            `);
        }
        return {
            user: userRecord,
            appSsoProvider: clientInfo,
            ssoAccount: ssoAccountRecords.rows[0]
        };
    };

    /**
     * Create and persist an AccessToken record, or update an exising one.
     *
     * @param {Object} accountRecords - Object containing the assoicated User,
     *                                  AppSsoProvider, and SsoAccount records.
     * @param {Object} accessToken - Access token associated with the User as
     *                               provided by the SSO provider.
     * @return {Object} An object consisting of the User record, the
     *                  AppSsoProvider record, and the SsoAccount record, and the
     *                  AccessToken record.
     */
    async refreshAccessToken(accountRecords, accessToken) {
        var accessTokenRecords = await this.runSql(`
            SELECT * FROM "AccessToken" WHERE
                "ssoAccount"=${accountRecords.ssoAccount.ssoAccountId} AND
                "ssoProvider"=${accountRecords.appSsoProvider.providerId};
        `);
        // If there is an access token record in the database, update it with
        // the new incoming access token, expiry, and possible refresh token.
        // If there is no incoming refresh token, leave whatever refrehs token
        // is in the database as is.
        debugger;
        var newTokenRecords;
        if (accessTokenRecords.rowCount > 0) {
            if (accessToken.refresh_token) {
                // TODO: remove console -- for debugging.
                console.log(`
                    UPDATE "AccessToken" SET
                      "accessToken" = '${accessToken.access_token}',
                      "expiresIn" =  ${accessToken.expires_in},
                      "refreshToken" = '${accessToken.refresh_token}'
                      WHERE id=${accessTokenRecords.rows[0].id}
                      RETURNING *;
                `);
                newTokenRecords = await this.runSql(`
                    UPDATE "AccessToken" SET
                      "accessToken" = '${accessToken.access_token}',
                      "expiresIn" =  ${accessToken.expires_in},
                      "refreshToken" = '${accessToken.refresh_token}'
                      WHERE id=${accessTokenRecords.rows[0].id}
                      RETURNING *;
                `);
            } else {
                // TODO: remove console -- for debugging.
                console.log(`
                    UPDATE "AccessToken" SET
                      "accessToken" = '${accessToken.access_token}',
                      "expiresIn" = ${accessToken.expires_in}
                      WHERE id=${accessTokenRecords.rows[0].id}
                      RETURNING *;
                `);
                newTokenRecords = await this.runSql(`
                    UPDATE "AccessToken" SET
                      "accessToken" = '${accessToken.access_token}',
                      "expiresIn" = ${accessToken.expires_in}
                      WHERE id=${accessTokenRecords.rows[0].id}
                      RETURNING *;
                `);
            }
        // No existing access token in the database for this user. Insert a new
        // one
        } else {
           var accessTokenJSON = {
                    ssoAccount: accountRecords.ssoAccount.ssoAccountId,
                    ssoProvider: accountRecords.appSsoProvider.providerId,
                    accessToken: accessToken.access_token,
                    expiresIn: accessToken.expires_in,
                    loginToken: generateToken(128)
            };
            if (accessToken.refresh_token) {
                accessTokenJSON.refreshToken = accessToken.refresh_token;
            }
            // TODO: remove console -- for debugging.
            console.debug("Access Token JSON: %O", accessTokenJSON);
            newTokenRecords = await this.loadFromJSON("AccessToken", [accessTokenJSON]);
        }
        debugger;
        accountRecords.accessToken = newTokenRecords.rows[0];
        return accountRecords;
    };
};

module.exports = new DataBaseRequest(dbConfig);
