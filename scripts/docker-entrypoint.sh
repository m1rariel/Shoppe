#!/bin/sh
set -eu

case "${NUXT_PUBLIC_API_BASE_URL:-}" in
  *[![:space:]]*) ;;
  *)
    printf '%s\n' 'NUXT_PUBLIC_API_BASE_URL is required. Set it when starting the Docker container.' >&2
    exit 1
    ;;
esac

exec "$@"
