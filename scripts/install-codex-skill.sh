#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL_NAME="institutional-lite"
SOURCE_DIR="${ROOT_DIR}/skills/${SKILL_NAME}"

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
TARGET_DIR="${CODEX_HOME}/skills/${SKILL_NAME}"

FORCE=0
if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Source skill not found: ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${CODEX_HOME}/skills"

if [[ -e "${TARGET_DIR}" ]]; then
  if [[ "${FORCE}" -ne 1 ]]; then
    echo "Target already exists: ${TARGET_DIR}" >&2
    echo "Re-run with --force to overwrite." >&2
    exit 1
  fi
  rm -rf "${TARGET_DIR}"
fi

cp -R "${SOURCE_DIR}" "${TARGET_DIR}"

echo "Installed ${SKILL_NAME} to ${TARGET_DIR}"
