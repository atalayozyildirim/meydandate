#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export EXPO_PUBLIC_APP_ENV=production
export EXPO_PUBLIC_USE_SUPABASE=true
export EXPO_PUBLIC_USE_REVENUECAT=true
export EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=false

npm run validate:prod

DEVICE_ID="$(xcrun simctl list devices booted --json | node -e '
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const runtimes = JSON.parse(input).devices;
  const device = Object.values(runtimes).flat().find((item) => item.state === "Booted");
  if (device) process.stdout.write(device.udid);
});
')"

if [[ -z "$DEVICE_ID" ]]; then
  echo "Açık bir iOS simülatörü bulunamadı. Önce Simulator uygulamasından bir cihaz açın."
  exit 1
fi

DERIVED_DATA="$ROOT_DIR/ios/build/DerivedDataRelease"
APP_PATH="$DERIVED_DATA/Build/Products/Release-iphonesimulator/Ehlibyte.app"

xcodebuild \
  -quiet \
  -workspace "$ROOT_DIR/ios/Ehlibyte.xcworkspace" \
  -scheme Ehlibyte \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA" \
  ONLY_ACTIVE_ARCH=YES \
  build

xcrun simctl install "$DEVICE_ID" "$APP_PATH"
xcrun simctl launch --terminate-running-process "$DEVICE_ID" com.ehlibyte.app
