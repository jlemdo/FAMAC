/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 */
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const os = require('os');

const defaultConfig = getDefaultConfig(__dirname);

// Fallback para Node < 18
if (typeof os.availableParallelism !== 'function') {
  os.availableParallelism = () => os.cpus().length;
}

module.exports = mergeConfig(defaultConfig, {
  // tus overrides aquí (si los hay)
});
