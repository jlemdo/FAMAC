// react-native.config.js

module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts'],
  dependencies: {
    'react-native-maps': {
      platforms: {
        ios: null,   // ← desactiva el enlace automático de iOS
      },
    },
  },
};
