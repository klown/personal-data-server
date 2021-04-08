/*!
Database Utilities

Copyright 2017-2021 OCAD university

Copied from "GPII Database Utilties":
    gpii-universal/gpii/node_modules/gpii-db-operation/src/DbUtils.js

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

You may obtain a copy of the License at
    https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
*/

"use strict";

var fluid = fluid || require("infusion");

fluid.registerNamespace("fluid.postgresdb");

/** Use `fluid.stringTemplate` method to replace terms within error.message with actual values.
 * @param {Object} error - An object that contains an element keyed by "message".
 * @param {Object} termMap - An object that contains the mapping between terms used within error.message and their actual values.
 * @return {Object} The input object "error" with terms in error.message being replaced by actual values.
 */
fluid.postgresdb.composeError = function (error, termMap) {
    var err = fluid.copy(error);
    err.message = fluid.stringTemplate(err.message, termMap);
    return err;
};

/**
 * Returns the current time in a human readable string that also naturally sort in chronological order.
 * See http://www.ecma-international.org/ecma-262/5.1/#sec-15.9.5.43
 * @return {String} The current time in ISO string format.
 */
fluid.postgresdb.getCurrentTimestamp = function () {
    return new Date().toISOString();
};
