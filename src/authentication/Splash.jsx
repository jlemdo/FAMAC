import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Animated, 
  Dimensions,
  StatusBar,
  Platform 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import fonts from '../theme/fonts';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const fadeInLogo = useRef(new Animated.Value(0)).current;
  const fadeInText = useRef(new Animated.Value(0)).current;
  const scaleInLogo = useRef(new Animated.Value(0.3)).current;
  const slideUpText = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Secuencia de animaciones
    const startAnimations = () => {
      // Logo aparece con fade + scale
      Animated.parallel([
        Animated.timing(fadeInLogo, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleInLogo, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();

      // Texto aparece después con fade + slide up
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeInText, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideUpText, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start();
      }, 500);
    };

    startAnimations();

    // Navegar después de las animaciones
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigation, fadeInLogo, fadeInText, scaleInLogo, slideUpText]);

  return (
    <>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#F2EFE4" 
        translucent={false} 
      />
      <LinearGradient
        colors={['#F2EFE4', '#FDFCF6', '#F2EFE4']}
        locations={[0, 0.5, 1]}
        style={styles.container}>
        
        {/* Elementos decorativos de fondo */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
        
        {/* Logo animado */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: fadeInLogo,
              transform: [{ scale: scaleInLogo }]
            }
          ]}>
          <View style={styles.logoShadow}>
            <Image 
              source={require('../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Texto de bienvenida animado */}
        <Animated.View 
          style={[
            styles.textContainer,
            {
              opacity: fadeInText,
              transform: [{ translateY: slideUpText }]
            }
          ]}>
          <Text style={styles.welcomeText}>Bienvenido</Text>
          <Text style={styles.appName}>FAMAC</Text>
          <Text style={styles.tagline}>Lácteos frescos para tu hogar</Text>
        </Animated.View>

        {/* Indicador de carga sutil */}
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDot1} />
          <View style={styles.loadingDot2} />
          <View style={styles.loadingDot3} />
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2EFE4',
  },
  
  // Elementos decorativos de fondo
  decorativeCircle1: {
    position: 'absolute',
    top: height * 0.1,
    right: width * 0.1,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(210, 127, 39, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: height * 0.2,
    left: width * 0.05,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(139, 94, 60, 0.06)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.3,
    left: width * 0.15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(51, 167, 68, 0.05)',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoShadow: {
    shadowColor: '#D27F27',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },

  // Textos
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  welcomeText: {
    fontSize: fonts.size.XL || 28,
    fontFamily: fonts.original || fonts.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(139, 94, 60, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  appName: {
    fontSize: fonts.size.XLLL || 36,
    fontFamily: fonts.original || fonts.bold,
    color: '#D27F27',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: 'rgba(47, 47, 47, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagline: {
    fontSize: fonts.size.medium || 16,
    fontFamily: fonts.regular,
    color: '#8B5E3C',
    textAlign: 'center',
    opacity: 0.8,
    fontStyle: 'italic',
  },

  // Indicador de carga
  loadingContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot1: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D27F27',
    marginHorizontal: 4,
    opacity: 0.6,
  },
  loadingDot2: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5E3C',
    marginHorizontal: 4,
    opacity: 0.7,
  },
  loadingDot3: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33A744',
    marginHorizontal: 4,
    opacity: 0.8,
  },
});

export default SplashScreen;
