# Postgres Database Components and API

Accessing the database involves setting up Postgres tables according to a table
definition, and adding, retrieving, and modifying the data within those tables.
A pair of fluid components have been defined for performing these operations.

The interface is a combination of [PostgreSQL](https://www.postgresql.org/)
and [Sequelize](https://sequelize.readthedocs.io/en/v3).  As such, the
calls to the database and its tables are given in the form of `JSON` structures.
That is, to put something into the data base, or to make a query, involves json
inputs that are compiled into Postgres and then executed.  Likewise, to retrieve
something from the database, the return value is a json structure.

Nonetheless, raw Postgres requests are available through the Sequelize `query()`
interface.  Users of this library have access to Sequelize via an instance of
the [`fluid.postgresdb.request` component](#fluidpostgresdbrequest).

Most of the functions return a `Promise`.  Sequelize uses the
[Bluebird](http://bluebirdjs.com/docs/why-promises.html) library, however,
the operations described here use only `then()`, `resolve()`, and `reject()`
functions, allowing the use of [Infusion's promise API](https://docs.fluidproject.org/infusion/development/promisesapi).

## APIs

The library consists of two fluid components, one that establishes a
connection to the data base (host, port, etc.) and another that executes the
data base requests.

### `fluid.postgresdb.request`

The request component is for initializing the connection with the database and
providing a means to make requests of it.

#### Component options

| Option            | Type       | Description | Default |
| ----------------- | ---------- | ----------- | ------- |
| `databaseName`    | String     | Optional. Name of the database containing the tables | `"fluid_prefsdb"` |
| `host`            | String     | Optional. The host for the requests | `localhost` |
| `port`            | Integer    | Optional. The port for the requests | `5432` |
| `user`            | String     | Optional. User administrator's name | `"postgres"` |
| `password`        | String     | Optional (required for secure implemenations). User administrator's password | `"asecretpassword"` |

#### Component members

| Member            | Type       | Description |
| ----------------- | ---------- | ----------- |
| `sequelize`       | Object     | Access to the Sequelize instance.

When initialized, the request component establishes the connection with the
database as per its options.  It is then available for database queries.
However, an instance of the request component is a member of the
`fluid.postgresdb.operations` component described immediately following.
Clients use the operations component for most of the interactions with the
database.

### `fluid.postgresdb.operations`

The majority of the database access operations is done using an instance of this
component.  Its structure and API are documented here:

#### Component members

| Member             | Type       | Description |
| ------------------ | ---------- | ----------- |
| `tables`           | Object     | Hash of Sequelize table models, keyed by the table name.  For example, if there is a table in the database named `"users"`, then access to its model is via `tables["users"]` |
| `modelDefinitions` | Object     | Hash of a table model definitions |

#### Sub-components

| Component         | Type                       | Description |
| ----------------- | ----------                 | ----------- |
| `request`         | `fluid.postgresdb.request` | An instance of the request component [documented above](#fluidpostgresdbrequest) |

#### Operations API

##### `createOneTable(tabelDef, deleteExisting)`

- `tableModel Object` A Sequelize table/model definition structure
- `deleteExisting Boolean` Optional flag - if true, delete the table from the
database before creating the new one, if it exists.
- Returns: `{Promise}` whose value is the model definition

Creates the table and sets up its rows as described by the `tableModel`
parameter. If the table already exists, it is deleted and re-created if
`deleteExisting` is set; otherwise, the existing table is left as is.  If the
table did not exist or was deleted first, the resulting table is empty after
creation.

##### `createTables(tableModels)`

- `tableModels Object` A Hash of table names and their Sequelize model
- `deleteExisting Boolean` Optional flag - if true, delete existing tables from
the database before creating the new ones.
- Returns: `{Promise}` whose value is an array of model definitions

Loop to create the tables by calling `createOneTable()` for each table model in
the input parameter.  Existing tables are deleted and recreated if
`deleteExisting` is set; otherwise they are left as is.  The returned promise
is the result of running a `fluid.promise.sequence()`, an array of table models.
The tables created in the database are empty if they are new or were deleted
based on `deleteExisting`.

##### `loadOneTable(tableName, records)`

- `tableName String` The name of the table to load with the given records
- `records Array` An array of JSON objects containing the data to store in the
given table.
- Returns: `{Promise}` whose value is an array of the altered rows.

Bulk load the given records into the given table.  The records' JSON field
names must match the column names of the table and the values of those fields
are the data to store in the column.  It is not necessary to have a field for
each column as missing fields/columns are left as is, or set to null values
in the table.

##### `loadTables(tableData)`

- `tableData Object` A Hash of table names and the records to load.
- Returns: `{Promise}` whose value is an array of tables and, for each, an array
of its altered rows.

For each table named in `tableData`, buik load the associated array of records
into that table using `loadOneTable()`.  The returned promise is the result of
running a `fluid.promise.sequence()`.

##### `deleteTableData(tableName, hardDelete)`

- `tableName String` The name of the table whose data is to be deleted.
- `hardDelete Boolean` Flag indicating whether to execute a hard vs. soft
deletion.  A soft deletion leaves the data in a recoverable state.  A hard
deletion is irrevocable.
- Returns: `{Promise}` whose value is the number of rows deleted.

Deletes all of the data in the given table, leaving it empty.

##### `selectRows(tableName, rowInfo)`

- `tableName String` The name of the table whose data is to be retrieved.
- `rowInfo Object` Object containing a columnName/value pair.
- Returns: `{Promise}` whose value is an array of the row data retrieved, as
JSON objects.

Executes a `SELECT * FROM <tableName> WHERE <columnName>=<value>`.  The `WHERE`
constraint is defined by the `rowInfo` object.  An example, given a table with a
"colour" column with row values consisting of colour names, is
`{ colour: "green" }`.

##### `retrieveValue(tableName, constraints)`

- `tableName String` The name of the table whose data is to be retrieved.
- `constraints Object` A Hash of constraints containing an `attributes` array
and a `where` object.  Both can be empty.
- Returns: `{Promise}` whose value is an array of the data retrieved, as
JSON objects.

Retrieves a value or values based on the contraints provided.  The `attributes`
array member of the `constraints` parameter lists the relevant column names, and
the `where` object defines the WHERE contraint.  Both can be empty.  An
example is:

```.js
{
    attributes: ["id", "password_scheme", "username"],
    where: {
        iterations: 10
    }
}
```

This executes
`SELECT id, password_scheme, username FROM <tableName> WHERE iterations=10;`

An example of the return value is, assuming there are only two users in the
table that have iterations of 10:

``` .js
[
    {
        id: "7D35672C-4E92-4662-8083-6432C179F9EE",
        password_schema: "pbkdf2",
        username: "carla",
        iterations: 10
    },
    {
        "id": "A5138D2A-3C64-4B49-8838-749EE12762DC",
        "password_scheme": "pbkdf2",
        "username"": "sammy",
        "iterations": 10,
    }
]
```

##### `insertRecord(tableName, record)`

- `tableName String` The name of the table into which to insert the record.
- `record Object` An JSON object containing the values to store in the table.
- Returns: `{Promise}` whose value is an array with the instance inserted, as a
JSON object, or whose rejection is a validation error.

Loads the given record into the given table.  The record's JSON field
names must match the column names of the table, and the values of those fields
are the data to store.  It is not necessary to have a field for each column
-- missing fields/columns are set to null.  If the primary key of the record
to-be-inserted matches the primary key of an existing record, the result is a
validation error and the record is not inserted.

##### `deleteRecord(tableName, primaryKey)`

- `tableName String` The name of the table whose data is to be deleted.
- `primaryKey Object` A name/value pair giving the primary key of the record to
delete.
- Returns: `Promise` whose value is the number of rows deleted, one in this
case.

The `primaryKey` object declares the name of the column that is a primary key,
and the row value to determine which row to delete.  For example:

``` .js
{ id: "7D35672C-4E92-4662-8083-6432C179F9EE"}
```

##### `updateFields(tableName, fieldData)`

- `tableName String` The name of the table whose data is to be retrieved.
- `fieldData Object` A Hash containing an `attributes` object and a `where`
 object.  The `where` object must contain the primary key, at least.
- Returns: `{Promise}` whose value is an array containing the number of
affected rows, and the actual affected rows.

Finds and updates the table's columns based on the fields in the `attributes`
object.  The `attributes` is a set of columnName and their (new) values.  The
`where` object determines the row in the table to update and is the value of the
primary key.  For example to update a user's email address:

``` .js
{
    attributes: {
        "email": "carla@localhost"
        "verified": true,
    },
    where: { id: "7D35672C-4E92-4662-8083-6432C179F9EE" }
}
```

##### `loadTableModels(tabelModelsFilePath)`

- `tabelModelsFilePath String` The path to the file containing the table
models definitions.

Loads the Sequelize table/model definitions from the given file using
`fluid.require()`.
