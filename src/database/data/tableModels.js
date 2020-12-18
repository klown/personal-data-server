/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 *
 * You may obtain a copy of the License at
 * https://github.com/fluid-project/preferencesServer/blob/main/LICENSE
 */
"use strict"

var fluid = require("infusion"),
    DataTypes = require("sequelize");   // Postgres data types

require("../src/js/dataBaseConstants.js");

fluid.each(
    // Array of table/model definitions, based on the data models documentation:
    // https://github.com/fluid-project/preferencesServer/blob/main/doc/dataModel.md
    [{
        modelName: fluid.postgresdb.tableNames.users,
        fields: {
            "id": { "type": DataTypes.STRING(64), "allowNull": false, "primaryKey": true },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.user
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.user
            },
            "name": { "type": DataTypes.STRING(64), "allowNull": false },
            "username": { "type": DataTypes.STRING(64), "allowNull": false },
            "derived_key": { "type": DataTypes.STRING, "allowNull": false },
            "verification_code": { "type": DataTypes.STRING, "allowNull": false },
            "salt": { "type": DataTypes.STRING, "allowNull": false },
            "iterations": { "type": DataTypes.INTEGER, "allowNull": false },
            "email": { "type": DataTypes.STRING(32), "allowNull": false },
            "roles": { "type": DataTypes.ARRAY(DataTypes.STRING(16)), "allowNull": false },
            "verified": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false }
        }
    }, {
        modelName: fluid.postgresdb.tableNames.prefsSafes,
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.prefsSafe
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.prefsSafe
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeType": { "type": DataTypes.ENUM("snapset", "user"), "allowNull": false },
            "name": { "type": DataTypes.STRING(64), "defaultValue": null },
            "password": { "type": DataTypes.STRING(64), "defaultValue": null },
            "email": { "type": DataTypes.STRING(32), "defaultValue": null },
            "preferences": { "type": DataTypes.JSONB, "allowNull": false, "defaultValue": {} }
        }
    }, {
        modelName: fluid.postgresdb.tableNames.clientCredentials,
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.clientCredential
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.clientCredential
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "clientId": { "type": DataTypes.STRING(36), "allowNull": false },
            "oauth2ClientId": { "type": DataTypes.STRING(64), "allowNull": false },
            "oauth2ClientSecret": { "type": DataTypes.STRING(64), "allowNull": false },
            "revoked": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false },
            "revokedReason": { "type": DataTypes.STRING },
            "timestampRevoked": { "type": DataTypes.DATE },

            // TODO: These next four are in the Data Model documentation's
            // graphic, but are not described in the table following the
            // graphic.  Also, it is undecided whether these are needed going
            // forward.  Keeping them here until there is a final decsision.
            // https://github.com/fluid-project/preferencesServer/blob/main/doc/dataModel.md#future-data-model
            "allowedIPBlocks": { "type": DataTypes.ARRAY(DataTypes.STRING(64)) },
            "allowedPrefsToWrite": { "type": DataTypes.ARRAY(DataTypes.STRING(64)) },
            "isCreatePrefsSafesKeyAllowed": { "type": DataTypes.BOOLEAN },
            "isCreatePrefsSafeAllowed": { "type": DataTypes.BOOLEAN }
        }
    }, {
        modelName: fluid.postgresdb.tableNames.appInstallationClients,
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.appInstallationClient
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.appInstallationClient
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "name": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64) },
            "computerType": { "type": DataTypes.ENUM("public", "private", "shared by trusted parties"), "allowNull": false }
        }
    }, {
        modelName: fluid.postgresdb.tableNames.appInstallationAuthorizations,
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.appInstallationAuthorization
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.appInstallationAuthorization
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "clientId": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64) },
            "clientCredentialId": { "type": DataTypes.STRING(36), "allowNull": false },
            "accessToken": { "type": DataTypes.STRING(64), "allowNull": false },
            "revoked": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false },
            "revokedReason": { "type": DataTypes.STRING },
            "timestampRevoked": { "type": DataTypes.DATE },
            "timestampExpires": { "type": DataTypes.DATE, "allowNull": false }
        }
    }, {
        modelName: fluid.postgresdb.tableNames.cloudSafeCredentials,
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.cloudSafeCredentials
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.cloudSafeCredentials
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeId": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64), "allowNull": false }
        }
    }, {
        modelName: fluid.postgresdb.tableNames.prefsSafesKeys,  // based on "GPII Keys"
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.prefsSafesKey
                },
                "type": DataTypes.STRING(32),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.prefsSafesKey
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeId": { "type": DataTypes.STRING(36) },
            "prefsSetId": { "type": DataTypes.STRING(36) },
            "revoked": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false },
            "revokedReason": { "type": DataTypes.STRING },
            "timestampRevoked": { "type": DataTypes.DATE }
        }
    }],
    // For each model definition (above), export a function that defines the
    // the sequelize table model.
    function (aModelDef) {
        module.exports[aModelDef.modelName+"TableModel"] = function (sequelize) {
            var tableModel = {};
            tableModel.modelName = aModelDef.modelName;
            // Freezing the name inhibits pluralizing in the database.
            tableModel.model = sequelize.define(
                aModelDef.modelName, aModelDef.fields, {freezeTableName: true}
            );
            return tableModel;
        };
    }
);
