#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "[setup-bash-aliase] non-linux OS, skip."
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ALIAS_FILE="${SCRIPT_DIR}/.bash_aliase"
TARGET_DIR="${HOME}/.bash"
TARGET_ALIAS_FILE="${TARGET_DIR}/.bash_aliase"
TARGET_ENV_FILE="${TARGET_DIR}/runner-alias.env"
BASHRC_FILE="${HOME}/.bashrc"
ENV_FILE="${1:-.env}"
if [[ "${ENV_FILE}" = /* ]]; then
  ENV_FILE_ABS="${ENV_FILE}"
else
  ENV_FILE_ABS="$(pwd)/${ENV_FILE#./}"
fi

if [[ ! -f "${SOURCE_ALIAS_FILE}" ]]; then
  echo "[setup-bash-aliase] source alias file not found: ${SOURCE_ALIAS_FILE}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp "${SOURCE_ALIAS_FILE}" "${TARGET_ALIAS_FILE}"
chmod 600 "${TARGET_ALIAS_FILE}"

{
  echo "export RUNNER_ALIAS_ENV_FILE=\"${ENV_FILE_ABS}\""
} > "${TARGET_ENV_FILE}"
chmod 600 "${TARGET_ENV_FILE}"

touch "${BASHRC_FILE}"
SOURCE_ALIAS_LINE='[ -f "$HOME/.bash/.bash_aliase" ] && source "$HOME/.bash/.bash_aliase"'
SOURCE_ENV_LINE='[ -f "$HOME/.bash/runner-alias.env" ] && source "$HOME/.bash/runner-alias.env"'

if ! grep -Fq "${SOURCE_ENV_LINE}" "${BASHRC_FILE}"; then
  echo "${SOURCE_ENV_LINE}" >> "${BASHRC_FILE}"
fi
if ! grep -Fq "${SOURCE_ALIAS_LINE}" "${BASHRC_FILE}"; then
  echo "${SOURCE_ALIAS_LINE}" >> "${BASHRC_FILE}"
fi

echo "[setup-bash-aliase] installed: ${TARGET_ALIAS_FILE}"
echo "[setup-bash-aliase] env file: ${ENV_FILE_ABS}"
echo "[setup-bash-aliase] open a new shell or run:"
echo "  source \"${TARGET_ENV_FILE}\" && source \"${TARGET_ALIAS_FILE}\" && r_help"
