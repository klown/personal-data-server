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

"use strict";

const crypto = require("crypto");

/**
 * Create a unpredicatable random string of the given length.  This can be used
 * to create nonce and other such tokens.
 * @param {Integer} length - The length of the state string.
 * @return {String} a random set of characters.
 */
function generateRandomToken(length) {
    return crypto.randomBytes(length).toString("base64");
};

module.exports = generateRandomToken;
