module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // Production'da console.log'ları otomatik kaldır (error ve warn hariç)
      ...(process.env.NODE_ENV === 'production' 
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] 
        : [])
    ],
  };
}; 