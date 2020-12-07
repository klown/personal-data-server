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
        modelName: "rgb",
        fields: {
            "id": { "type": DataTypes.STRING(36), "primaryKey": true },
            "color": { "type": DataTypes.STRING(36) },
            "colourMap": { "type": DataTypes.JSONB }
        }
    },
    {
        modelName: "roster.preferenceset",
        "fields": {
            "name": { "type": DataTypes.STRING(64), "primaryKey": true },
            "description": { "type": DataTypes.STRING(64) },
            "prefs_json": { "type": DataTypes.JSONB }
        }
    },
    {
        modelName: "massive",
        fields: {
            "text": { "type": DataTypes.TEXT }
        }
    },
    {
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
    },
    {
        modelName: "nodata",
        fields: {}
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
