#!/bin/bash
# Warms macOS syspolicyd cache for this project.
#
# macOS flags every file with com.apple.provenance and runs a sync policy
# check on first read. On this machine that check takes ~1.3s per file,
# which makes Vite's cold start appear to hang indefinitely (Vite reads
# hundreds of files during dep scan + transform).
#
# Reading every project file once warms the policy cache so subsequent
# reads are instant (<3ms). Run once after `npm install` or after reboot.

set -e
cd "$(dirname "$0")/.."

echo "Warming syspolicyd cache (reads every file once; takes 1-2 min)..."

# node_modules: only the files Vite touches
time find node_modules -type f \
  \( -name '*.json' -o -name '*.js' -o -name '*.mjs' -o -name '*.cjs' \
     -o -name '*.ts' -o -name '*.tsx' -o -name '*.node' \) -print0 2>/dev/null \
  | xargs -0 -n 500 cat > /dev/null 2>&1

# project sources
time find src -type f -print0 2>/dev/null | xargs -0 -n 200 cat > /dev/null 2>&1
time find . -maxdepth 2 -type f \( -name '*.json' -o -name '*.ts' -o -name '*.html' -o -name '*.css' \) -print0 2>/dev/null \
  | xargs -0 -n 100 cat > /dev/null 2>&1

echo "Done. Dev server should now start instantly."
