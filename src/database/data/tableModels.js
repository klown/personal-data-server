/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
"use strict"

var fluid = require("infusion");
var DataTypes = require("sequelize");   // Postgres data types

fluid.require("%preferencesServer/src/database/src/js/databaseConstants.js");

fluid.each(
    // Array of table/model definitions, based on the data models documentation:
    // https://github.com/fluid-project/preferencesServer/blob/main/doc/dataModel.md
    [{
        modelName: "users",
        fields: {
            "id": { "type": DataTypes.STRING(64), "allowNull": false, "primaryKey": true },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.user
                },
                "type": DataTypes.STRING(16),
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
        modelName: "prefs_safes",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.prefsSafe
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.prefsSafe
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeType": { "type": DataTypes.ENUM("snapset", "user"), "allowNull": false },
            "name": { "type": DataTypes.STRING(64), "defaultValue": null },
            "email": { "type": DataTypes.STRING(32), "defaultValue": null },
            "preferences": { "type": DataTypes.JSONB, "allowNull": false, "defaultValue": {} }
        }
    }, {
        modelName: "client_credentials",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.clientCredentials
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.clientCredentials
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "clientId": { "type": DataTypes.STRING(36), "allowNull": false },
            "oath2ClientId": { "type": DataTypes.STRING(64), "allowNull": false },
            "oath2ClientSecret": { "type": DataTypes.STRING(64), "allowNull": false },
            "allowedIPBlocks": { "type": DataTypes.ARRAY(DataTypes.STRING(64) },       // ? in models doc's graphic, but not in description table
            "allowedPrefsToWrite": { "type": DataTypes.ARRAY(DataTypes.STRING(64) },   // ? in models doc's graphic, but not in description table
            "isCreatePrefsSafesKeyAllowed": { "type": DataTypes.BOOLEAN },             // ? in models doc's graphic, but not in description table
            "isCreatePrefsSafeAllowed": { "type": DataTypes.BOOLEAN },                 // ? in models doc's graphic, but not in description table
            "revoked": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false },
            "revokedReason": { "type": DataTypes.STRING },
            "timeStampRevoked": { "type": DataTypes.DATE }
        }
    }, {
        modelName: "app_installation_clients",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.appInstallationClient
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.appInstallationClient
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "name": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64) },
            "computerType": { "type": DataTypes.ENUM("public", "private", "shared by trusted parties"), "allowNull": false }
        }
    }, {
        modelName: "app_installation_authorizations",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.appInstallationAuthorizations
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.appInstallationAuthorizations
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "clientId": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64) },
            "clientCredentialId": { "type": DataTypes.STRING(36), "allowNull": false },
            "revoked": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false },
            "revokedReason": { "type": DataTypes.STRING },
            "timeStampRevoked": { "type": DataTypes.DATE },
            "timeStampExpires": { "type": DataTypes.DATE, "allowNull": false }
        }
    }, {
        modelName: "cloud_safe_credentials",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.cloudSafeCredentials
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.cloudSafeCredentials
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeId": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64), "allowNull": false }
        }
    }, {
        modelName: "prefs_safes_key",  // based on old "GPII Keys"
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true, "allowNull": false },
            "type": {
                "validate": {
                    "equals": fluid.postgresdb.dataModelTypes.cloudSafeCredentials.prefsSafeKey
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": fluid.postgresdb.dataModelTypes.cloudSafeCredentials.prefsSafeKey
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeId": { "type": DataTypes.STRING(36) },
            "prefsSetId": { "type": DataTypes.STRING(36) },
            "revoked": { "type": DataTypes.BOOLEAN, "allowNull": false, "defaultValue": false },
            "revokedReason": { "type": DataTypes.STRING },
            "timeStampRevoked": { "type": DataTypes.DATE }
        }
    }],
    // For each model definition (above), export a function that defines the
    // sequelize table model.
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
