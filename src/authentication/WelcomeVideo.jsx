// src/authentication/WelcomeVideo.jsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
// import Video from 'react-native-video';
// import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import fonts from '../theme/fonts';

const { width, height } = Dimensions.get('window');

const WelcomeVideo = () => {
  const navigation = useNavigation();

  // Animadores
  const translateY = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in del logo y el texto
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // PanResponder para el swipe hacia arriba
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 20,
      onPanResponderMove: (_, { dy }) => translateY.setValue(dy),
      onPanResponderRelease: (_, { dy }) => {
        if (dy < -120) {
          navigation.replace('Login');
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
   <View><Text>Occr Productos</Text></View>
  );
};

export default WelcomeVideo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    position: 'absolute',
    left: 0, right: 0,
    bottom: 0,
    height: height * 0.5,
  },
  overlay: {
    position: 'absolute',
    bottom: 80,
    left: 20, right: 20,
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: width * 0.2,
    marginBottom: 30,
  },
  heading: {
    color: '#FFF',
    fontFamily: fonts.original,
    fontSize: fonts.size.XLL,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 10,
  },
  paragraph: {
    color: '#FFF',
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    textAlign: 'center',
    lineHeight: 28,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
