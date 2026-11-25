#!/usr/bin/env bash
set -eu

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if [[ ! -r .env ]]; then
  printf 'Create a readable .env next to send-with-ftp.sh. See README.md for the FTP settings.\n' >&2
  exit 1
fi
source ./.env
: "${FTP_HOST:?Set FTP_HOST in .env}"
: "${FTP_PORT:?Set FTP_PORT in .env}"
: "${FTP_USER:?Set FTP_USER in .env}"
: "${FTP_PASS:?Set FTP_PASS in .env}"

if [[ ! $FTP_HOST =~ ^[[:alnum:].-]+$ ]]; then
  printf 'Set FTP_HOST to a hostname or IPv4 address without a scheme or port.\n' >&2
  exit 1
fi
if [[ ! $FTP_PORT =~ ^[0-9]{1,5}$ ]] || (( 10#$FTP_PORT < 1 || 10#$FTP_PORT > 65535 )); then
  printf 'Set FTP_PORT to a port number between 1 and 65535.\n' >&2
  exit 1
fi
if ! command -v lftp >/dev/null; then
  printf 'Install lftp to deploy over FTP.\n' >&2
  exit 1
fi

node scripts/build.mjs
cd dist

# Upload into the existing document root required by InfinityFree.
# Transfer each file under a temporary name before replacing its live copy.
ftp_commands=(
  'set cmd:fail-exit yes'
  'set net:max-retries 3'
  'set net:timeout 20s'
  'set ftp:ssl-force yes'
  'set ftp:ssl-protect-data yes'
  'set ssl:verify-certificate yes'
  'set xfer:use-temp-file yes'
  'set xfer:make-backup no'
  'set mirror:order "*/"'
  'cd /htdocs'
  'mirror --reverse --transfer-all --overwrite --no-perms --verbose . .'
  'bye'
)
LFTP_PASSWORD="$FTP_PASS" lftp --norc --user "$FTP_USER" --env-password \
  -p "$((10#$FTP_PORT))" -e "$(printf '%s; ' "${ftp_commands[@]}")" "ftp://$FTP_HOST"

printf 'Uploaded dist/ to /htdocs.\n'
