# PostgreSQL Database Access

The purpose of this module is to provide a set of common operations for persistent storage of data, using
a PostgreSQL database running in a docker container. Database operations are implemented using
[the Postgres database](https://www.postgresql.org//) with [node-postgres](https://node-postgres.com/).

## Getting started

The `scripts` folder provides a way to initialize a database to use with the
operations defined here.  It uses [Docker](https://www.docker.com/get-started)
to create a container with an empty "`personalData`" database.  If you have
Docker installed, then running the startup script will download the postgresdb
docker image and launch it with the following configuration:

| Envionment variable        | Default Value          | Description |
| -------------------------- | -------------          | ----------- |
| `POSTGRES_MAIN_CONTAINER`  | `PersonalDataPostgres` | The main Docker container running the postgresdb interface |
| `PGDATABASE`               | `personalData`         | The database name |
| `PGPORT`                   | `5432`                 | Postgres TCP port for accessing the database |
| `PGUSER`                   | `admin`                | User that has admin privileges for all tables in the database |
| `PGPASSWORD`               | `asecretpassword`      | User's password |
| `POSTGRES_IMAGE`           | `postgres:14.0-alpine` | Postgres docker image name |

## Start Up: `./scripts/startDockerPostgres.sh`

WARNING:  The script below uses Docker to start a container based on the Postgres docker image. It will download the
image if it is not on the system. The Docker image is about 160 MB.

Use the provided script to start up a container running Postgres and initialize an empty `personalData` database.
The script uses the configuration described above, but the values can be overridden by setting up the appropriate
environment variables (see below for an example).  The script is in the `scripts` folder and is run as follows from
the project root directory:

```bash
./scripts/startDockerPostgres.sh
```

If you wish to change, for example, the Postgres TCP port `PGPORT`, execute the script as follows:

```bash
export PGPORT=5433; ./scripts/startDockerPostgres.sh
```

## Shut Down: `./scripts/stopDockerPostgres.sh`

This script is to shut down the database and its container. The only environment variable this script relies on
is the main container name, `POSTGRES_MAIN_CONTAINER`.

```bash
./scripts/stopDockerPostgres.sh
```

## Load into Database: `./scripts/runSql.js`

This script is to load a SQL file or execute a SQL statement against a database running in a Postgres docker container.
It doesn't require any environment variables to be defined. All required database parameters should be passed in as
command arguments.

* The usage to load a SQL file is:

```bash
node ./scripts/runSql.js {database} {host} {port} {user} {password} {sql-file}
```

Example:

```bash
node ./scripts/runSql.js personalData localhost 5432 admin asecretpassword ./dataModel/SsoProvidersData.sql
```

* The usage to execute a SQL statement is:

```bash
node ./scripts/runSql.js {database} {host} {port} {user} {password} -- {sql-statement}
```

Example:

```bash
node ./scripts/runSql.js personalData localhost 5432 admin asecretpassword -- "truncate table \"AppSsoProvider\" CASCADE"
```

## Drop Database

This script will drop the specified database in the Postgres docker container. Environment variables it relies on are:
`POSTGRES_MAIN_CONTAINER`, `PGPORT`, `PGUSER`, `PGDATABASE`.

```bash
./scripts/dropDockerDatabase.sh
```

## References

[Environment variables used to set default Postgres connection parameters](https://www.postgresql.org/docs/9.1/libpq-envars.html)
[How to use Postgres official docker image](https://hub.docker.com/_/postgres)
