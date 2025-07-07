// index.js
import { AppRegistry } from 'react-native';
import React from 'react';
import { View, Text } from 'react-native';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => () => (
  <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
    <Text>🚀 Hello World</Text>
  </View>
));
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log('🔥 GLOBAL ERROR:', error.message, error.stack);
  // opcional: envía a Sentry u otro servicio de logs
});
