// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const os = require('os');

// En Node <18 no existe os.availableParallelism(), así que caemos a os.cpus().length
const availableWorkers = typeof os.availableParallelism === 'function'
  ? os.availableParallelism()
  : os.cpus().length;

module.exports = mergeConfig(
  getDefaultConfig(__dirname),
  {
    // Inyectamos maxWorkers en la configuración final
    maxWorkers: availableWorkers,
    transformer: {
      // tus otras opciones de transformer, si las tuvieras...
    },
    resolver: {
      // tus otras opciones de resolver, si las tuvieras...
    },
    // etc.
  }
);
