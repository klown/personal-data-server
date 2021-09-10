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
    fetch = require("node-fetch"),
    nock = require("nock"),
    url = require("url"),
    jqUnit = require("node-jqunit");

require("./testUtils.js");

fluid.logObjectRenderChars = 4096;

jqUnit.module("Personal Data Server Google SSO tests.");

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

fluid.defaults("fluid.tests.googleSso.environment", {
    gradeNames: ["fluid.test.testEnvironment"],
    components: {
        testCaseHolder: {
            type: "fluid.tests.googleSso.testCaseHolder"
        }
    }
});

fluid.defaults("fluid.tests.googleSso.testCaseHolder", {
    gradeNames: ["fluid.test.testCaseHolder"],
    googleSso: require("../routes/ssoProviders/googleSso.js"),
    dbRequest: require("../dataBase.js"),
    pdServerUrl: fluid.tests.personalData.serverUrl,
    pdServerStartCmd: "node src/personalData/bin/www",
    members: {
        // These are assigned during the test sequence
        pdServerProcess: null,   // { status, process, wasRunning }
        databaseStatus: null,    // { wasPaused, pgReady }
        authPayload: null,
        accountInfo: null
    },
    modules: [{
        name: "Google SSO tests",
        tests: [{
            name: "Google SSO end points",
            sequence: [{
                funcName: "fluid.tests.personalData.initEnvironmentVariables"
            }, {
                // Start the database
                task: "fluid.tests.personalData.dockerStartDatabase",
                args: [fluid.tests.personalData.postgresContainer, fluid.tests.personalData.postgresImage],
                resolve: "fluid.tests.googleSso.testDatabaseStarted",
                resolveArgs: ["{that}", true, "{arguments}.0"]  // database status
            }, {
                // Start server
                task: "fluid.tests.personalData.startServer",
                args: ["{that}.options.pdServerStartCmd", "{that}.options.pdServerUrl"],
                resolve: "fluid.tests.googleSso.testProcessStarted",
                resolveArgs: ["{arguments}.0", "{that}"]        // ChildProcess
            }, {
                // Test "/ready".
                task: "fluid.tests.googleSso.sendRequest",
                args: ["{that}.options.pdServerUrl", "/ready"],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: ["{arguments}.0", 200, { isReady: true }, "/ready (should succeed)"]
            }, {
                // Test "/sso/google".
                task: "fluid.tests.googleSso.sendAuthRequest",
                args: ["{that}", "/sso/google"],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: ["{arguments}.0", 200, {}, "/sso/google"]
            }, {
                // Test successful GoogleSso.fetchAccessToken() with mock /token endpoint
                task: "fluid.tests.googleSso.fetchAccessToken",
                args: [
                    "{that}.options.googleSso",
                    "{that}.authPayload.code",
                    "{that}.options.dbRequest",
                    "{that}.options.googleSso.options",
                    200
                ],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: ["{arguments}.0", 200, fluid.tests.googleSso.mockAccessToken, "googleSso.fetchAccessToken(/token)"]
            }, {
                // Test failure of GoogleSso.fetchAccessToken()
                task: "fluid.tests.googleSso.fetchAccessToken",
                args: [
                    "{that}.options.googleSso",
                    "{that}.authPayload.code",
                    "{that}.options.dbRequest",
                    "{that}.options.googleSso.options",
                    400
                ],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: ["{arguments}.0", 400, fluid.tests.googleSso.mockErrorResponse, "googleSso.fetchAccessToken(/token)"]
            }, {
                // Test successful GoogleSso.fetchUserInfo() with mock /userInfo endpoint
                task: "fluid.tests.googleSso.fetchUserInfo",
                args: [
                    "{that}.options.googleSso",
                    fluid.tests.googleSso.mockAccessToken,
                    "{that}.options.googleSso.options",
                    200
                ],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: ["{arguments}.0", 200, fluid.tests.googleSso.mockUserInfo, "googleSso.fetchUserInfo(/userInfo)"]
            }, {
                // Test failure GoogleSso.fetchUserInfo() with mock /userInfo endpoint
                task: "fluid.tests.googleSso.fetchUserInfo",
                args: [
                    "{that}.options.googleSso",
                    fluid.tests.googleSso.mockAccessToken,
                    "{that}.options.googleSso.options",
                    400
                ],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: ["{arguments}.0", 400, fluid.tests.googleSso.mockErrorResponse, "googleSso.fetchUserInfo(/userInfo)"]
            }, {
                task: "fluid.tests.googleSso.storeUserAndAccessToken",
                args: ["{that}", fluid.tests.googleSso.mockUserInfo, fluid.tests.googleSso.mockAccessToken],
                resolve: "fluid.tests.googleSso.testStoreUserAndAccessToken",
                resolveArgs: ["{that}.accountInfo", "googleSso.storeUserAndAccessToken()", "{that}.options.googleSso.options"]
            }, {
                // Test failure of "/sso/google/login/callback" -- missing authorization code parameter.
                task: "fluid.tests.googleSso.sendRequest",
                args: ["{that}.options.pdServerUrl", "/sso/google/login/callback"],
                resolve: "fluid.tests.googleSso.testResponse",
                resolveArgs: [
                    "{arguments}.0",    // Response
                    403,
                    {"isError": true, "message": "Request missing authorization code"},
                    "/sso/google/login/callback"
                ]
            }, {
                // Delete the test user -- this will cascade and delete the
                // associated SsoAccount and AccessToken.
                task: "fluid.tests.personalData.deleteTestUser",
                args: [fluid.tests.googleSso.mockUserInfo.id, "{that}.options.dbRequest"],
                resolve: "fluid.tests.personalData.testDeleteTestUser",
                resolveArgs: ["{arguments}.0", fluid.tests.googleSso.mockUserInfo.id]
            }, {
                funcName: "fluid.tests.personalData.stopServer",
                args: ["{that}.pdServerProcess", "{that}.options.pdServerUrl"]
            }, {
                funcName: "fluid.tests.personalData.dockerStopDatabase",
                args: [
                    fluid.tests.personalData.postgresContainer,
                    "{that}.options.dbRequest",
                    "{that}.databaseStatus.wasPaused"
                ]
            }]
        }]
    }]
});

fluid.tests.googleSso.testProcessStarted = function (result, testCase) {
    console.debug("- Checking process started, ", testCase.options.pdServerStartCmd);
    testCase.pdServerProcess = result;
    jqUnit.assertEquals("Check server active", 200, testCase.pdServerProcess.status);
};

fluid.tests.googleSso.testDatabaseStarted = function (testCase, expected, actual) {
    testCase.databaseStatus = actual;
    jqUnit.assertEquals("Check that database started", expected, actual.pgReady);
};

fluid.tests.googleSso.testResponse = async function (res, expectedStatus, expected, endPoint) {
    jqUnit.assertEquals("Check '" + endPoint + "' response status", expectedStatus, res.status);
    jqUnit.assertNotNull("Check '" + endPoint + "' non-null response", res);

    const value = await res.json();
    fluid.tests.googleSso.testResult(value, expected, endPoint);
};

fluid.tests.googleSso.testResult = function (result, expected, testPoint) {
    jqUnit.assertNotNull("Check '" + testPoint + "' non-null result", result);
    jqUnit.assertDeepEq("Check '" + testPoint + "' result", expected, result);
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

fluid.tests.personalData.testDeleteTestUser = function (deleteResponse, userId) {
    jqUnit.assertNotNull(`Checking deletion of mock user ${userId}`, deleteResponse);
};

fluid.tests.googleSso.sendRequest = function (url, endpoint) {
    console.debug("- Sending '%s' request", endpoint);
    return fetch(url + endpoint);
};

fluid.tests.googleSso.sendAuthRequest = function (testCase, endpoint) {
    // Mock Google's OAuth2 endpoint.  The request payload is stored in
    // `testCase.authPayload` for subsequent tests.
    nock("https://accounts.google.com")
        .get("/o/oauth2/auth")
        .query(function (payload) {
            testCase.authPayload = payload;
            return true;
        })
        .reply(200, {});

    console.debug("- Sending '%s'", endpoint);
    return fetch(testCase.options.pdServerUrl + endpoint);
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
        .query(true) //.query((payload) => { return true; })
        .reply(mockResponse.status, mockResponse.body);

    console.debug("- Calling googleSso.fetchUserInfo(/userInfo)");
    return googleSso.fetchUserInfo(accessToken, options);
};

fluid.tests.googleSso.storeUserAndAccessToken = async function (testCase, userInfo, accessToken) {
    try {
        console.debug("- Calling googleSso.storeUserAndAccessToken()");
        testCase.accountInfo = await testCase.options.googleSso.storeUserAndAccessToken(
            userInfo, accessToken, testCase.options.dbRequest, testCase.options.googleSso.options
        );
    }
    catch (error) {
        console.debug (error.message);
    }
    return testCase.accountInfo;
};

fluid.tests.personalData.deleteTestUser = async function (userId, dbRequest) {
    console.debug(`- Deleting user with id '${userId}'`);
    const deleteResult = await dbRequest.runSql(`DELETE FROM "User" WHERE "userId"='${userId}' RETURNING *`);
    return deleteResult;
};

fluid.test.runTests("fluid.tests.googleSso.environment");
