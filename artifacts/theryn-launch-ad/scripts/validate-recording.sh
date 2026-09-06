#!/bin/bash
# Validates that the video recording lifecycle hooks are properly wired up.
# Exit 0 = valid, Exit 1 = missing hooks.

set -u

ARTIFACT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ARTIFACT_DIR/src"

errors=0

if ! grep -rq "useVideoPlayer" "$SRC_DIR/components/"; then
  echo "ERROR: No component imports useVideoPlayer from @/lib/video."
  errors=$((errors + 1))
fi

if ! grep -Fq 'window.startRecording?.()' "$SRC_DIR/lib/video/hooks.ts" 2>/dev/null; then
  echo "ERROR: src/lib/video/hooks.ts is missing window.startRecording?.()."
  errors=$((errors + 1))
fi

if ! grep -Fq 'window.__replitVideoPlayerMounted = true' "$SRC_DIR/lib/video/hooks.ts" 2>/dev/null; then
  echo "ERROR: src/lib/video/hooks.ts is missing its mounted marker."
  errors=$((errors + 1))
fi

if ! grep -Fq 'window.__replitVideoTotalDurationMs' "$SRC_DIR/lib/video/hooks.ts" 2>/dev/null; then
  echo "ERROR: src/lib/video/hooks.ts is missing its total-duration marker."
  errors=$((errors + 1))
fi

if ! grep -Fq 'window.stopRecording?.()' "$SRC_DIR/lib/video/hooks.ts" 2>/dev/null; then
  echo "ERROR: src/lib/video/hooks.ts is missing window.stopRecording?.()."
  errors=$((errors + 1))
fi

if [ "$errors" -gt 0 ]; then
  echo ""
  echo "Found $errors recording lifecycle error(s)."
  exit 1
fi

echo "Recording lifecycle validation passed."