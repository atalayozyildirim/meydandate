#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOCK_DIR="$ROOT_DIR/ios/build/.test-store-run.lock"
LOCK_PID_FILE="$LOCK_DIR/pid"
METRO_PID=""

release_lock() {
  if [[ -n "$METRO_PID" ]]; then
    kill "$METRO_PID" 2>/dev/null || true
  fi

  rm -f "$LOCK_PID_FILE"
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  EXISTING_PID="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"

  if [[ "$EXISTING_PID" =~ ^[0-9]+$ ]] && kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "Test Store build zaten çalışıyor (PID $EXISTING_PID). Mevcut terminali kullanın."
    exit 1
  fi

  rm -f "$LOCK_PID_FILE"
  rmdir "$LOCK_DIR" 2>/dev/null || true
  mkdir "$LOCK_DIR"
fi

printf '%s\n' "$$" > "$LOCK_PID_FILE"
trap release_lock EXIT INT TERM

export EXPO_PUBLIC_APP_ENV=preview
export EXPO_PUBLIC_USE_REVENUECAT=true
export EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=true

DEVICE_ID="$(xcrun simctl list devices booted --json | /usr/bin/plutil -extract devices json -o - - 2>/dev/null | node -e '
let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const runtimes = JSON.parse(input);
  const device = Object.values(runtimes).flat().find((item) => item.state === "Booted");
  if (device) process.stdout.write(device.udid);
});
')"

if [[ -z "$DEVICE_ID" ]]; then
  echo "Açık bir iOS simülatörü bulunamadı. Önce Simulator uygulamasından bir cihaz açın."
  exit 1
fi

DERIVED_DATA="$ROOT_DIR/ios/build/DerivedDataTestStore"
APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/Ehlibyte.app"

xcodebuild \
  -quiet \
  -workspace "$ROOT_DIR/ios/Ehlibyte.xcworkspace" \
  -scheme Ehlibyte \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA" \
  ONLY_ACTIVE_ARCH=YES \
  build

xcrun simctl install "$DEVICE_ID" "$APP_PATH"

npx expo start --localhost &
METRO_PID=$!

for _ in {1..60}; do
  if curl --silent --fail http://127.0.0.1:8081/status | grep -q "packager-status:running"; then
    break
  fi
  sleep 1
done

xcrun simctl launch --terminate-running-process "$DEVICE_ID" com.ehlibyte.app
wait "$METRO_PID"
