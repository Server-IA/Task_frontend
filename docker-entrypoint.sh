#!/bin/sh
set -e

# Sustituye solo $BACKEND_HOST y deja intactas las variables de nginx ($host, $remote_addr, etc.)
envsubst '$BACKEND_HOST' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
