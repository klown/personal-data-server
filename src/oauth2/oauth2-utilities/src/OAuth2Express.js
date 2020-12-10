/*!
Copyright 2014-2020 OCAD university

Licensed under the New BSD license. You may not use this file except in
compliance with this License.

The research leading to these results has received funding from the European Union's
Seventh Framework Programme (FP7/2007-2013) under grant agreement no. 289016.

You may obtain a copy of the License at
https://github.com/fluid-project/preferencesServer/blob/main/LICENSE.txt
*/
"use strict";

var express = require("express");

var fluid = require("infusion");

fluid.registerNamespace("fluid.oauth2");

fluid.oauth2.createExpressApp = function () {
    return express();
};

fluid.oauth2.expressStatic = function (root) {
    return express["static"](root);
};
