const { getDefaultConfig } = require("expo/metro-config");

  const config = getDefaultConfig(__dirname);

  // منع Metro من مشاهدة حزم server-only (@google-cloud) لتجنب أخطاء الملفات المؤقتة
  config.resolver = config.resolver || {};
  config.resolver.blockList = [
    /node_modules\/@google-cloud\/.*/,
    /node_modules\/google-auth-library\/.*/,
  ];

  // إجبار Metro على ترجمة TypeScript من @workspace/api-client-react
  // (ضروري عند تثبيته عبر yarn كـ file: dependency)
  config.transformer = config.transformer || {};
  config.transformer.transformIgnorePatterns = [
    /node_modules\/(?!(@workspace\/api-client-react|react-native|@react-native|expo|@expo|@unimodules|unimodules|sentry-expo|native-base|react-native-svg).*)/,
  ];

  module.exports = config;
  