"use strict";
require("json5/lib/register");

var fluid = require("infusion");

fluid.registerNamespace("fluid.tests.postgresdb.testTableData");

fluid.tests.postgresdb.testTableData = {
    users:                  require("./users.json"),
    rgb:                    require("./rgb.json"),
    "roster.preferenceset": require("./PrefsSets"),
    massive:                require("./massive.json")
};
