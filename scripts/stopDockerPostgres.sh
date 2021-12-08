#!/bin/sh

# Copyright 2020 OCAD University
#
# Licensed under the New BSD license. You may not use this file except in
# compliance with this License.

# Shuts down the docker container running the database and removes the
# containers.

# Default values
POSTGRES_MAIN_CONTAINER=${POSTGRES_MAIN_CONTAINER:-"postgresdb"}

log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

log "Stopping the container for the Postgres database..."
docker stop "$POSTGRES_MAIN_CONTAINER"

log "Removing the container..."
docker rm "$POSTGRES_MAIN_CONTAINER"
