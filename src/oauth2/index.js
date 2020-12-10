"use strict";

var fluid = require("infusion");

fluid.module.register("fluid-oauth2", __dirname, require);

require("../database/src/js/postGresOperations.js");
require("./oauth2-utilities");
require("./oauth2-authz-server");
