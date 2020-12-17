/* eslint-env node */
"use strict";

var fluid = require("infusion");

fluid.registerNamespace("fluid.tests.dataModel.testTableData");

fluid.tests.dataModel.testTableData = {
    users:                          require("./users.json"),
    prefsSafes:                     require("./prefsSafes.json"),
    cloudSafeCredentials:           require("./cloudSafeCredentials.json"),
    clientCredentials:              require("./clientCredentials.json"),
    appInstallationAuthorizations:  require("./appInstallationAuthorizations.json"),
    appInstallationClients:         require("./appInstallationClients.json"),
    prefsSafesKeys:                 require("./prefsSafesKeys.json")
};
