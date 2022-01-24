/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

require("json5/lib/register");

const fluid = require("infusion");

fluid.registerNamespace("fluid.tests.dbOps.testTableData");

fluid.tests.dbOps.testTableData = {
    users:                  require("./users.json"),
    rgb:                    require("./rgb.json"),
    "roster.preferenceset": require("./PrefsSets"),
    massive:                require("./massive.json")
};
