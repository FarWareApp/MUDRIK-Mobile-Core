#!/usr/bin/env bash
set -euo pipefail

readonly MAX_ATTEMPTS=3
readonly NETWORK_TIMEOUT_MS=120000

is_transient_install_failure() {
  local log_file="$1"

  grep -Eqi \
    'Request failed "5[0-9]{2}|5[0-9]{2} Service Unavailable|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|socket hang up|trouble with your network connection' \
    "$log_file"
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  log_file="$(mktemp)"

  set +e
  yarn install \
    --frozen-lockfile \
    --non-interactive \
    --network-timeout "$NETWORK_TIMEOUT_MS" \
    2>&1 | tee "$log_file"
  status=${PIPESTATUS[0]}
  set -e

  if (( status == 0 )); then
    rm -f "$log_file"
    exit 0
  fi

  if ! is_transient_install_failure "$log_file"; then
    echo "Dependency install failed with a non-transient error; not retrying." >&2
    rm -f "$log_file"
    exit "$status"
  fi

  rm -f "$log_file"

  if (( attempt == MAX_ATTEMPTS )); then
    echo "Dependency install still fails after ${MAX_ATTEMPTS} transient attempts." >&2
    exit "$status"
  fi

  delay_seconds=$((attempt * 5))
  echo "Transient registry/network failure detected. Retrying in ${delay_seconds}s (${attempt}/${MAX_ATTEMPTS})." >&2
  sleep "$delay_seconds"
done
