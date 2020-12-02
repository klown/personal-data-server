# fluid-postgres

The purpose of this module is to provide a set of common operations for
persistent storage of data, using a Postgres database.  The database is
implemented using [postgresdb](https://www.postgresql.org//) with
[Sequelize](https://sequelize.readthedocs.io/en/v3).  Documentation of the fluid
components is available in the `docs` folder.

## Getting started

The `scripts` folder provides a way to initialize a database to use with the
operations defined here.  It uses [Docker](https://www.docker.com/get-started)
to create a container with an empty "`fluid_prefsdb`" database.  If you have
Docker installed, then running the startup script will download the postgresdb
docker image and launch it with the following configuration:

| Envionment variable        | Default Value     | Description |
| -------------------------- | -------------     | ----------- |
| `POSTGRES_MAIN_CONTAINER`  | `postgresdb`      | The main Docker container running the postgresdb interface |
| `POSTGRES _LISTEN_PORT`    | `5432`            | Postgres TCP port for accessing the database |
| `POSTGRES_USER`            | `admin`           | User that has admin privileges for all tables in the database |
| `POSTGRES_PASSWORD`        | `asecretpassword` | User's password |

## Start Up

Use the provided script to start up the a container running PostGres and
initialize an empty `fluid_prefsdb` database.  The script uses the configuration
described above, but the values can be overridden by setting up the appropriate
environment variables (see below for an example).  The script is in the
`scripts` folder and is run as follows:

```console
startDockerPostgres.sh
```

If you wish to change, for example, the Postgres TCP port
`POSTGRESDB_LISTEN_PORT`, execute the script as follows:

```console
export POSTGRESDB_LISTEN_PORT=5433; startDockerPostgres.sh
```

## Shut Down

When you wish to shut down the cluster, use the `stop` script:

```console
stopDockerPostgres.sh
```

The only environment variable that the shut down script relies on is the main
container name, `POSTGRES_MAIN_CONTAINER`.

## Database API

Documentation on database operations can be found in the
[`docs`](docs/Operations.md) folder.
