module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@": "./src",
            "expo-router/native-tabs": "expo-router/unstable-native-tabs",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
