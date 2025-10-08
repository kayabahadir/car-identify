const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// TypeScript desteği için
config.resolver.sourceExts.push('ts', 'tsx');

module.exports = config;
