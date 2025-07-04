import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import fonts from '../theme/fonts';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.text}>Food App</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFE4',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  text: {
    fontSize: fonts.size.extraLarge,
    fontFamily: fonts.bold,
    color: '#2F2F2F',
  },
});

export default SplashScreen;
