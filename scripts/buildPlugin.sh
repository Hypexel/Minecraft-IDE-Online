#!/usr/bin/env bash
# buildPlugin.sh
#
# Usage:
#   ./buildPlugin.sh /absolute/or/relative/path/to/plugin-project [output-dir]
#
# Runs 'mvn -DskipTests package' in the project folder and copies the produced jar
# to builds/<timestamp-id>/. This script is useful when running builds outside the Node server.

set -euo pipefail

PROJECT_DIR="${1:-}"
OUT_BASE="${2:-builds}"

if [ -z "$PROJECT_DIR" ]; then
  echo "Usage: $0 /path/to/project [output-dir]"
  exit 2
fi

if ! command -v mvn >/dev/null 2>&1; then
  echo "mvn not found — please install Apache Maven and ensure it's on PATH."
  exit 3
fi

PROJECT_DIR="$(realpath "$PROJECT_DIR")"
OUT_BASE="$(realpath "$OUT_BASE")"
ID="$(date +%s)-$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 6 | head -n1)"
OUT_DIR="$OUT_BASE/$ID"

echo "Building project: $PROJECT_DIR"
echo "Output will be copied to: $OUT_DIR"

mkdir -p "$OUT_DIR"

# run maven package (skip tests for speed)
pushd "$PROJECT_DIR" >/dev/null
mvn -DskipTests package
popd >/dev/null

# find jar in target
TARGET_DIR="$PROJECT_DIR/target"
JAR="$(ls "$TARGET_DIR"/*.jar 2>/dev/null | grep -vE '(-sources|-javadoc)\.jar$' | head -n1 || true)"

if [ -z "$JAR" ]; then
  echo "No jar found in $TARGET_DIR — build may have failed."
  exit 4
fi

cp "$JAR" "$OUT_DIR/"
echo "Copied: $(basename "$JAR") -> $OUT_DIR/"

echo "Done. Built JAR: $OUT_DIR/$(basename "$JAR")"
