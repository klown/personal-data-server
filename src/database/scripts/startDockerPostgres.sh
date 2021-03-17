#!/bin/sh

# Copyright 2020-2021 OCAD University
#
# Licensed under the New BSD license. You may not use this file except in
# compliance with this License.  You may obtain a copy of the License at
# https://github.com/fluid-project/preferencesServer/blob/main/LICENSE

# Starts up a Postgres database using a docker image.  If it is not present, it
# is downloaded (pulled) from dockerhub.

# Default values
POSTGRES_MAIN_CONTAINER=${POSTGRES_MAIN_CONTAINER:-"postgresdb"}
PGPORT=${PGPORT:-5432}
POSTGRES_USER=${PGUSER:-"admin"}
PGDATABASE=${PGDATABASE:-"fluid_prefsdb"}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-"asecretpassword"}
POSTGRES_IMAGE=${POSTGRES_IMAGE:-"postgres:13.1-alpine"}

log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

run() {
docker run -d \
    --name="$POSTGRES_MAIN_CONTAINER" \
    -e POSTGRES_USER=$POSTGRES_USER \
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    -p $PGPORT:$PGPORT \
    -d $POSTGRES_IMAGE postgres -p $PGPORT
}

log "POSTGRES_MAIN_CONTAINER: $POSTGRES_MAIN_CONTAINER"
log "PGPORT: $PGPORT"
log "POSTGRES_USER: $POSTGRES_USER"
log "POSTGRES_IMAGE: $POSTGRES_IMAGE"
log "PGDATABASE: $PGDATABASE"

log "Starting postgres in a docker container, if not already running ..."

# Try starting a stopped container, if any.  If that fails, start a new one.
docker start $POSTGRES_MAIN_CONTAINER
if [[ $? != 0 ]]; then
    docker run -d \
        --name="$POSTGRES_MAIN_CONTAINER" \
        -e POSTGRES_USER=$POSTGRES_USER \
        -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
        -p $PGPORT:$PGPORT \
        -d $POSTGRES_IMAGE postgres -p $PGPORT
fi

log "Checking that PostgresDB is ready..."
POSTGRESDB_ISREADY=0
for i in `seq 1 30`
do
    docker exec --user postgres "$POSTGRES_MAIN_CONTAINER" pg_isready -p $PGPORT
    if [[ $? == 0 ]]; then
        POSTGRESDB_ISREADY=1
        break
    fi
    sleep 2 # seconds
done

if [[ $POSTGRESDB_ISREADY == 1 ]]; then
    log "Creating $PGDATABASE database ..."
    ERR_MSG="$(docker exec $POSTGRES_MAIN_CONTAINER \
        createdb -p $PGPORT -U $POSTGRES_USER --echo $PGDATABASE 2>&1 >/dev/null)"

    if [[ $? == 0 ]]; then
        EXIT_STATUS=0
        log "database created"
    elif [[ $ERR_MSG == *"already exists"* ]]; then
        EXIT_STATUS=0
        log "database already exists, okay"
    else
        EXIT_STATUS=1
        log "$ERR_MSG"
    fi
else
    echo "Failed to start database server"
    EXIT_STATUS=1
fi
exit $EXIT_STATUS
