/*
 * Copyright 2021 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */

"use strict";

const fluid = require("infusion");

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
