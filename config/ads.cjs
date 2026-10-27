const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;
const TEST_PUBLISHER = "3940256099942544";
const trackingDescription = "İzin verirsen cihazının reklam tanımlayıcısı reklam ölçümü için kullanılabilir. İzin vermeden de Ehlibyte’ı kullanabilirsin.";

function resolveAdsConfig(env) {
  const read = (key) => env[key]?.trim() ?? "";
  const production = read("EXPO_PUBLIC_APP_ENV") === "production" || read("EAS_BUILD_PROFILE") === "production";
  const enabled = read("EXPO_PUBLIC_ENABLE_ADS") === "true";
  const platform = read("EAS_BUILD_PLATFORM");
  const errors = [];
  const requiredPlatforms = platform === "ios" || platform === "android" ? [platform] : ["ios", "android"];
  const appIds = {};
  for (const target of ["ios", "android"]) {
    const key = `EXPO_PUBLIC_ADMOB_${target.toUpperCase()}_APP_ID`;
    const id = read(key);
    if (production && enabled && requiredPlatforms.includes(target)) {
      if (!APP_ID.test(id) || id.includes(TEST_PUBLISHER)) errors.push(`${key}: geçerli canlı AdMob uygulama ID’si gerekli.`);
      const units = [read(`EXPO_PUBLIC_ADMOB_${target.toUpperCase()}_NATIVE_UNIT_ID`) || read("EXPO_PUBLIC_ADMOB_NATIVE_UNIT_ID"), read(`EXPO_PUBLIC_ADMOB_${target.toUpperCase()}_BANNER_UNIT_ID`) || read("EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID")];
      if (!units.some((unit) => UNIT_ID.test(unit) && !unit.includes(TEST_PUBLISHER))) errors.push(`${target}: en az bir canlı feed banner/native reklam birimi gerekli.`);
      for (const unit of units.filter(Boolean)) if (!UNIT_ID.test(unit) || unit.includes(TEST_PUBLISHER)) errors.push(`${target}: geçersiz/test feed reklam birimi production’da kullanılamaz.`);
    }
    appIds[target] = production && enabled && APP_ID.test(id) ? id : target === "ios" ? "ca-app-pub-3940256099942544~1458002511" : "ca-app-pub-3940256099942544~3347511713";
  }
  return { enabled, production, appIds, errors, trackingDescription };
}
module.exports = { resolveAdsConfig, trackingDescription };
