/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Handles endpoints:
 * /sso/
 * /sso/google - trigger SSO for Google OAuth2 provider
 * /sso/google/login/callback - handle OAuth2 callback from Google
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */

"use strict";

/**
 * Create a unpredicatable random string of the given length.  This can be used
 * to create nonce and other such tokens.
 * @param {Integer} length - The length of the state string.
 * @return {String} a random set of characters.
 */
function generateRandomToken(length) {
    var token = "";
    const charset = "ABCDEFGHIJKLMMOPQRSTUVWXYZabcdefghijklmmopqrstuvwxyz01234567890_.-";
    for (var i = 0; i < length; i++) {
        token += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return token;
};

module.exports = generateRandomToken;
