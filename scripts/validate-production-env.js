#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const envFiles = [".env", ".env.local"];
const env = { ...process.env };

for (const file of envFiles) {
  const fullPath = path.join(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!env[key]) {
      env[key] = value;
    }
  }
}

const errors = [];
const warnings = [];

const value = (key) => env[key]?.trim() ?? "";
const isPlaceholder = (candidate) =>
  !candidate ||
  /your-|your_|placeholder|example|your-project/i.test(candidate);
const adsEnabled = value("EXPO_PUBLIC_ENABLE_ADS") === "true";

if (value("EXPO_PUBLIC_USE_SUPABASE") !== "true") {
  errors.push("EXPO_PUBLIC_USE_SUPABASE=true olmalı.");
}

if (
  isPlaceholder(value("EXPO_PUBLIC_SUPABASE_URL")) ||
  !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(value("EXPO_PUBLIC_SUPABASE_URL"))
) {
  errors.push("EXPO_PUBLIC_SUPABASE_URL geçerli Supabase proje URL'i olmalı.");
}

const supabaseKey =
  value("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
  value("EXPO_PUBLIC_SUPABASE_ANON_KEY") ||
  value("EXPO_PUBLIC_SUPABASE_KEY");

if (isPlaceholder(supabaseKey) || !/^(sb_publishable_|eyJ)/.test(supabaseKey)) {
  errors.push("Supabase public key eksik veya placeholder.");
}

if (
  isPlaceholder(value("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY")) ||
  !value("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY").startsWith("appl_")
) {
  errors.push("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY appl_ public key olmalı.");
}

if (isPlaceholder(value("EXPO_PUBLIC_SPOTIFY_CLIENT_ID"))) {
  errors.push("EXPO_PUBLIC_SPOTIFY_CLIENT_ID eksik. Spotify dashboard'daki iOS/public client id EAS production env'e eklenmeli.");
}

if (value("EXPO_PUBLIC_USE_REVENUECAT") !== "true") {
  errors.push("Production için EXPO_PUBLIC_USE_REVENUECAT=true olmalı.");
}

if (value("EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE") === "true") {
  errors.push("Production build RevenueCat Test Store key ile gönderilemez. EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=false olmalı.");
}

if (
  isPlaceholder(value("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY")) ||
  !value("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY").startsWith("goog_")
) {
  warnings.push("Android yayını için EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY goog_ public key olmalı.");
}

if (!value("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID")) {
  errors.push("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID eksik.");
}

if (
  value("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID") &&
  !/^[A-Za-z0-9_.-]+$/.test(value("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID"))
) {
  errors.push("EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID boşluksuz lookup key olmalı. Örn: premium");
}

if (adsEnabled) {
  const { resolveAdsConfig } = require("../config/ads.cjs");
  errors.push(...resolveAdsConfig({ ...env, EXPO_PUBLIC_APP_ENV: "production" }).errors);
}

if (warnings.length > 0) {
  console.warn(`Production env uyarıları:\n- ${warnings.join("\n- ")}`);
}

if (errors.length > 0) {
  console.error(`Production env hataları:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log("Production env kontrolü temiz.");
