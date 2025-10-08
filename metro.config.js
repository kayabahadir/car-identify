const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// TypeScript ve JSX desteği
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Asset extensions
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];

module.exports = config;
