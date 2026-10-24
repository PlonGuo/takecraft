#!/usr/bin/env bash
set -euo pipefail
command -v node >/dev/null || { echo 'Install Node.js >=22.12 first.' >&2; exit 1; }
command -v curl >/dev/null || { echo 'Install curl first.' >&2; exit 1; }
takecraft_tmp=$(mktemp -d "${TMPDIR:-/tmp}/takecraft-install.XXXXXXXX")
trap 'rm -rf "$takecraft_tmp"' EXIT
curl -fsSL https://raw.githubusercontent.com/PlonGuo/takecraft/main/scripts/install.mjs -o "$takecraft_tmp/install.mjs"
node "$takecraft_tmp/install.mjs" "$@"
