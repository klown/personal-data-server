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
