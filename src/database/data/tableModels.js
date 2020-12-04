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

fluid.each(
    // Array of table/model definitions
    [{
        modelName: "users",
        fields: {
            "id": { "type": DataTypes.STRING(64), "allowNull": false, "primaryKey": true },
            "type": {
                "validate": {
                    "equals": "user"
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": "user"
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
                    "equals": "prefsSafe"
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": "prefsSafe"
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
                    "equals": "clientCredentials"
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": "clientCredentials"
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "clientId": { "type": DataTypes.STRING(36), "allowNull": false },
            "oath2ClientId": { "type": DataTypes.STRING(64), "allowNull": false },
            "oath2ClientSecret": { "type": DataTypes.STRING(64), "allowNull": false },
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
                    "equals": "appInstallationClient"
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": "appInstallationClient"
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
                    "equals": "appInstallationAuthorizations"
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": "appInstallationAuthorizations"
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
                    "equals": "cloudSafeCredentials"
                },
                "type": DataTypes.STRING(16),
                "allowNull": false,
                "defaultValue": "cloudSafeCredentials"
            },
            "schemaVersion": { "type": DataTypes.STRING(36), "allowNull": false },
            "prefsSafeId": { "type": DataTypes.STRING(36), "allowNull": false },
            "userId": { "type": DataTypes.STRING(64), "allowNull": false }
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
