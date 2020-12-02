/*
 * Copyright 2020 Inclusive Design Research Centre, OCAD University
 * All rights reserved.
 *
 * Licensed under the New BSD license. You may not use this file except in
 * compliance with this License.
 */
"use strict";

var fluid = require("infusion"),
    Sequelize = require("sequelize");

fluid.registerNamespace("fluid.postgresdb");

fluid.defaults("fluid.postgresdb.request", {
    gradeNames: ["fluid.component"],
    databaseName:   "fluid_prefsdb",
    host:           "localhost",
    port:           5432,
    user:           "admin",
    password:       "asecretpassword",
    members: {
        // Reference to a sequelize instance that will handle the Postgres
        // requests, initialized onCreate.  Note that the database can be
        // non-existent when the sequelize member is initialized, but the
        // database must be up before it is used to make a request.
        sequelize:  null
    },
    listeners: {
        "onCreate": {
            funcName: "fluid.postgresdb.initConnection",
            arguments: ["{that}"]
        }
    }
});

/**
 * Initiallize connection to the postgresdb, using Sequelize.
 *
 * @param {Object} that - Contains the options for the connection and a member
 *                        to hold a reference to the connection.
 * @param {String} that.options.databaseName - Name of the database.
 * @param {String} that.options.user - Name of the user with admin access.
 * @param {String} that.options.password - User's password.
 * @param {String} that.options.dialect - The dialect for SQL requests,
 *                                        e.g. "postgres".
 * @param {Number} that.options.port - The port number for the connection.
 * @param {Object} that.sequelize - Object set herein to use for requests.
 *
 */
fluid.postgresdb.initConnection = function (that) {
    that.sequelize = new Sequelize(
        that.options.databaseName, that.options.user, that.options.password, {
            dialect: "postgres",
            host: that.options.host,
            port: that.options.port
        }
    );
};

fluid.defaults("fluid.postgresdb.operations", {
    gradeNames: ["fluid.component"],
    members: {
        tables: {},
        modelDefinitions: null
    },
    invokers: {
        createTables: {
            funcName: "fluid.postgresdb.operations.createTables",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // models        // delete existing table?
        },
        createOneTable: {
            funcName: "fluid.postgresdb.operations.createOneTable",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // model         // delete existing table
        },
        loadOneTable: {
            funcName: "fluid.postgresdb.operations.loadOneTable",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // table data
        },
        loadTables: {
            funcName: "fluid.postgresdb.operations.loadTables",
            args: ["{that}", "{arguments}.0"]
                             // table names and data
        },
        deleteTableData: {
            funcName: "fluid.postgresdb.operations.deleteTableData",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // hard delete?
        },
        selectRows: {
            funcName: "fluid.postgresdb.operations.selectRows",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // row contraints
        }, 
        retrieveValue: {
            funcName: "fluid.postgresdb.operations.retrieveValue",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // constraints
        },
        insertRecord: {      
            funcName: "fluid.postgresdb.operations.insertRecord",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // record
        },
        updateFields: {
            funcName: "fluid.postgresdb.operations.updateFields",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // changes
        },
        deleteRecord: {
            funcName: "fluid.postgresdb.operations.deleteRecord",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
                             // table name    // identifier (primary key)
        },
        loadTableModels: {
            funcName: "fluid.postgresdb.operations.loadTableModels",
            args: ["{that}", "{arguments}.0"]
                             // path to table model definitions
        }
    },
    components: {
        request: {
            type: "fluid.postgresdb.request"
        }
    }
});

/**
 * Loop to create or connect to the database tables.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.request - An instance of fluid.postgresdb.request
 * @param {Object} that.tables - List of references the created tables.
 * @param {Object} tableDefs - A list of table definitions.
 * @param {Boolean} deleteExisting - Optional flag to desroy an existing table
 *                                   before creating the new one.
 * @return {Promise} Final Promise of the sequence that created the tables.
 */
fluid.postgresdb.operations.createTables = function (that, tableDefs, deleteExisting) {
    var creationSequence = [];
    fluid.each(tableDefs, function (aTableDef) {
        creationSequence.push(that.createOneTable(aTableDef, deleteExisting));
    });
    return fluid.promise.sequence(creationSequence);
};

/**
 * Create a table in the database or initialize a connection with an existing
 * table.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The resulting table is added to this list. 
 * @param {Object} that.request - An instance of fluid.postgresdb.operations.request
 * @param {Object} tableDef - The table definition.
 * @param {Object} tableDef.options - Table columns.
 * @param {Boolean} deleteExisting - Optional flag to destroy an existing table
 *                                   before creating the new one.
 * @return {Promise} Promise whose value is the created table.  A resolve
 *                   handler adds the table to that.tables.  A reject handler
 *                   logs a message.
 */
fluid.postgresdb.operations.createOneTable = function (that, tableDef, deleteExisting) {
    var theTable = tableDef(that.request.sequelize);

    // Force the destruction (drop) of any existing table before (re)creating
    // it.
    var createPromise = theTable.model.sync({force: deleteExisting});
    createPromise.then(
        function (createdTable) {
            that.tables[createdTable.name] = createdTable;
        },
        function (error) {
            fluid.log("Failed to create table '", theTable.name, "' ", error);        
        }
    );
    return createPromise;
};

/*
 * Bulk load records into the given tables.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableData - List of name/value pairs for the tables.
 * @return {Promise} Final Promise of the sequence that loaded the tables.
 */
fluid.postgresdb.operations.loadTables = function (that, tableData) {
    var tableNames = fluid.keys(tableData);
    var loadSequence = [];
    fluid.each(tableNames, function (aTableName) {
        loadSequence.push(that.loadOneTable(aTableName, tableData[aTableName]));
    });
    return fluid.promise.sequence(loadSequence);
};

/*
 * Bulk load the given records into the given table.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - Name of the table to load.
 * @param {Object} records - The table data -- array of objects containing
 *                           name/value pairs that match the column/values of
 *                           the table.
 * @param {Object} that.table[tableName] - The table to load.
 * @return {Promise} Promise whose value is loaded table.  Resolve and reject
 *                   handlers log the success/failure.
 */
fluid.postgresdb.operations.loadOneTable = function (that, tableName, records) {
    var model = that.tables[tableName];
    if (model) {
        var loadPromise = model.bulkCreate(records);
        loadPromise.then(
            function (results) {
                fluid.log("Loaded ", results.length, " records into table '", tableName, "'");
            },
            function (error) {
                fluid.log("Failed to load data into table '", tableName, "'", error);
            }
        );
        return loadPromise;
    } else {
        return fluid.promise().resolve("No table defined for '" + tableName + "'");
    }
};

/*
 * Flush or empty the contents of the named table -- delete all rows.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Boolean} hardDelete - (Optional) Flag for soft vs. hard deletion.
 * @return {Promise} Promise whose value is the number of rows deleted.
 */
fluid.postgresdb.operations.deleteTableData = function (that, tableName, hardDelete) {
    var model = that.tables[tableName];
    if (model) {
        // Empty 'where' option means: no row filtering (= all rows).
        return model.destroy({force: hardDelete, where: {}});
    } else {
        return fluid.promise().resolve(0);
    }
};

/*
 * Retrieve the given row from the given table.
 * SELECT * FROM <tableName> WHERE <column>=<value>;
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} rowInfo - Object containing a columnName/value pair.
 * @return {Promise} Promise whose value is an array of rows (can be empty).
 */
fluid.postgresdb.operations.selectRows = function (that, tableName, rowInfo) {
    var model = that.tables[tableName];
    if (model) {
        return model.findAll({where: rowInfo});
    } else {
        return fluid.promise().resolve([]);
    }
    // SELECT * FROM <tableName> WHERE <column>=<value>;
};

/*
 * Retrieve the value at a given row/column in the given table.
 * SELECT <constraints.attributes> FROM <tableName> WHERE <valueSpec.where> 
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} constraints - Specification of what to retrieve:
 * @param {Array}  constraints.attributes - Array of column names; can be empty.
 * @param {Object} constraints.where - Restrictions on row; can be empty.
 * @return {Promise} Promise whose value is an array of records (can be empty).
 */
fluid.postgresdb.operations.retrieveValue = function (that, tableName, constraints) {
    var model = that.tables[tableName];
    if (model) {
        return model.findAll(constraints);
    } else {
        return fluid.promise().resolve([]);
    }
    // SELECT <constraints.attributes> FROM <tableName> WHERE <constraints.where> 
};

/*
 * Insert the given record into the given table.  Note that the fields of the
 * record must match the columns of the table.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be deleted.
 * @param {Object} record - Hash of name/value pairs.
 * @return {Promise} Promise whose value is an array of the record added and
 *                   whether it was added.
 */
fluid.postgresdb.operations.insertRecord = function (that, tableName, record) {
    return that.loadOneTable(tableName, [record]);
};

/*
 * Delete the given identified record into the given table.
 * DELETE FROM <tableName> WHERE <primaryKey.keyName>=<primaryKey.value>
 *
 * Examples of the 'primaryKey' parameter:
 * - { "id": "F553B211-5BCD-41EA-9911-50646AE19D74"}
 * - { "name": "default"}
 * 
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table from which the record is deleted.
 * @param {Object} primaryKey - Identifier for the record to delete:
 * @param {Object} primaryKey.keyName - Primary key name.
 * @param {Object} primaryKey.value - Value of the primary key.
 * @return {Promise} Promise the value is the number of rows deleted, either
 *                   zero or one.
 */
fluid.postgresdb.operations.deleteRecord = function (that, tableName, primaryKey) {
    var model = that.tables[tableName];
    if (model) {
        return model.destroy({ where: primaryKey });
    } else {
        return fluid.promise().resolve(0);
    }
    // DELETE FROM <tableName> WHERE <primaryKey.keyName>=<primaryKey.value>
};

/*
 * Update the data in the given field(s) of the given table with the given
 * identifier and other constraints.
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.tables - The known tables.
 * @param {Object} tableName - The table whose contents are to be updated.
 * @param {Object} fieldData - Data to be inserted, with constraints:
 * @param {Object} fieldData.attributes - Hash of name/value pairs, to be
 *                                        inserted.
 * @param {Object} fieldData.where - Constraints on the insertion.  It must
 *                                   contain an identifier (primary key).
 * @return {Promise} Promise whose value is an array containing the number of
 *                   affected rows, and the actual affected rows.
 */
fluid.postgresdb.operations.updateFields = function (that, tableName, fieldData) {
    var model = that.tables[tableName];
    if (model) {
        if (!fieldData.where) {
            return fluid.promise().reject("Missing primary key");
        } else {
            return model.update(fieldData.attributes, { where: fieldData.where });
        }
    } else {
        return fluid.promise().resolve([0]);
    }
};

/*
 * Load the table model definitions using fluid.require().
 *
 * @param {Object} that - Operations component instance.
 * @param {Object} that.modelDefinitions - List to populate with the table models.
 * @param {String} tabelModelsFilePath - Path to models definitions file.
 */ 
fluid.postgresdb.operations.loadTableModels = function (that, tabelModelsFilePath) {
    that.modelDefinitions = fluid.require(tabelModelsFilePath, require);
};
