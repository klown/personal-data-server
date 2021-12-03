/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
/* eslint-env node */
/* eslint-disable no-console */

"use strict";

const fluid = require("infusion"),
    axios = require("axios"),
    nock = require("nock"),
    url = require("url"),
    path = require("path"),
    jqUnit = require("node-jqunit");

require("../src/shared/initDbUtils.js");
require("./utilsSso.js");

const googleSso = require("../src/personalData/routes/ssoProviders/googleSso.js");
const dbRequest = require("../src/personalData/ssoDbOps.js");

fluid.personalData.initEnvironmentVariables({
    dbName: "prefs_testdb",
    dbPort: 5433
});

jqUnit.module("Personal Data Server Google SSO Tests");

fluid.registerNamespace("fluid.tests.googleSso");

fluid.tests.googleSso.mockAccessToken = {
    access_token: "PatAccessToken.someRandomeString",
    expires_in: 3600,
    refresh_token: "anotherRandomString"
};

// Possible errors are "invalid_request", "invalid_client", "invalid_grant".
// "unauthorized_client", "unsupported_grant_type", or "invalid_scope".
// However, the status code is "400 Bad Request" for all of them -- use same
// mock in all cases.
// https://www.rfc-editor.org/rfc/rfc6749#section-5.2
fluid.tests.googleSso.mockErrorResponse = {
    error: "invalid client",
    error_description: "The specified client is unknown"
};

fluid.tests.googleSso.mockUserInfo = {
    id: "PatId",
    name: "Pat Smith",
    email: "pat.smith@somewhere.com",
    locale: "en",
    picture: "https://lh3.googleusercontent.com/picture/url",
    given_name: "Pat",
    family_name: "Smith",
    verified_email: true
};

const pdServerUrl = fluid.tests.personalData.serverUrl;
const pdServerStartCmd = "node index.js";
const sqlFiles = {
    flush: __dirname + "/../dataModel/dropTables.sql",
    tableDefs: path.join(__dirname, "/../dataModel/SsoTables.sql"),
    loadTestData: __dirname + "/../dataModel/SsoProvidersData.sql"
};

// Keep track of the payload returned by the auth request for consequent tests
let authPayload;

jqUnit.test("Google SSO tests", async function () {
    jqUnit.expect(36);
    try {
        // Start the database
        const dbStatus = await fluid.personalData.dockerStartDatabase(fluid.tests.personalData.postgresContainer,
            fluid.tests.personalData.postgresImage,
            dbRequest.dbConfig);
        jqUnit.assertTrue("The database has been started successfully", dbStatus);

        // Start the server
        const serverInstance = await fluid.personalData.startServer(pdServerStartCmd, pdServerUrl);
        jqUnit.assertEquals("Check server active", 200, serverInstance.status);

        // Flush the database
        const loadDataStatus = await fluid.personalData.initDataBase(dbRequest, sqlFiles);
        jqUnit.assertTrue("The database has been initiated", loadDataStatus);

        // Test "/ready" to ensure the server is up and running
        let response = await fluid.tests.sendRequest(pdServerUrl, "/ready");
        fluid.tests.googleSso.testResponse(response, 200, { isReady: true }, "/ready (should succeed)");

        // Test "/sso/google"
        response = await fluid.tests.googleSso.sendAuthRequest(pdServerUrl, "/sso/google");
        fluid.tests.googleSso.testResponse(response, 200, {}, "/sso/google");

        // Test successful GoogleSso.fetchAccessToken() with mock /token endpoint
        response = await fluid.tests.googleSso.fetchAccessToken(googleSso, authPayload.code, dbRequest, googleSso.options, 200);
        fluid.tests.googleSso.testResponse(response, 200, fluid.tests.googleSso.mockAccessToken, "googleSso.fetchAccessToken(/token)");

        // Test failure of GoogleSso.fetchAccessToken()
        response = await fluid.tests.googleSso.fetchAccessToken(googleSso, authPayload.code, dbRequest, googleSso.options, 400);
        fluid.tests.googleSso.testResponse(response, 400, fluid.tests.googleSso.mockErrorResponse, "googleSso.fetchAccessToken(/token)");

        // Test successful GoogleSso.fetchUserInfo() with mock /userInfo endpoint
        response = await fluid.tests.googleSso.fetchUserInfo(googleSso, fluid.tests.googleSso.mockAccessToken, googleSso.options, 200);
        fluid.tests.googleSso.testResponse(response, 200, fluid.tests.googleSso.mockUserInfo, "googleSso.fetchUserInfo(/userInfo)");

        // Test failure GoogleSso.fetchUserInfo() with mock /userInfo endpoint
        response = await fluid.tests.googleSso.fetchUserInfo(googleSso, fluid.tests.googleSso.mockAccessToken, googleSso.options, 400);
        fluid.tests.googleSso.testResponse(response, 400, fluid.tests.googleSso.mockErrorResponse, "googleSso.fetchUserInfo(/userInfo)");

        // Test googleSso.storeUserAndAccessToken()
        response = await fluid.tests.googleSso.storeUserAndAccessToken(googleSso, dbRequest, fluid.tests.googleSso.mockUserInfo, fluid.tests.googleSso.mockAccessToken);
        fluid.tests.googleSso.testStoreUserAndAccessToken(response, "googleSso.storeUserAndAccessToken()", googleSso.options);

        // Test failure of "/sso/google/login/callback" -- missing authorization code parameter
        response = await fluid.tests.sendRequest(pdServerUrl, "/sso/google/login/callback");
        fluid.tests.googleSso.testResponse(response, 403, {"isError": true, "message": "Request missing authorization code"}, "/sso/google/login/callback");

        // Delete the test user -- this will cascade and delete the associated SsoAccount and AccessToken.
        response = await fluid.tests.personalData.deleteTestUser(fluid.tests.googleSso.mockUserInfo.id, dbRequest);
        jqUnit.assertNotNull(`Checking deletion of mock user ${fluid.tests.googleSso.mockUserInfo.id}`, response);

        // Stop the server
        await fluid.personalData.stopServer(serverInstance, pdServerUrl);

        // Stop the docker container for the database
        await fluid.personalData.dockerStopDatabase(fluid.tests.personalData.postgresContainer, dbStatus, dbRequest);
    } catch (error) {
        jqUnit.fail("Google SSO tests fails with this error: ", error);
    }
});

fluid.tests.googleSso.testResponse = function (response, expectedStatus, expected, endPoint) {
    jqUnit.assertEquals("Check '" + endPoint + "' response status", expectedStatus, response.status);
    jqUnit.assertDeepEq("Check '" + endPoint + "' result", expected, response.data);
};

fluid.tests.googleSso.testStoreUserAndAccessToken = function (accountInfo, testPoint, ssoOptions) {
    const checkPrefix = `Check '${testPoint}'`;
    jqUnit.assertNotNull(`${checkPrefix} non-null result`, accountInfo);

    // Spot check parts of the User record that can be tested
    const mockUserInfo = fluid.tests.googleSso.mockUserInfo;
    jqUnit.assertNotNull(`${checkPrefix} non-null User`, accountInfo.user);
    jqUnit.assertEquals(`${checkPrefix} User id`, mockUserInfo.id, accountInfo.user.userId);
    jqUnit.assertEquals(`${checkPrefix} User name`, mockUserInfo.name, accountInfo.user.name);
    jqUnit.assertEquals(`${checkPrefix} User email`, mockUserInfo.email, accountInfo.user.email);
    jqUnit.assertEquals(`${checkPrefix} User username`, mockUserInfo.email, accountInfo.user.username);
    jqUnit.assertDeepEq(`${checkPrefix} User roles`, ["user"], accountInfo.user.roles);
    jqUnit.assertEquals(`${checkPrefix} User verified`, true, accountInfo.user.verified);

    // Spot check aspect of the AppSsoProvider record
    jqUnit.assertNotNull(`${checkPrefix} non-null AppSsoProvider`, accountInfo.appSsoProvider);
    jqUnit.assertEquals(`${checkPrefix} AppSsoProvider provider`, ssoOptions.provider, accountInfo.appSsoProvider.provider);

    // Similarly, the SsoAccount record
    jqUnit.assertNotNull(`${checkPrefix} non-null SsoAccount`, accountInfo.ssoAccount);
    jqUnit.assertEquals(`${checkPrefix} SsoAccount user`, mockUserInfo.id, accountInfo.ssoAccount.user);
    jqUnit.assertDeepEq(`${checkPrefix} SsoAccount userInfo`, fluid.tests.googleSso.mockUserInfo, accountInfo.ssoAccount.userInfo);

    // Similarly spot check aspects of the AccessToken record
    jqUnit.assertNotNull(`${checkPrefix} non-null AccessToken`, accountInfo.accessToken);
    jqUnit.assertEquals(`${checkPrefix} AccessToken accessToken`, fluid.tests.googleSso.mockAccessToken.access_token, accountInfo.accessToken.accessToken);
    jqUnit.assertEquals(`${checkPrefix} AccessToken refreshToken`, fluid.tests.googleSso.mockAccessToken.refresh_token, accountInfo.accessToken.refreshToken);
    jqUnit.assertNotNull(`${checkPrefix} AccessToken expiresAt`, accountInfo.accessToken.expiresAt);
    jqUnit.assertNotNull(`${checkPrefix} AccessToken loginToken`, accountInfo.accessToken.loginToken);
};

fluid.tests.googleSso.sendAuthRequest = async function (pdServerUrl, endpoint) {
    // Mock Google's OAuth2 endpoint.  The request payload is stored in `authPayload` for subsequent tests.
    nock("https://accounts.google.com")
        .get("/o/oauth2/auth")
        .query(function (payload) {
            authPayload = payload;
            return true;
        })
        .reply(200, {});

    console.debug("- Sending '%s'", endpoint);
    try {
        return await axios.get(pdServerUrl + endpoint);
    } catch (e) {
        return e.response;
    }
};

fluid.tests.googleSso.fetchAccessToken = function (googleSso, code, dbRequest, options, responseStatus) {
    var mockResponse;
    switch (responseStatus) {
    case 200:
        mockResponse = {
            status: responseStatus,
            body: fluid.tests.googleSso.mockAccessToken
        };
        break;
    case 400:
        mockResponse = {
            status: 400,
            body: fluid.tests.googleSso.mockErrorResponse
        };
    }
    const accessTokenURL = new url.URL(options.accessTokenUri);
    nock(accessTokenURL.origin)
        .post(accessTokenURL.pathname)
        .reply(mockResponse.status, mockResponse.body);

    console.debug("- Calling googleSso.fetchAccessToken(/token)");
    return googleSso.fetchAccessToken(code, dbRequest, options);
};

fluid.tests.googleSso.fetchUserInfo = function (googleSso, accessToken, options, responseStatus) {
    var mockResponse;
    switch (responseStatus) {
    case 200:
        mockResponse = {
            status: responseStatus,
            body: fluid.tests.googleSso.mockUserInfo
        };
        break;
    case 400:
        mockResponse = {
            status: 400,
            body: fluid.tests.googleSso.mockErrorResponse
        };
    }
    const userInfoURL = new url.URL(options.userInfoUri);
    nock(userInfoURL.origin)
        .get(userInfoURL.pathname)
        .query(true)
        .reply(mockResponse.status, mockResponse.body);

    console.debug("- Calling googleSso.fetchUserInfo(/userInfo)");
    return googleSso.fetchUserInfo(accessToken, options);
};

fluid.tests.googleSso.storeUserAndAccessToken = async function (googleSso, dbRequest, userInfo, accessToken) {
    try {
        console.debug("- Calling googleSso.storeUserAndAccessToken()");
        return await googleSso.storeUserAndAccessToken(
            userInfo, accessToken, dbRequest, googleSso.options
        );
    }
    catch (error) {
        console.debug(error.message);
    }
};

fluid.tests.personalData.deleteTestUser = async function (userId, dbRequest) {
    console.debug(`- Deleting user with id '${userId}'`);
    const deleteResult = await dbRequest.runSql(`DELETE FROM "User" WHERE "userId"='${userId}' RETURNING *`);
    return deleteResult;
};
