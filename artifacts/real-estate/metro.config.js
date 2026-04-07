const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// منع Metro من مشاهدة حزم server-only (@google-cloud) لتجنب أخطاء الملفات المؤقتة
config.resolver = config.resolver || {};
config.resolver.blockList = [
  /node_modules\/@google-cloud\/.*/,
  /node_modules\/google-auth-library\/.*/,
];

module.exports = config;
