/*
 * Copyright 2021-2022 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Test code for getting all the users out the database and displaying them
 * as a definition list (html).
 *
 * TODO: move this to a testing folder.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/personal-data-server/blob/main/LICENSE
 */

"use strict";

const express = require("express");
const router = express.Router();
const ssoDbOps = require("../ssoDbOps.js");

/* GET users listing. */
router.get("/", function (req, res) {
    const pageHtml = "<html><head><title>Users:</title></head><body><h1>Users:</h1>";
    appendUserList(pageHtml).then((thePage) => {
        thePage += "</body></html>";
        res.send(thePage);
    });
});

// Append a <dl> and set of <dt>/<dd> definition list items of users and their
// emails to the given markup.
async function appendUserList(content) {
    const dbUsers = await getUsers();
    content += "<dl>\n";
    if (dbUsers.rowCount === 0) {
        content += "<dt>No users</dt>\n";
    } else {
        dbUsers.rows.forEach(function (aUser) {
            content += "<dt>" + aUser.name + "</dt>\n";
            content += "<dd>" + aUser.email + "</dt>\n";
        });
    }
    content += "</dl>\n";
    return content;
};

async function getUsers() {
    const users = await ssoDbOps.runSql("SELECT * FROM \"User\";");
    console.log("Database users count: ", users.rowCount);
    return users;
};

module.exports = router;
