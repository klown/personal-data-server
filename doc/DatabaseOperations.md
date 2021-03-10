# Postgres Database Components and API

Accessing the database involves setting up Postgres tables according to a table
definition, and adding, retrieving, and modifying the data within those tables.
A fluid component has been defined for performing these operations using
JavaScript.

The implementation is a combination of [PostgreSQL](https://www.postgresql.org/),
[node-postgres](https://node-postgres.com/), and code to handle SQL and JSON.
Requests made to the database that manipulate the tables and their contents are
given in the form of PostgreSQL strings.  Responses from the database are JSON.

Most of the functions return a `Promise`.  The operations described here use
only `then()`, `resolve()`, and `reject()` functions, allowing the use of
[Infusion's promise API](https://docs.fluidproject.org/infusion/development/promisesapi).

## APIs

The library consists of a single fluid component that establishes a
connection to the data base (host, port, etc.) and provides an interface to
make PostgresSQL queries

### `fluid.postgresdb.request`

The request component is for initializing the connection with the database and
provides a means to make queries of it.

#### Component options

These options are all set to `null` in the base grade.  Integrators need to set
these as appropriate to their situation.

| Option            | Type       | Description | Default |
| ----------------- | ---------- | ----------- | ------- |
| `databaseName`    | String     | Required. Name of the database containing the tables, e.g., `"fluid_prefsdb"` | `null` |
| `host`            | String     | Required. The host for the requests, e.g., `"localhost"` | `null` |
| `port`            | Integer    | Required. The port for the requests, e.g., `5432` | `null` |
| `user`            | String     | Required. User administrator's name, e.g., `"admin"`| `null` |
| `password`        | String     | Required for secure implementations. User administrator's password | `null` |

#### Component members

| Member            | Type       | Description |
| ----------------- | ---------- | ----------- |
| `pool`            | Object     | Access to the node-postgres instance.

When initialized, the request component allocates a node-postgress [`Pool`](https://node-postgres.com/api/pool)
and uses it to establish the connection to the database as per the request's
options.  It is then ready for database queries.

#### Operations API

##### `query(queryString)` (Invoker)

- `queryString {String}` SQL query string.
- Returns: `{Promise}` whose value is the result(s) of the query.

The `queryString` can be a single SQL query, or a set of them.  An example of
the former is:
```
SELECT * FROM users WHERE "userId" = 'carla';
```

An example of the latter is:

```
DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='prefsSafesType') THEN
            CREATE TYPE "prefsSafesType" AS ENUM ('snapset', 'user');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='accessType') THEN
            CREATE TYPE "accessType" AS ENUM ('public', 'private', 'shared by trusted parties');
        END IF;
    END
$$;
CREATE TABLE "prefsSafes" (
    "prefsSafesId" VARCHAR(36) PRIMARY KEY NOT NULL,
    "safeType" "prefsSafesType" NOT NULL,
    name VARCHAR(64),
    password VARCHAR(64),
    email VARCHAR(32),
    preferences JSONB NOT NULL DEFAULT '{}'
);
INSERT INTO "prefsSafes" ("prefsSafesId", "safeType", name, password, email)
    VALUES ('prefsSafe-1', user, 'carla', 'null', 'someone@somewhere.com')
    RETURNING *
;

```

In both cases, the query is a single `String`.

The returned `Promise` is configured with a rejection handler that logs any
error.

##### `bulkQuery(queryArray)` (Invoker)

- `queryArray {Array}` An array of SQL statements.
- Returns: `{Promise}` A promise whose values are the results of running the
sequence of commands in the `queryArray`.

Loop to execute the input array as a `fluid.promise.sequence()`.  The returned
`Promise` is configured with a rejection handler that logs any error.

While there is no constraint on the order of the SQL statements in the input
array, this function can be used to define a logical sequence of database
queries, where the order of the queries is defined by their position in the
array.

##### `loadFromJSON(tableName, records)` (Invoker)

- `tableName {String}` The name of the table to load with the given records.
- `jsonArray {Array}` An array of JSON objects containing the data to load into
the given table.
- Returns: `{Promise}` whose values is an array of successful INSERT results.

Bulk load the given records into the given table.  The records' JSON field
names must match the column names of the table, and the values of each field
contain the value to store in the corresponding column.  For columns that are
required and have no default value set, the JSON field must exist and its value
be of the correct type and format for the column.  For table columns that are
not required, or have a default value, the corresponding JSON field can be
missing.

##### `fluid.postgresdb.stringifyJoinKeys(keys)` (Function)

- `keys {Array}` An array of strings as given by `Object.keys()`.
- Returns: A comma-separated string of the keys, each quoted with double quotes.

Utility to stringify each element of an array of object keys and join them
as a single string separated by commas.  This is similar to the `Array.join()`
function, but where each element is quoted with double quotes.

##### `fluid.postgresdb.stringifyJoinValues(values)` (Function)

- `values {Array}` Array of object values as given by `Object.values()`.
- Returns: A comma-separated string of the values each quoted with single
quotes.

Utility to stringify each element of an array of object values and join them
as a single string separated by commas.  This is similar to the `Array.join()`
function, but where each element is quoted with a single quote.  Also, if
a value is an object, it is stringified as well as quoted.

##### `fluid.postgresdb.maybeStringify(aValue)` (Function)

- `aValue {Any}` The value to possibly stringify.
- Returns `{Any|String}` - The value as is, or stringified.

The input value is checked via `fluid.isPrimitive()`, and if so, it is
returned as is.  Otherwise the result of `JSON.stringify()` is returned. If
the argument is an array, the square brackets are replaced with curly brackets.

