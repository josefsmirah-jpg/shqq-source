#!/bin/bash
cd /home/runner/workspace/artifacts/real-estate
export EXPO_TOKEN=$EXPO_TOKEN
export EAS_NO_GIT_STATUS_CHECK=1
export EAS_BUILD_NO_EXPO_GO_WARNING=true

echo "Starting EAS iOS build submission at $(date)"
pnpm exec eas build --platform ios --profile production --non-interactive --no-wait 2>&1
echo "EAS submission finished at $(date) with exit code $?"
